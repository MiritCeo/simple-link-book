import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../prisma.js";
import type { AuthRequest } from "../middleware/auth.js";
import { sendEmail } from "../notifications.js";
import { sendFcmToTokens } from "../push/fcm.js";

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

  let activationEmail: { attempted: boolean; sent: boolean; sandbox?: boolean; reason?: string; messageId?: string } | undefined;
  let passwordEmail: { attempted: boolean; sent: boolean; sandbox?: boolean; reason?: string; messageId?: string } | undefined;
  if (parsed.data.active === true) {
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
    const emailResult = await sendEmail(updated.email, "Konto salonu aktywne — witamy w testach honly", html);
    activationEmail = {
      attempted: true,
      sent: !!emailResult?.ok,
      sandbox: emailResult?.ok ? !!emailResult.sandbox : undefined,
      messageId: emailResult?.ok ? emailResult.messageId : undefined,
      reason: emailResult && !emailResult.ok ? emailResult.reason : undefined,
    };
  }

  if (parsed.data.password) {
    const salon = user.salonId ? await prisma.salon.findUnique({ where: { id: user.salonId } }) : null;
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#212121">
        <h2 style="margin:0 0 12px">Hasło do konta zostało zmienione</h2>
        <p>Cześć!</p>
        <p>Super administrator ręcznie ustawił nowe hasło do Twojego konta${salon?.name ? ` (${salon.name})` : ""}.</p>
        <p>Nowe hasło: <strong>${parsed.data.password}</strong></p>
        <p style="margin:16px 0">
          <a href="https://honly.app/login" style="display:inline-block;background:#b8566f;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px">
            Przejdź do logowania
          </a>
        </p>
        <p>Po zalogowaniu zalecamy natychmiastową zmianę hasła w ustawieniach konta.</p>
        <p>Pozdrawiamy,<br/>Zespół honly</p>
      </div>
    `;
    const emailResult = await sendEmail(updated.email, "Nowe hasło do konta salonu w honly", html);
    passwordEmail = {
      attempted: true,
      sent: !!emailResult?.ok,
      sandbox: emailResult?.ok ? !!emailResult.sandbox : undefined,
      messageId: emailResult?.ok ? emailResult.messageId : undefined,
      reason: emailResult && !emailResult.ok ? emailResult.reason : undefined,
    };
  }

  return res.json({
    owner: {
      id: updated.id,
      email: updated.email,
      phone: updated.phone,
      active: updated.active,
      createdAt: updated.createdAt,
    },
    activationEmail,
    passwordEmail,
  });
});

router.delete("/owners/:id", async (req: AuthRequest, res) => {
  if (!requireSuperAdmin(req, res)) return;
  const owner = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!owner || owner.role !== "OWNER") return res.status(404).json({ error: "Nie znaleziono właściciela" });

  if (!owner.salonId) {
    await prisma.userSalon.deleteMany({ where: { userId: owner.id } });
    await prisma.user.delete({ where: { id: owner.id } });
    return res.json({ ok: true, deleted: { salonId: null, ownerId: owner.id } });
  }

  const salonId = owner.salonId;
  await prisma.$transaction(async (tx) => {
    const [appointments, staff, services, clients, inventoryItems] = await Promise.all([
      tx.appointment.findMany({ where: { salonId }, select: { id: true } }),
      tx.staff.findMany({ where: { salonId }, select: { id: true, userId: true } }),
      tx.service.findMany({ where: { salonId }, select: { id: true } }),
      tx.client.findMany({ where: { salonId }, select: { id: true } }),
      tx.inventoryItem.findMany({ where: { salonId }, select: { id: true } }),
    ]);

    const appointmentIds = appointments.map(a => a.id);
    const staffIds = staff.map(s => s.id);
    const serviceIds = services.map(s => s.id);
    const clientIds = clients.map(c => c.id);
    const inventoryItemIds = inventoryItems.map(i => i.id);

    const clientAccounts = clientIds.length
      ? await tx.clientAccount.findMany({ where: { clientId: { in: clientIds } }, select: { id: true } })
      : [];
    const clientAccountIds = clientAccounts.map(a => a.id);

    if (appointmentIds.length) {
      await tx.notificationLog.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
      await tx.appointmentToken.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
      await tx.appointmentService.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
      await tx.salonRating.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
    }
    if (serviceIds.length) {
      await tx.staffService.deleteMany({ where: { serviceId: { in: serviceIds } } });
      await tx.appointmentService.deleteMany({ where: { serviceId: { in: serviceIds } } });
    }
    if (staffIds.length) {
      await tx.staffAvailability.deleteMany({ where: { staffId: { in: staffIds } } });
      await tx.staffException.deleteMany({ where: { staffId: { in: staffIds } } });
      await tx.staffService.deleteMany({ where: { staffId: { in: staffIds } } });
    }
    if (inventoryItemIds.length) {
      await tx.inventoryMovement.deleteMany({ where: { itemId: { in: inventoryItemIds } } });
    }
    if (clientAccountIds.length) {
      await tx.clientPasswordReset.deleteMany({ where: { clientAccountId: { in: clientAccountIds } } });
      await tx.clientFavoriteGooglePlace.deleteMany({ where: { clientAccountId: { in: clientAccountIds } } });
      await tx.clientFavoriteSalon.deleteMany({ where: { clientAccountId: { in: clientAccountIds } } });
      await tx.salonRating.deleteMany({ where: { clientAccountId: { in: clientAccountIds } } });
    }

    await tx.notificationTemplate.deleteMany({ where: { salonId } });
    await tx.notificationSetting.deleteMany({ where: { salonId } });
    await tx.salonBreak.deleteMany({ where: { salonId } });
    await tx.salonException.deleteMany({ where: { salonId } });
    await tx.salonHour.deleteMany({ where: { salonId } });

    await tx.clientFavoriteSalon.deleteMany({ where: { salonId } });
    await tx.salonRating.deleteMany({ where: { salonId } });
    await tx.clientAccountSalon.deleteMany({ where: { salonId } });
    await tx.userSalon.deleteMany({ where: { salonId } });

    await tx.appointment.deleteMany({ where: { salonId } });
    await tx.staff.deleteMany({ where: { salonId } });
    await tx.service.deleteMany({ where: { salonId } });
    await tx.client.deleteMany({ where: { salonId } });

    await tx.inventoryMovement.deleteMany({ where: { createdBy: { salonId } } });
    await tx.inventoryItem.deleteMany({ where: { salonId } });
    await tx.inventoryCategory.deleteMany({ where: { salonId } });
    await tx.inventoryUnit.deleteMany({ where: { salonId } });
    await tx.inventorySetting.deleteMany({ where: { salonId } });

    if (clientAccountIds.length) {
      await tx.clientAccount.deleteMany({ where: { id: { in: clientAccountIds } } });
    }

    await tx.user.deleteMany({ where: { salonId } });
    await tx.salon.delete({ where: { id: salonId } });
  });

  return res.json({ ok: true, deleted: { salonId, ownerId: owner.id } });
});

// --- PUSH (FCM) test endpoint ---
router.post("/push/test", async (req: AuthRequest, res) => {
  if (!requireSuperAdmin(req, res)) return;

  const schema = z.object({
    clientId: z.string().optional(),
    email: z.string().email().optional(),
    title: z.string().min(1).optional(),
    body: z.string().min(1),
  }).refine(data => data.clientId || data.email, { message: "clientId lub email wymagane" });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });

  const account =
    parsed.data.clientId
      ? await prisma.clientAccount.findUnique({ where: { clientId: parsed.data.clientId }, select: { id: true, clientId: true, email: true } })
      : await prisma.clientAccount.findUnique({ where: { email: parsed.data.email! }, select: { id: true, clientId: true, email: true } });

  if (!account) return res.status(404).json({ error: "account_not_found" });

  const p = prisma as any;
  const tokenRows = await p.pushDeviceToken?.findMany?.({
    where: { clientAccountId: account.id },
    select: { token: true },
  });
  const tokens: string[] = (tokenRows || []).map((r: { token: string }) => r.token);

  if (!tokens.length) {
    return res.status(404).json({ error: "no_push_tokens" });
  }

  const result = await sendFcmToTokens(tokens, {
    title: parsed.data.title || "Powiadomienie testowe",
    body: parsed.data.body,
    data: {
      type: "TEST_PUSH",
      clientId: account.clientId || "",
    },
  });

  if (result.invalidTokens?.length) {
    // Opcjonalnie: czyścimy tokeny które już nie są ważne
    await p.pushDeviceToken?.deleteMany?.({ where: { token: { in: result.invalidTokens } } });
  }

  return res.json({ ...result, tokenCount: tokens.length });
});

export default router;

