import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import prisma from "../prisma.js";
import auth, { type AuthRequest } from "../middleware/auth.js";
import { buildGoogleOAuthUrl, connectSalonGoogleCalendar, exchangeGoogleOAuthCode } from "../googleCalendar.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(6),
  password: z.string().min(8),
  salonName: z.string().min(2),
  salonSlug: z.string().min(2),
  privacyAccepted: z.boolean(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const signGoogleOAuthState = (payload: { userId: string; salonId: string }) =>
  jwt.sign(payload, process.env.JWT_SECRET || "dev", { expiresIn: "10m" });

const getInventoryRoleForUser = async (user: { id: string; role: "SUPER_ADMIN" | "OWNER" | "STAFF" }, salonId?: string | null) => {
  if (user.role === "OWNER" || user.role === "SUPER_ADMIN") return "ADMIN" as const;
  const staff = await prisma.staff.findFirst({
    where: salonId ? { userId: user.id, salonId } : { userId: user.id },
    select: { inventoryRole: true },
  });
  return (staff?.inventoryRole || "STAFF") as "ADMIN" | "MANAGER" | "STAFF";
};

const getUserSalons = async (user: { id: string; role: "SUPER_ADMIN" | "OWNER" | "STAFF"; salonId: string | null }) => {
  if (user.role === "SUPER_ADMIN") {
    const salons = await prisma.salon.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });
    return salons.map((s) => ({ ...s, role: "SUPER_ADMIN" as const }));
  }

  const extraSalons = await prisma.userSalon.findMany({
    where: { userId: user.id },
    include: { salon: true },
  });
  const primarySalon = user.salonId ? await prisma.salon.findUnique({ where: { id: user.salonId } }) : null;
  return [
    ...(primarySalon ? [{ id: primarySalon.id, name: primarySalon.name, slug: primarySalon.slug, role: user.role }] : []),
    ...extraSalons
      .filter(us => us.salonId !== user.salonId)
      .map(us => ({ id: us.salon.id, name: us.salon.name, slug: us.salon.slug, role: us.role })),
  ];
};

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload" });
  }

  if (parsed.data.privacyAccepted !== true) {
    return res.status(400).json({ error: "privacy_required" });
  }

  const { email, phone, password, salonName, salonSlug } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "email_taken" });
  }

  const salon = await prisma.salon.create({
    data: {
      name: salonName,
      slug: salonSlug,
      phone,
      address: "",
      hours: "",
      description: "",
    },
  });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      phone,
      passwordHash,
      role: "OWNER",
      salonId: salon.id,
      active: false,
      privacyPolicyAcceptedAt: new Date(),
    },
  });
  await prisma.userSalon.create({
    data: {
      userId: user.id,
      salonId: salon.id,
      role: "OWNER",
    },
  });

  return res.json({
    ok: true,
    pendingApproval: true,
    salonId: salon.id,
    userId: user.id,
    role: user.role,
    salons: [{ id: salon.id, name: salon.name, slug: salon.slug, role: user.role, active: false }],
  });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload" });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "invalid_credentials" });
  }
  if (!user.active) {
    return res.status(403).json({ error: "account_inactive" });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const inventoryRole = user.role === "OWNER"
    ? "ADMIN"
    : user.role === "STAFF"
      ? (await prisma.staff.findFirst({ where: { userId: user.id } }))?.inventoryRole || "STAFF"
      : "ADMIN";

  if (user.role === "SUPER_ADMIN") {
    const token = jwt.sign({ userId: user.id, role: user.role, salonId: null }, process.env.JWT_SECRET || "dev", {
      expiresIn: "7d",
    });
    return res.json({ token, salonId: null, userId: user.id, role: user.role, salons: [], inventoryRole });
  }

  const extraSalons = await prisma.userSalon.findMany({
    where: { userId: user.id },
    include: { salon: true },
  });
  const primarySalon = user.salonId ? await prisma.salon.findUnique({ where: { id: user.salonId } }) : null;
  const salons = [
    ...(primarySalon ? [{ id: primarySalon.id, name: primarySalon.name, slug: primarySalon.slug, role: user.role }] : []),
    ...extraSalons
      .filter(us => us.salonId !== user.salonId)
      .map(us => ({ id: us.salon.id, name: us.salon.name, slug: us.salon.slug, role: us.role })),
  ];

  const token = jwt.sign({ userId: user.id, salonId: user.salonId, role: user.role }, process.env.JWT_SECRET || "dev", {
    expiresIn: "7d",
  });

  return res.json({ token, salonId: user.salonId, userId: user.id, role: user.role, salons, inventoryRole });
});

