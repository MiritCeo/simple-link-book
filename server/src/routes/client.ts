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

const buildClientSalons = async (account: { id: string; clientId: string }) => {
  const [primaryClient, links] = await Promise.all([
    prisma.client.findUnique({
      where: { id: account.clientId },
      include: { salon: true },
    }),
    prisma.clientAccountSalon.findMany({
      where: { clientAccountId: account.id },
      include: { salon: true, client: true },
    }),
  ]);

  const salons: Array<{
    id: string;
    name: string;
    slug: string;
    clientId: string;
    address?: string;
    phone?: string;
    hours?: string;
    description?: string;
  }> = [];
  if (primaryClient?.salon) {
    salons.push({
      id: primaryClient.salon.id,
      name: primaryClient.salon.name,
      slug: primaryClient.salon.slug,
      clientId: primaryClient.id,
      address: primaryClient.salon.address,
      phone: primaryClient.salon.phone,
      hours: primaryClient.salon.hours,
      description: primaryClient.salon.description,
    });
  }

  links.forEach(link => {
    if (!link.salon) return;
    if (salons.some(s => s.id === link.salonId)) return;
    salons.push({
      id: link.salon.id,
      name: link.salon.name,
      slug: link.salon.slug,
      clientId: link.clientId,
      address: link.salon.address,
      phone: link.salon.phone,
      hours: link.salon.hours,
      description: link.salon.description,
    });
  });

  return salons;
};

const ensureAccountSalonLink = async (accountId: string, clientId: string) => {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return;
  const existing = await prisma.clientAccountSalon.findFirst({
    where: { clientAccountId: accountId, salonId: client.salonId },
  });
  if (existing) return;
  await prisma.clientAccountSalon.create({
    data: { clientAccountId: accountId, salonId: client.salonId, clientId },
  });
};

const getAccountForClient = async (clientId: string) => {
  const direct = await prisma.clientAccount.findUnique({ where: { clientId } });
  if (direct) return direct;
  const link = await prisma.clientAccountSalon.findFirst({
    where: { clientId },
    include: { clientAccount: true },
  });
  return link?.clientAccount || null;
};

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

    await ensureAccountSalonLink(account.id, account.clientId);
    const primaryClient = await prisma.client.findUnique({ where: { id: account.clientId } });
    if (!primaryClient) {
      return res.status(403).json({ error: "client_profile_missing" });
    }

    const token = jwt.sign(
      { clientId: account.clientId, salonId: primaryClient.salonId, role: "CLIENT" },
      process.env.JWT_SECRET || "dev",
      { expiresIn: "14d" },
    );

    const salons = await buildClientSalons(account);
    return res.json({
      token,
      clientId: account.clientId,
      salonId: primaryClient.salonId,
      salons,
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

router.get("/salons", async (req: ClientAuthRequest, res) => {
  const account = await getAccountForClient(req.client!.clientId);
  if (!account) return res.status(404).json({ error: "account_not_found" });
  await ensureAccountSalonLink(account.id, account.clientId);
  const salons = await buildClientSalons(account);
  return res.json({ salons, activeSalonId: req.client!.salonId });
});

router.post("/switch-salon", async (req: ClientAuthRequest, res) => {
  const schema = z.object({ salonId: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });

  const account = await getAccountForClient(req.client!.clientId);
  if (!account) return res.status(404).json({ error: "account_not_found" });
  await ensureAccountSalonLink(account.id, account.clientId);

  const primaryClient = await prisma.client.findUnique({ where: { id: account.clientId } });
  if (!primaryClient) return res.status(404).json({ error: "client_profile_missing" });

  let targetClientId: string | null = null;
  if (primaryClient.salonId === parsed.data.salonId) {
    targetClientId = account.clientId;
  } else {
    const link = await prisma.clientAccountSalon.findFirst({
      where: { clientAccountId: account.id, salonId: parsed.data.salonId },
    });
    targetClientId = link?.clientId || null;
  }

  if (!targetClientId) {
    return res.status(404).json({ error: "salon_not_linked" });
  }

  const token = jwt.sign(
    { clientId: targetClientId, salonId: parsed.data.salonId, role: "CLIENT" },
    process.env.JWT_SECRET || "dev",
    { expiresIn: "14d" },
  );

  return res.json({ token, clientId: targetClientId, salonId: parsed.data.salonId });
});

router.post("/salons/attach", async (req: ClientAuthRequest, res) => {
  const schema = z.object({ token: z.string().min(10) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });

  const record = await prisma.appointmentToken.findFirst({
    where: {
      token: parsed.data.token,
      type: "CANCEL",
      expiresAt: { gt: new Date() },
    },
    include: { appointment: { include: { client: true, salon: true } } },
  });
  if (!record?.appointment) return res.status(404).json({ error: "token_invalid" });

  const account = await getAccountForClient(req.client!.clientId);
  if (!account) return res.status(404).json({ error: "account_not_found" });

  await ensureAccountSalonLink(account.id, account.clientId);
  const existing = await prisma.clientAccountSalon.findFirst({
    where: { clientAccountId: account.id, salonId: record.appointment.salonId },
  });
  if (!existing) {
    await prisma.clientAccountSalon.create({
      data: {
        clientAccountId: account.id,
        salonId: record.appointment.salonId,
        clientId: record.appointment.clientId,
      },
    });
  }

  if (record.appointment.client.email == null && account.email) {
    await prisma.client.update({
      where: { id: record.appointment.clientId },
      data: { email: account.email },
    });
  }

  const salons = await buildClientSalons(account);
  return res.json({ ok: true, salons });
});

router.get("/me", async (req: ClientAuthRequest, res) => {
  const client = await prisma.client.findUnique({
    where: { id: req.client!.clientId },
  });
  if (!client) return res.status(404).json({ error: "profile_not_found" });
  return res.json({ client });
});

router.get("/appointments", async (req: ClientAuthRequest, res) => {
  const account = await getAccountForClient(req.client!.clientId);
  if (!account) return res.status(404).json({ error: "account_not_found" });
  await ensureAccountSalonLink(account.id, account.clientId);
  const links = await prisma.clientAccountSalon.findMany({
    where: { clientAccountId: account.id },
    select: { clientId: true },
  });
  const clientIds = Array.from(new Set([account.clientId, ...links.map(l => l.clientId)]));

  const appointments = await prisma.appointment.findMany({
    where: {
      clientId: { in: clientIds },
    },
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
