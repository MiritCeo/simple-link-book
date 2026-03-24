import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import prisma from "../prisma.js";
import { phonesMatchDigits, toPhoneDigits } from "../lib/phoneDigits.js";
import { sendEmail, sendSms } from "../notifications.js";
import { buildClientSalons, ensureAccountSalonLink } from "./client.js";
import type { Prisma } from "@prisma/client";

const router = Router();

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 8;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const UNASSIGNED_SALON_SLUG = "__honly_unassigned__";

const emailSchema = z.string().email().transform(s => s.trim().toLowerCase());
const passwordSchema = z.string().min(8);
const phoneSchema = z.string().regex(/^\+48\s?\d{3}\s?\d{3}\s?\d{3}$/, "Podaj numer w formacie +48 123 456 789");

function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function generateVerificationCode() {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]!;
  }
  return code;
}

function smsRecipientFromDigits(digits: string) {
  const d = digits.startsWith("48") ? digits : `48${digits}`;
  return `+${d}`;
}

async function assertClientsNotLinkedToOtherAccount(
  tx: Prisma.TransactionClient,
  clients: { id: string }[],
  emailLower: string,
) {
  for (const c of clients) {
    const direct = await tx.clientAccount.findUnique({ where: { clientId: c.id } });
    if (direct && direct.email.toLowerCase() !== emailLower) {
      const err = new Error("phone_linked_other_account");
      (err as any).code = "phone_linked_other_account";
      throw err;
    }
    const link = await tx.clientAccountSalon.findFirst({
      where: { clientId: c.id },
      include: { clientAccount: true },
    });
    if (link?.clientAccount && link.clientAccount.email.toLowerCase() !== emailLower) {
      const err = new Error("phone_linked_other_account");
      (err as any).code = "phone_linked_other_account";
      throw err;
    }
  }
}

async function pickClientsMatchingPhone(
  tx: Prisma.TransactionClient,
  phoneDigits: string,
): Promise<Array<{ id: string; salonId: string; phone: string; email: string | null; name: string; createdAt: Date }>> {
  const all = await tx.client.findMany({
    where: { active: true },
    select: { id: true, salonId: true, phone: true, email: true, name: true, createdAt: true },
  });
  const matched = all.filter(c => phonesMatchDigits(c.phone, phoneDigits));
  const bySalon = new Map<string, (typeof matched)[0]>();
  for (const c of matched.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    if (!bySalon.has(c.salonId)) bySalon.set(c.salonId, c);
  }
  return [...bySalon.values()];
}

async function sendVerificationChannels(email: string, phoneDigits: string, plainCode: string) {
  const smsTo = smsRecipientFromDigits(phoneDigits);
  const msg = `Twój kod weryfikacyjny honly: ${plainCode}`;
  await sendSms(smsTo, msg);
  await sendEmail(email, "Kod weryfikacyjny honly", `<p>Twój kod potwierdzający numer telefonu: <strong>${plainCode}</strong></p><p>Ten sam kod został wysłany SMS-em.</p>`);

  const hasSms = !!(process.env.SMSAPI_API_KEY || process.env.SMSAPI_KEY);
  const hasMail = !!(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM);
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.info(`[dev] Kod rejestracji dla ${email} / ${smsTo}: ${plainCode} (SMS skonfigurowane: ${hasSms}, email: ${hasMail})`);
  }
}

async function ensureUnassignedSalon(tx: Prisma.TransactionClient) {
  const existing = await tx.salon.findUnique({ where: { slug: UNASSIGNED_SALON_SLUG } });
  if (existing) return existing;
  return tx.salon.create({
    data: {
      slug: UNASSIGNED_SALON_SLUG,
      name: "Konto klienta (bez salonu)",
      address: "",
      phone: "",
      hours: "",
      description: "Techniczny salon systemowy dla kont bez przypisań.",
    },
  });
}

