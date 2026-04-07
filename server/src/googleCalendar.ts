import { google } from "googleapis";
import prisma from "./prisma.js";

const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const DEFAULT_TZ = process.env.GOOGLE_CALENDAR_TIMEZONE || "Europe/Warsaw";

const getOAuthClient = (redirectUri?: string) => {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("google_oauth_not_configured");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri || process.env.GOOGLE_OAUTH_REDIRECT_URI);
};

export const getGoogleCalendarConfigStatus = () => {
  return {
    configured: Boolean(
      process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
      process.env.GOOGLE_OAUTH_REDIRECT_URI,
    ),
    redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || null,
    scope: GOOGLE_CALENDAR_SCOPE,
  };
};

export const buildGoogleOAuthUrl = (state: string) => {
  const oauth = getOAuthClient(process.env.GOOGLE_OAUTH_REDIRECT_URI);
  return oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [GOOGLE_CALENDAR_SCOPE],
    state,
    include_granted_scopes: true,
  });
};

export const exchangeGoogleOAuthCode = async (code: string) => {
  const oauth = getOAuthClient(process.env.GOOGLE_OAUTH_REDIRECT_URI);
  const { tokens } = await oauth.getToken(code);
  oauth.setCredentials(tokens);
  const oauth2Api = google.oauth2({ version: "v2", auth: oauth });
  const me = await oauth2Api.userinfo.get();
  return {
    tokens,
    email: me.data.email || null,
  };
};

export const connectSalonGoogleCalendar = async (salonId: string, payload: {
  accessToken: string;
  refreshToken?: string | null;
  expiryDate?: number | null;
  googleAccountEmail?: string | null;
  googleCalendarId?: string;
  googleCalendarName?: string | null;
}) => {
  return prisma.salonGoogleCalendarConnection.upsert({
    where: { salonId },
    create: {
      salonId,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken || null,
      tokenExpiresAt: payload.expiryDate ? new Date(payload.expiryDate) : null,
      googleAccountEmail: payload.googleAccountEmail || null,
      googleCalendarId: payload.googleCalendarId || "primary",
      googleCalendarName: payload.googleCalendarName || "primary",
      syncEnabled: true,
      syncHorizonDays: 180,
      lastSyncError: null,
    },
    update: {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken || undefined,
      tokenExpiresAt: payload.expiryDate ? new Date(payload.expiryDate) : null,
      googleAccountEmail: payload.googleAccountEmail || null,
      googleCalendarId: payload.googleCalendarId || "primary",
      googleCalendarName: payload.googleCalendarName || "primary",
      syncEnabled: true,
      lastSyncError: null,
    },
  });
};

const appointmentStartDate = (date: string, time: string) => new Date(`${date}T${time}:00`);

const isInsideHorizon = (date: string, time: string, horizonDays: number) => {
  const start = appointmentStartDate(date, time);
  const now = new Date();
  const horizon = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000);
  return start >= now && start <= horizon;
};

const appointmentToGoogleEvent = (appointment: any) => {
  const start = appointmentStartDate(appointment.date, appointment.time);
  const end = new Date(start.getTime() + (appointment.duration || 0) * 60_000);
  const toLocalDateTime = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const sec = String(d.getSeconds()).padStart(2, "0");
    return `${y}-${m}-${day}T${h}:${min}:${sec}`;
  };
  const serviceNames = (appointment.appointmentServices || [])
    .map((as: any) => as.service?.name)
    .filter(Boolean)
    .join(", ");
  const title = `${appointment.client?.name || "Klient"}${serviceNames ? ` • ${serviceNames}` : ""}`;
  const lines = [
    appointment.client?.phone ? `Telefon: ${appointment.client.phone}` : "",
    appointment.client?.email ? `Email: ${appointment.client.email}` : "",
    appointment.staff?.name ? `Specjalista: ${appointment.staff.name}` : "Specjalista: Dowolny",
    appointment.notes ? `Notatka: ${appointment.notes}` : "",
    `Wizyta #${appointment.id}`,
    "Utworzone przez honly.pl",
  ].filter(Boolean);
  return {
    summary: title,
    description: lines.join("\n"),
    start: {
      dateTime: toLocalDateTime(start),
      timeZone: DEFAULT_TZ,
    },
    end: {
      dateTime: toLocalDateTime(end),
      timeZone: DEFAULT_TZ,
    },
    status: appointment.status === "CANCELLED" ? "cancelled" : "confirmed",
  };
};

