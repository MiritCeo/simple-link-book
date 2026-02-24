import type { NotificationChannel } from "@prisma/client";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import yaml from "yaml";
import authRoutes from "./routes/auth.js";
import publicRoutes from "./routes/public.js";
import salonRoutes from "./routes/salon.js";
import adminRoutes from "./routes/admin.js";
import clientRoutes from "./routes/client.js";
import inventoryRoutes from "./routes/inventory.js";
import auth from "./middleware/auth.js";
import prisma from "./prisma.js";
import { sendEventNotification } from "./notificationService.js";

dotenv.config();

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const openApiPath = path.join(process.cwd(), "openapi.yaml");
if (fs.existsSync(openApiPath)) {
  const openApiFile = fs.readFileSync(openApiPath, "utf8");
  const openApiDoc = yaml.parse(openApiFile);
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDoc));
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/salon", auth, salonRoutes);
app.use("/api/salon/inventory", auth, inventoryRoutes);
app.use("/api/admin", auth, adminRoutes);

const toDateTime = (date: string, time: string) => new Date(`${date}T${time}:00`);
const addMinutes = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60000);

const runReminders = async () => {
  const now = new Date();
  const settings = await prisma.notificationSetting.findMany({
    where: { event: { in: ["REMINDER_24H", "REMINDER_2H", "FOLLOWUP"] } },
  });

  for (const setting of settings) {
    if (!setting.smsEnabled && !setting.emailEnabled) continue;
    const minutes = setting.timingMinutes ?? (setting.event === "REMINDER_24H" ? 1440 : setting.event === "REMINDER_2H" ? 120 : 60);
    const isFollowup = setting.event === "FOLLOWUP";
    const windowStart = addMinutes(now, (isFollowup ? -minutes : minutes) - 5);
    const windowEnd = addMinutes(now, (isFollowup ? -minutes : minutes) + 5);

    const appts = await prisma.appointment.findMany({
      where: {
        salonId: setting.salonId,
        status: isFollowup ? { in: ["COMPLETED"] } : { in: ["SCHEDULED", "CONFIRMED"] },
      },
      include: {
        client: true,
        staff: true,
        appointmentServices: { include: { service: true } },
        salon: true,
      },
    });

    const due = appts.filter(a => {
      const base = toDateTime(a.date, a.time);
      const dt = isFollowup ? addMinutes(base, a.duration || 0) : base;
      return dt >= windowStart && dt <= windowEnd;
    });

    for (const apt of due) {
      const requestedChannels: NotificationChannel[] = [];
      if (setting.smsEnabled) requestedChannels.push("SMS");
      if (setting.emailEnabled) requestedChannels.push("EMAIL");
      const existing = await prisma.notificationLog.findMany({
        where: { appointmentId: apt.id, event: setting.event, channel: { in: requestedChannels } },
      });
      const sent = new Set(existing.map(e => e.channel));
      const toSend = requestedChannels.filter(ch => !sent.has(ch));
      if (toSend.length === 0) continue;
      await sendEventNotification(setting.event as any, apt as any, toSend);
      await prisma.notificationLog.createMany({
        data: toSend.map(ch => ({ appointmentId: apt.id, event: setting.event as any, channel: ch })),
        skipDuplicates: true,
      });
    }
  }
};

setInterval(() => {
  runReminders().catch(() => {});
}, 60_000);

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API running on http://localhost:${port}`);
});
