import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import prisma from "../prisma.js";
import clientAuth, { ClientAuthRequest } from "../middleware/clientAuth.js";
import { sendEmail } from "../notifications.js";
import { ensureCancelToken } from "../notificationService.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const profileSchema = z.object({
  name: z.string().min(2),
  phone: z.string().regex(/^\+48\s?\d{3}\s?\d{3}\s?\d{3}$/, "Podaj numer telefonu w formacie +48 123 456 789"),
  email: z.string().email().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

const resetRequestSchema = z.object({
  email: z.string().email(),
});

const resetConfirmSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8),
});

router.post("/login", async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid_payload" });
    }

    const { email, password } = parsed.data;
    const account = await prisma.clientAccount.findUnique({
      where: { email },
      include: { client: true },
    });
    if (!account) {
      return res.status(401).json({ error: "invalid_credentials" });
    }
    if (!account.client) {
      return res.status(403).json({ error: "client_profile_missing" });
    }
    if (!account.active || !account.client.active) {
      return res.status(403).json({ error: "account_inactive" });
    }
    const ok = await bcrypt.compare(password, account.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const token = jwt.sign(
      { clientId: account.clientId, salonId: account.client.salonId, role: "CLIENT" },
      process.env.JWT_SECRET || "dev",
      { expiresIn: "14d" },
    );

    return res.json({
      token,
      clientId: account.clientId,
      salonId: account.client.salonId,
    });
  } catch (err) {
    return res.status(500).json({ error: "internal_error" });
  }
});

router.post("/password-reset", async (req, res) => {
  const parsed = resetRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });

  const account = await prisma.clientAccount.findUnique({ where: { email: parsed.data.email } });
  if (!account || !account.active) {
    return res.json({ ok: true });
  }

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.clientPasswordReset.create({
    data: { clientAccountId: account.id, token, expiresAt },
  });

  const resetLink = `https://purebook.pl/konto/reset-hasla?token=${token}`;
  await sendEmail(account.email, "Reset hasła", `Kliknij, aby ustawić nowe hasło: ${resetLink}`);

  const isProd = process.env.NODE_ENV === "production";
  return res.json({ ok: true, ...(isProd ? {} : { token }) });
});

router.post("/password-reset/confirm", async (req, res) => {
  const parsed = resetConfirmSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });

  const reset = await prisma.clientPasswordReset.findFirst({
    where: { token: parsed.data.token, usedAt: null, expiresAt: { gt: new Date() } },
    include: { clientAccount: true },
  });
  if (!reset) return res.status(400).json({ error: "token_invalid" });

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.clientAccount.update({
    where: { id: reset.clientAccountId },
    data: { passwordHash },
  });
  await prisma.clientPasswordReset.update({
    where: { id: reset.id },
    data: { usedAt: new Date() },
  });

  return res.json({ ok: true });
});

router.use(clientAuth);

router.get("/me", async (req: ClientAuthRequest, res) => {
  const client = await prisma.client.findUnique({
    where: { id: req.client!.clientId },
  });
  if (!client) return res.status(404).json({ error: "profile_not_found" });
  return res.json({ client });
});

router.get("/appointments", async (req: ClientAuthRequest, res) => {
  const appointments = await prisma.appointment.findMany({
    where: { clientId: req.client!.clientId },
    orderBy: [{ date: "desc" }, { time: "desc" }],
    include: {
      staff: true,
      salon: true,
      appointmentServices: { include: { service: true } },
    },
  });
  const enriched = await Promise.all(
    appointments.map(async (apt) => {
      const canManage = ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"].includes(apt.status);
      const token = canManage ? await ensureCancelToken(apt.id) : null;
      return { ...apt, cancelToken: token?.token || null };
    }),
  );
  return res.json({ appointments: enriched });
});

router.put("/me", async (req: ClientAuthRequest, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload" });
  }

  const { name, phone, email } = parsed.data;
  const account = await prisma.clientAccount.findUnique({
    where: { clientId: req.client!.clientId },
  });

  if (email && account) {
    const existing = await prisma.clientAccount.findUnique({ where: { email } });
    if (existing && existing.clientId !== account.clientId) {
        return res.status(409).json({ error: "email_taken" });
    }
  }

  if (account && email && account.email !== email) {
    await prisma.clientAccount.update({
      where: { id: account.id },
      data: { email },
    });
  }

  const client = await prisma.client.update({
    where: { id: req.client!.clientId },
    data: { name, phone, email: email ?? null },
  });

  return res.json({ client });
});

router.put("/password", async (req: ClientAuthRequest, res) => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload" });
  }

  const { currentPassword, newPassword } = parsed.data;
  const account = await prisma.clientAccount.findUnique({
    where: { clientId: req.client!.clientId },
  });
  if (!account) {
    return res.status(404).json({ error: "account_not_found" });
  }

  const ok = await bcrypt.compare(currentPassword, account.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "invalid_current_password" });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.clientAccount.update({
    where: { id: account.id },
    data: { passwordHash },
  });

  return res.json({ ok: true });
});

export default router;
