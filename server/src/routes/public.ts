import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import prisma from "../prisma.js";
import { ensureCancelToken, sendEventNotification } from "../notificationService.js";

const router = Router();

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
}: {
  salonId: string;
  date: string;
  time: string;
  duration: number;
  staffId?: string | null;
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

const getSalonWindowForDate = (
  date: string,
  salonHours: Array<{ weekday: number; open: string; close: string; active: boolean }>,
  salonExceptions: Array<{ date: string; start?: string | null; end?: string | null; closed: boolean }>,
) => {
  const exception = salonExceptions.find(ex => ex.date === date);
  if (exception?.closed) return null;
  if (exception?.start && exception?.end) return { start: exception.start, end: exception.end };
  const weekday = (new Date(date).getDay() + 6) % 7;
  const salonDay = salonHours.find(h => h.weekday === weekday);
  if (!salonDay || !salonDay.active || !salonDay.open || !salonDay.close) return null;
  return { start: salonDay.open, end: salonDay.close };
};

const getStaffWindowForDate = (
  date: string,
  staffId: string,
  availabilityByStaff: Map<string, Array<{ weekday: number; start: string; end: string; active: boolean }>>,
  exceptionsByStaff: Map<string, Array<{ date: string; start?: string | null; end?: string | null; active: boolean }>>,
) => {
  const exceptions = exceptionsByStaff.get(staffId) || [];
  const ex = exceptions.find(e => e.date === date && e.active !== false);
  if (ex) {
    if (!ex.start || !ex.end) return null;
    return { start: ex.start, end: ex.end };
  }
  const availability = availabilityByStaff.get(staffId) || [];
  if (!availability.length) return null;
  const weekday = (new Date(date).getDay() + 6) % 7;
  const day = availability.find(a => a.weekday === weekday);
  if (!day || !day.active || !day.start || !day.end) return null;
  return { start: day.start, end: day.end };
};

const buildSlotsForWindow = ({
  window,
  date,
  duration,
  buffers,
  breakWindows,
  appointments,
}: {
  window: { start: string; end: string };
  date: string;
  duration: number;
  buffers: { before: number; after: number };
  breakWindows: Array<{ start: number; end: number }>;
  appointments: Array<{ time: string; duration: number }>;
}) => {
  const startWindow = toMinutes(window.start);
  const endWindow = toMinutes(window.end);
  const slots: string[] = [];
  for (let m = startWindow; m <= endWindow; m += 30) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    const label = `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    const appointmentStart = m;
    const start = appointmentStart - buffers.before;
    const end = appointmentStart + duration + buffers.after;
    if (start < startWindow || end > endWindow) continue;
    if (breakWindows.some(w => hasOverlap(start, end, w.start, w.end))) continue;
    const conflict = appointments.some(ap => {
      const s = toMinutes(ap.time) - buffers.before;
      const e = s + ap.duration + buffers.before + buffers.after;
      return hasOverlap(start, end, s, e);
    });
    if (!conflict) slots.push(label);
  }
  return slots;
};

const buildSlotsForAppointment = async (appointment: { id: string; salonId: string; date: string; staffId?: string | null; duration: number }) => {
  const [salonHours, salonExceptions, salonBreaks, staffAvailability, staffExceptions, appointments] = await Promise.all([
    prisma.salonHour.findMany({ where: { salonId: appointment.salonId } }),
    prisma.salonException.findMany({ where: { salonId: appointment.salonId } }),
    prisma.salonBreak.findMany({ where: { salonId: appointment.salonId } }),
    prisma.staffAvailability.findMany({ where: { staffId: appointment.staffId || undefined } }),
    prisma.staffException.findMany({ where: { staffId: appointment.staffId || undefined } }),
    prisma.appointment.findMany({
      where: {
        salonId: appointment.salonId,
        date: appointment.date,
        ...(appointment.staffId ? { staffId: appointment.staffId } : {}),
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        NOT: { id: appointment.id },
      },
      select: { time: true, duration: true },
    }),
  ]);

  const salonWindow = getSalonWindowForDate(appointment.date, salonHours as any, salonExceptions as any);
  if (!salonWindow) return [];

  let staffWindow: { start: string; end: string } | null = null;
  if (appointment.staffId) {
    const availabilityByStaff = new Map<string, Array<{ weekday: number; start: string; end: string; active: boolean }>>();
    staffAvailability.forEach(a => {
      const list = availabilityByStaff.get(a.staffId) || [];
      list.push({ weekday: a.weekday, start: a.start, end: a.end, active: a.active });
      availabilityByStaff.set(a.staffId, list);
    });
    const exceptionsByStaff = new Map<string, Array<{ date: string; start?: string | null; end?: string | null; active: boolean }>>();
    staffExceptions.forEach(e => {
      const list = exceptionsByStaff.get(e.staffId) || [];
      list.push({ date: e.date, start: e.start, end: e.end, active: e.active });
      exceptionsByStaff.set(e.staffId, list);
    });
    staffWindow = getStaffWindowForDate(appointment.date, appointment.staffId, availabilityByStaff, exceptionsByStaff);
  }

  const window = staffWindow || salonWindow;
  if (!window) return [];
  const buffers = getBufferMinutes(salonBreaks as any);
  const breakWindows = getBreakWindowsForDate(appointment.date, salonBreaks as any);
  return buildSlotsForWindow({
    window,
    date: appointment.date,
    duration: appointment.duration,
    buffers,
    breakWindows,
    appointments,
  });
};

router.get("/salons/:slug", async (req, res) => {
  const slug = req.params.slug.toLowerCase();
  const salon = await prisma.salon.findUnique({
    where: { slug },
    include: {
      services: { where: { active: true } },
      staff: {
        where: { active: true },
        include: {
          staffServices: { include: { service: true } },
        },
      },
    },
  });

  if (!salon) {
    return res.status(404).json({ error: "Nie znaleziono salonu o podanym linku" });
  }

  return res.json({
    salon,
    services: salon.services,
    staff: salon.staff.map(s => ({
      ...s,
      services: s.staffServices.map(ss => ss.service),
    })),
  });
});

router.get("/salons/:slug/availability", async (req, res) => {
  const schema = z.object({
    date: z.string().min(8),
    serviceId: z.string().min(1),
    staffId: z.string().optional(),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe parametry" });

  const slug = req.params.slug.toLowerCase();
  const salon = await prisma.salon.findUnique({ where: { slug } });
  if (!salon) return res.status(404).json({ error: "Nie znaleziono salonu o podanym linku" });

  const service = await prisma.service.findFirst({
    where: { salonId: salon.id, id: parsed.data.serviceId, active: true },
  });
  if (!service) return res.status(404).json({ error: "Nie znaleziono usługi w tym salonie" });

  const staffList = await prisma.staff.findMany({
    where: {
      salonId: salon.id,
      active: true,
      staffServices: { some: { serviceId: service.id } },
    },
    select: { id: true },
  });
  if (!staffList.length) return res.json({ slots: [] });

  const staffIds = staffList.map(s => s.id);
  if (parsed.data.staffId && !staffIds.includes(parsed.data.staffId)) {
    return res.status(400).json({ error: "Nie znaleziono pracownika w tym salonie" });
  }

  const [salonHours, salonExceptions, salonBreaks, staffAvailability, staffExceptions, appointments] = await Promise.all([
    prisma.salonHour.findMany({ where: { salonId: salon.id } }),
    prisma.salonException.findMany({ where: { salonId: salon.id } }),
    prisma.salonBreak.findMany({ where: { salonId: salon.id } }),
    prisma.staffAvailability.findMany({ where: { staffId: { in: staffIds } } }),
    prisma.staffException.findMany({ where: { staffId: { in: staffIds } } }),
    prisma.appointment.findMany({
      where: {
        salonId: salon.id,
        date: parsed.data.date,
        staffId: { in: staffIds },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
      select: { staffId: true, time: true, duration: true },
    }),
  ]);

  const salonWindow = getSalonWindowForDate(parsed.data.date, salonHours as any, salonExceptions as any);
  if (!salonWindow) return res.json({ slots: [] });

  const availabilityByStaff = new Map<string, Array<{ weekday: number; start: string; end: string; active: boolean }>>();
  staffAvailability.forEach(a => {
    const list = availabilityByStaff.get(a.staffId) || [];
    list.push({ weekday: a.weekday, start: a.start, end: a.end, active: a.active });
    availabilityByStaff.set(a.staffId, list);
  });
  const exceptionsByStaff = new Map<string, Array<{ date: string; start?: string | null; end?: string | null; active: boolean }>>();
  staffExceptions.forEach(e => {
    const list = exceptionsByStaff.get(e.staffId) || [];
    list.push({ date: e.date, start: e.start, end: e.end, active: e.active });
    exceptionsByStaff.set(e.staffId, list);
  });

  const buffers = getBufferMinutes(salonBreaks as any);
  const breakWindows = getBreakWindowsForDate(parsed.data.date, salonBreaks as any);

  const candidates = parsed.data.staffId ? [parsed.data.staffId] : staffIds;
  const slotsSet = new Set<string>();
  for (const staffId of candidates) {
    const staffWindow = getStaffWindowForDate(parsed.data.date, staffId, availabilityByStaff, exceptionsByStaff);
    const window = staffWindow || salonWindow;
    if (!window) continue;
    const staffAppts = appointments.filter(a => a.staffId === staffId);
    const slots = buildSlotsForWindow({
      window,
      date: parsed.data.date,
      duration: service.duration,
      buffers,
      breakWindows,
      appointments: staffAppts,
    });
    slots.forEach(s => slotsSet.add(s));
  }

  const slots = Array.from(slotsSet).sort();
  return res.json({ slots });
});

router.post("/salons/:slug/appointments", async (req, res) => {
  const schema = z.object({
    date: z.string().min(8),
    time: z.string().min(4),
    notes: z.string().optional(),
    serviceId: z.string().optional(),
    serviceIds: z.array(z.string()).optional(),
    staffId: z.string().optional(),
    client: z.object({
      name: z.string().min(2),
      phone: z.string().min(6),
      email: z.string().email().optional(),
      notes: z.string().optional(),
    }),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane rezerwacji" });

  const slug = req.params.slug.toLowerCase();
  const salon = await prisma.salon.findUnique({ where: { slug } });
  if (!salon) return res.status(404).json({ error: "Nie znaleziono salonu o podanym linku" });

  const ids = parsed.data.serviceIds?.length
    ? parsed.data.serviceIds
    : parsed.data.serviceId
      ? [parsed.data.serviceId]
      : [];
  if (!ids.length) return res.status(400).json({ error: "Wybierz przynajmniej jedną usługę" });

  const services = await prisma.service.findMany({
    where: { salonId: salon.id, id: { in: ids }, active: true },
  });
  if (services.length !== ids.length) return res.status(400).json({ error: "Nie znaleziono usług w tym salonie" });

  const duration = services.reduce((sum, s) => sum + s.duration, 0);

  const existingClient = await prisma.client.findFirst({
    where: { salonId: salon.id, phone: parsed.data.client.phone },
  });
  const client = existingClient
    ? await prisma.client.update({
        where: { id: existingClient.id },
        data: {
          name: parsed.data.client.name,
          email: parsed.data.client.email,
          notes: parsed.data.client.notes,
          active: true,
        },
      })
    : await prisma.client.create({
        data: {
          salonId: salon.id,
          name: parsed.data.client.name,
          phone: parsed.data.client.phone,
          email: parsed.data.client.email,
          notes: parsed.data.client.notes,
        },
      });

  if (parsed.data.staffId) {
    const staffExists = await prisma.staff.findFirst({
      where: { id: parsed.data.staffId, salonId: salon.id, active: true },
      select: { id: true },
    });
    if (!staffExists) return res.status(400).json({ error: "Nie znaleziono pracownika w tym salonie" });

    const staffServiceCount = await prisma.staffService.count({
      where: { staffId: parsed.data.staffId, serviceId: { in: ids } },
    });
    if (staffServiceCount !== ids.length) {
      return res.status(400).json({ error: "Pracownik nie wykonuje wybranych usług" });
    }
  }

  const availability = await validateAppointmentAvailability({
    salonId: salon.id,
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
      salonId: salon.id,
      date: parsed.data.date,
      time: parsed.data.time,
      duration,
      notes: parsed.data.notes,
      clientId: client.id,
      staffId: parsed.data.staffId ?? null,
      appointmentServices: {
        create: services.map(s => ({ serviceId: s.id })),
      },
    },
    include: { client: true, staff: true, appointmentServices: { include: { service: true } } },
  });

  await sendEventNotification("BOOKING_CONFIRMATION", {
    ...appointment,
    salon: salon,
    client: appointment.client,
  });

  const cancelToken = await ensureCancelToken(appointment.id);
  return res.json({ appointment, cancelToken: cancelToken.token });
});

router.get("/cancel/:token", async (req, res) => {
  const token = req.params.token;
  const record = await prisma.appointmentToken.findFirst({
    where: {
      token,
      type: "CANCEL",
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      appointment: {
        include: {
          client: true,
          staff: true,
          appointmentServices: { include: { service: true } },
          salon: true,
        },
      },
    },
  });
  if (!record) return res.status(404).json({ error: "Link jest nieprawidłowy lub wygasł" });
  return res.json({ appointment: record.appointment });
});

router.get("/cancel/:token/availability", async (req, res) => {
  const token = req.params.token;
  const schema = z.object({
    date: z.string().min(8),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe parametry" });

  const record = await prisma.appointmentToken.findFirst({
    where: {
      token,
      type: "CANCEL",
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { appointment: true },
  });
  if (!record) return res.status(404).json({ error: "Link jest nieprawidłowy lub wygasł" });

  const slots = await buildSlotsForAppointment({
    id: record.appointment.id,
    salonId: record.appointment.salonId,
    date: parsed.data.date,
    staffId: record.appointment.staffId,
    duration: record.appointment.duration,
  });
  return res.json({ slots });
});

router.post("/cancel/:token/reschedule", async (req, res) => {
  const token = req.params.token;
  const schema = z.object({
    date: z.string().min(8),
    time: z.string().min(4),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane zmiany terminu" });

  const record = await prisma.appointmentToken.findFirst({
    where: {
      token,
      type: "CANCEL",
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      appointment: {
        include: {
          client: true,
          staff: true,
          appointmentServices: { include: { service: true } },
          salon: true,
        },
      },
    },
  });
  if (!record) return res.status(404).json({ error: "Link jest nieprawidłowy lub wygasł" });
  if (record.appointment.status === "CANCELLED") {
    return res.status(400).json({ error: "Wizyta jest anulowana" });
  }
  if (["COMPLETED", "NO_SHOW"].includes(record.appointment.status)) {
    return res.status(400).json({ error: "Nie można przełożyć tej wizyty" });
  }

  const availability = await validateAppointmentAvailability({
    salonId: record.appointment.salonId,
    date: parsed.data.date,
    time: parsed.data.time,
    duration: record.appointment.duration,
    staffId: record.appointment.staffId,
  });
  if (!availability.ok) {
    return res.status(409).json({ error: availability.error || "Termin jest niedostępny" });
  }

  const updated = await prisma.appointment.update({
    where: { id: record.appointment.id },
    data: { date: parsed.data.date, time: parsed.data.time, status: "SCHEDULED" },
    include: {
      client: true,
      staff: true,
      appointmentServices: { include: { service: true } },
      salon: true,
    },
  });

  await prisma.appointmentToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  await sendEventNotification("BOOKING_CONFIRMATION", updated as any);
  return res.json({ appointment: updated });
});

router.post("/cancel/:token", async (req, res) => {
  const token = req.params.token;
  const record = await prisma.appointmentToken.findFirst({
    where: {
      token,
      type: "CANCEL",
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      appointment: {
        include: {
          client: true,
          staff: true,
          appointmentServices: { include: { service: true } },
          salon: true,
        },
      },
    },
  });
  if (!record) return res.status(404).json({ error: "Link jest nieprawidłowy lub wygasł" });

  const appointment = record.appointment;
  if (appointment.status !== "CANCELLED") {
    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: "CANCELLED" },
      include: {
        client: true,
        staff: true,
        appointmentServices: { include: { service: true } },
        salon: true,
      },
    });
    await sendEventNotification("CANCELLATION", updated as any);
  }

  await prisma.appointmentToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return res.json({ ok: true });
});

router.post("/client/register", async (req, res) => {
  const schema = z.object({
    token: z.string().min(10),
    email: z.string().email().optional(),
    password: z.string().min(8),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nieprawidłowe dane rejestracji klienta" });

  const record = await prisma.appointmentToken.findFirst({
    where: {
      token: parsed.data.token,
      type: "CANCEL",
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { appointment: { include: { client: true } } },
  });
  if (!record) return res.status(404).json({ error: "Link jest nieprawidłowy lub wygasł" });

  const client = record.appointment.client;
  const existingAccount = await prisma.clientAccount.findUnique({ where: { clientId: client.id } });
  if (existingAccount) {
    return res.status(409).json({ error: "Konto klienta już istnieje" });
  }

  const finalEmail = parsed.data.email || client.email;
  if (!finalEmail) {
    return res.status(400).json({ error: "Podaj email do konta" });
  }

  const emailExists = await prisma.clientAccount.findUnique({ where: { email: finalEmail } });
  if (emailExists) {
    return res.status(409).json({ error: "Podany email jest już zajęty" });
  }

  if (client.email !== finalEmail) {
    await prisma.client.update({
      where: { id: client.id },
      data: { email: finalEmail },
    });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.clientAccount.create({
    data: { clientId: client.id, email: finalEmail, passwordHash, active: true },
  });

  const token = jwt.sign(
    { clientId: client.id, salonId: client.salonId, role: "CLIENT" },
    process.env.JWT_SECRET || "dev",
    { expiresIn: "14d" },
  );

  return res.json({ ok: true, token, clientId: client.id, salonId: client.salonId });
});

export default router;