/** Krok 1: email + hasło */
router.post("/client/register/session", async (req, res) => {
  const schema = z
    .object({
      email: emailSchema,
      password: passwordSchema,
      confirmPassword: passwordSchema,
    })
    .refine(d => d.password === d.confirmPassword, { message: "password_mismatch" });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    const err = parsed.error.flatten();
    if (err.fieldErrors.confirmPassword) {
      return res.status(400).json({ error: "password_mismatch" });
    }
    return res.status(400).json({ error: "invalid_payload" });
  }

  const { email, password } = parsed.data;

  const existingClientAcc = await prisma.clientAccount.findUnique({ where: { email } });
  if (existingClientAcc) {
    return res.status(409).json({ error: "email_taken" });
  }

  const salonUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, active: true },
  });
  const linkedSalonUser = !!(salonUser && salonUser.active);

  await prisma.clientRegistrationSession.deleteMany({ where: { email } });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const sessionToken = generateSessionToken();
  await prisma.clientRegistrationSession.create({
    data: {
      sessionToken,
      email,
      passwordHash,
    },
  });

  return res.json({ sessionToken, linkedSalonUser });
});

/** Krok 2: telefon + wysłanie SMS i e-maila z tym samym kodem */
router.post("/client/register/session/phone", async (req, res) => {
  const schema = z.object({
    sessionToken: z.string().min(16),
    phone: phoneSchema,
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });

  const session = await prisma.clientRegistrationSession.findUnique({
    where: { sessionToken: parsed.data.sessionToken },
  });
  if (!session) return res.status(404).json({ error: "session_not_found" });
  if (Date.now() - session.createdAt.getTime() > SESSION_TTL_MS) {
    await prisma.clientRegistrationSession.delete({ where: { id: session.id } });
    return res.status(410).json({ error: "session_expired" });
  }

  const phoneDigits = toPhoneDigits(parsed.data.phone);
  if (phoneDigits.length < 11) {
    return res.status(400).json({ error: "invalid_phone" });
  }

  const plainCode = generateVerificationCode();
  const codeHash = await bcrypt.hash(plainCode.toUpperCase(), 10);
  const codeExpiresAt = new Date(Date.now() + CODE_TTL_MS);

  await prisma.clientRegistrationSession.update({
    where: { id: session.id },
    data: {
      phoneDigits,
      codeHash,
      codeExpiresAt,
      codeAttempts: 0,
    },
  });

  await sendVerificationChannels(session.email, phoneDigits, plainCode);

  return res.json({ ok: true });
});

/** Ponowne wysłanie kodu (ten sam flow co phone — nadpisuje kod) */
router.post("/client/register/session/resend-code", async (req, res) => {
  const schema = z.object({ sessionToken: z.string().min(16) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });

  const session = await prisma.clientRegistrationSession.findUnique({
    where: { sessionToken: parsed.data.sessionToken },
  });
  if (!session) return res.status(404).json({ error: "session_not_found" });
  if (!session.phoneDigits) return res.status(400).json({ error: "phone_not_set" });
  if (Date.now() - session.createdAt.getTime() > SESSION_TTL_MS) {
    await prisma.clientRegistrationSession.delete({ where: { id: session.id } });
    return res.status(410).json({ error: "session_expired" });
  }

  const plainCode = generateVerificationCode();
  const codeHash = await bcrypt.hash(plainCode.toUpperCase(), 10);
  await prisma.clientRegistrationSession.update({
    where: { id: session.id },
    data: {
      codeHash,
      codeExpiresAt: new Date(Date.now() + CODE_TTL_MS),
      codeAttempts: 0,
    },
  });

  await sendVerificationChannels(session.email, session.phoneDigits, plainCode);
  return res.json({ ok: true });
});

