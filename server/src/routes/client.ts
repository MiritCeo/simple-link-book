import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import prisma from "../prisma.js";
import clientAuth, { ClientAuthRequest } from "../middleware/clientAuth.js";
import { sendEmail, sendSms } from "../notifications.js";
import { ensureCancelToken } from "../notificationService.js";
import { appointmentEndDate, canRateAppointment } from "../lib/appointmentTime.js";
import { phonesMatchDigits, toPhoneDigits } from "../lib/phoneDigits.js";

const router = Router();
const publicAppUrl = (process.env.PUBLIC_APP_URL?.trim() || "https://honly.app").replace(/\/$/, "");
const UNASSIGNED_SALON_SLUG = "__honly_unassigned__";
const publicApiUrl = (process.env.PUBLIC_API_URL?.trim() || "").replace(/\/$/, "");
const SOCIAL_CODE_TTL_MS = 15 * 60 * 1000;
const SOCIAL_MAX_ATTEMPTS = 8;
const SOCIAL_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const toAbsoluteUrl = (raw: string | null | undefined) => {
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (publicApiUrl) return `${publicApiUrl}${raw.startsWith("/") ? "" : "/"}${raw}`;
  return raw;
};

const socialProviderSchema = z.enum(["GOOGLE", "APPLE"]);

function generateVerificationCode() {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += SOCIAL_CODE_CHARS[crypto.randomInt(SOCIAL_CODE_CHARS.length)]!;
  }
  return code;
}

