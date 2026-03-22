/** Koniec wizyty: data + godzina startu + czas trwania (min). */
export function appointmentEndDate(apt: { date: string; time: string; duration: number }): Date {
  const iso = `${apt.date}T${apt.time.length === 5 ? apt.time : apt.time.slice(0, 5)}:00`;
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return new Date(NaN);
  return new Date(start.getTime() + apt.duration * 60_000);
}

const RATING_WINDOW_MS = 24 * 60 * 60 * 1000;

const BLOCKED = new Set(["CANCELLED", "NO_SHOW"]);

export function canRateAppointment(
  apt: { date: string; time: string; duration: number; status: string },
  now: Date = new Date(),
): { ok: boolean; reason?: string } {
  if (BLOCKED.has(apt.status)) return { ok: false, reason: "visit_invalid_status" };
  const end = appointmentEndDate(apt);
  if (Number.isNaN(end.getTime())) return { ok: false, reason: "invalid_datetime" };
  if (now.getTime() < end.getTime()) return { ok: false, reason: "visit_not_ended" };
  if (now.getTime() > end.getTime() + RATING_WINDOW_MS) return { ok: false, reason: "rating_window_closed" };
  return { ok: true };
}