/** Krok 3: kod → utworzenie konta, powiązanie wizyt po numerze */
router.post("/client/register/session/verify", async (req, res) => {
  const schema = z.object({
    sessionToken: z.string().min(16),
    code: z.string().min(4).max(8),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });

  const session = await prisma.clientRegistrationSession.findUnique({
    where: { sessionToken: parsed.data.sessionToken },
  });
  if (!session) return res.status(404).json({ error: "session_not_found" });
  if (!session.phoneDigits || !session.codeHash || !session.codeExpiresAt) {
    return res.status(400).json({ error: "phone_not_set" });
  }
  if (Date.now() - session.createdAt.getTime() > SESSION_TTL_MS) {
    await prisma.clientRegistrationSession.delete({ where: { id: session.id } });
    return res.status(410).json({ error: "session_expired" });
  }
  if (session.codeExpiresAt.getTime() < Date.now()) {
    return res.status(400).json({ error: "code_expired" });
  }
  if (session.codeAttempts >= MAX_CODE_ATTEMPTS) {
    return res.status(429).json({ error: "too_many_attempts" });
  }

  const codeOk = await bcrypt.compare(parsed.data.code.trim().toUpperCase(), session.codeHash);
  if (!codeOk) {
    await prisma.clientRegistrationSession.update({
      where: { id: session.id },
      data: { codeAttempts: { increment: 1 } },
    });
    return res.status(400).json({ error: "invalid_code" });
  }

  const emailLower = session.email.toLowerCase();
  const existingClientAcc = await prisma.clientAccount.findUnique({ where: { email: session.email } });
  if (existingClientAcc) {
    await prisma.clientRegistrationSession.delete({ where: { id: session.id } });
    return res.status(409).json({ error: "email_taken" });
  }

  const salonUser = await prisma.user.findUnique({
    where: { email: session.email },
    select: { id: true, active: true },
  });
  const linkedSalonUser = !!(salonUser && salonUser.active);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const matched = await pickClientsMatchingPhone(tx, session.phoneDigits!);
      await assertClientsNotLinkedToOtherAccount(tx, matched, emailLower);

      let primaryClientId: string;
      if (matched.length > 0) {
        const sorted = [...matched].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        primaryClientId = sorted[0]!.id;
      } else {
        const unassignedSalon = await ensureUnassignedSalon(tx);
        const local = session.email.split("@")[0] || "Klient";
        const created = await tx.client.create({
          data: {
            salonId: unassignedSalon.id,
            name: local.slice(0, 80),
            phone: smsRecipientFromDigits(session.phoneDigits!),
            email: session.email,
          },
        });
        primaryClientId = created.id;
      }

      const account = await tx.clientAccount.create({
        data: {
          clientId: primaryClientId,
          email: session.email,
          passwordHash: session.passwordHash,
          active: true,
        },
      });

      for (const c of matched) {
        await tx.clientAccountSalon.upsert({
          where: {
            clientAccountId_salonId: { clientAccountId: account.id, salonId: c.salonId },
          },
          create: {
            clientAccountId: account.id,
            salonId: c.salonId,
            clientId: c.id,
          },
          update: { clientId: c.id },
        });
        if (!c.email) {
          await tx.client.update({
            where: { id: c.id },
            data: { email: session.email },
          });
        }
      }

      await tx.clientRegistrationSession.delete({ where: { id: session.id } });

      return { accountId: account.id, primaryClientId };
    });

    await ensureAccountSalonLink(result.accountId, result.primaryClientId);

    const account = await prisma.clientAccount.findUniqueOrThrow({
      where: { id: result.accountId },
    });
    const primaryClient = await prisma.client.findUniqueOrThrow({
      where: { id: result.primaryClientId },
    });

    const token = jwt.sign(
      { clientId: primaryClient.id, salonId: primaryClient.salonId, role: "CLIENT" },
      process.env.JWT_SECRET || "dev",
      { expiresIn: "14d" },
    );

    const salons = await buildClientSalons(account);
    return res.json({
      ok: true,
      token,
      clientId: primaryClient.id,
      salonId: primaryClient.salonId,
      salons,
      linkedSalonUser,
    });
  } catch (e: any) {
    if (e?.code === "phone_linked_other_account") {
      return res.status(409).json({ error: "phone_linked_other_account" });
    }
    if (e?.code === "P2002") {
      return res.status(409).json({ error: "email_taken" });
    }
    // eslint-disable-next-line no-console
    console.error(e);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
