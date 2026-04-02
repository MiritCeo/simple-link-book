import { toPhoneDigits } from "./phoneDigits.js";

/** Lowercase + usuwa znaki diakrytyczne (NFD) dla porównań „łukasz” vs „Łukasz”. */
export function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}

export function clientMatchesSearchQuery(
  client: { name: string; phone: string; email: string | null },
  raw: string,
): boolean {
  const q = raw.trim();
  if (!q) return true;
  const qLower = q.toLowerCase();
  const qNorm = stripDiacritics(qLower);
  const nameNorm = stripDiacritics((client.name || "").toLowerCase());
  if (nameNorm.includes(qNorm)) return true;

  const email = (client.email || "").toLowerCase();
  if (email.includes(qLower)) return true;

  const qDigits = q.replace(/\D/g, "");
  if (qDigits.length >= 3) {
    const pDigits = toPhoneDigits(client.phone || "");
    if (pDigits.includes(qDigits)) return true;
    const tail = qDigits.length >= 9 ? qDigits.slice(-9) : qDigits;
    if (tail.length >= 3 && pDigits.endsWith(tail)) return true;
  }

  const phoneLower = (client.phone || "").toLowerCase();
  return phoneLower.includes(qLower);
}
