import { Router } from "express";
import { z } from "zod";
import prisma from "../prisma.js";
import type { AuthRequest } from "../middleware/auth.js";

const router = Router();

const getSalonId = (req: AuthRequest) => req.user!.salonId as string;

const getInventoryRole = async (req: AuthRequest) => {
  if (req.user?.role === "OWNER") return "ADMIN";
  if (req.user?.role !== "STAFF") return "ADMIN";
  const staff = await prisma.staff.findFirst({
    where: { salonId: getSalonId(req), userId: req.user.userId },
    select: { inventoryRole: true },
  });
  return staff?.inventoryRole || "STAFF";
};

const canManageItems = (role: string) => role === "ADMIN" || role === "MANAGER";
const canManageMovements = (role: string) => role === "ADMIN" || role === "MANAGER";

router.get("/items", async (req: AuthRequest, res) => {
  const items = await prisma.inventoryItem.findMany({
    where: { salonId: getSalonId(req) },
    orderBy: { name: "asc" },
  });
  return res.json({ items });
});

router.post("/items", async (req: AuthRequest, res) => {
  const role = await getInventoryRole(req);
  if (!canManageItems(role)) return res.status(403).json({ error: "Brak dostępu do edycji magazynu" });

  const schema = z.object({
    name: z.string().min(2),
    category: z.string().min(2),
    unit: z.string().min(1),
    stock: z.number().int().optional().default(0),
    minStock: z.number().int().optional().default(0),
    purchasePrice: z.number().int().optional().default(0),
    salePrice: z.number().int().optional().default(0),
    active: z.boolean().optional().default(true),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane produktu" });

  const item = await prisma.inventoryItem.create({
    data: { ...parsed.data, salonId: getSalonId(req) },
  });
  return res.json({ item });
});

router.put("/items/:id", async (req: AuthRequest, res) => {
  const role = await getInventoryRole(req);
  if (!canManageItems(role)) return res.status(403).json({ error: "Brak dostępu do edycji magazynu" });

  const schema = z.object({
    name: z.string().min(2).optional(),
    category: z.string().min(2).optional(),
    unit: z.string().min(1).optional(),
    stock: z.number().int().optional(),
    minStock: z.number().int().optional(),
    purchasePrice: z.number().int().optional(),
    salePrice: z.number().int().optional(),
    active: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane produktu" });

  const existing = await prisma.inventoryItem.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.salonId !== getSalonId(req)) {
    return res.status(404).json({ error: "Nie znaleziono produktu" });
  }
  const item = await prisma.inventoryItem.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  return res.json({ item });
});

router.delete("/items/:id", async (req: AuthRequest, res) => {
  const role = await getInventoryRole(req);
  if (role !== "ADMIN") return res.status(403).json({ error: "Brak dostępu do usuwania produktów" });
  const existing = await prisma.inventoryItem.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.salonId !== getSalonId(req)) {
    return res.status(404).json({ error: "Nie znaleziono produktu" });
  }
  const item = await prisma.inventoryItem.update({
    where: { id: req.params.id },
    data: { active: false },
  });
  return res.json({ item });
});

router.get("/movements", async (req: AuthRequest, res) => {
  const movements = await prisma.inventoryMovement.findMany({
    where: { item: { salonId: getSalonId(req) } },
    orderBy: { createdAt: "desc" },
    include: { item: true, createdBy: true },
  });
  return res.json({ movements });
});

router.post("/movements", async (req: AuthRequest, res) => {
  const role = await getInventoryRole(req);
  if (!canManageMovements(role)) return res.status(403).json({ error: "Brak dostępu do ruchów magazynowych" });

  const schema = z.object({
    itemId: z.string(),
    type: z.enum(["IN", "OUT", "ADJUST"]),
    quantity: z.number().int().min(1),
    note: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane ruchu" });

  const item = await prisma.inventoryItem.findUnique({ where: { id: parsed.data.itemId } });
  if (!item || item.salonId !== getSalonId(req)) {
    return res.status(404).json({ error: "Nie znaleziono produktu" });
  }

  let newStock = item.stock;
  if (parsed.data.type === "IN") newStock = item.stock + parsed.data.quantity;
  if (parsed.data.type === "OUT") newStock = item.stock - parsed.data.quantity;
  if (parsed.data.type === "ADJUST") newStock = parsed.data.quantity;
  if (newStock < 0) {
    return res.status(400).json({ error: "Stan magazynowy nie może być ujemny" });
  }

  const movement = await prisma.inventoryMovement.create({
    data: {
      itemId: item.id,
      type: parsed.data.type,
      quantity: parsed.data.quantity,
      note: parsed.data.note,
      createdByUserId: req.user?.userId,
    },
    include: { item: true, createdBy: true },
  });

  await prisma.inventoryItem.update({
    where: { id: item.id },
    data: { stock: newStock },
  });

  return res.json({ movement, stock: newStock });
});

router.get("/units", async (req: AuthRequest, res) => {
  const existing = await prisma.inventoryUnit.findMany({
    where: { salonId: getSalonId(req), active: true },
    orderBy: { name: "asc" },
  });
  if (existing.length > 0) {
    return res.json({ units: existing });
  }
  const defaults = ["szt", "ml", "g"];
  const created = await prisma.inventoryUnit.createMany({
    data: defaults.map((name) => ({ salonId: getSalonId(req), name, active: true })),
    skipDuplicates: true,
  });
  const units = await prisma.inventoryUnit.findMany({
    where: { salonId: getSalonId(req), active: true },
    orderBy: { name: "asc" },
  });
  return res.json({ units, created: created.count });
});

router.post("/units", async (req: AuthRequest, res) => {
  const role = await getInventoryRole(req);
  if (role !== "ADMIN") return res.status(403).json({ error: "Brak dostępu do ustawień magazynu" });
  const schema = z.object({ name: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowa jednostka" });
  try {
    const unit = await prisma.inventoryUnit.create({
      data: { salonId: getSalonId(req), name: parsed.data.name, active: true },
    });
    return res.json({ unit });
  } catch {
    return res.status(400).json({ error: "Taka jednostka już istnieje" });
  }
});

router.delete("/units/:id", async (req: AuthRequest, res) => {
  const role = await getInventoryRole(req);
  if (role !== "ADMIN") return res.status(403).json({ error: "Brak dostępu do ustawień magazynu" });
  const unit = await prisma.inventoryUnit.update({
    where: { id: req.params.id },
    data: { active: false },
  });
  return res.json({ unit });
});

router.get("/settings", async (req: AuthRequest, res) => {
  const setting = await prisma.inventorySetting.findUnique({
    where: { salonId: getSalonId(req) },
  });
  return res.json({ setting });
});

router.put("/settings", async (req: AuthRequest, res) => {
  const role = await getInventoryRole(req);
  if (role !== "ADMIN") return res.status(403).json({ error: "Brak dostępu do ustawień magazynu" });
  const schema = z.object({ defaultMinStock: z.number().int().min(0) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe ustawienia magazynu" });
  const setting = await prisma.inventorySetting.upsert({
    where: { salonId: getSalonId(req) },
    update: { defaultMinStock: parsed.data.defaultMinStock },
    create: { salonId: getSalonId(req), defaultMinStock: parsed.data.defaultMinStock },
  });
  return res.json({ setting });
});

export default router;
