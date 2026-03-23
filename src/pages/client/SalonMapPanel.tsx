import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { mapStylesByPreset, type MapStylePreset } from "@/lib/googleMapStyles";
import { cn } from "@/lib/utils";
import { getPublicMapsClientConfig } from "@/lib/api";
import { markerIconDataUrl, type MapPinVariant } from "./mapMarkerIcons";

export type SalonMapMarkerVariant = MapPinVariant;

export type SalonMapMarker = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  variant: SalonMapMarkerVariant;
};

const defaultContainerStyle: CSSProperties = { width: "100%", height: "min(50vh, 420px)", borderRadius: "1rem" };
const fillContainerStyle: CSSProperties = { width: "100%", height: "100%", minHeight: "280px" };

type InnerProps = {
  apiKey: string;
  center: { lat: number; lng: number };
  zoom?: number;
  mapStylePreset?: MapStylePreset;
  markers: SalonMapMarker[];
  onMarkerClick?: (id: string) => void;
  /** Mapa wypełnia rodzica (ustaw rodzicowi np. min-h + absolute inset-0). */
  fillContainer?: boolean;
  wrapperClassName?: string;
};

function SalonMapInner({
  apiKey,
  center,
  zoom = 11,
  mapStylePreset = "default",
  markers,
  onMarkerClick,
  fillContainer = false,
  wrapperClassName,
}: InnerProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "honly-client-map",
    googleMapsApiKey: apiKey,
    libraries: ["places"],
  });

  const styledMapType = useMemo(() => mapStylesByPreset[mapStylePreset], [mapStylePreset]);
  const mapContainerStyle = fillContainer ? fillContainerStyle : defaultContainerStyle;
  const loadingMinH = fillContainer ? "min-h-[min(78dvh,820px)]" : "h-[280px]";

  if (loadError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl bg-destructive/10 px-4 text-center text-sm text-destructive",
          loadingMinH,
          fillContainer && "rounded-none",
          wrapperClassName,
        )}
      >
        Nie udało się wczytać mapy. Odśwież stronę lub spróbuj później.
      </div>
    );
  }
  if (!isLoaded) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground",
          loadingMinH,
          fillContainer && "rounded-none",
          wrapperClassName,
        )}
      >
        Ładowanie mapy…
      </div>
    );
  }

  const g = window.google.maps;

  return (
    <div
      className={cn(
        "overflow-hidden shadow-md ring-1 ring-border",
        fillContainer ? "h-full min-h-0 rounded-none ring-0" : "rounded-2xl",
        wrapperClassName,
      )}
    >
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={zoom}
        options={{
          streetViewControl: false,
          mapTypeControl: mapStylePreset === "default",
          fullscreenControl: true,
          gestureHandling: "greedy",
          ...(styledMapType ? { styles: styledMapType } : {}),
        }}
      >
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={{ lat: m.lat, lng: m.lng }}
            title={m.title}
            zIndex={m.variant === "honly" ? 100 : 20}
            icon={{
              url: markerIconDataUrl(m.variant),
              scaledSize: new g.Size(28, 36),
              anchor: new g.Point(14, 36),
            }}
            onClick={() => onMarkerClick?.(m.id)}
          />
        ))}
      </GoogleMap>
    </div>
  );
}

export function SalonMapPanel(
  props: Omit<InnerProps, "apiKey"> & { fillContainer?: boolean; wrapperClassName?: string },
) {
  const staticEnvKey = ((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim();
  const [apiKey, setApiKey] = useState<string | null>(staticEnvKey || null);
  const [resolved, setResolved] = useState<boolean>(!!staticEnvKey);

  useEffect(() => {
    let cancelled = false;
    if (staticEnvKey) {
      setApiKey(staticEnvKey);
      setResolved(true);
      return () => {
        cancelled = true;
      };
    }

    getPublicMapsClientConfig()
      .then((cfg) => {
        if (cancelled) return;
        setApiKey(cfg.googleMapsApiKey?.trim() || null);
      })
      .catch(() => {
        if (cancelled) return;
        setApiKey(null);
      })
      .finally(() => {
        if (cancelled) return;
        setResolved(true);
      });

    return () => {
      cancelled = true;
    };
  }, [staticEnvKey]);

  if (!resolved) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground leading-relaxed">
        <p className="font-medium text-foreground mb-2">Mapa Google</p>
        <p>Ładowanie konfiguracji mapy…</p>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground leading-relaxed">
        <p className="font-medium text-foreground mb-2">Mapa Google</p>
        <p>
          Brak klucza Google Maps. Ustaw{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">GOOGLE_MAPS_API_KEY</code> w środowisku backendu
          (runtime) albo <code className="rounded bg-muted px-1 py-0.5 text-xs">VITE_GOOGLE_MAPS_API_KEY</code> przed
          buildem frontendu.
        </p>
        <p className="mt-2">
          Dla punktów „w okolicy” backend także używa{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">GOOGLE_MAPS_API_KEY</code> w tym samym pliku (Places Nearby).
        </p>
      </div>
    );
  }
  return <SalonMapInner apiKey={apiKey} {...props} />;
}
