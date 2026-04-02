/**
 * Obcina błędnie złączone ID klienta (np. po imporcie CSV: `cuid-+48 500 …`).
 * Prawidłowe CUID/cuid2 to zwykle 20–32 znaki [a-z0-9].
 */
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
