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
    include: { categoryRef: true },
  });
  return res.json({ items });
});

router.get("/categories", async (req: AuthRequest, res) => {
  const categories = await prisma.inventoryCategory.findMany({
    where: { salonId: getSalonId(req) },
    orderBy: [{ name: "asc" }],
  });
  return res.json({ categories });
});

router.post("/categories", async (req: AuthRequest, res) => {
  const role = await getInventoryRole(req);
  if (!canManageItems(role)) return res.status(403).json({ error: "Brak dostępu do edycji magazynu" });
  const schema = z.object({
    name: z.string().min(2),
    parentId: z.string().optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane kategorii" });
  const parentId = parsed.data.parentId || null;
  if (parentId) {
    const parent = await prisma.inventoryCategory.findUnique({ where: { id: parentId } });
    if (!parent || parent.salonId !== getSalonId(req)) {
      return res.status(404).json({ error: "Nie znaleziono kategorii nadrzędnej" });
    }
  }
  const category = await prisma.inventoryCategory.create({
    data: {
      salonId: getSalonId(req),
      name: parsed.data.name,
      parentId,
    },
  });
  return res.json({ category });
});

router.put("/categories/:id", async (req: AuthRequest, res) => {
  const role = await getInventoryRole(req);
  if (!canManageItems(role)) return res.status(403).json({ error: "Brak dostępu do edycji magazynu" });
  const schema = z.object({
    name: z.string().min(2).optional(),
    parentId: z.string().optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane kategorii" });
  const existing = await prisma.inventoryCategory.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.salonId !== getSalonId(req)) {
    return res.status(404).json({ error: "Nie znaleziono kategorii" });
  }
  const parentId = parsed.data.parentId ?? existing.parentId;
  if (parentId) {
    const parent = await prisma.inventoryCategory.findUnique({ where: { id: parentId } });
    if (!parent || parent.salonId !== getSalonId(req)) {
      return res.status(404).json({ error: "Nie znaleziono kategorii nadrzędnej" });
    }
  }
  const category = await prisma.inventoryCategory.update({
    where: { id: req.params.id },
    data: { ...parsed.data, parentId },
  });
  return res.json({ category });
});

router.delete("/categories/:id", async (req: AuthRequest, res) => {
  const role = await getInventoryRole(req);
  if (!canManageItems(role)) return res.status(403).json({ error: "Brak dostępu do edycji magazynu" });
  const existing = await prisma.inventoryCategory.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.salonId !== getSalonId(req)) {
    return res.status(404).json({ error: "Nie znaleziono kategorii" });
  }
  const children = await prisma.inventoryCategory.count({ where: { parentId: existing.id } });
  if (children > 0) {
    return res.status(400).json({ error: "Kategoria ma podkategorie. Usuń je najpierw." });
  }
  const assigned = await prisma.inventoryItem.count({ where: { categoryId: existing.id } });
  if (assigned > 0) {
    return res.status(400).json({ error: "Kategoria jest używana w produktach." });
  }
  await prisma.inventoryCategory.delete({ where: { id: existing.id } });
  return res.json({ ok: true });
});

router.post("/items", async (req: AuthRequest, res) => {
  const role = await getInventoryRole(req);
  if (!canManageItems(role)) return res.status(403).json({ error: "Brak dostępu do edycji magazynu" });

  const schema = z.object({
    name: z.string().min(2),
    category: z.string().min(2).optional(),
    categoryId: z.string().optional().nullable(),
    unit: z.string().min(1),
    stock: z.number().int().optional().default(0),
    minStock: z.number().int().optional().default(0),
    purchasePrice: z.number().int().optional().default(0),
    salePrice: z.number().int().optional().default(0),
    active: z.boolean().optional().default(true),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane produktu" });

  let categoryName = parsed.data.category || "";
  let categoryId: string | null = parsed.data.categoryId || null;
  if (categoryId) {
    const category = await prisma.inventoryCategory.findUnique({ where: { id: categoryId } });
    if (!category || category.salonId !== getSalonId(req)) {
      return res.status(404).json({ error: "Nie znaleziono kategorii" });
    }
    categoryName = category.name;
  }
  if (!categoryName) return res.status(400).json({ error: "Wybierz kategorię" });

  const item = await prisma.inventoryItem.create({
    data: {
      salonId: getSalonId(req),
      name: parsed.data.name,
      category: categoryName,
      categoryId,
      unit: parsed.data.unit,
      stock: parsed.data.stock,
      minStock: parsed.data.minStock,
      purchasePrice: parsed.data.purchasePrice,
      salePrice: parsed.data.salePrice,
      active: parsed.data.active,
    },
  });
  return res.json({ item });
});

router.put("/items/:id", async (req: AuthRequest, res) => {
  const role = await getInventoryRole(req);
  if (!canManageItems(role)) return res.status(403).json({ error: "Brak dostępu do edycji magazynu" });

  const schema = z.object({
    name: z.string().min(2).optional(),
    category: z.string().min(2).optional(),
    categoryId: z.string().optional().nullable(),
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
  let categoryName = parsed.data.category ?? existing.category;
  let categoryId: string | null = parsed.data.categoryId ?? existing.categoryId ?? null;
  if (parsed.data.categoryId !== undefined) {
    if (parsed.data.categoryId) {
      const category = await prisma.inventoryCategory.findUnique({ where: { id: parsed.data.categoryId } });
      if (!category || category.salonId !== getSalonId(req)) {
        return res.status(404).json({ error: "Nie znaleziono kategorii" });
      }
      categoryName = category.name;
      categoryId = category.id;
    } else {
      categoryId = null;
    }
  }
  const item = await prisma.inventoryItem.update({
    where: { id: req.params.id },
    data: {
      ...parsed.data,
      category: categoryName,
      categoryId,
    },
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
    include: { item: true, createdBy: true, client: true },
  });
  return res.json({ movements });
});

router.post("/movements", async (req: AuthRequest, res) => {
  const role = await getInventoryRole(req);
  if (!canManageMovements(role)) return res.status(403).json({ error: "Brak dostępu do ruchów magazynowych" });

  const schema = z.object({
    itemId: z.string(),
    type: z.enum(["IN", "OUT", "ADJUST"]),
    usageType: z.enum(["SALON_USE", "CLIENT_SALE", "LOSS", "PURCHASE", "RETURN"]).optional(),
    clientId: z.string().optional().nullable(),
    quantity: z.number().int().min(1),
    note: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane ruchu" });

  const item = await prisma.inventoryItem.findUnique({ where: { id: parsed.data.itemId } });
  if (!item || item.salonId !== getSalonId(req)) {
    return res.status(404).json({ error: "Nie znaleziono produktu" });
  }

  if (parsed.data.type === "OUT") {
    const usage = parsed.data.usageType || "SALON_USE";
    if (usage === "CLIENT_SALE") {
      if (!parsed.data.clientId) {
        return res.status(400).json({ error: "Wybierz klienta dla sprzedaży" });
      }
      const client = await prisma.client.findUnique({ where: { id: parsed.data.clientId } });
      if (!client || client.salonId !== getSalonId(req)) {
        return res.status(404).json({ error: "Nie znaleziono klienta" });
      }
    }
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
      usageType: parsed.data.usageType,
      clientId: parsed.data.clientId || null,
      quantity: parsed.data.quantity,
      note: parsed.data.note,
      createdByUserId: req.user?.userId,
    },
    include: { item: true, createdBy: true, client: true },
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