const withCalendar = async (
  salonId: string,
  fn: (ctx: { calendar: ReturnType<typeof google.calendar>; connection: any }) => Promise<void>,
) => {
  const connection = await prisma.salonGoogleCalendarConnection.findUnique({ where: { salonId } });
  if (!connection || !connection.syncEnabled) return;
  try {
    const oauth = getOAuthClient(process.env.GOOGLE_OAUTH_REDIRECT_URI);
    oauth.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken || undefined,
      expiry_date: connection.tokenExpiresAt?.getTime(),
    });
    const calendar = google.calendar({ version: "v3", auth: oauth });
    await fn({ calendar, connection });
    await prisma.salonGoogleCalendarConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: oauth.credentials.access_token || connection.accessToken,
        refreshToken: oauth.credentials.refresh_token || connection.refreshToken,
        tokenExpiresAt: oauth.credentials.expiry_date ? new Date(oauth.credentials.expiry_date) : connection.tokenExpiresAt,
        lastSyncAt: new Date(),
        lastSyncError: null,
      },
    });
  } catch (error: any) {
    await prisma.salonGoogleCalendarConnection.update({
      where: { salonId },
      data: { lastSyncError: String(error?.message || "google_calendar_sync_error") },
    }).catch(() => {});
    throw error;
  }
};

export const syncAppointmentToGoogleCalendar = async (appointmentId: string) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      client: true,
      staff: true,
      appointmentServices: { include: { service: true } },
      salon: true,
    },
  });
  if (!appointment) return;

  await withCalendar(appointment.salonId, async ({ calendar, connection }) => {
    const mapping = await prisma.salonGoogleCalendarEvent.findUnique({ where: { appointmentId: appointment.id } });
    if (!isInsideHorizon(appointment.date, appointment.time, connection.syncHorizonDays || 180)) {
      return;
    }
    const eventPayload = appointmentToGoogleEvent(appointment);
    if (mapping?.googleEventId) {
      await calendar.events.patch({
        calendarId: connection.googleCalendarId,
        eventId: mapping.googleEventId,
        requestBody: eventPayload,
      });
      await prisma.salonGoogleCalendarEvent.update({
        where: { id: mapping.id },
        data: { syncedAt: new Date() },
      });
      return;
    }
    const created = await calendar.events.insert({
      calendarId: connection.googleCalendarId,
      requestBody: eventPayload,
    });
    const googleEventId = created.data.id;
    if (!googleEventId) return;
    await prisma.salonGoogleCalendarEvent.create({
      data: {
        salonId: appointment.salonId,
        appointmentId: appointment.id,
        googleEventId,
      },
    });
  });
};

export const cancelAppointmentInGoogleCalendar = async (appointmentId: string) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, salonId: true },
  });
  if (!appointment) return;
  await withCalendar(appointment.salonId, async ({ calendar, connection }) => {
    const mapping = await prisma.salonGoogleCalendarEvent.findUnique({ where: { appointmentId } });
    if (!mapping?.googleEventId) return;
    await calendar.events.patch({
      calendarId: connection.googleCalendarId,
      eventId: mapping.googleEventId,
      requestBody: { status: "cancelled" },
    });
    await prisma.salonGoogleCalendarEvent.update({
      where: { id: mapping.id },
      data: { syncedAt: new Date() },
    });
  });
};

export const syncSalonFutureAppointmentsToGoogleCalendar = async (salonId: string) => {
  const connection = await prisma.salonGoogleCalendarConnection.findUnique({ where: { salonId } });
  if (!connection?.syncEnabled) return { synced: 0 };

  const now = new Date();
  const horizon = new Date(now.getTime() + (connection.syncHorizonDays || 180) * 24 * 60 * 60 * 1000);
  const from = now.toISOString().slice(0, 10);
  const to = horizon.toISOString().slice(0, 10);
  const appointments = await prisma.appointment.findMany({
    where: {
      salonId,
      date: { gte: from, lte: to },
    },
    orderBy: [{ date: "asc" }, { time: "asc" }],
    select: { id: true, status: true },
  });

  let synced = 0;
  for (const apt of appointments) {
    if (apt.status === "CANCELLED" || apt.status === "NO_SHOW") {
      await cancelAppointmentInGoogleCalendar(apt.id);
      synced += 1;
      continue;
    }
    await syncAppointmentToGoogleCalendar(apt.id);
    synced += 1;
  }
  await prisma.salonGoogleCalendarConnection.update({
    where: { salonId },
    data: { lastSyncAt: new Date(), lastSyncError: null },
  });
  return { synced };
};