function smsRecipientFromDigits(digits: string) {
  const d = digits.startsWith("48") ? digits : `48${digits}`;
  return `+${d}`;
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const profileSchema = z.object({
  name: z.string().min(2),
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

export const buildClientSalons = async (account: { id: string; clientId: string }) => {
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
    logoUrl?: string | null;
    address?: string;
    phone?: string;
    hours?: string;
    description?: string;
    latitude?: number | null;
    longitude?: number | null;
  }> = [];
  if (primaryClient?.salon && primaryClient.salon.slug !== UNASSIGNED_SALON_SLUG) {
    salons.push({
      id: primaryClient.salon.id,
      name: primaryClient.salon.name,
      slug: primaryClient.salon.slug,
      clientId: primaryClient.id,
      logoUrl: toAbsoluteUrl(primaryClient.salon.logoUrl),
      address: primaryClient.salon.address,
      phone: primaryClient.salon.phone,
      hours: primaryClient.salon.hours,
      description: primaryClient.salon.description,
      latitude: primaryClient.salon.latitude,
      longitude: primaryClient.salon.longitude,
    });
  }

  links.forEach(link => {
    if (!link.salon) return;
    if (link.salon.slug === UNASSIGNED_SALON_SLUG) return;
    if (salons.some(s => s.id === link.salonId)) return;
    salons.push({
      id: link.salon.id,
      name: link.salon.name,
      slug: link.salon.slug,
      clientId: link.clientId,
      logoUrl: toAbsoluteUrl(link.salon.logoUrl),
      address: link.salon.address,
      phone: link.salon.phone,
      hours: link.salon.hours,
      description: link.salon.description,
      latitude: link.salon.latitude,
      longitude: link.salon.longitude,
    });
  });

  return salons;
};

export const ensureAccountSalonLink = async (accountId: string, clientId: string) => {
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

const getAccountContext = async (req: ClientAuthRequest) => {
  const account = await getAccountForClient(req.client!.clientId);
  if (!account) return null;
  await ensureAccountSalonLink(account.id, account.clientId);
  const links = await prisma.clientAccountSalon.findMany({
    where: { clientAccountId: account.id },
    select: { clientId: true },
  });
  const clientIds = Array.from(new Set([account.clientId, ...links.map((l) => l.clientId)]));
  return { account, clientIds };
};

const issueClientSessionResponse = async (account: { id: string; clientId: string }, salonIdOverride?: string) => {
  await ensureAccountSalonLink(account.id, account.clientId);
  const primaryClient = await prisma.client.findUnique({ where: { id: account.clientId } });
  if (!primaryClient) {
    return { error: "client_profile_missing" as const };
  }

  const token = jwt.sign(
    { clientId: account.clientId, salonId: salonIdOverride || primaryClient.salonId, role: "CLIENT" },
    process.env.JWT_SECRET || "dev",
    { expiresIn: "14d" },
  );

  const salons = await buildClientSalons(account);
  return {
    token,
    clientId: account.clientId,
    salonId: salonIdOverride || primaryClient.salonId,
    salons,
  };
};

const findClientsByPhoneDigits = async (phoneDigits: string) => {
  const all = await prisma.client.findMany({
    where: { active: true },
    select: { id: true, phone: true, email: true, salonId: true, createdAt: true },
  });
  return all
    .filter((c) => phonesMatchDigits(c.phone, phoneDigits))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
};

const isPhoneTakenByAccount = async (phoneDigits: string) => {
  const matchedClients = await findClientsByPhoneDigits(phoneDigits);
  if (!matchedClients.length) return false;
  for (const c of matchedClients) {
    const direct = await prisma.clientAccount.findUnique({ where: { clientId: c.id }, select: { id: true } });
    if (direct) return true;
    const linked = await prisma.clientAccountSalon.findFirst({
      where: { clientId: c.id },
      select: { id: true },
    });
    if (linked) return true;
  }
  return false;
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

    const session = await issueClientSessionResponse({ id: account.id, clientId: account.clientId });
    if ("error" in session) {
      return res.status(403).json({ error: "client_profile_missing" });
    }
    return res.json(session);
  } catch (err) {
    return res.status(500).json({ error: "internal_error" });
  }
});

router.post("/social/login", async (req, res) => {
  const schema = z.object({
    userId: z.string().min(3),
    provider: socialProviderSchema,
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });

  const account = await prisma.clientAccount.findFirst({
    where: {
      socialProvider: parsed.data.provider,
      socialUserId: parsed.data.userId,
    },
    include: { client: true },
  });

  if (!account) return res.status(404).json({ error: "no_social_account_found" });
  if (!account.client) return res.status(403).json({ error: "client_profile_missing" });
  if (!account.active || !account.client.active) return res.status(403).json({ error: "account_inactive" });

  const session = await issueClientSessionResponse({ id: account.id, clientId: account.clientId });
  if ("error" in session) return res.status(403).json({ error: "client_profile_missing" });
  return res.json(session);
});

router.post("/social/phone-verification/request", async (req, res) => {
  const schema = z.object({ phone: z.string().min(6) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });

  const phoneDigits = toPhoneDigits(parsed.data.phone);
  if (phoneDigits.length < 9) return res.status(400).json({ error: "invalid_phone" });

  const taken = await isPhoneTakenByAccount(phoneDigits);
  if (taken) return res.status(409).json({ error: "phone_taken" });

  const code = generateVerificationCode();
  const codeHash = await bcrypt.hash(code.toUpperCase(), 10);
  const codeExpiresAt = new Date(Date.now() + SOCIAL_CODE_TTL_MS);

  await prisma.clientSocialVerificationCode.upsert({
    where: { phoneDigits },
    update: { codeHash, codeExpiresAt, attempts: 0 },
    create: { phoneDigits, codeHash, codeExpiresAt, attempts: 0 },
  });

  await sendSms(smsRecipientFromDigits(phoneDigits), `Twój kod weryfikacyjny honly: ${code}`);

  const matchedClients = await findClientsByPhoneDigits(phoneDigits);
  const emails = Array.from(new Set(matchedClients.map((c) => (c.email || "").trim().toLowerCase()).filter(Boolean)));
  await Promise.all(
    emails.map((email) =>
      sendEmail(
        email,
        "Kod weryfikacyjny honly",
        `<p>Twój kod potwierdzający numer telefonu: <strong>${code}</strong></p><p>Ten sam kod został wysłany SMS-em.</p>`,
      ),
    ),
  );

  return res.json({ ok: true });
});

router.post("/social/register", async (req, res) => {
  const schema = z.object({
    userId: z.string().min(3),
    provider: socialProviderSchema,
    name: z.string().min(1),
    lastname: z.string().min(1),
    email: z.string().email().transform((s) => s.trim().toLowerCase()),
    phone: z.string().min(6),
    phone_verification_code: z.string().min(4).max(8),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });

  const phoneDigits = toPhoneDigits(parsed.data.phone);
  if (phoneDigits.length < 9) return res.status(400).json({ error: "invalid_phone" });

  const existingEmail = await prisma.clientAccount.findUnique({ where: { email: parsed.data.email } });
  if (existingEmail) return res.status(409).json({ error: "email_taken" });

  const existingSocial = await prisma.clientAccount.findFirst({
    where: { socialProvider: parsed.data.provider, socialUserId: parsed.data.userId },
    select: { id: true },
  });
  if (existingSocial) return res.status(409).json({ error: "social_account_taken" });

  const codeRow = await prisma.clientSocialVerificationCode.findUnique({ where: { phoneDigits } });
  if (!codeRow) return res.status(400).json({ error: "verification_code_not_found" });
  if (codeRow.codeExpiresAt.getTime() < Date.now()) return res.status(400).json({ error: "verification_code_expired" });
  if (codeRow.attempts >= SOCIAL_MAX_ATTEMPTS) return res.status(429).json({ error: "too_many_attempts" });

  const codeOk = await bcrypt.compare(parsed.data.phone_verification_code.trim().toUpperCase(), codeRow.codeHash);
  if (!codeOk) {
    await prisma.clientSocialVerificationCode.update({
      where: { id: codeRow.id },
      data: { attempts: { increment: 1 } },
    });
    return res.status(400).json({ error: "invalid_verification_code" });
  }

  const fullName = `${parsed.data.name} ${parsed.data.lastname}`.trim().slice(0, 120);
  const unassignedSalon = await prisma.salon.findUnique({ where: { slug: UNASSIGNED_SALON_SLUG } })
    ?? await prisma.salon.create({
      data: {
        slug: UNASSIGNED_SALON_SLUG,
        name: "Konto klienta (bez salonu)",
        address: "",
        phone: "",
        hours: "",
        description: "Techniczny salon systemowy dla kont bez przypisań.",
      },
    });

  const created = await prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: {
        salonId: unassignedSalon.id,
        name: fullName || "Klient",
        phone: smsRecipientFromDigits(phoneDigits),
        email: parsed.data.email,
      },
    });

    const randomPassword = crypto.randomBytes(24).toString("hex");
    const passwordHash = await bcrypt.hash(randomPassword, 10);

    const account = await tx.clientAccount.create({
      data: {
        clientId: client.id,
        email: parsed.data.email,
        passwordHash,
        socialProvider: parsed.data.provider,
        socialUserId: parsed.data.userId,
        active: true,
      },
    });

    await tx.clientSocialVerificationCode.delete({ where: { id: codeRow.id } });
    return { accountId: account.id, clientId: client.id, salonId: client.salonId };
  });

  const session = await issueClientSessionResponse({ id: created.accountId, clientId: created.clientId }, created.salonId);
  if ("error" in session) return res.status(403).json({ error: "client_profile_missing" });
  return res.json(session);
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

  const resetLink = `${publicAppUrl}/konto/reset-hasla?token=${token}`;
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

