import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import prisma from "../prisma.js";
import auth, { type AuthRequest } from "../middleware/auth.js";

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

export default router;

