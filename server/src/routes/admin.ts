import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../prisma.js";
import type { AuthRequest } from "../middleware/auth.js";
import { sendEmail } from "../notifications.js";

const router = Router();

const requireSuperAdmin = (req: AuthRequest, res: any) => {
  if (req.user?.role !== "SUPER_ADMIN") {
    res.status(403).json({ error: "Brak dostępu" });
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
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane właściciela" });

  const { email, phone, password, salonName } = parsed.data;
  const salonSlug = parsed.data.salonSlug.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Podany email jest już zajęty" });

  const existingSalon = await prisma.salon.findUnique({ where: { slug: salonSlug } });
  if (existingSalon) return res.status(409).json({ error: "Taki slug salonu już istnieje" });

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
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane aktualizacji" });

  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user || user.role !== "OWNER") return res.status(404).json({ error: "Nie znaleziono właściciela" });

  const data: any = {};
  if (parsed.data.active !== undefined) data.active = parsed.data.active;
  if (parsed.data.password) {
    data.passwordHash = await bcrypt.hash(parsed.data.password, 10);
  }
  const updated = await prisma.user.update({ where: { id: user.id }, data });

  if (parsed.data.active === true && user.active === false) {
    const salon = user.salonId ? await prisma.salon.findUnique({ where: { id: user.salonId } }) : null;
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#212121">
        <h2 style="margin:0 0 12px">Konto salonu zostało aktywowane</h2>
        <p>Cześć!</p>
        <p>Dziękujemy za dołączenie do zamkniętych testów honly.</p>
        <p>Twoje konto${salon?.name ? ` dla salonu <strong>${salon.name}</strong>` : ""} zostało aktywowane i możesz już zalogować się do panelu.</p>
        <p style="margin:16px 0">
          <a href="https://honly.app/login" style="display:inline-block;background:#b8566f;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px">
            Przejdź do logowania
          </a>
        </p>
        <p>Pozdrawiamy,<br/>Zespół honly</p>
      </div>
    `;
    await sendEmail(updated.email, "Konto salonu aktywne — witamy w testach honly", html);
  }

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

