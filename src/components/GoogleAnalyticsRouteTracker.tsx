import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/lib/analytics";

/**
 * Wysyła page_view do gtag przy każdej nawigacji w SPA (bez pełnego przeładowania).
 * Pierwsze wyrenderowanie pomijamy — pierwszą odsłonę wysyła już skrypt z `index.html`.
 */
export function GoogleAnalyticsRouteTracker() {
  const location = useLocation();
  const isFirst = useRef(true);

  useEffect(() => {
    const path = `${location.pathname}${location.search}`;
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    trackPageView(path);
  }, [location.pathname, location.search]);

  return null;
}