// FCM: rejestracja tokenu urządzenia (jedno konto -> wiele urządzeń)
router.post("/push-token", async (req: ClientAuthRequest, res) => {
  const schema = z.object({
    token: z.string().min(10),
    // opcjonalne, jeśli mobile będzie chciało wysłać dodatkowe meta
    platform: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });

  const account = await prisma.clientAccount.findUnique({
    where: { clientId: req.client!.clientId },
    select: { id: true },
  });
  if (!account) return res.status(404).json({ error: "account_not_found" });

  const p = prisma as any;
  await p.pushDeviceToken.upsert({
    where: { token: parsed.data.token },
    update: { clientAccountId: account.id },
    create: { token: parsed.data.token, clientAccountId: account.id },
  });

  return res.json({ ok: true });
});

router.get("/salons", async (req: ClientAuthRequest, res) => {
  const account = await getAccountForClient(req.client!.clientId);
  if (!account) return res.status(404).json({ error: "account_not_found" });
  await ensureAccountSalonLink(account.id, account.clientId);
  const salons = await buildClientSalons(account);
  const activeSalon = await prisma.salon.findUnique({
    where: { id: req.client!.salonId },
    select: { slug: true },
  });
  return res.json({
    salons,
    activeSalonId: activeSalon?.slug === UNASSIGNED_SALON_SLUG ? null : req.client!.salonId,
  });
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
  const account = await getAccountForClient(req.client!.clientId);
  let salonPanelAvailable = false;
  if (account) {
    const salonUser = await prisma.user.findUnique({
      where: { email: account.email },
      select: { id: true, active: true },
    });
    salonPanelAvailable = !!(salonUser && salonUser.active);
  }
  return res.json({ client, salonPanelAvailable });
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
      const salonLogoUrl = toAbsoluteUrl(apt.salon?.logoUrl || null);
      return {
        ...apt,
        salon: apt.salon ? { ...apt.salon, logoUrl: salonLogoUrl } : apt.salon,
        salonLogoUrl,
        cancelToken: token?.token || null,
      };
    }),
  );
  return res.json({ appointments: enriched });
});

