import { Router } from "express";
import prisma from "../prisma.js";
import { googlePlaceMatchesSalon } from "../lib/matchGoogleSalon.js";

const router = Router();

/** Salon techniczny (rejestracja konta) — nie pokazujemy w katalogu publicznym. */
const UNASSIGNED_SALON_SLUG = "__honly_unassigned__";

const publicApiUrl = (process.env.PUBLIC_API_URL?.trim() || "").replace(/\/$/, "");
const toAbsoluteAssetUrl = (raw: string | null | undefined) => {
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (publicApiUrl) return `${publicApiUrl}${raw.startsWith("/") ? "" : "/"}${raw}`;
  return raw;
};

/** Runtime config dla frontendu (np. klucz mapy bez konieczności rebuildu frontu). */
router.get("/maps/config", (_req, res) => {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim() || process.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || "";
  return res.json({ googleMapsApiKey: key || null });
});

/** Katalog salonów Honly (publicznie — mapa / wyszukiwarka / aplikacja mobilna; bez JWT). */
router.get("/salons/catalog", async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));

    const notUnassigned = { slug: { not: UNASSIGNED_SALON_SLUG } };
    const where = q
      ? {
          AND: [
            notUnassigned,
            {
              OR: [
                { name: { contains: q } },
                { address: { contains: q } },
                { slug: { contains: q } },
              ],
            },
          ],
        }
      : notUnassigned;

    const [total, rows, aggregates] = await Promise.all([
      prisma.salon.count({ where }),
      prisma.salon.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: "asc" },
        select: {
          id: true,
          slug: true,
          name: true,
          address: true,
          phone: true,
          hours: true,
          description: true,
          logoUrl: true,
          accentColor: true,
          latitude: true,
          longitude: true,
        },
      }),
      prisma.salonRating.groupBy({
        by: ["salonId"],
        _avg: { stars: true },
        _count: { _all: true },
      }),
    ]);

    const stats = new Map(
      aggregates.map((a) => [a.salonId, { avgStars: a._avg.stars ?? null, ratingCount: a._count._all }]),
    );

    const salons = rows.map((s) => {
      const st = stats.get(s.id);
      return {
        ...s,
        logoUrl: toAbsoluteAssetUrl(s.logoUrl),
        avgStars: st?.avgStars != null ? Math.round(st.avgStars * 10) / 10 : null,
        ratingCount: st?.ratingCount ?? 0,
        isHonly: true as const,
      };
    });

    return res.json({ salons, total, page, limit, pages: Math.ceil(total / limit) || 1 });
  } catch (e) {
    console.error("[public] GET /salons/catalog", e);
    return res.status(500).json({ error: "internal_error" });
  }
});

type NearbyResult = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  isHonly: boolean;
  matchedSalonId: string | null;
  matchedSalonSlug: string | null;
};

type RawNearby = { placeId: string; name: string; address: string; lat: number; lng: number };

async function fetchNearbyType(
  lat: number,
  lng: number,
  radius: number,
  type: string,
  key: string,
  keyword?: string,
): Promise<{ places: RawNearby[]; status: string }> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("radius", String(radius));
  url.searchParams.set("type", type);
  url.searchParams.set("key", key);
  const kw = keyword?.trim();
  if (kw) {
    url.searchParams.set("keyword", kw.slice(0, 80));
  }

  const r = await fetch(url.toString());
  const data = (await r.json()) as { results?: any[]; status?: string; error_message?: string };
  const status = data.status || "UNKNOWN";
  if (status !== "OK" && status !== "ZERO_RESULTS") {
    // eslint-disable-next-line no-console
    console.warn("Google Places nearby", status, type, data.error_message || "");
  }
  const results = data.results || [];
  const places = results
    .map((p) => ({
      placeId: p.place_id as string,
      name: (p.name as string) || "",
      address: (p.vicinity as string) || (p.formatted_address as string) || "",
      lat: p.geometry?.location?.lat,
      lng: p.geometry?.location?.lng,
    }))
    .filter((p) => p.placeId && Number.isFinite(p.lat) && Number.isFinite(p.lng));
  return { places, status };
}

function noteForPlacesStatuses(statuses: string[]): string | null {
  const bad = statuses.filter((s) => s !== "OK" && s !== "ZERO_RESULTS");
  if (bad.length === 0) return null;
  if (bad.some((s) => s === "REQUEST_DENIED")) {
    return "Nie udało się wczytać salonów z mapy w okolicy. Spróbuj za chwilę — jeśli tak zostanie, napisz do nas.";
  }
  if (bad.some((s) => s === "OVER_QUERY_LIMIT")) {
    return "Chwilowo za dużo wyszukiwań — spróbuj ponownie za moment.";
  }
  return "Wyszukiwanie w okolicy chwilowo niedostępne. Spróbuj za chwilę.";
}

/** Salony fryzjerskie/kosmetyczne z Google w promieniu + dopasowanie do Honly (nazwa/adres) */
router.get("/places/nearby", async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radius = Math.min(Number(req.query.radius) || 5000, 50_000);
  const searchQ = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "";
  const keyword = searchQ || undefined;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: "invalid_params" });
  }

  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key) {
    return res.json({ places: [] as NearbyResult[], googleConfigured: false, googlePlacesNote: null as string | null });
  }

  const dbSalons = await prisma.salon.findMany({
    where: { slug: { not: UNASSIGNED_SALON_SLUG } },
    select: { id: true, slug: true, name: true, address: true },
  });

  const [a, b] = await Promise.all([
    fetchNearbyType(lat, lng, radius, "beauty_salon", key, keyword),
    fetchNearbyType(lat, lng, radius, "hair_care", key, keyword),
  ]);

  const statuses = [a.status, b.status];
  const googlePlacesNote = noteForPlacesStatuses(statuses);

  const byId = new Map<string, Omit<NearbyResult, "isHonly" | "matchedSalonId" | "matchedSalonSlug">>();
  for (const p of [...a.places, ...b.places]) {
    if (!byId.has(p.placeId)) byId.set(p.placeId, p);
  }

  const places: NearbyResult[] = [...byId.values()].map((p) => {
    let matchedSalonId: string | null = null;
    let matchedSalonSlug: string | null = null;
    for (const s of dbSalons) {
      if (googlePlaceMatchesSalon(s, p.name, p.address)) {
        matchedSalonId = s.id;
        matchedSalonSlug = s.slug;
        break;
      }
    }
    return {
      ...p,
      isHonly: !!matchedSalonId,
      matchedSalonId,
      matchedSalonSlug,
    };
  });

  return res.json({ places, googleConfigured: true, googlePlacesNote });
});

export default router;
