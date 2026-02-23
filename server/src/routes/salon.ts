import { Router } from "express";
import { z } from "zod";
import prisma from "../prisma";
import { sendEventNotification } from "../notificationService";
import { sendSms } from "../notifications";
import type { AuthRequest } from "../middleware/auth";

const router = Router();

router.use((req: AuthRequest, res, next) => {
  if (!req.user?.salonId) {
    return res.status(403).json({ error: "Nie wybrano salonu" });
  }
  return next();
});

const requireOwner = (req: AuthRequest, res: any) => {
  if (req.user?.role !== "OWNER") {
    res.status(403).json({ error: "Brak dostępu" });
    return false;
  }
  return true;
};

const defaultHours = [
  { weekday: 0, open: "09:00", close: "20:00", active: true },
  { weekday: 1, open: "09:00", close: "20:00", active: true },
  { weekday: 2, open: "09:00", close: "20:00", active: true },
  { weekday: 3, open: "09:00", close: "20:00", active: true },
  { weekday: 4, open: "09:00", close: "20:00", active: true },
  { weekday: 5, open: "09:00", close: "16:00", active: true },
  { weekday: 6, open: "", close: "", active: false },
];

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const hasOverlap = (startA: number, endA: number, startB: number, endB: number) => {
  return startA < endB && endA > startB;
};

const dayIndexMap: Record<string, number> = {
  Pn: 0, Wt: 1, "Śr": 2, Sr: 2, Cz: 3, Pt: 4, So: 5, Sob: 5, Sb: 5, Nd: 6,
};

const parseBreakDays = (days?: string) => {
  if (!days) return null as Set<number> | null;
  const set = new Set<number>();
  days
    .split(",")
    .map(part => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const sep = part.includes("–") ? "–" : part.includes("-") ? "-" : "";
      if (sep) {
        const [start, end] = part.split(sep).map(s => s.trim());
        const sIdx = dayIndexMap[start];
        const eIdx = dayIndexMap[end];
        if (sIdx === undefined || eIdx === undefined) return;
        if (sIdx <= eIdx) {
          for (let i = sIdx; i <= eIdx; i += 1) set.add(i);
        } else {
          for (let i = sIdx; i < 7; i += 1) set.add(i);
          for (let i = 0; i <= eIdx; i += 1) set.add(i);
        }
      } else {
        const idx = dayIndexMap[part];
        if (idx !== undefined) set.add(idx);
      }
    });
  return set.size ? set : null;
};

const getBufferMinutes = (breaks: Array<{ type: string; label: string; minutes?: number | null }>) => {
  let before = 0;
  let after = 0;
  breaks
    .filter(b => b.type === "BUFFER" && typeof b.minutes === "number")
    .forEach((b) => {
      const label = (b.label || "").toLowerCase();
      if (label.includes("przed")) before += b.minutes || 0;
      else if (label.includes("po")) after += b.minutes || 0;
      else {
        before += b.minutes || 0;
        after += b.minutes || 0;
      }
    });
  return { before, after };
};

const getBreakWindowsForDate = (dateStr: string, breaks: Array<{ type: string; days?: string | null; start?: string | null; end?: string | null }>) => {
  if (!dateStr) return [] as Array<{ start: number; end: number }>;
  const d = new Date(dateStr);
  const weekday = (d.getDay() + 6) % 7;
  return breaks
    .filter(b => b.type === "BREAK" && b.start && b.end)
    .filter((b) => {
      const days = parseBreakDays(b.days || undefined);
      return !days || days.has(weekday);
    })
    .map(b => ({ start: toMinutes(b.start as string), end: toMinutes(b.end as string) }));
};

