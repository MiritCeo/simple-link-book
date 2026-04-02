import type { Client, Prisma, PrismaClient } from "@prisma/client";

/** Jak frontend — obcina błędnie złączone ID (import CSV itd.). */
export function sanitizeClientId(id: string | undefined | null): string {
  if (id == null) return "";
  const s = String(id).trim();
  if (!s) return "";

  const dash = s.indexOf("-");
  if (dash >= 20 && dash <= 36) {
    const head = s.slice(0, dash);
    const tail = s.slice(dash + 1).trim();
    if (/^[a-z][a-z0-9]{18,31}$/i.test(head) && /^\+?[\d\s-]{8,}$/.test(tail)) {
      return head;
    }
  }

  const glued = s.match(/^([a-z][a-z0-9]{18,31})(\+\d[\d\s-]{8,})$/i);
  if (glued) return glued[1];

  return s;
}

/** Znajduje klienta po parametrze z URL lub „naprawionym” CUID — w bazie może zostać pełny zepsuty id (cuid-+48…). */
export function buildClientWhereByParam(paramId: string): Prisma.ClientWhereInput {
  const raw = decodeURIComponent(String(paramId).trim());
  const base = sanitizeClientId(raw);
  const exact = new Set([raw, base].filter(Boolean));
  const or: Prisma.ClientWhereInput[] = [...exact].map((id) => ({ id }));
  if (base.length >= 12) {
    or.push({ id: { startsWith: `${base}-` } }, { id: { startsWith: `${base}+` } });
  }
  return { OR: or };
}

/** Warunek na clientId w wizytach (to samo co buildClientWhereByParam, pole clientId). */
export function buildAppointmentClientIdWhere(paramId: string): Prisma.AppointmentWhereInput {
  const raw = decodeURIComponent(String(paramId).trim());
  const base = sanitizeClientId(raw);
  const exact = new Set([raw, base].filter(Boolean));
  const or: Prisma.AppointmentWhereInput[] = [...exact].map((id) => ({ clientId: id }));
  if (base.length >= 12) {
    or.push(
      { clientId: { startsWith: `${base}-` } },
      { clientId: { startsWith: `${base}+` } },
    );
  }
  return { OR: or };
}

/**
 * Gdy pasuje kilka wierszy (CUID + duplikat z importu), wybierz właściwy: dokładnie param z URL,
 * jedyny kandydat, albo dłuższe id (wizyty często wskazują na „pełny” zepsuty klucz).
 */
export function pickClientWhenAmbiguous(candidates: Client[], rawParam: string): Client | null {
  if (candidates.length === 0) return null;
  const exact = candidates.find((c) => c.id === rawParam);
  if (exact) return exact;
  if (candidates.length === 1) return candidates[0];
  return candidates.reduce((a, b) => (a.id.length >= b.id.length ? a : b));
}

export async function resolveClientForSalon(
  db: PrismaClient,
  salonId: string,
  paramId: string,
): Promise<Client | null> {
  const rawParam = decodeURIComponent(String(paramId).trim());
  const candidates = await db.client.findMany({
    where: { salonId, ...buildClientWhereByParam(paramId) },
    take: 32,
  });
  return pickClientWhenAmbiguous(candidates, rawParam);
}
