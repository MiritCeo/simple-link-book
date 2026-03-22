export type MapPinVariant = "honly" | "google_external";

/** Primary honly (~348°) i neutralny szary dla punktów tylko z Google. */
const HONLY_FILL = "#b8566f";
const HONLY_STROKE = "#7d3a4d";
const EXTERNAL_FILL = "#64748b";
const EXTERNAL_STROKE = "#334155";

export function markerIconDataUrl(variant: MapPinVariant): string {
  const fill = variant === "honly" ? HONLY_FILL : EXTERNAL_FILL;
  const stroke = variant === "honly" ? HONLY_STROKE : EXTERNAL_STROKE;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
    <path fill="${fill}" stroke="${stroke}" stroke-width="1.25" d="M16 1C8.8 1 3 6.6 3 13.5c0 10.5 13 26.5 13 26.5s13-16 13-26.5C29 6.6 23.2 1 16 1z"/>
    <circle cx="16" cy="14" r="4.2" fill="white" opacity="0.95"/>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
