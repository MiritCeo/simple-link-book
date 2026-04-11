type FetchFn = (input: any, init?: any) => Promise<any>;

const getFetch = (): FetchFn | null => {
  const fetchFn = (globalThis as any).fetch as FetchFn | undefined;
  return fetchFn ?? null;
};

/** Stopka promująca apkę (jeden URL dla iOS i Android). Używana na końcu każdego wysłanego SMS. */
const DEFAULT_SMS_MARKETING_FOOTER = "Apka Honly: https://honly.app/aplikacja";

/** Zwraca treść stopki lub null, jeśli wyłączono (`SMS_APPEND_MARKETING_FOOTER=false`). */
function getSmsMarketingFooter(): string | null {
  const off = process.env.SMS_APPEND_MARKETING_FOOTER?.trim().toLowerCase();
  if (off === "0" || off === "false" || off === "no") return null;
  const custom = process.env.SMS_MARKETING_FOOTER?.trim();
  return custom || DEFAULT_SMS_MARKETING_FOOTER;
}

/** Dokleja stopkę do treści SMS (idempotentnie — nie duplikuje). */
function appendSmsMarketingFooter(message: string): string {
  const footer = getSmsMarketingFooter();
  if (!footer) return message;
  const trimmed = message.trimEnd();
  if (trimmed.endsWith(footer)) return message;
  return `${trimmed}\n${footer}`;
}

const normalizeSender = (input?: string | null) => {
  if (!input) return null;
  const normalized = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, " ");
  const sender = normalized.slice(0, 11);
  return sender.length ? sender : null;
};

const sendSmsRequest = async (to: string, message: string, from?: string | null) => {
  const fetchFn = getFetch();
  if (!fetchFn) return { ok: false, error: "Brak dostępnego fetch" };

  const body = new URLSearchParams({
    to,
    message,
    format: "json",
    encoding: "utf-8",
    ...(from ? { from } : {}),
  });

  const res = await fetchFn("https://api.smsapi.pl/sms.do", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SMSAPI_API_KEY || process.env.SMSAPI_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const text = await res.text().catch(() => "");
  let parsed: any = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }
  if (parsed && typeof parsed === "object" && "error" in parsed) {
    return { ok: false, error: parsed.message || "Błąd SMSAPI" };
  }
  if (!res.ok) {
    return { ok: false, error: text || `Błąd SMSAPI: ${res.status}` };
  }
  return { ok: true };
};

export async function sendSms(to: string, message: string, senderName?: string | null) {
  const token = process.env.SMSAPI_API_KEY || process.env.SMSAPI_KEY;
  if (!token) return;

  const body = appendSmsMarketingFooter(message);
  const from = normalizeSender(process.env.SMSAPI_FROM);
  try {
    const primary = await sendSmsRequest(to, body, from);
    if (primary.ok) return primary;
    if (from) {
      const fallback = await sendSmsRequest(to, body, null);
      if (fallback.ok) return fallback;
      // eslint-disable-next-line no-console
      console.warn("Błąd SMSAPI", { primary: primary.error, fallback: fallback.error });
      return fallback;
    }
    // eslint-disable-next-line no-console
    console.warn("Błąd SMSAPI", primary.error);
    return primary;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("Błąd SMSAPI", err);
    return { ok: false, error: "Błąd SMSAPI" };
  }
}

function sendGridSandboxEnabled() {
  const v = process.env.SENDGRID_SANDBOX_MODE?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  const from = process.env.SENDGRID_FROM?.trim();
  if (!apiKey || !from) {
    return { ok: false as const, reason: "missing_config" as const };
  }
  const fetchFn = getFetch();
  if (!fetchFn) {
    return { ok: false as const, reason: "fetch_unavailable" as const };
  }

  const sandbox = sendGridSandboxEnabled();
  const plain = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  const payload: Record<string, unknown> = {
    personalizations: [{ to: [{ email: to }] }],
    from: {
      email: from,
      ...(process.env.SENDGRID_FROM_NAME?.trim() ? { name: process.env.SENDGRID_FROM_NAME.trim() } : {}),
    },
    subject,
    content: [
      { type: "text/plain", value: plain || subject },
      { type: "text/html", value: html },
    ],
  };
  if (sandbox) {
    payload.mail_settings = { sandbox_mode: { enable: true } };
  }

  try {
    const res = await fetchFn("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const messageId = res.headers.get("x-message-id") || undefined;
    if (res.ok && sandbox) {
      // eslint-disable-next-line no-console
      console.info("SendGrid: sandbox — żądanie OK, e-mail nie został dostarczony (tylko walidacja API)", {
        to,
        subject,
        messageId,
      });
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      // eslint-disable-next-line no-console
      console.warn("SendGrid error", { status: res.status, body: text });
      return { ok: false as const, reason: "sendgrid_error" as const, status: res.status, body: text };
    }
    return { ok: true as const, sandbox, messageId };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("SendGrid error", err);
    return { ok: false as const, reason: "exception" as const };
  }
}

