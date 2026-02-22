import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../prisma";
import type { AuthRequest } from "../middleware/auth";

const router = Router();

const requireSuperAdmin = (req: AuthRequest, res: any) => {
  if (req.user?.role !== "SUPER_ADMIN") {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
};

router.get("/owners", async (req: AuthRequest, res) => {
  if (!requireSuperAdmin(req, res)) return;
  const owners = await prisma.user.findMany({
    where: { role: "OWNER" },
    include: { salon: true },
    orderBy: { createdAt: "desc" },
  });
  return res.json({
    owners: owners.map(o => ({
      id: o.id,
      email: o.email,
      phone: o.phone,
      active: o.active,
      createdAt: o.createdAt,
      salon: o.salon ? { id: o.salon.id, name: o.salon.name, slug: o.salon.slug } : null,
    })),
  });
});

router.post("/owners", async (req: AuthRequest, res) => {
  if (!requireSuperAdmin(req, res)) return;
  const schema = z.object({
    email: z.string().email(),
    phone: z.string().min(6),
    password: z.string().min(8),
    salonName: z.string().min(2),
    salonSlug: z.string().min(2),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  const { email, phone, password, salonName } = parsed.data;
  const salonSlug = parsed.data.salonSlug.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already exists" });

  const existingSalon = await prisma.salon.findUnique({ where: { slug: salonSlug } });
  if (existingSalon) return res.status(409).json({ error: "Salon slug already exists" });

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
      active: true,
    },
  });
  await prisma.userSalon.create({
    data: { userId: user.id, salonId: salon.id, role: "OWNER" },
  });

  return res.json({
    owner: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      active: user.active,
      createdAt: user.createdAt,
      salon: { id: salon.id, name: salon.name, slug: salon.slug },
    },
  });
});

router.patch("/owners/:id", async (req: AuthRequest, res) => {
  if (!requireSuperAdmin(req, res)) return;
  const schema = z.object({
    active: z.boolean().optional(),
    password: z.string().min(8).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user || user.role !== "OWNER") return res.status(404).json({ error: "Owner not found" });

  const data: any = {};
  if (parsed.data.active !== undefined) data.active = parsed.data.active;
  if (parsed.data.password) {
    data.passwordHash = await bcrypt.hash(parsed.data.password, 10);
  }
  const updated = await prisma.user.update({ where: { id: user.id }, data });
  return res.json({
    owner: {
      id: updated.id,
      email: updated.email,
      phone: updated.phone,
      active: updated.active,
      createdAt: updated.createdAt,
    },
  });
});

export default router;
