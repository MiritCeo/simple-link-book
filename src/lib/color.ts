export const getReadableTextColor = (hex?: string) => {
  if (!hex) return "#fff";
  const cleaned = hex.replace("#", "").trim();
  if (cleaned.length !== 6) return "#fff";
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111827" : "#ffffff";
};
