/** Normalizacja do porównań nazw/adresów (Honly ↔ Google). */
export function normText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function googlePlaceMatchesSalon(
  salon: { name: string; address: string },
  googleName: string,
  googleAddress: string,
): boolean {
  const sn = normText(salon.name);
  const sa = normText(salon.address);
  const gn = normText(googleName);
  const ga = normText(googleAddress || "");
  if (sn.length >= 4 && gn.includes(sn.slice(0, Math.min(sn.length, 12)))) return true;
  if (gn.length >= 4 && sn.includes(gn.slice(0, Math.min(gn.length, 12)))) return true;
  if (sa.length >= 10 && ga.length >= 10) {
    const saShort = sa.slice(0, 24);
    const gaShort = ga.slice(0, 24);
    if (ga.includes(saShort.slice(0, 15)) || sa.includes(gaShort.slice(0, 15))) return true;
  }
  return false;
}
