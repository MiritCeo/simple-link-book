import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Info, Search, SlidersHorizontal, X } from "lucide-react";
import { PageTransition } from "@/components/motion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import type { MapStylePreset } from "@/lib/googleMapStyles";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  addClientFavoriteGooglePlace,
  addClientFavoriteSalon,
  attachClientSalon,
  getClientFavorites,
  getClientRatingPending,
  getClientSalons,
  getPlacesNearby,
  getPublicSalonCatalog,
  postClientRating,
  removeClientFavoriteGooglePlace,
  removeClientFavoriteSalon,
  switchClientSalon,
} from "@/lib/api";
import { SalonMapPanel, type SalonMapMarker } from "./SalonMapPanel";

type CatalogSalon = {
  id: string;
  slug: string;
  name: string;
  address: string;
  phone?: string;
  latitude?: number | null;
  longitude?: number | null;
  avgStars?: number | null;
  ratingCount?: number;
};

type NearbyPlace = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  isHonly: boolean;
  matchedSalonId: string | null;
  matchedSalonSlug: string | null;
};

type ClientFavoriteSalonRow = { salonId: string; favoriteId?: string };
type ClientFavoriteGoogleRow = { googlePlaceId: string; favoriteId: string };

function FavoritesInviteDisclaimer({ className }: { className?: string }) {
  return (
    <Alert className={cn("rounded-2xl border-primary/20 bg-primary/5 text-foreground", className)}>
      <Info className="h-4 w-4 text-primary" />
      <AlertTitle className="text-sm">Pomóż swojemu ulubionemu salonowi</AlertTitle>
      <AlertDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
        <p>
          Jeśli salon, do którego chodzisz, nie korzysta jeszcze z naszej aplikacji, będzie nam niezmiernie miło, jeśli
          wspomnisz mu o{" "}
          <a
            href="https://honly.app"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            honly.app
          </a>
          — prostsze zarządzanie wizytami i kalendarzem pomoże też Tobie umawiać się na kolejne wizyty wygodniej,
          w jednym miejscu.
        </p>
      </AlertDescription>
    </Alert>
  );
}

/** Liczba salonów w honly — poprawna odmiana po polsku. */
function polishSalonsInCatalogLabel(n: number): string {
  if (n === 1) return "1 salon w honly";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${n} salony w honly`;
  }
  return `${n} salonów w honly`;
}

function polishPlacesOnMapLabel(n: number): string {
  if (n === 1) return "1 miejsce na mapie";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${n} miejsca na mapie`;
  }
  return `${n} miejsc na mapie`;
}