const validateAppointmentAvailability = async ({
  salonId,
  date,
  time,
  duration,
  staffId,
  excludeAppointmentId,
}: {
  salonId: string;
  date: string;
  time: string;
  duration: number;
  staffId?: string | null;
  excludeAppointmentId?: string;
}) => {
  const [salonHours, salonExceptions, salonBreaks] = await Promise.all([
    prisma.salonHour.findMany({ where: { salonId } }),
    prisma.salonException.findMany({ where: { salonId } }),
    prisma.salonBreak.findMany({ where: { salonId } }),
  ]);

  const exception = salonExceptions.find(ex => ex.date === date);
  if (exception?.closed) {
    return { ok: false, error: "Salon jest zamknięty w tym dniu" };
  }

  const weekday = (new Date(date).getDay() + 6) % 7;
  const salonDay = salonHours.find(h => h.weekday === weekday);
  const salonWindow = exception?.start && exception?.end
    ? { start: exception.start, end: exception.end }
    : (salonDay && salonDay.active && salonDay.open && salonDay.close
      ? { start: salonDay.open, end: salonDay.close }
      : null);

  let staffWindow: { start: string; end: string } | null = null;
  if (staffId) {
    const [availability, staffExceptions] = await Promise.all([
      prisma.staffAvailability.findMany({ where: { staffId } }),
      prisma.staffException.findMany({ where: { staffId, active: true } }),
    ]);
    const staffException = staffExceptions.find(ex => ex.date === date);
    if (staffException) {
      if (!staffException.start || !staffException.end) {
        return { ok: false, error: "Pracownik jest niedostępny w tym terminie" };
      }
      staffWindow = { start: staffException.start, end: staffException.end };
    } else if (availability.length > 0) {
      const day = availability.find(a => a.weekday === weekday);
      if (!day || !day.active || !day.start || !day.end) {
        return { ok: false, error: "Pracownik jest niedostępny w tym terminie" };
      }
      staffWindow = { start: day.start, end: day.end };
    }
  }

  const window = staffWindow || salonWindow;
  if (!window) {
    return { ok: false, error: "Termin jest niedostępny" };
  }

  const buffers = getBufferMinutes(salonBreaks as any);
  const appointmentStart = toMinutes(time);
  const start = appointmentStart - buffers.before;
  const end = appointmentStart + duration + buffers.after;
  const windowStart = toMinutes(window.start);
  const windowEnd = toMinutes(window.end);
  if (start < windowStart || end > windowEnd) {
    return { ok: false, error: "Termin jest niedostępny" };
  }

  const breakWindows = getBreakWindowsForDate(date, salonBreaks as any);
  const breakOverlap = breakWindows.some(w => hasOverlap(start, end, w.start, w.end));
  if (breakOverlap) {
    return { ok: false, error: "Termin wypada w czasie przerwy" };
  }

  if (staffId) {
    const conflicts = await prisma.appointment.findMany({
      where: {
        salonId,
        staffId,
        date,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        ...(excludeAppointmentId ? { NOT: { id: excludeAppointmentId } } : {}),
      },
      select: { id: true, time: true, duration: true },
    });
    const hasConflict = conflicts.some(ap => {
      const s = toMinutes(ap.time) - buffers.before;
      const e = s + ap.duration + buffers.before + buffers.after;
      return hasOverlap(start, end, s, e);
    });
    if (hasConflict) {
      return { ok: false, error: "Pracownik jest niedostępny w tym terminie" };
    }
  }

  return { ok: true };
};

router.get("/profile", async (req: AuthRequest, res) => {
  const salonId = req.user?.salonId;
  const salon = await prisma.salon.findUnique({ where: { id: salonId } });
  return res.json({ salon });
});