router.put("/me", async (req: ClientAuthRequest, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload" });
  }

  const { name, email } = parsed.data;
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
    data: { name, email: email ?? null },
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

// --- Oceny salonów (1–5, 24h po wizycie, jedna ocena na wizytę) ---

router.get("/ratings/pending", async (req: ClientAuthRequest, res) => {
  const ctx = await getAccountContext(req);
  if (!ctx) return res.status(404).json({ error: "account_not_found" });
  const now = new Date();
  const appts = await prisma.appointment.findMany({
    where: {
      clientId: { in: ctx.clientIds },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      salonRating: { is: null },
    },
    include: { salon: true },
    orderBy: [{ date: "desc" }, { time: "desc" }],
  });
  const pending = appts
    .filter((a) => canRateAppointment(a, now).ok)
    .map((a) => ({
      appointmentId: a.id,
      salonId: a.salonId,
      salonName: a.salon.name,
      date: a.date,
      time: a.time,
      duration: a.duration,
      visitEndsAt: appointmentEndDate(a).toISOString(),
    }));
  return res.json({ pending });
});

router.post("/ratings", async (req: ClientAuthRequest, res) => {
  const schema = z.object({
    appointmentId: z.string(),
    stars: z.number().int().min(1).max(5),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });

  const ctx = await getAccountContext(req);
  if (!ctx) return res.status(404).json({ error: "account_not_found" });

  const apt = await prisma.appointment.findUnique({
    where: { id: parsed.data.appointmentId },
    include: { salonRating: true },
  });
  if (!apt || !ctx.clientIds.includes(apt.clientId)) {
    return res.status(404).json({ error: "appointment_not_found" });
  }
  if (apt.salonRating) return res.status(409).json({ error: "already_rated" });
  const gate = canRateAppointment(apt, new Date());
  if (!gate.ok) return res.status(403).json({ error: gate.reason || "cannot_rate" });

  await prisma.salonRating.create({
    data: {
      appointmentId: apt.id,
      clientAccountId: ctx.account.id,
      salonId: apt.salonId,
      stars: parsed.data.stars,
    },
  });
  return res.json({ ok: true });
});

// --- Ulubione salony (Honly + Google) ---

router.get("/favorites", async (req: ClientAuthRequest, res) => {
  const ctx = await getAccountContext(req);
  if (!ctx) return res.status(404).json({ error: "account_not_found" });

  const [honly, google] = await Promise.all([
    prisma.clientFavoriteSalon.findMany({
      where: { clientAccountId: ctx.account.id },
      include: { salon: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.clientFavoriteGooglePlace.findMany({
      where: { clientAccountId: ctx.account.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return res.json({
    honlySalons: honly.map((f) => ({
      favoriteId: f.id,
      salonId: f.salon.id,
      slug: f.salon.slug,
      name: f.salon.name,
      address: f.salon.address,
      phone: f.salon.phone,
      latitude: f.salon.latitude,
      longitude: f.salon.longitude,
    })),
    googlePlaces: google.map((f) => ({
      favoriteId: f.id,
      googlePlaceId: f.googlePlaceId,
      name: f.displayName,
      address: f.displayAddress,
      lat: f.lat,
      lng: f.lng,
    })),
  });
});

router.post("/favorites/salons", async (req: ClientAuthRequest, res) => {
  const schema = z.object({ salonId: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });

  const ctx = await getAccountContext(req);
  if (!ctx) return res.status(404).json({ error: "account_not_found" });

  const salon = await prisma.salon.findUnique({ where: { id: parsed.data.salonId } });
  if (!salon) return res.status(404).json({ error: "salon_not_found" });

  try {
    await prisma.clientFavoriteSalon.create({
      data: {
        clientAccountId: ctx.account.id,
        salonId: salon.id,
      },
    });
  } catch (e: any) {
    if (e?.code === "P2002") return res.status(409).json({ error: "already_favorite" });
    throw e;
  }
  return res.json({ ok: true });
});

router.delete("/favorites/salons/:salonId", async (req: ClientAuthRequest, res) => {
  const ctx = await getAccountContext(req);
  if (!ctx) return res.status(404).json({ error: "account_not_found" });
  const r = await prisma.clientFavoriteSalon.deleteMany({
    where: { clientAccountId: ctx.account.id, salonId: req.params.salonId },
  });
  if (r.count === 0) return res.status(404).json({ error: "not_found" });
  return res.json({ ok: true });
});

router.post("/favorites/google-places", async (req: ClientAuthRequest, res) => {
  const schema = z.object({
    googlePlaceId: z.string().min(4),
    displayName: z.string().min(1),
    displayAddress: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });

  const ctx = await getAccountContext(req);
  if (!ctx) return res.status(404).json({ error: "account_not_found" });

  try {
    await prisma.clientFavoriteGooglePlace.create({
      data: {
        clientAccountId: ctx.account.id,
        googlePlaceId: parsed.data.googlePlaceId,
        displayName: parsed.data.displayName,
        displayAddress: parsed.data.displayAddress,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
      },
    });
  } catch (e: any) {
    if (e?.code === "P2002") return res.status(409).json({ error: "already_favorite" });
    throw e;
  }
  return res.json({ ok: true });
});

router.delete("/favorites/google-places/:id", async (req: ClientAuthRequest, res) => {
  const ctx = await getAccountContext(req);
  if (!ctx) return res.status(404).json({ error: "account_not_found" });
  const r = await prisma.clientFavoriteGooglePlace.deleteMany({
    where: { id: req.params.id, clientAccountId: ctx.account.id },
  });
  if (r.count === 0) return res.status(404).json({ error: "not_found" });
  return res.json({ ok: true });
});

export default router;

