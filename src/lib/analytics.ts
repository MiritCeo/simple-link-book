/** Musi być zgodne z ID w `index.html` (Google tag). */
export const GA_MEASUREMENT_ID = "G-XR8SBRXNXC";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/** Wyślij odsłonę strony do GA4 (SPA — po zmianie trasy). */
export function trackPageView(pathWithSearch: string) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("config", GA_MEASUREMENT_ID, {
    page_path: pathWithSearch,
    page_title: document.title,
    page_location: `${window.location.origin}${pathWithSearch}`,
  });
}