router.put("/profile", async (req: AuthRequest, res) => {
  if (!requireOwner(req, res)) return;
  const schema = z.object({
    name: z.string().min(2),
    address: z.string().min(2).or(z.literal("")),
    phone: z.string().min(6),
    hours: z.string().optional().default(""),
    description: z.string().optional().default(""),
    accentColor: z.string().optional(),
    logoUrl: z.string().optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane profilu salonu" });
  const salon = await prisma.salon.update({
    where: { id: req.user!.salonId },
    data: parsed.data,
  });
  return res.json({ salon });
});

router.get("/user-salons", async (req: AuthRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Brak autoryzacji" });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const primarySalon = user?.salonId
    ? await prisma.salon.findUnique({ where: { id: user.salonId } })
    : null;
  const linked = await prisma.userSalon.findMany({
    where: { userId },
    include: { salon: true },
  });

  const salons = [
    ...(primarySalon ? [{ id: primarySalon.id, name: primarySalon.name, slug: primarySalon.slug, role: user?.role }] : []),
    ...linked
      .filter(link => link.salonId !== user?.salonId)
      .map(link => ({ id: link.salon.id, name: link.salon.name, slug: link.salon.slug, role: link.role })),
  ];

  return res.json({ salons });
});

router.post("/user-salons", async (req: AuthRequest, res) => {
  if (!requireOwner(req, res)) return;
  const schema = z.object({
    name: z.string().min(2),
    slug: z.string().min(2),
    phone: z.string().min(6),
    address: z.string().min(2),
    hours: z.string().optional().default(""),
    description: z.string().optional().default(""),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane salonu" });

  const userId = req.user!.userId;
  const salon = await prisma.salon.create({
    data: {
      ...parsed.data,
      slug: parsed.data.slug.trim().toLowerCase(),
    },
  });
  await prisma.userSalon.create({
    data: { userId, salonId: salon.id, role: "OWNER" },
  });
  return res.json({ salon });
});

router.get("/notifications/settings", async (req: AuthRequest, res) => {
  if (!requireOwner(req, res)) return;
  const salonId = req.user!.salonId;
  let settings = await prisma.notificationSetting.findMany({ where: { salonId } });
  if (settings.length === 0) {
    const defaults = [
      { event: "BOOKING_CONFIRMATION", smsEnabled: true, emailEnabled: true },
      { event: "REMINDER_24H", smsEnabled: true, emailEnabled: false, timingMinutes: 24 * 60 },
      { event: "REMINDER_2H", smsEnabled: true, emailEnabled: false, timingMinutes: 2 * 60 },
      { event: "CANCELLATION", smsEnabled: true, emailEnabled: true },
      { event: "FOLLOWUP", smsEnabled: false, emailEnabled: true, timingMinutes: 60 },
    ];
    await prisma.notificationSetting.createMany({
      data: defaults.map(s => ({ ...s, salonId })),
    });
    settings = await prisma.notificationSetting.findMany({ where: { salonId } });
  }
  return res.json({ settings });
});

router.put("/notifications/settings", async (req: AuthRequest, res) => {
  if (!requireOwner(req, res)) return;
  const schema = z.object({
    settings: z.array(z.object({
      event: z.enum(["BOOKING_CONFIRMATION", "REMINDER_24H", "REMINDER_2H", "CANCELLATION", "FOLLOWUP"]),
      smsEnabled: z.boolean(),
      emailEnabled: z.boolean(),
      timingMinutes: z.number().int().optional().nullable(),
    })),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe ustawienia powiadomień" });
  const salonId = req.user!.salonId;
  await Promise.all(parsed.data.settings.map(s =>
    prisma.notificationSetting.upsert({
      where: { salonId_event: { salonId, event: s.event } },
      update: { smsEnabled: s.smsEnabled, emailEnabled: s.emailEnabled, timingMinutes: s.timingMinutes ?? null },
      create: { salonId, ...s },
    }),
  ));
  return res.json({ ok: true });
});

router.post("/notifications/test-sms", async (req: AuthRequest, res) => {
  if (!requireOwner(req, res)) return;
  const schema = z.object({
    to: z.string().min(6),
    message: z.string().min(1).max(480).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane testu SMS" });
  const token = process.env.SMSAPI_API_KEY || process.env.SMSAPI_KEY;
  if (!token) return res.status(400).json({ error: "Brak konfiguracji SMS" });
  const salon = await prisma.salon.findUnique({ where: { id: req.user!.salonId } });
  const prefix = salon?.name ? `[${salon.name}] ` : "";
  const result = await sendSms(parsed.data.to, `${prefix}${parsed.data.message || "Test SMS z purebook."}`, salon?.name);
  if (!result?.ok) {
    return res.status(400).json({ error: result?.error || "Błąd SMSAPI" });
  }
  return res.json({ ok: true });
});

router.post("/notifications/send-sms", async (req: AuthRequest, res) => {
  const schema = z.object({
    to: z.string().min(6),
    message: z.string().min(1).max(640),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane SMS" });
  const token = process.env.SMSAPI_API_KEY || process.env.SMSAPI_KEY;
  if (!token) return res.status(400).json({ error: "Brak konfiguracji SMS" });
  const salon = await prisma.salon.findUnique({ where: { id: req.user!.salonId } });
  const prefix = salon?.name ? `[${salon.name}] ` : "";
  const result = await sendSms(parsed.data.to, `${prefix}${parsed.data.message}`, salon?.name);
  if (!result?.ok) {
    return res.status(400).json({ error: result?.error || "Błąd SMSAPI" });
  }
  return res.json({ ok: true });
});

router.get("/notifications/templates", async (req: AuthRequest, res) => {
  if (!requireOwner(req, res)) return;
  const salonId = req.user!.salonId;
  const templates = await prisma.notificationTemplate.findMany({ where: { salonId } });
  return res.json({ templates });
});

router.post("/notifications/templates", async (req: AuthRequest, res) => {
  if (!requireOwner(req, res)) return;
  const schema = z.object({
    event: z.enum(["BOOKING_CONFIRMATION", "REMINDER_24H", "REMINDER_2H", "CANCELLATION", "FOLLOWUP"]),
    channel: z.enum(["SMS", "EMAIL"]),
    subject: z.string().optional(),
    body: z.string().min(2),
    active: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane szablonu" });
  const template = await prisma.notificationTemplate.create({
    data: { ...parsed.data, salonId: req.user!.salonId },
  });
  return res.json({ template });
});

router.put("/notifications/templates/:id", async (req: AuthRequest, res) => {
  if (!requireOwner(req, res)) return;
  const schema = z.object({
    subject: z.string().optional(),
    body: z.string().min(2),
    active: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane szablonu" });
  const template = await prisma.notificationTemplate.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  return res.json({ template });
});

router.get("/services", async (req: AuthRequest, res) => {
  const services = await prisma.service.findMany({ where: { salonId: req.user?.salonId } });
  return res.json({ services });
});

router.post("/services", async (req: AuthRequest, res) => {
  if (!requireOwner(req, res)) return;
  const schema = z.object({
    name: z.string().min(2),
    category: z.string().min(2),
    duration: z.number().int().min(1),
    price: z.number().int().min(0),
    description: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane usługi" });
  const service = await prisma.service.create({
    data: { ...parsed.data, salonId: req.user!.salonId },
  });
  return res.json({ service });
});

router.put("/services/:id", async (req: AuthRequest, res) => {
  if (!requireOwner(req, res)) return;
  const schema = z.object({
    name: z.string().min(2),
    category: z.string().min(2),
    duration: z.number().int().min(1),
    price: z.number().int().min(0),
    description: z.string().optional(),
    active: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane usługi" });
  const existing = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.salonId !== req.user!.salonId) {
    return res.status(404).json({ error: "Nie znaleziono usługi w tym salonie" });
  }
  const service = await prisma.service.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  return res.json({ service });
});

router.delete("/services/:id", async (req: AuthRequest, res) => {
  if (!requireOwner(req, res)) return;
  const existing = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.salonId !== req.user!.salonId) {
    return res.status(404).json({ error: "Nie znaleziono usługi w tym salonie" });
  }
  const apptCount = await prisma.appointmentService.count({
    where: { serviceId: req.params.id },
  });
  if (apptCount > 0) {
    return res.status(409).json({ error: "Usługa ma powiązane wizyty" });
  }
  const service = await prisma.service.update({
    where: { id: req.params.id },
    data: { active: false },
  });
  return res.json({ ok: true, service });
});

router.get("/staff", async (req: AuthRequest, res) => {
  const staff = await prisma.staff.findMany({
    where: { salonId: req.user?.salonId },
    include: { staffServices: { include: { service: true } }, user: true },
  });
  return res.json({
    staff: staff.map(s => ({
      ...s,
      services: s.staffServices.map(ss => ss.service),
    })),
  });
});

router.post("/staff", async (req: AuthRequest, res) => {
  if (!requireOwner(req, res)) return;
  const schema = z.object({
    name: z.string().min(2),
    role: z.string().min(2),
    phone: z.string().optional(),
    serviceIds: z.array(z.string()).default([]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane pracownika" });
  if (parsed.data.serviceIds.length) {
    const services = await prisma.service.findMany({
      where: { salonId: req.user!.salonId, id: { in: parsed.data.serviceIds }, active: true },
      select: { id: true },
    });
    if (services.length !== parsed.data.serviceIds.length) {
      return res.status(400).json({ error: "Nie znaleziono usług w tym salonie" });
    }
  }
  const staff = await prisma.staff.create({
    data: {
      name: parsed.data.name,
      role: parsed.data.role,
      phone: parsed.data.phone,
      active: true,
      salonId: req.user!.salonId,
      staffServices: {
        create: parsed.data.serviceIds.map(serviceId => ({ serviceId })),
      },
    },
    include: { staffServices: { include: { service: true } }, user: true },
  });
  return res.json({
    staff: {
      ...staff,
      services: staff.staffServices.map(ss => ss.service),
    },
  });
});

router.put("/staff/:id", async (req: AuthRequest, res) => {
  if (!requireOwner(req, res)) return;
  const schema = z.object({
    name: z.string().min(2),
    role: z.string().min(2),
    phone: z.string().optional(),
    active: z.boolean().optional(),
    serviceIds: z.array(z.string()).default([]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane pracownika" });
  const existing = await prisma.staff.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.salonId !== req.user!.salonId) {
    return res.status(404).json({ error: "Nie znaleziono pracownika w tym salonie" });
  }
  if (parsed.data.serviceIds.length) {
    const services = await prisma.service.findMany({
      where: { salonId: req.user!.salonId, id: { in: parsed.data.serviceIds }, active: true },
      select: { id: true },
    });
    if (services.length !== parsed.data.serviceIds.length) {
      return res.status(400).json({ error: "Nie znaleziono usług w tym salonie" });
    }
  }
  await prisma.staffService.deleteMany({ where: { staffId: req.params.id } });
  const staff = await prisma.staff.update({
    where: { id: req.params.id },
    data: {
      name: parsed.data.name,
      role: parsed.data.role,
      phone: parsed.data.phone,
      active: parsed.data.active,
      staffServices: {
        create: parsed.data.serviceIds.map(serviceId => ({ serviceId })),
      },
    },
    include: { staffServices: { include: { service: true } }, user: true },
  });
  return res.json({
    staff: { ...staff, services: staff.staffServices.map(ss => ss.service) },
  });
});

router.post("/staff/:id/account", async (req: AuthRequest, res) => {
  if (!requireOwner(req, res)) return;
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane konta pracownika" });

  const staff = await prisma.staff.findUnique({ where: { id: req.params.id } });
  if (!staff || staff.salonId !== req.user!.salonId) return res.status(404).json({ error: "Nie znaleziono pracownika w tym salonie" });
  if (staff.userId) return res.status(409).json({ error: "Konto już istnieje" });

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return res.status(409).json({ error: "Podany email jest już zajęty" });

  const passwordHash = await (await import("bcryptjs")).default.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      phone: staff.phone || "",
      passwordHash,
      role: "STAFF",
      salonId: staff.salonId,
      active: true,
    },
  });
  await prisma.userSalon.create({
    data: { userId: user.id, salonId: staff.salonId, role: "STAFF" },
  });
  const updated = await prisma.staff.update({
    where: { id: staff.id },
    data: { userId: user.id },
    include: { staffServices: { include: { service: true } }, user: true },
  });
  return res.json({ staff: { ...updated, services: updated.staffServices.map(ss => ss.service) } });
});

router.put("/staff/:id/account", async (req: AuthRequest, res) => {
  if (!requireOwner(req, res)) return;
  const schema = z.object({
    active: z.boolean().optional(),
    password: z.string().min(8).optional(),
    role: z.enum(["OWNER", "STAFF"]).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane konta pracownika" });

  const staff = await prisma.staff.findUnique({ where: { id: req.params.id }, include: { user: true } });
  if (!staff || staff.salonId !== req.user!.salonId) return res.status(404).json({ error: "Nie znaleziono pracownika w tym salonie" });
  if (!staff.userId || !staff.user) return res.status(404).json({ error: "Nie znaleziono konta pracownika" });

  const data: any = {};
  if (parsed.data.active !== undefined) data.active = parsed.data.active;
  if (parsed.data.password) {
    data.passwordHash = await (await import("bcryptjs")).default.hash(parsed.data.password, 10);
  }
  if (parsed.data.role) {
    data.role = parsed.data.role;
    await prisma.userSalon.upsert({
      where: { userId_salonId: { userId: staff.userId, salonId: staff.salonId } },
      update: { role: parsed.data.role },
      create: { userId: staff.userId, salonId: staff.salonId, role: parsed.data.role },
    });
  }
  if (Object.keys(data).length) {
    await prisma.user.update({ where: { id: staff.userId }, data });
  }
  const updated = await prisma.staff.findUnique({
    where: { id: staff.id },
    include: { staffServices: { include: { service: true } }, user: true },
  });
  return res.json({ staff: { ...updated!, services: updated!.staffServices.map(ss => ss.service) } });
});

router.delete("/staff/:id", async (req: AuthRequest, res) => {
  if (!requireOwner(req, res)) return;
  const existing = await prisma.staff.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.salonId !== req.user!.salonId) {
    return res.status(404).json({ error: "Nie znaleziono pracownika w tym salonie" });
  }
  const apptCount = await prisma.appointment.count({
    where: { staffId: req.params.id },
  });
  if (apptCount > 0) {
    return res.status(409).json({ error: "Pracownik ma powiązane wizyty" });
  }
  const staff = await prisma.staff.update({ where: { id: req.params.id }, data: { active: false } });
  if (staff.userId) {
    await prisma.user.update({ where: { id: staff.userId }, data: { active: false } });
  }
  return res.json({ ok: true, staff });
});

router.get("/clients", async (req: AuthRequest, res) => {
  const clients = await prisma.client.findMany({
    where: { salonId: req.user?.salonId, active: true },
    include: { appointments: { select: { date: true } } },
  });
  const enriched = clients.map(c => {
    const dates = c.appointments.map(a => a.date).sort();
    const lastVisit = dates.length ? dates[dates.length - 1] : null;
    return {
      ...c,
      visits: c.appointments.length,
      lastVisit,
      appointments: undefined,
    };
  });
  return res.json({ clients: enriched });
});

router.post("/clients", async (req: AuthRequest, res) => {
  const schema = z.object({
    name: z.string().min(2),
    phone: z.string().min(6),
    email: z.string().email().optional(),
    notes: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane klienta" });
  const client = await prisma.client.create({
    data: { ...parsed.data, salonId: req.user!.salonId, active: true },
  });
  return res.json({ client });
});

router.post("/clients/import", async (req: AuthRequest, res) => {
  const schema = z.object({
    includeVisits: z.boolean().optional().default(true),
    updateExisting: z.boolean().optional().default(true),
    rows: z.array(z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      notes: z.string().optional(),
      date: z.string().optional(),
      time: z.string().optional(),
      services: z.string().optional(),
      staff: z.string().optional(),
      status: z.string().optional(),
    })).min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane importu" });

  const salonId = req.user!.salonId;
  const defaultService = { category: "Import", duration: 30, price: 0 };
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const timeRegex = /^\d{2}:\d{2}$/;
  const statusMap: Record<string, string> = {
    zaplanowana: "SCHEDULED",
    potwierdzona: "CONFIRMED",
    "w trakcie": "IN_PROGRESS",
    zakonczona: "COMPLETED",
    zakończona: "COMPLETED",
    anulowana: "CANCELLED",
    nieobecnosc: "NO_SHOW",
    nieobecność: "NO_SHOW",
    scheduled: "SCHEDULED",
    confirmed: "CONFIRMED",
    "in-progress": "IN_PROGRESS",
    completed: "COMPLETED",
    cancelled: "CANCELLED",
    "no-show": "NO_SHOW",
  };

  let createdServices = 0;
  let createdAppointments = 0;
  let createdClients = 0;
  let updatedClients = 0;
  let skippedRows = 0;
  const errors: Array<{ row: number; reason: string }> = [];

  for (const [idx, row] of parsed.data.rows.entries()) {
    const phone = (row.phone || "").trim();
    const name = `${row.firstName || ""} ${row.lastName || ""}`.trim();
    if (!phone || !name) {
      skippedRows += 1;
      errors.push({ row: idx + 2, reason: "Brak imienia/nazwiska lub telefonu" });
      continue;
    }

    const existing = await prisma.client.findFirst({
      where: { salonId, phone },
    });
    let client = existing;
    if (existing) {
      if (parsed.data.updateExisting) {
        client = await prisma.client.update({
          where: { id: existing.id },
          data: {
            name,
            email: row.email || existing.email || null,
            notes: row.notes || existing.notes || null,
            active: true,
          },
        });
        updatedClients += 1;
      }
    } else {
      client = await prisma.client.create({
        data: {
          salonId,
          name,
          phone,
          email: row.email || null,
          notes: row.notes || null,
          active: true,
        },
      });
      createdClients += 1;
    }
    if (!client) {
      skippedRows += 1;
      errors.push({ row: idx + 2, reason: "Klient już istnieje (pominięto aktualizację)" });
      continue;
    }

    if (!parsed.data.includeVisits) continue;

    const hasVisit = row.date && row.time && row.services;
    if (!hasVisit) continue;

    if (!dateRegex.test(row.date!)) {
      skippedRows += 1;
      errors.push({ row: idx + 2, reason: "Nieprawidłowa data (oczekiwano RRRR-MM-DD)" });
      continue;
    }
    if (!timeRegex.test(row.time!)) {
      skippedRows += 1;
      errors.push({ row: idx + 2, reason: "Nieprawidłowa godzina (oczekiwano HH:MM)" });
      continue;
    }

    const serviceNames = (row.services || "")
      .split(/[+,]/)
      .map(s => s.trim())
      .filter(Boolean);
    if (!serviceNames.length) {
      skippedRows += 1;
      errors.push({ row: idx + 2, reason: "Brak usług w wierszu wizyty" });
      continue;
    }

    const services = [];
    for (const serviceName of serviceNames) {
      let service = await prisma.service.findFirst({
        where: { salonId, name: serviceName },
      });
      if (!service) {
        service = await prisma.service.create({
          data: {
            salonId,
            name: serviceName,
            category: defaultService.category,
            duration: defaultService.duration,
            price: defaultService.price,
            active: true,
          },
        });
        createdServices += 1;
      }
      services.push(service);
    }

    const duration = services.reduce((sum, s) => sum + s.duration, 0);
    const staffName = (row.staff || "").trim();
    const staff = staffName
      ? await prisma.staff.findFirst({ where: { salonId, name: staffName, active: true } })
      : null;
    const statusKey = (row.status || "").toLowerCase().trim();
    const status = (statusMap[statusKey] || "SCHEDULED") as any;

    const appointment = await prisma.appointment.create({
      data: {
        salonId,
        date: row.date!,
        time: row.time!,
        duration,
        status,
        clientId: client.id,
        staffId: staff?.id,
        appointmentServices: {
          create: services.map(s => ({ serviceId: s.id })),
        },
      },
    });
    createdAppointments += 1;
  }

  return res.json({
    ok: true,
    createdClients,
    updatedClients,
    createdAppointments,
    createdServices,
    skippedRows,
    errors,
  });
});

router.put("/clients/:id", async (req: AuthRequest, res) => {
  const schema = z.object({
    name: z.string().min(2),
    phone: z.string().min(6),
    email: z.string().email().optional(),
    notes: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane klienta" });
  const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.salonId !== req.user!.salonId) {
    return res.status(404).json({ error: "Nie znaleziono klienta w tym salonie" });
  }
  const client = await prisma.client.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  return res.json({ client });
});

router.get("/clients/:id/appointments", async (req: AuthRequest, res) => {
  const appointments = await prisma.appointment.findMany({
    where: { salonId: req.user?.salonId, clientId: req.params.id },
    include: { staff: true, appointmentServices: { include: { service: true } } },
    orderBy: [{ date: "desc" }, { time: "desc" }],
  });
  return res.json({ appointments });
});

router.delete("/clients/:id", async (req: AuthRequest, res) => {
  const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.salonId !== req.user!.salonId) {
    return res.status(404).json({ error: "Nie znaleziono klienta w tym salonie" });
  }
  const apptCount = await prisma.appointment.count({
    where: { clientId: req.params.id },
  });
  if (apptCount > 0) {
    return res.status(409).json({ error: "Klient ma powiązane wizyty" });
  }
  const client = await prisma.client.update({ where: { id: req.params.id }, data: { active: false } });
  return res.json({ ok: true, client });
});

router.get("/hours", async (req: AuthRequest, res) => {
  if (!requireOwner(req, res)) return;
  const salonId = req.user!.salonId;
  let hours = await prisma.salonHour.findMany({
    where: { salonId },
    orderBy: { weekday: "asc" },
  });
  if (hours.length === 0) {
    await prisma.salonHour.createMany({
      data: defaultHours.map(h => ({ ...h, salonId })),
    });
    hours = await prisma.salonHour.findMany({
      where: { salonId },
      orderBy: { weekday: "asc" },
    });
  }
  return res.json({ hours });
});

router.put("/hours", async (req: AuthRequest, res) => {
  if (!requireOwner(req, res)) return;
  const schema = z.object({
    hours: z.array(z.object({
      weekday: z.number().int().min(0).max(6),
      open: z.string(),
      close: z.string(),
      active: z.boolean(),
    })),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe godziny pracy" });
  const salonId = req.user!.salonId;
  await Promise.all(parsed.data.hours.map(h =>
    prisma.salonHour.upsert({
      where: { salonId_weekday: { salonId, weekday: h.weekday } },
      update: { open: h.open, close: h.close, active: h.active },
      create: { ...h, salonId },
    }),
  ));
  return res.json({ ok: true });
});

router.get("/hours/exceptions", async (req: AuthRequest, res) => {
  if (!requireOwner(req, res)) return;
  const exceptions = await prisma.salonException.findMany({
    where: { salonId: req.user!.salonId },
    orderBy: { date: "asc" },
  });
  return res.json({ exceptions });
});

router.post("/hours/exceptions", async (req: AuthRequest, res) => {
  if (!requireOwner(req, res)) return;
  const schema = z.object({
    date: z.string(),
    label: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    closed: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane wyjątku" });
  const exception = await prisma.salonException.create({
    data: { ...parsed.data, salonId: req.user!.salonId },
  });
  return res.json({ exception });
});

router.delete("/hours/exceptions/:id", async (req: AuthRequest, res) => {
  if (!requireOwner(req, res)) return;
  await prisma.salonException.delete({ where: { id: req.params.id } });
  return res.json({ ok: true });
});

router.get("/breaks", async (req: AuthRequest, res) => {
  if (!requireOwner(req, res)) return;
  const breaks = await prisma.salonBreak.findMany({
    where: { salonId: req.user!.salonId },
    orderBy: { label: "asc" },
  });
  return res.json({ breaks });
});

router.post("/breaks", async (req: AuthRequest, res) => {
  if (!requireOwner(req, res)) return;
  const schema = z.object({
    type: z.enum(["BREAK", "BUFFER"]),
    label: z.string().min(2),
    days: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    minutes: z.number().int().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane przerwy" });
  const created = await prisma.salonBreak.create({
    data: { ...parsed.data, salonId: req.user!.salonId },
  });
  return res.json({ break: created });
});

router.delete("/breaks/:id", async (req: AuthRequest, res) => {
  if (!requireOwner(req, res)) return;
  await prisma.salonBreak.delete({ where: { id: req.params.id } });
  return res.json({ ok: true });
});

router.get("/appointments", async (req: AuthRequest, res) => {
  const appointments = await prisma.appointment.findMany({
    where: { salonId: req.user?.salonId },
    include: { client: true, staff: true, appointmentServices: { include: { service: true } } },
    orderBy: { date: "asc" },
  });
  return res.json({ appointments });
});

router.post("/appointments", async (req: AuthRequest, res) => {
  const schema = z.object({
    date: z.string().min(8),
    time: z.string().min(4),
    duration: z.number().int().min(1),
    status: z.enum(["SCHEDULED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
    notes: z.string().optional(),
    clientId: z.string(),
    staffId: z.string().optional(),
    serviceIds: z.array(z.string()).default([]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane wizyty" });
  if (!parsed.data.serviceIds.length) return res.status(400).json({ error: "Wybierz przynajmniej jedną usługę" });

  const client = await prisma.client.findFirst({
    where: { id: parsed.data.clientId, salonId: req.user!.salonId },
  });
  if (!client) return res.status(400).json({ error: "Nie znaleziono klienta w tym salonie" });
  if (client.active === false) return res.status(400).json({ error: "Klient jest nieaktywny" });

  const services = await prisma.service.findMany({
    where: { salonId: req.user!.salonId, id: { in: parsed.data.serviceIds }, active: true },
  });
  if (services.length !== parsed.data.serviceIds.length) {
    return res.status(400).json({ error: "Nie znaleziono usług w tym salonie" });
  }
  const duration = services.reduce((sum, s) => sum + s.duration, 0);

  if (parsed.data.staffId) {
    const staffRec = await prisma.staff.findFirst({
      where: { id: parsed.data.staffId, salonId: req.user!.salonId, active: true },
      select: { id: true },
    });
    if (!staffRec) return res.status(400).json({ error: "Nie znaleziono pracownika w tym salonie" });

    const staffServiceCount = await prisma.staffService.count({
      where: { staffId: parsed.data.staffId, serviceId: { in: parsed.data.serviceIds } },
    });
    if (staffServiceCount !== parsed.data.serviceIds.length) {
      return res.status(400).json({ error: "Pracownik nie wykonuje wybranych usług" });
    }
  }
  const availability = await validateAppointmentAvailability({
    salonId: req.user!.salonId,
    date: parsed.data.date,
    time: parsed.data.time,
    duration,
    staffId: parsed.data.staffId,
  });
  if (!availability.ok) {
    return res.status(409).json({ error: availability.error || "Termin jest niedostępny" });
  }
  const appointment = await prisma.appointment.create({
    data: {
      salonId: req.user!.salonId,
      date: parsed.data.date,
      time: parsed.data.time,
      duration,
      status: parsed.data.status ?? "SCHEDULED",
      notes: parsed.data.notes,
      clientId: client.id,
      staffId: parsed.data.staffId,
      appointmentServices: {
        create: services.map(s => ({ serviceId: s.id })),
      },
    },
    include: { client: true, staff: true, appointmentServices: { include: { service: true } } },
  });
  const salon = await prisma.salon.findUnique({ where: { id: appointment.salonId } });
  await sendEventNotification("BOOKING_CONFIRMATION", { ...appointment, salon });
  return res.json({ appointment });
});

router.put("/appointments/:id", async (req: AuthRequest, res) => {
  const schema = z.object({
    date: z.string().min(8).optional(),
    time: z.string().min(4).optional(),
    duration: z.number().int().min(1).optional(),
    status: z.enum(["SCHEDULED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
    notes: z.string().optional(),
    staffId: z.string().optional().nullable(),
    serviceIds: z.array(z.string()).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane wizyty" });
  const appointment = await prisma.appointment.findUnique({
    where: { id: req.params.id },
  });
  if (!appointment || appointment.salonId !== req.user!.salonId) {
    return res.status(404).json({ error: "Nie znaleziono wizyty w tym salonie" });
  }

  const statusChanged = parsed.data.status && parsed.data.status !== appointment.status;
  const isCancelledNow = parsed.data.status === "CANCELLED" && appointment.status !== "CANCELLED";
  const isConfirmedNow = parsed.data.status === "CONFIRMED" && appointment.status !== "CONFIRMED";
  const isCompletedNow = parsed.data.status === "COMPLETED" && appointment.status !== "COMPLETED";
  const timeChanged =
    (parsed.data.date && parsed.data.date !== appointment.date) ||
    (parsed.data.time && parsed.data.time !== appointment.time);

  let duration = parsed.data.duration;
  let effectiveServiceIds: string[] = [];
  if (parsed.data.serviceIds) {
    const services = await prisma.service.findMany({
      where: { salonId: appointment.salonId, id: { in: parsed.data.serviceIds }, active: true },
    });
    if (services.length !== parsed.data.serviceIds.length) {
      return res.status(400).json({ error: "Nie znaleziono usług w tym salonie" });
    }
    duration = services.reduce((sum, s) => sum + s.duration, 0);
    effectiveServiceIds = services.map(s => s.id);
    await prisma.appointmentService.deleteMany({ where: { appointmentId: appointment.id } });
    await prisma.appointmentService.createMany({
      data: services.map(s => ({ appointmentId: appointment.id, serviceId: s.id })),
    });
  } else {
    const currentServices = await prisma.appointmentService.findMany({
      where: { appointmentId: appointment.id },
      select: { serviceId: true },
    });
    effectiveServiceIds = currentServices.map(s => s.serviceId);
  }
  const newDate = parsed.data.date ?? appointment.date;
  const newTime = parsed.data.time ?? appointment.time;
  const newDuration = duration ?? appointment.duration;
  const newStaffId = parsed.data.staffId === undefined ? appointment.staffId : parsed.data.staffId;
  if (!effectiveServiceIds.length) {
    return res.status(400).json({ error: "Wybierz przynajmniej jedną usługę" });
  }

  if (newStaffId) {
    const staffRec = await prisma.staff.findFirst({
      where: { id: newStaffId, salonId: appointment.salonId, active: true },
      select: { id: true },
    });
    if (!staffRec) return res.status(400).json({ error: "Nie znaleziono pracownika w tym salonie" });

    const staffServiceCount = await prisma.staffService.count({
      where: { staffId: newStaffId, serviceId: { in: effectiveServiceIds } },
    });
    if (staffServiceCount !== effectiveServiceIds.length) {
      return res.status(400).json({ error: "Pracownik nie wykonuje wybranych usług" });
    }
  }

  const availability = await validateAppointmentAvailability({
    salonId: appointment.salonId,
    date: newDate,
    time: newTime,
    duration: newDuration,
    staffId: newStaffId || undefined,
    excludeAppointmentId: appointment.id,
  });
  if (!availability.ok) {
    return res.status(409).json({ error: availability.error || "Termin jest niedostępny" });
  }

  const updated = await prisma.appointment.update({
    where: { id: req.params.id },
    data: {
      date: parsed.data.date,
      time: parsed.data.time,
      duration: newDuration,
      status: parsed.data.status,
      notes: parsed.data.notes,
      staffId: parsed.data.staffId ?? undefined,
    },
    include: { client: true, staff: true, appointmentServices: { include: { service: true } } },
  });
  if (isCancelledNow) {
    const salon = await prisma.salon.findUnique({ where: { id: updated.salonId } });
    await sendEventNotification("CANCELLATION", { ...updated, salon });
  } else if (isConfirmedNow || timeChanged) {
    const salon = await prisma.salon.findUnique({ where: { id: updated.salonId } });
    await sendEventNotification("BOOKING_CONFIRMATION", { ...updated, salon });
  } else if (isCompletedNow) {
    const salon = await prisma.salon.findUnique({ where: { id: updated.salonId } });
    await sendEventNotification("FOLLOWUP", { ...updated, salon });
  }
  return res.json({ appointment: updated });
});

router.get("/schedule/:staffId", async (req: AuthRequest, res) => {
  if (!requireOwner(req, res)) return;
  const { staffId } = req.params;
  const availability = await prisma.staffAvailability.findMany({ where: { staffId } });
  const exceptions = await prisma.staffException.findMany({ where: { staffId } });
  return res.json({ availability, exceptions });
});

router.post("/schedule/:staffId", async (req: AuthRequest, res) => {
  if (!requireOwner(req, res)) return;
  const schema = z.object({
    availability: z.array(z.object({
      weekday: z.number().int().min(0).max(6),
      start: z.string(),
      end: z.string(),
      active: z.boolean(),
    })),
    exceptions: z.array(z.object({
      date: z.string(),
      start: z.string().optional(),
      end: z.string().optional(),
      label: z.string().optional(),
      active: z.boolean().optional(),
    })).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane grafiku" });

  const { staffId } = req.params;
  await prisma.staffAvailability.deleteMany({ where: { staffId } });
  await prisma.staffAvailability.createMany({
    data: parsed.data.availability.map(a => ({
      staffId,
      weekday: a.weekday,
      start: a.start,
      end: a.end,
      active: a.active,
    })),
  });

  if (parsed.data.exceptions) {
    await prisma.staffException.deleteMany({ where: { staffId } });
    await prisma.staffException.createMany({
      data: parsed.data.exceptions.map(ex => ({
        staffId,
        date: ex.date,
        start: ex.start,
        end: ex.end,
        label: ex.label,
        active: ex.active ?? false,
      })),
    });
  }

  return res.json({ ok: true });
});

router.post("/schedule/:staffId/exceptions", async (req: AuthRequest, res) => {
  if (!requireOwner(req, res)) return;
  const schema = z.object({
    date: z.string(),
    start: z.string().optional(),
    end: z.string().optional(),
    label: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane wyjątku pracownika" });

  const staff = await prisma.staff.findUnique({ where: { id: req.params.staffId } });
  if (!staff || staff.salonId !== req.user!.salonId) return res.status(404).json({ error: "Nie znaleziono pracownika w tym salonie" });

  const exception = await prisma.staffException.create({
    data: {
      staffId: req.params.staffId,
      date: parsed.data.date,
      start: parsed.data.start,
      end: parsed.data.end,
      label: parsed.data.label,
      active: true,
    },
  });
  return res.json({ exception });
});

export default router;