function StarsPicker({ onPick, disabled }: { onPick: (n: number) => void; disabled?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          className="text-2xl leading-none text-amber-500 hover:scale-110 transition-transform disabled:opacity-40"
          onClick={() => onPick(n)}
          aria-label={`${n} gwiazdek`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export type ClientSalonsMode = "favorites" | "explore";

export default function ClientSalons({ mode }: { mode: ClientSalonsMode }) {
  const navigate = useNavigate();
  const [linkedSalons, setLinkedSalons] = useState<
    Array<{
      id: string;
      name: string;
      slug: string;
      clientId: string;
      address?: string;
      latitude?: number | null;
      longitude?: number | null;
    }>
  >([]);
  const [activeSalonId, setActiveSalonId] = useState<string | null>(localStorage.getItem("client_salon_id"));
  const [attachToken, setAttachToken] = useState("");
  const [attachingSalon, setAttachingSalon] = useState(false);

  const [pendingRatings, setPendingRatings] = useState<any[]>([]);
  const [ratingSubmit, setRatingSubmit] = useState<string | null>(null);

  const [favHonly, setFavHonly] = useState<any[]>([]);
  const [favGoogle, setFavGoogle] = useState<any[]>([]);

  const [catalogQ, setCatalogQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [catalog, setCatalog] = useState<CatalogSalon[]>([]);
  const [googleFilter, setGoogleFilter] = useState<"all" | "honly" | "nonhonly">("all");
  const [nearby, setNearby] = useState<NearbyPlace[]>([]);
  const [googleOk, setGoogleOk] = useState(false);
  const [googlePlacesNote, setGooglePlacesNote] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 52.13, lng: 19.3 });
  const [nearbyOrigin, setNearbyOrigin] = useState<{ lat: number; lng: number }>({ lat: 52.13, lng: 19.3 });
  const [nearbyRadiusM, setNearbyRadiusM] = useState(8000);
  const [mapStylePreset, setMapStylePreset] = useState<MapStylePreset>("minimal");
  const [showHonlyOnMap, setShowHonlyOnMap] = useState(true);
  const [showGoogleExternalOnMap, setShowGoogleExternalOnMap] = useState(true);
  const [catalogMinStars, setCatalogMinStars] = useState<number | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [togglingFavoriteKey, setTogglingFavoriteKey] = useState<string | null>(null);

  const favoriteSalonIdSet = useMemo(() => {
    return new Set<string>((favHonly as ClientFavoriteSalonRow[]).map((f) => f.salonId));
  }, [favHonly]);

  const googlePlaceToFavoriteId = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of favGoogle as ClientFavoriteGoogleRow[]) {
      if (f?.googlePlaceId && f?.favoriteId) m.set(f.googlePlaceId, f.favoriteId);
    }
    return m;
  }, [favGoogle]);

  const isCatalogSalonFavorite = (salonId: string) => favoriteSalonIdSet.has(salonId);

  const isNearbyPlaceFavorite = (p: NearbyPlace) => {
    if (p.isHonly && p.matchedSalonId) return favoriteSalonIdSet.has(p.matchedSalonId);
    return googlePlaceToFavoriteId.has(p.placeId);
  };

  const loadLinked = async () => {
    const res = await getClientSalons();
    setLinkedSalons(res.salons || []);
    if (res.activeSalonId) {
      setActiveSalonId(res.activeSalonId);
      localStorage.setItem("client_salon_id", res.activeSalonId);
    }
  };

  const loadFavoritesAndPending = async () => {
    try {
      const [fav, pen] = await Promise.all([getClientFavorites(), getClientRatingPending()]);
      setFavHonly(fav.honlySalons || []);
      setFavGoogle(fav.googlePlaces || []);
      setPendingRatings(pen.pending || []);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    loadLinked().catch(() => {});
    loadFavoritesAndPending().catch(() => {});
  }, [mode]);

  useEffect(() => {
    if (mode !== "explore") return;
    const t = setTimeout(() => setDebouncedQ(catalogQ.trim()), 320);
    return () => clearTimeout(t);
  }, [catalogQ, mode]);

  useEffect(() => {
    if (mode !== "explore") return;
    let cancelled = false;
    (async () => {
      setLoadingCatalog(true);
      try {
        const res = await getPublicSalonCatalog({ q: debouncedQ || undefined, page: 1, limit: 60 });
        if (!cancelled) setCatalog(res.salons || []);
      } catch {
        if (!cancelled) setCatalog([]);
      } finally {
        if (!cancelled) setLoadingCatalog(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQ, mode]);

  const refreshNearby = useCallback(async (lat: number, lng: number, radiusM?: number, searchQ?: string) => {
    const r = radiusM ?? nearbyRadiusM;
    const q = (searchQ ?? "").trim() || undefined;
    setLoadingNearby(true);
    try {
      const res = await getPlacesNearby({ lat, lng, radius: r, q });
      setNearby(res.places || []);
      setNearbyOrigin({ lat, lng });
      setGoogleOk(!!res.googleConfigured);
      setGooglePlacesNote(res.googlePlacesNote ?? null);
    } catch {
      setNearby([]);
      setGoogleOk(false);
      setGooglePlacesNote(null);
    } finally {
      setLoadingNearby(false);
    }
  }, [nearbyRadiusM]);

  const pickNearbyRadius = (m: number) => {
    setNearbyRadiusM(m);
  };

  useEffect(() => {
    if (mode !== "explore") return;
    if (!navigator.geolocation) {
      const c = { lat: 52.13, lng: 19.3 };
      setMapCenter(c);
      setNearbyOrigin(c);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const c = { lat: p.coords.latitude, lng: p.coords.longitude };
        setMapCenter(c);
        setNearbyOrigin(c);
      },
      () => {
        const c = { lat: 52.13, lng: 19.3 };
        setMapCenter(c);
        setNearbyOrigin(c);
      },
    );
  }, [mode]);

  useEffect(() => {
    if (mode !== "explore") return;
    void refreshNearby(mapCenter.lat, mapCenter.lng, nearbyRadiusM, debouncedQ);
  }, [mode, mapCenter.lat, mapCenter.lng, nearbyRadiusM, debouncedQ, refreshNearby]);

  const catalogFiltered = useMemo(() => {
    return catalog.filter((s) => {
      if (catalogMinStars == null) return true;
      const cnt = s.ratingCount ?? 0;
      if (cnt < 1) return false;
      return (s.avgStars ?? 0) >= catalogMinStars;
    });
  }, [catalog, catalogMinStars]);

  const catalogExploreStatusText = useMemo(() => {
    if (mode !== "explore") return "";
    if (loadingCatalog) return "Chwileczkę, szukamy…";
    if (catalogFiltered.length === 0) {
      const q = debouncedQ.trim();
      if (q) {
        return `Nie znaleźliśmy „${q}” w honly. Spróbuj inaczej napisać lub wyczyść pole.`;
      }
      if (catalogMinStars != null) {
        return "Przy takiej minimalnej ocenie nikt się nie pojawia — poluzuj filtr gwiazdek albo wybierz „Wszystkie”.";
      }
      return "Na razie nie ma tu żadnego salonu w honly.";
    }
    return polishSalonsInCatalogLabel(catalogFiltered.length);
  }, [mode, loadingCatalog, catalogFiltered.length, debouncedQ, catalogMinStars]);

  const filteredNearby = useMemo(() => {
    return nearby.filter((p) => {
      if (googleFilter === "honly") return p.isHonly;
      if (googleFilter === "nonhonly") return !p.isHonly;
      return true;
    });
  }, [nearby, googleFilter]);

  const exploreUnifiedSummary = useMemo(() => {
    if (mode !== "explore") return "";
    const km = nearbyRadiusM / 1000;
    const cat = loadingCatalog
      ? "Szukamy w honly…"
      : catalogFiltered.length === 0
        ? "Brak wyników w honly"
        : polishSalonsInCatalogLabel(catalogFiltered.length);
    const g = loadingNearby
      ? "Szukamy salonów w okolicy…"
      : filteredNearby.length === 0
        ? `Nic w okolicy do ${km} km — poszerz zasięg w Filtrach albo zmień wpis`
        : `${polishPlacesOnMapLabel(filteredNearby.length)} (do ${km} km od Ciebie${debouncedQ.trim() ? ", wg Twojego wpisu" : ""})`;
    return `${cat} · ${g}`;
  }, [
    mode,
    loadingCatalog,
    loadingNearby,
    catalogFiltered.length,
    filteredNearby.length,
    nearbyRadiusM,
    debouncedQ,
  ]);

  const mapMarkers: SalonMapMarker[] = useMemo(() => {
    const bySalonId = new Map<string, SalonMapMarker>();
    for (const s of catalogFiltered) {
      if (s.latitude == null || s.longitude == null) continue;
      bySalonId.set(s.id, {
        id: `cat-${s.id}`,
        lat: s.latitude as number,
        lng: s.longitude as number,
        title: s.name,
        variant: "honly",
      });
    }
    for (const s of linkedSalons) {
      if (s.latitude == null || s.longitude == null || bySalonId.has(s.id)) continue;
      bySalonId.set(s.id, {
        id: `link-${s.id}`,
        lat: s.latitude as number,
        lng: s.longitude as number,
        title: s.name,
        variant: "honly",
      });
    }
    const fromGoogle: SalonMapMarker[] = filteredNearby.map((p) => ({
      id: `g-${p.placeId}`,
      lat: p.lat,
      lng: p.lng,
      title: p.name,
      variant: p.isHonly ? ("honly" as const) : ("google_external" as const),
    }));
    return [...bySalonId.values(), ...fromGoogle];
  }, [catalogFiltered, filteredNearby, linkedSalons]);

  const mapMarkersVisible = useMemo(() => {
    return mapMarkers.filter((m) => {
      if (m.variant === "honly" && !showHonlyOnMap) return false;
      if (m.variant === "google_external" && !showGoogleExternalOnMap) return false;
      return true;
    });
  }, [mapMarkers, showHonlyOnMap, showGoogleExternalOnMap]);

  const handleSwitchSalon = async (salonId: string) => {
    if (!salonId || salonId === activeSalonId) return;
    try {
      await switchClientSalon(salonId);
      setActiveSalonId(salonId);
      window.location.reload();
    } catch (err: any) {
      toast.error(err?.message || "Nie udało się przełączyć salonu");
    }
  };

  const handleAttachSalon = async () => {
    if (!attachToken.trim()) {
      toast.error("Wpisz kod lub token z SMS");
      return;
    }
    try {
      setAttachingSalon(true);
      await attachClientSalon(attachToken.trim());
      setAttachToken("");
      await loadLinked();
      await loadFavoritesAndPending();
      toast.success("Salon został dodany");
    } catch (err: any) {
      toast.error(err?.message || "Nie udało się dodać salonu");
    } finally {
      setAttachingSalon(false);
    }
  };

  const submitRating = async (appointmentId: string, stars: number) => {
    try {
      setRatingSubmit(appointmentId);
      await postClientRating({ appointmentId, stars });
      toast.success("Dziękujemy za ocenę");
      await loadFavoritesAndPending();
    } catch (err: any) {
      toast.error(err?.message || "Nie udało się zapisać oceny");
    } finally {
      setRatingSubmit(null);
    }
  };

  const toggleCatalogSalonFavorite = async (salonId: string) => {
    const key = `salon:${salonId}`;
    if (togglingFavoriteKey) return;
    setTogglingFavoriteKey(key);
    try {
      if (favoriteSalonIdSet.has(salonId)) {
        await removeClientFavoriteSalon(salonId);
        toast.success("Usunięto z ulubionych");
      } else {
        try {
          await addClientFavoriteSalon(salonId);
          toast.success("Dodano do ulubionych");
        } catch (err: any) {
          if (err?.message === "already_favorite") {
            toast.info("Ten salon jest już w ulubionych");
          } else {
            throw err;
          }
        }
      }
      await loadFavoritesAndPending();
    } catch (err: any) {
      toast.error(err?.message || "Nie udało się zapisać ulubionych");
    } finally {
      setTogglingFavoriteKey(null);
    }
  };

  const toggleNearbyFavorite = async (p: NearbyPlace) => {
    const key =
      p.isHonly && p.matchedSalonId ? `salon:${p.matchedSalonId}` : `gplace:${p.placeId}`;
    if (togglingFavoriteKey) return;
    setTogglingFavoriteKey(key);
    try {
      if (p.isHonly && p.matchedSalonId) {
        if (favoriteSalonIdSet.has(p.matchedSalonId)) {
          await removeClientFavoriteSalon(p.matchedSalonId);
          toast.success("Usunięto z ulubionych");
        } else {
          try {
            await addClientFavoriteSalon(p.matchedSalonId);
            toast.success("Dodano do ulubionych");
          } catch (err: any) {
            if (err?.message === "already_favorite") {
              toast.info("Ten salon jest już w ulubionych");
            } else {
              throw err;
            }
          }
        }
      } else {
        const existingId = googlePlaceToFavoriteId.get(p.placeId);
        if (existingId) {
          await removeClientFavoriteGooglePlace(existingId);
          toast.success("Usunięto z ulubionych");
        } else {
          try {
            await addClientFavoriteGooglePlace({
              googlePlaceId: p.placeId,
              displayName: p.name,
              displayAddress: p.address,
              lat: p.lat,
              lng: p.lng,
            });
            toast.success("Dodano do ulubionych");
          } catch (err: any) {
            if (err?.message === "already_favorite") {
              toast.info("To miejsce jest już w ulubionych");
              await loadFavoritesAndPending();
            } else {
              throw err;
            }
          }
        }
      }
      await loadFavoritesAndPending();
    } catch (err: any) {
      toast.error(err?.message || "Nie udało się zapisać ulubionych");
    } finally {
      setTogglingFavoriteKey(null);
    }
  };

  return (
    <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6 pb-8">
      {mode === "favorites" ? (
        <>
          <h1 className="text-xl font-bold lg:text-2xl mb-1">Ulubione</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Tu masz salony z wizyt, zapisane ulubione i krótkie oceny. Pełną listę i mapę otworzysz w{" "}
            <Link to="/konto/salony" className="text-primary font-medium underline-offset-4 hover:underline">
              Wszystkie salony
            </Link>
            .
          </p>

          <div className="space-y-6 w-full">
          {pendingRatings.length > 0 && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
              <p className="text-sm font-semibold">Oceń wizytę (24 h od zakończenia)</p>
              {pendingRatings.map((p) => (
                <div key={p.appointmentId} className="rounded-xl bg-card border border-border p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{p.salonName}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.date} {p.time}
                    </p>
                  </div>
                  <StarsPicker
                    disabled={ratingSubmit === p.appointmentId}
                    onPick={(n) => submitRating(p.appointmentId, n)}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="bg-card rounded-2xl p-5 border border-border">
            <label className="text-sm font-medium mb-2 block">Dodaj salon z wizyty (kod z SMS)</label>
            <div className="flex gap-2">
              <Input
                value={attachToken}
                onChange={(e) => setAttachToken(e.target.value)}
                placeholder="Wklej kod lub token"
                className="h-11 rounded-xl"
              />
              <Button onClick={handleAttachSalon} disabled={attachingSalon} className="h-11 rounded-xl shrink-0">
                {attachingSalon ? "…" : "Dodaj"}
              </Button>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold mb-3">Ulubione w honly</h2>
            {favHonly.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Brak — dodaj sercem salony w{" "}
                <Link to="/konto/salony" className="text-primary font-medium underline-offset-4 hover:underline">
                  Wszystkie salony
                </Link>
                .
              </p>
            ) : (
              <div className="grid gap-2">
                {favHonly.map((f) => (
                  <div key={f.favoriteId} className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-3 py-2">
                    <div>
                      <p className="font-medium text-sm">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{f.address}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-8 rounded-lg" onClick={() => f.slug && navigate(`/s/${f.slug}`)}>
                        Umów
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-lg text-destructive"
                        onClick={async () => {
                          await removeClientFavoriteSalon(f.salonId);
                          await loadFavoritesAndPending();
                          toast.success("Usunięto z ulubionych");
                        }}
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <FavoritesInviteDisclaimer className="mb-4" />
            <h2 className="text-sm font-semibold mb-3">Zapisane z mapy (poza honly)</h2>
            {favGoogle.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nie masz jeszcze takich zapisów — dodaj serce przy salonie na mapie w „Wszystkie salony”.</p>
            ) : (
              <div className="grid gap-2">
                {favGoogle.map((f) => (
                  <div key={f.favoriteId} className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-3 py-2">
                    <div>
                      <p className="font-medium text-sm">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{f.address || "—"}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-lg text-destructive"
                      onClick={async () => {
                        await removeClientFavoriteGooglePlace(f.favoriteId);
                        await loadFavoritesAndPending();
                        toast.success("Usunięto");
                      }}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-sm font-semibold mb-3">Twoje salony (z wizyt)</h2>
            {linkedSalons.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Brak przypisanych salonów</p>
            ) : (
              <div className="grid gap-3">
                {linkedSalons.map((salon) => (
                  <motion.div
                    key={salon.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-border bg-muted/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{salon.name}</p>
                        <p className="text-xs text-muted-foreground">{salon.address || "—"}</p>
                      </div>
                      {activeSalonId === salon.id ? (
                        <span className="text-[10px] uppercase tracking-wide text-primary">aktywny</span>
                      ) : (
                        <Button size="sm" variant="outline" className="rounded-lg h-8" onClick={() => handleSwitchSalon(salon.id)}>
                          Przełącz
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" className="rounded-xl h-9 flex-1" onClick={() => salon.slug && navigate(`/s/${salon.slug}`)}>
                        Umów wizytę
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl h-9 flex-1"
                        onClick={() => navigate(`/konto/wizyty?salonId=${salon.id}`)}
                      >
                        Historia
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
          </div>
        </>
      ) : (
        <>
          <div className="mb-4 w-full max-w-3xl">
            <h1 className="text-xl font-bold lg:text-2xl mb-1">Wszystkie salony</h1>
            <p className="text-sm text-muted-foreground">
              Na mapie zobaczysz salony z honly i inne w okolicy. Wpisz nazwę, dzielnicę lub usługę — szukamy jednocześnie w honly i w pobliżu Twojej lokalizacji.{" "}
              <Link to="/konto/ulubione" className="text-primary font-medium underline-offset-4 hover:underline">
                Ulubione
              </Link>{" "}
              znajdziesz w menu po lewej.
            </p>
          </div>

          <div className="relative -mx-4 mb-8 w-[calc(100%+2rem)] overflow-hidden rounded-none border-y border-border bg-muted shadow-sm lg:mx-0 lg:mb-10 lg:w-full lg:rounded-2xl lg:border">
            <div className="relative min-h-[min(78dvh,820px)] w-full">
              <div className="absolute inset-0 z-0">
                <SalonMapPanel
                  fillContainer
                  wrapperClassName="h-full rounded-none"
                  center={mapCenter}
                  zoom={nearbyRadiusM >= 12000 ? 10 : 11}
                  mapStylePreset={mapStylePreset}
                  markers={mapMarkersVisible}
                />
              </div>

              <div className="relative z-10 flex flex-col gap-2 p-3 sm:p-4 pointer-events-none">
                <div className="pointer-events-auto mx-auto w-full max-w-2xl space-y-2">
                  <div
                    className="space-y-2 rounded-2xl border border-border/90 bg-background/95 p-3 shadow-lg backdrop-blur-md sm:p-4"
                    aria-labelledby="salon-search-heading"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <h2 id="salon-search-heading" className="text-sm font-semibold tracking-tight">
                        Szukaj salonu
                      </h2>
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button type="button" variant="outline" size="sm" className="h-9 shrink-0 gap-1.5 self-start sm:self-auto">
                            <SlidersHorizontal className="h-4 w-4" />
                            Filtry
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
                          <SheetHeader>
                            <SheetTitle>Filtry</SheetTitle>
                            <SheetDescription>
                              Dopasuj mapę, zasięg wokół Ciebie, co widać na mapie i na liście oraz minimalną ocenę salonów w honly.
                            </SheetDescription>
                          </SheetHeader>
                          <div className="mt-6 flex-1 space-y-8 overflow-y-auto pr-1 pb-8">
                            <div className="space-y-3">
                              <span className="text-xs font-medium text-muted-foreground">Wygląd mapy</span>
                              <div className="flex flex-wrap gap-2">
                                {(
                                  [
                                    { id: "default" as const, label: "Klasyczna" },
                                    { id: "minimal" as const, label: "Jasny minimal" },
                                    { id: "dark" as const, label: "Ciemna" },
                                  ] as const
                                ).map((preset) => (
                                  <Button
                                    key={preset.id}
                                    size="sm"
                                    variant={mapStylePreset === preset.id ? "default" : "outline"}
                                    className="rounded-lg h-8"
                                    onClick={() => setMapStylePreset(preset.id)}
                                  >
                                    {preset.label}
                                  </Button>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-3">
                              <span className="text-xs font-medium text-muted-foreground">Jak daleko szukać wokół Ciebie</span>
                              <div className="flex flex-wrap gap-2">
                                {(
                                  [
                                    { m: 3000, label: "3 km" },
                                    { m: 8000, label: "8 km" },
                                    { m: 15000, label: "15 km" },
                                  ] as const
                                ).map(({ m, label }) => (
                                  <Button
                                    key={m}
                                    size="sm"
                                    variant={nearbyRadiusM === m ? "default" : "outline"}
                                    className="rounded-lg h-8"
                                    onClick={() => pickNearbyRadius(m)}
                                    disabled={loadingNearby}
                                  >
                                    {label}
                                  </Button>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-3">
                              <span className="text-xs font-medium text-muted-foreground">Warstwy na mapie</span>
                              <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                  <Switch id="sheet-map-honly" checked={showHonlyOnMap} onCheckedChange={setShowHonlyOnMap} />
                                  <Label htmlFor="sheet-map-honly" className="text-xs font-normal cursor-pointer">
                                    Salony w honly
                                  </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    id="sheet-map-google"
                                    checked={showGoogleExternalOnMap}
                                    onCheckedChange={setShowGoogleExternalOnMap}
                                  />
                                  <Label htmlFor="sheet-map-google" className="text-xs font-normal cursor-pointer">
                                    Salony spoza honly (tylko z mapy)
                                  </Label>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <span className="text-xs font-medium text-muted-foreground">Lista pod mapą</span>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant={googleFilter === "all" ? "default" : "outline"}
                                  className="rounded-lg h-8"
                                  onClick={() => setGoogleFilter("all")}
                                >
                                  Wszystkie
                                </Button>
                                <Button
                                  size="sm"
                                  variant={googleFilter === "honly" ? "default" : "outline"}
                                  className="rounded-lg h-8"
                                  onClick={() => setGoogleFilter("honly")}
                                >
                                  Tylko w honly
                                </Button>
                                <Button
                                  size="sm"
                                  variant={googleFilter === "nonhonly" ? "default" : "outline"}
                                  className="rounded-lg h-8"
                                  onClick={() => setGoogleFilter("nonhonly")}
                                >
                                  Poza honly
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-3 border-t border-border pt-6">
                              <span className="text-xs font-medium text-muted-foreground">Minimalna ocena (salony w honly)</span>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant={catalogMinStars === null ? "default" : "outline"}
                                  className="rounded-lg h-8"
                                  onClick={() => setCatalogMinStars(null)}
                                >
                                  Wszystkie
                                </Button>
                                <Button
                                  size="sm"
                                  variant={catalogMinStars === 4 ? "default" : "outline"}
                                  className="rounded-lg h-8"
                                  onClick={() => setCatalogMinStars(4)}
                                >
                                  ★ 4+
                                </Button>
                                <Button
                                  size="sm"
                                  variant={catalogMinStars === 4.5 ? "default" : "outline"}
                                  className="rounded-lg h-8"
                                  onClick={() => setCatalogMinStars(4.5)}
                                >
                                  ★ 4,5+
                                </Button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <span className="inline-block size-2.5 rounded-full bg-[#b8566f] ring-1 ring-[#7d3a4d]" aria-hidden />
                                honly
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className="inline-block size-2.5 rounded-full bg-slate-500 ring-1 ring-slate-700" aria-hidden />
                                poza honly
                              </span>
                            </div>
                            {!googleOk && (
                              <p className="text-xs text-amber-700">
                                Mapa okolicy jest niedostępna — skontaktuj się z obsługą, jeśli problem się powtarza.
                              </p>
                            )}
                            {googleOk && googlePlacesNote && <p className="text-xs text-amber-700">{googlePlacesNote}</p>}
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
                    <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs">
                      To pole szuka po nazwie i adresie w honly oraz po tym, co wpiszesz, w salonach wokół Twojej lokalizacji (w obrębie wybranego zasięgu w Filtrach).
                    </p>
                    <div className="relative">
                      <Search
                        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      <Input
                        id="client-salon-unified-search"
                        placeholder="Np. fryzjer, manicure, nazwa salonu, ulica…"
                        value={catalogQ}
                        onChange={(e) => setCatalogQ(e.target.value)}
                        className="h-12 rounded-xl border-input bg-background pl-10 pr-11 text-base shadow-none focus-visible:ring-2"
                        aria-label="Szukaj salonu w honly i w okolicy"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                      {catalogQ ? (
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Wyczyść wyszukiwanie"
                          onClick={() => setCatalogQ("")}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                    <p
                      className={cn(
                        "text-xs text-muted-foreground min-h-[1.25rem]",
                        (loadingCatalog || loadingNearby) && "animate-pulse",
                      )}
                      role="status"
                      aria-live="polite"
                    >
                      {exploreUnifiedSummary}
                    </p>
                    {!loadingCatalog && catalogFiltered.length === 0 && (
                      <p className="text-[11px] text-amber-900/80 dark:text-amber-200/90">{catalogExploreStatusText}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8 w-full">
            <FavoritesInviteDisclaimer />

            <section className="space-y-3" aria-labelledby="honly-catalog-results-heading">
              <h3 id="honly-catalog-results-heading" className="text-sm font-semibold">
                Salony w honly{loadingCatalog ? " …" : ""}
              </h3>
              <div className="grid gap-2">
              {catalogFiltered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                  {loadingCatalog ? "Szukamy…" : catalogExploreStatusText}
                </div>
              ) : (
                catalogFiltered.map((s) => {
                const fav = isCatalogSalonFavorite(s.id);
                const busy = togglingFavoriteKey === `salon:${s.id}`;
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 transition-colors",
                      fav ? "border-primary/35 bg-primary/[0.04]" : "border-border",
                    )}
                  >
                    <div>
                      <p className="font-medium flex flex-wrap items-center gap-2">
                        {s.name}
                        {fav && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            <Heart className="h-3 w-3 fill-primary shrink-0" aria-hidden />
                            W ulubionych
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{s.address}</p>
                      {s.ratingCount ? (
                        <p className="text-xs text-amber-600 mt-1">
                          ★ {s.avgStars?.toFixed(1)} ({s.ratingCount} ocen)
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">Brak ocen</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant={fav ? "secondary" : "outline"}
                        className={cn("rounded-lg h-9 gap-1.5", fav && "border-primary/25")}
                        disabled={busy}
                        aria-pressed={fav}
                        onClick={() => void toggleCatalogSalonFavorite(s.id)}
                      >
                        <Heart className={cn("h-4 w-4 shrink-0", fav && "fill-primary text-primary")} aria-hidden />
                        {fav ? "Usuń" : "Ulubione"}
                      </Button>
                      <Button size="sm" className="rounded-lg h-9" onClick={() => navigate(`/s/${s.slug}`)}>
                        Otwórz
                      </Button>
                    </div>
                  </div>
                );
              })
              )}
            </div>
          </section>

          <section className="space-y-3" aria-labelledby="google-nearby-heading">
            <div>
              <h3 id="google-nearby-heading" className="text-sm font-semibold">
                Salony w Twojej okolicy
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                To te same miejsca, które widzisz na mapie. Listę możesz zawęzić w <span className="font-medium text-foreground">Filtrach</span>.
              </p>
            </div>
            <div className="grid gap-2">
              {filteredNearby.map((p) => {
                const fav = isNearbyPlaceFavorite(p);
                const busyKey = p.isHonly && p.matchedSalonId ? `salon:${p.matchedSalonId}` : `gplace:${p.placeId}`;
                const busy = togglingFavoriteKey === busyKey;
                return (
                  <div
                    key={p.placeId}
                    className={cn(
                      "rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 transition-colors",
                      fav ? "border-primary/35 bg-primary/[0.04]" : "border-border",
                    )}
                  >
                    <div>
                      <p className="font-medium flex flex-wrap items-center gap-2">
                        {p.name}
                        {fav && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            <Heart className="h-3 w-3 fill-primary shrink-0" aria-hidden />
                            W ulubionych
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{p.address}</p>
                      <p className="text-[10px] mt-1 uppercase tracking-wide text-muted-foreground">
                        {p.isHonly ? "Jest w honly" : "Jeszcze nie ma w honly"}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant={fav ? "secondary" : "outline"}
                        className={cn("rounded-lg h-9 gap-1.5", fav && "border-primary/25")}
                        disabled={busy}
                        aria-pressed={fav}
                        onClick={() => void toggleNearbyFavorite(p)}
                      >
                        <Heart className={cn("h-4 w-4 shrink-0", fav && "fill-primary text-primary")} aria-hidden />
                        {fav ? "Usuń" : "Ulubione"}
                      </Button>
                      {p.isHonly && p.matchedSalonSlug && (
                        <Button size="sm" className="rounded-lg h-9" onClick={() => navigate(`/s/${p.matchedSalonSlug}`)}>
                          Otwórz w honly
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredNearby.length === 0 && !loadingNearby && (
                <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                  Nic nie znaleźliśmy — spróbuj innego wpisu, poszerz zasięg albo zmień opcje w Filtrach.
                </p>
              )}
            </div>
          </section>
          </div>
        </>
      )}
    </PageTransition>
  );
}
