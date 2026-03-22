/** Zwraca same cyfry, dla PL zwykle 48 + 9 cyfr (11 znaków). */
export function toPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Porównanie numerów zapisanych w różnych formatach (+48 …, 48…, 9 cyfr). */
export function phonesMatchDigits(a: string, b: string): boolean {
  const da = toPhoneDigits(a);
  const db = toPhoneDigits(b);
  if (da === db) return true;
  const na = da.length === 9 && !da.startsWith("48") ? `48${da}` : da;
  const nb = db.length === 9 && !db.startsWith("48") ? `48${db}` : db;
  if (na === nb) return true;
  const tail = (s: string) => (s.length > 9 ? s.slice(-9) : s);
  return tail(na) === tail(nb);
}
