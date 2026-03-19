export const normalizeAssetUrl = (value?: string | null) => {
  if (!value) return value || "";
  if (typeof window === "undefined") return value;
  try {
    const url = new URL(value, window.location.origin);
    if (url.pathname.startsWith("/uploads/")) {
      return `${window.location.origin}${url.pathname}`;
    }
    if (url.protocol === "http:") {
      return `https://${url.host}${url.pathname}${url.search}${url.hash}`;
    }
    return url.toString();
  } catch {
    return value;
  }
};
