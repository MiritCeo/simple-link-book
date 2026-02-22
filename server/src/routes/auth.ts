import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import prisma from "../prisma";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(6),
  password: z.string().min(8),
  salonName: z.string().min(2),
  salonSlug: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const { email, phone, password, salonName, salonSlug } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Email already exists" });
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
    },
  });
  await prisma.userSalon.create({
    data: {
      userId: user.id,
      salonId: salon.id,
      role: "OWNER",
    },
  });

  const token = jwt.sign({ userId: user.id, salonId: salon.id, role: user.role }, process.env.JWT_SECRET || "dev", {
    expiresIn: "7d",
  });

  return res.json({
    token,
    salonId: salon.id,
    userId: user.id,
    role: user.role,
    salons: [{ id: salon.id, name: salon.name, slug: salon.slug, role: user.role }],
  });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  if (!user.active) {
    return res.status(403).json({ error: "Account inactive" });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (user.role === "SUPER_ADMIN") {
    const token = jwt.sign({ userId: user.id, role: user.role, salonId: null }, process.env.JWT_SECRET || "dev", {
      expiresIn: "7d",
    });
    return res.json({ token, salonId: null, userId: user.id, role: user.role, salons: [] });
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

  return res.json({ token, salonId: user.salonId, userId: user.id, role: user.role, salons });
});

router.post("/switch-salon", async (req, res) => {
  const schema = z.object({ salonId: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const payload = jwt.verify(token, process.env.JWT_SECRET || "dev") as { userId: string };
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  if (user.role === "SUPER_ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }

  let role: "OWNER" | "STAFF" | null = null;
  if (user.salonId === parsed.data.salonId) {
    role = user.role;
  } else {
    const link = await prisma.userSalon.findUnique({
      where: { userId_salonId: { userId: user.id, salonId: parsed.data.salonId } },
    });
    role = link?.role || null;
  }
  if (!role) return res.status(403).json({ error: "Forbidden" });

  const newToken = jwt.sign(
    { userId: user.id, salonId: parsed.data.salonId, role },
    process.env.JWT_SECRET || "dev",
    { expiresIn: "7d" },
  );
  return res.json({ token: newToken, salonId: parsed.data.salonId, role });
});

export default router;