router.get("/me", auth, async (req: AuthRequest, res) => {
  const authUser = req.user!;
  const user = await prisma.user.findUnique({
    where: { id: authUser.userId },
    select: { id: true, email: true, phone: true, role: true, active: true, salonId: true, createdAt: true },
  });
  if (!user) return res.status(401).json({ error: "unauthorized" });

  const activeSalonId = authUser.salonId ?? user.salonId ?? null;
  const activeSalon = activeSalonId
    ? await prisma.salon.findUnique({ where: { id: activeSalonId }, select: { id: true, name: true, slug: true } })
    : null;
  const inventoryRole = await getInventoryRoleForUser(user, activeSalonId);
  return res.json({
    user,
    activeSalonId,
    activeSalon,
    inventoryRole,
  });
});

router.put("/password", auth, async (req: AuthRequest, res) => {
  const schema = z.object({
    currentPassword: z.string().min(8),
    newPassword: z.string().min(8),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });

  const authUser = req.user!;
  const user = await prisma.user.findUnique({ where: { id: authUser.userId } });
  if (!user) return res.status(404).json({ error: "profile_not_found" });
  if (!user.active) return res.status(403).json({ error: "account_inactive" });

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) return res.status(400).json({ error: "invalid_current_password" });
  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return res.status(400).json({ error: "new_password_same_as_current" });
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });
  return res.json({ ok: true });
});

router.get("/salons", auth, async (req: AuthRequest, res) => {
  const authUser = req.user!;
  const user = await prisma.user.findUnique({
    where: { id: authUser.userId },
    select: { id: true, role: true, salonId: true },
  });
  if (!user) return res.status(401).json({ error: "unauthorized" });
  const salons = await getUserSalons(user);
  return res.json({
    activeSalonId: authUser.salonId ?? user.salonId ?? null,
    salons,
  });
});

router.post("/switch-salon", async (req, res) => {
  const schema = z.object({ salonId: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });

  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  if (!token) return res.status(401).json({ error: "unauthorized" });

  const payload = jwt.verify(token, process.env.JWT_SECRET || "dev") as { userId: string };
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) return res.status(401).json({ error: "unauthorized" });

  if (user.role === "SUPER_ADMIN") {
    return res.status(403).json({ error: "forbidden" });
  }

  let role: "OWNER" | "STAFF" | null = null;
  if (user.salonId === parsed.data.salonId) {
    role = user.role;
  } else {
    const link = await prisma.userSalon.findUnique({
      where: { userId_salonId: { userId: user.id, salonId: parsed.data.salonId } },
    });
    role = link?.role === "OWNER" || link?.role === "STAFF" ? link.role : null;
  }
  if (!role) return res.status(403).json({ error: "forbidden" });

  const newToken = jwt.sign(
    { userId: user.id, salonId: parsed.data.salonId, role },
    process.env.JWT_SECRET || "dev",
    { expiresIn: "7d" },
  );
  const inventoryRole = role === "OWNER"
    ? "ADMIN"
    : (await prisma.staff.findFirst({ where: { userId: user.id, salonId: parsed.data.salonId } }))?.inventoryRole || "STAFF";
  return res.json({ token: newToken, salonId: parsed.data.salonId, role, inventoryRole });
});

router.get("/google-calendar/oauth/start", auth, async (req: AuthRequest, res) => {
  if (!req.user?.salonId) return res.status(400).json({ error: "salon_not_selected" });
  if (req.user.role !== "OWNER") return res.status(403).json({ error: "forbidden" });
  try {
    const state = signGoogleOAuthState({ userId: req.user.userId, salonId: req.user.salonId });
    const authUrl = buildGoogleOAuthUrl(state);
    return res.json({ authUrl });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "google_oauth_not_configured" });
  }
});

router.get("/google-calendar/oauth/callback", async (req, res) => {
  const schema = z.object({
    code: z.string().min(10),
    state: z.string().min(10),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).send("Nieprawidłowy callback OAuth.");

  try {
    const statePayload = jwt.verify(parsed.data.state, process.env.JWT_SECRET || "dev") as { userId: string; salonId: string };
    const { tokens, email } = await exchangeGoogleOAuthCode(parsed.data.code);
    if (!tokens.access_token) return res.status(400).send("Brak access token od Google.");
    await connectSalonGoogleCalendar(statePayload.salonId, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      expiryDate: tokens.expiry_date || null,
      googleAccountEmail: email,
      googleCalendarId: "primary",
      googleCalendarName: "primary",
    });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(`<!doctype html>
<html><body style="font-family:Arial,sans-serif;padding:24px">
<h2>Google Calendar połączony</h2>
<p>Integracja została zapisana. Możesz zamknąć tę kartę i wrócić do panelu.</p>
</body></html>`);
  } catch (e: any) {
    return res.status(400).send(`Błąd integracji Google Calendar: ${String(e?.message || e)}`);
  }
});

export default router;

