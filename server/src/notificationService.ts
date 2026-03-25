import crypto from "crypto";
import type { NotificationChannel, NotificationEvent } from "@prisma/client";
import prisma from "./prisma.js";
import { sendEmail, sendSms } from "./notifications.js";
import { sendFcmToTokens } from "./push/fcm.js";

type AppointmentWithRelations = {
  id: string;
  date: string;
  time: string;
  duration: number;
  status: string;
  clientId?: string;
  salonId: string;
  client: { name: string; phone: string; email?: string | null };
  staff?: { name: string | null } | null;
  appointmentServices: { service: { name: string } }[];
  salon?: { name: string; slug: string } | null;
};

const renderTemplate = (input: string, ctx: Record<string, string>) => {
  return Object.entries(ctx).reduce((acc, [key, value]) => acc.replaceAll(`{${key}}`, value), input);
};

const publicAppUrl = (process.env.PUBLIC_APP_URL?.trim() || "https://honly.app").replace(/\/$/, "");

export const ensureCancelToken = async (appointmentId: string) => {
  const existing = await prisma.appointmentToken.findFirst({
    where: {
      appointmentId,
      type: "CANCEL",
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return prisma.appointmentToken.create({
    data: { appointmentId, token, type: "CANCEL", expiresAt },
  });
};

const ensureNotificationSettings = async (salonId: string) => {
  const existing = await prisma.notificationSetting.findMany({
    where: { salonId },
    select: { event: true },
  });
  const existingEvents = new Set(existing.map(e => e.event));
  const defaults: Array<{
    salonId: string;
    event: NotificationEvent;
    smsEnabled: boolean;
    emailEnabled: boolean;
    timingMinutes?: number;
  }> = [
    { salonId, event: "BOOKING_CONFIRMATION", smsEnabled: true, emailEnabled: true },
    { salonId, event: "REMINDER_24H", smsEnabled: true, emailEnabled: false, timingMinutes: 24 * 60 },
    { salonId, event: "REMINDER_2H", smsEnabled: true, emailEnabled: false, timingMinutes: 2 * 60 },
    { salonId, event: "CANCELLATION", smsEnabled: true, emailEnabled: true },
    { salonId, event: "FOLLOWUP", smsEnabled: false, emailEnabled: true, timingMinutes: 60 },
  ];
  const missing = defaults.filter(d => !existingEvents.has(d.event as any));
  if (!missing.length) return;
  await prisma.notificationSetting.createMany({ data: missing });
};

export async function sendEventNotification(
  event: "BOOKING_CONFIRMATION" | "CANCELLATION" | "REMINDER_24H" | "REMINDER_2H" | "FOLLOWUP",
  appointment: AppointmentWithRelations,
  channels?: NotificationChannel[],
) {
  await ensureNotificationSettings(appointment.salonId);
  const setting = await prisma.notificationSetting.findUnique({
    where: { salonId_event: { salonId: appointment.salonId, event } },
  });
  if (!setting) return;

  const templates = await prisma.notificationTemplate.findMany({
    where: { salonId: appointment.salonId, event, active: true },
  });

  const serviceLabel = appointment.appointmentServices.map(s => s.service.name).join(", ");
  const cancelToken = await ensureCancelToken(appointment.id);
  const ctx = {
    client_name: appointment.client.name,
    date: appointment.date,
    time: appointment.time,
    service: serviceLabel,
    staff: appointment.staff?.name || "Dowolny",
    salon_name: appointment.salon?.name || "Salon",
    cancel_link: `${publicAppUrl}/cancel/${cancelToken.token}`,
  };

  const shouldSendSms = setting.smsEnabled && (!channels || channels.includes("SMS"));
  const shouldSendEmail = setting.emailEnabled && (!channels || channels.includes("EMAIL"));

  const defaultBody = (channel: "SMS" | "EMAIL") => {
    switch (event) {
      case "BOOKING_CONFIRMATION":
        return `Twoja wizyta w {salon_name} dnia {date} o {time} została potwierdzona. Link do zarządzania wizytą i rejestracji konta: {cancel_link}`;
      case "REMINDER_24H":
      case "REMINDER_2H":
        return `Przypomnienie: Twoja wizyta w {salon_name} dnia {date} o {time}.`;
      case "CANCELLATION":
        return `Twoja wizyta w {salon_name} dnia {date} o {time} została anulowana.`;
      case "FOLLOWUP":
        return `Dziękujemy za wizytę {date} {time}. Zapraszamy ponownie!`;
      default:
        return `Wizyta: {date} {time}, {service}.`;
    }
  };
  const defaultSubject = () => {
    switch (event) {
      case "BOOKING_CONFIRMATION":
        return "Potwierdzenie wizyty";
      case "REMINDER_24H":
      case "REMINDER_2H":
        return "Przypomnienie o wizycie";
      case "CANCELLATION":
        return "Wizyta anulowana";
      case "FOLLOWUP":
        return "Dziękujemy za wizytę";
      default:
        return "Wiadomość z salonu";
    }
  };

  if (shouldSendSms) {
    const smsTemplate = templates.find(t => t.channel === "SMS");
    let body = smsTemplate?.body?.trim() ? smsTemplate.body : defaultBody("SMS");
    if (event === "BOOKING_CONFIRMATION" && !body.includes("{cancel_link}")) {
      body = `${body} Link: {cancel_link}`;
    }
    const content = `[${ctx.salon_name}] ${renderTemplate(body, ctx)}`;
    await sendSms(appointment.client.phone, content, appointment.salon?.name);
  }

  if (shouldSendEmail && appointment.client.email) {
    const emailTemplate = templates.find(t => t.channel === "EMAIL");
    const subject = emailTemplate?.subject?.trim() ? emailTemplate.subject : defaultSubject();
    let body = emailTemplate?.body?.trim() ? emailTemplate.body : defaultBody("EMAIL");
    if (event === "BOOKING_CONFIRMATION" && !body.includes("{cancel_link}")) {
      body = `${body}\n\nLink: {cancel_link}`;
    }
    await sendEmail(appointment.client.email, subject, renderTemplate(body, ctx));
  }

  // PUSH (FCM) - deduplikacja per wizyta + typ zdarzenia
  // Uwaga: mechanizm push jest niezależny od SMS/EMAIL, ale uruchamiany jest z poziomu
  // istniejącego flow (tj. scheduler wywołuje sendEventNotification tylko gdy wysyła SMS lub EMAIL).
  try {
    const pushClientId = appointment.clientId;
    if (!pushClientId) return;

    const p = prisma as any;
    const existingPush = await p.pushLog?.findFirst?.({
      where: { appointmentId: appointment.id, event },
      select: { id: true },
    });
    if (existingPush) return;

    const clientAccount = await prisma.clientAccount.findUnique({
      where: { clientId: pushClientId },
      select: { id: true },
    });
    if (!clientAccount) return;

    const tokenRows: Array<{ token: string }> = [];
    if (p.pushDeviceToken?.findMany) {
      const rows = await p.pushDeviceToken.findMany({
        where: { clientAccountId: clientAccount.id },
        select: { token: true },
      });
      tokenRows.push(...(rows as Array<{ token: string }>));
    }
    const tokens = tokenRows.map(r => r.token);

    if (!tokens?.length) return;

    const pushTitle = appointment.salon?.name ? `Powiadomienia: ${appointment.salon.name}` : "Powiadomienia";
    const defaultPushBody = () => {
      switch (event) {
        case "BOOKING_CONFIRMATION":
          return "Twoja wizyta w {salon_name} jest potwierdzona {date} o {time}.";
        case "REMINDER_24H":
          return "Przypomnienie: wizyta w {salon_name} {date} o {time}.";
        case "REMINDER_2H":
          return "Przypomnienie (2h): wizyta w {salon_name} {date} o {time}.";
        case "CANCELLATION":
          return "Twoja wizyta w {salon_name} {date} o {time} została anulowana.";
        case "FOLLOWUP":
          return "Dziękujemy za wizytę! Jeśli chcesz, umów kolejną.";
        default:
          return "Masz nowe powiadomienie.";
      }
    };

    const payloadBody = renderTemplate(defaultPushBody(), ctx);
    const result = await sendFcmToTokens(tokens, {
      title: pushTitle,
      body: payloadBody,
      data: {
        event,
        appointmentId: appointment.id,
        client_name: appointment.client.name || "",
        salon_name: ctx.salon_name || "",
        date: appointment.date || "",
        time: appointment.time || "",
        cancel_link: ctx.cancel_link || "",
      },
    });

    if (result.ok && result.successCount > 0) {
      await p.pushLog.create({
        data: { appointmentId: appointment.id, event },
      });
    }
  } catch (err) {
    // Nie psujemy flow SMS/EMAIL — push ma być "best effort"
    console.error("[push] sendEventNotification error:", err);
  }
}

