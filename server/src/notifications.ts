type FetchFn = (input: any, init?: any) => Promise<any>;

const getFetch = (): FetchFn | null => {
  const fetchFn = (globalThis as any).fetch as FetchFn | undefined;
  return fetchFn ?? null;
};

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

  const from = normalizeSender(process.env.SMSAPI_FROM);
  try {
    const primary = await sendSmsRequest(to, message, from);
    if (primary.ok) return primary;
    if (from) {
      const fallback = await sendSmsRequest(to, message, null);
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

export async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.SENDGRID_FROM;
  if (!apiKey || !from) return;
  const fetchFn = getFetch();
  if (!fetchFn) return;

  const payload = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: from, ...(process.env.SENDGRID_FROM_NAME ? { name: process.env.SENDGRID_FROM_NAME } : {}) },
    subject,
    content: [{ type: "text/html", value: html }],
  };

  try {
    const res = await fetchFn("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      // eslint-disable-next-line no-console
      console.warn("SendGrid error", { status: res.status, body: text });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("SendGrid error", err);
  }
}

