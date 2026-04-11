import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Apple,
  ArrowRight,
  Calendar,
  CalendarDays,
  History,
  MapPin,
  Scissors,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react";
import { PageTransition } from "@/components/motion";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  HONLY_APP_STORE_URL,
  HONLY_PLAY_SCREENSHOTS,
  HONLY_PLAY_STORE_URL,
} from "@/constants/honlyStores";

const publicBase =
  (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.replace(/\/$/, "") || "https://honly.app";

const LANDING_TITLE = "Honly — Twój czas. Twoje wizyty. Jedno miejsce.";
const LANDING_DESCRIPTION =
  "Z Honly masz pod ręką nadchodzące wizyty, historię i ulubione miejsca. Pobierz na iOS lub Android.";

const GOOGLE_PLAY_BADGE_PL =
  "https://play.google.com/intl/pl_pl/badges/static/images/badges/pl_badge_web_generic.png";
const APP_STORE_BADGE_PL =
  "https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/pl-pl?size=250x83";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] as const },
};

function useMobileAppsMeta() {
  useEffect(() => {
    const prevTitle = document.title;
    const desc = document.querySelector('meta[name="description"]');
    const prevDesc = desc?.getAttribute("content") ?? "";
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const prevOgTitle = ogTitle?.getAttribute("content") ?? "";
    const ogDesc = document.querySelector('meta[property="og:description"]');
    const prevOgDesc = ogDesc?.getAttribute("content") ?? "";
    const ogUrl = document.querySelector('meta[property="og:url"]');
    const prevOgUrl = ogUrl?.getAttribute("content") ?? "";

    document.title = LANDING_TITLE;
    desc?.setAttribute("content", LANDING_DESCRIPTION);
    ogTitle?.setAttribute("content", LANDING_TITLE);
    ogDesc?.setAttribute("content", LANDING_DESCRIPTION);
    ogUrl?.setAttribute("content", `${publicBase}/aplikacja`);

    return () => {
      document.title = prevTitle;
      desc?.setAttribute("content", prevDesc);
      ogTitle?.setAttribute("content", prevOgTitle);
      ogDesc?.setAttribute("content", prevOgDesc);
      ogUrl?.setAttribute("content", prevOgUrl);
    };
  }, []);
}

const features = [
  {
    icon: CalendarDays,
    title: "Nadchodzące wizyty",
    text: "Zawsze wiesz, kiedy i gdzie masz być.",
  },
  {
    icon: History,
    title: "Historia wizyt",
    text: "Wszystkie Twoje wizyty w jednym miejscu.",
  },
  {
    icon: MapPin,
    title: "Twoje miejsca",
    text: "Szybki powrót do ulubionych salonów.",
  },
  {
    icon: Zap,
    title: "Szybkie umawianie",
    text: "Umów kolejną wizytę w kilka sekund — bez dzwonienia.",
  },
] as const;

function StoreDownloadButtons({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center ${className}`}>
      <a
        href={HONLY_APP_STORE_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 hover:shadow-md"
      >
        <Apple className="h-5 w-5" aria-hidden />
        Pobierz na iOS
        <ArrowRight className="h-4 w-4 opacity-90" aria-hidden />
      </a>
      <a
        href={HONLY_PLAY_STORE_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-6 text-sm font-semibold text-neutral-900 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50"
      >
        <Smartphone className="h-5 w-5" aria-hidden />
        Pobierz na Android
        <ArrowRight className="h-4 w-4 opacity-70" aria-hidden />
      </a>
    </div>
  );
}

function StoreBadgesRow({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-4 ${className}`}>
      <a href={HONLY_APP_STORE_URL} target="_blank" rel="noreferrer" className="inline-block opacity-90 transition hover:opacity-100">
        <img src={APP_STORE_BADGE_PL} alt="Pobierz z App Store" className="h-11 w-auto sm:h-12" width={180} height={54} />
      </a>
      <a href={HONLY_PLAY_STORE_URL} target="_blank" rel="noreferrer" className="inline-block opacity-90 transition hover:opacity-100">
        <img src={GOOGLE_PLAY_BADGE_PL} alt="Pobierz z Google Play" className="h-[52px] w-auto sm:h-[54px]" width={180} height={52} />
      </a>
    </div>
  );
}

export default function MobileAppsPage() {
  useMobileAppsMeta();

  return (
    <PageTransition className="min-h-screen bg-white font-[Inter,system-ui,sans-serif] text-neutral-900 antialiased selection:bg-primary/15 selection:text-foreground">
      <header className="sticky top-0 z-50 border-b border-neutral-200/90 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/aplikacja" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-neutral-950">
            <img src="/happlogo.svg?v=20260324" alt="" className="h-8 w-8" width={32} height={32} />
            Honly
          </Link>
          <nav className="flex items-center gap-4 text-sm text-neutral-600">
            <Link to="/konto/logowanie" className="transition hover:text-neutral-950">
              Logowanie
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-neutral-100">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-30%,hsl(var(--primary)/0.12),transparent),radial-gradient(ellipse_60%_50%_at_100%_0%,rgba(15,23,42,0.04),transparent)]"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl gap-14 px-4 pb-20 pt-14 sm:gap-16 sm:px-6 sm:pb-24 sm:pt-20 lg:grid-cols-2 lg:items-center lg:gap-20">
          <motion.div {...fadeUp}>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-neutral-950 sm:text-5xl sm:leading-[1.08]">
              Twój czas. Twoje wizyty. <span className="text-primary">Jedno miejsce.</span>
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-neutral-600 sm:text-xl">
              Z Honly wszystko masz pod ręką — nadchodzące wizyty, historia i ulubione miejsca.
            </p>
            <p className="mt-5 max-w-xl text-pretty leading-relaxed text-neutral-600">
              Nie musisz już szukać wiadomości, numerów ani terminów. Honly porządkuje Twoje wizyty, żebyś mógł skupić
              się na tym, co ważne.
            </p>
            <StoreDownloadButtons className="mt-10" />
            <StoreBadgesRow className="mt-8" />
          </motion.div>

          <motion.div
            className="relative flex justify-center lg:justify-end"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1], delay: 0.08 }}
          >
            <div className="absolute -right-10 top-0 h-72 w-72 rounded-full bg-primary/15 blur-3xl" aria-hidden />
            <div className="relative w-full max-w-[min(100%,340px)]">
              <div className="rounded-[2rem] border border-neutral-200/80 bg-neutral-100 p-2.5 shadow-[0_32px_64px_-24px_rgba(15,23,42,0.18)] sm:p-3">
                <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-inner ring-1 ring-neutral-200/60">
                  <Carousel opts={{ align: "start", loop: true }} className="w-full">
                    <CarouselContent className="-ml-0">
                      {HONLY_PLAY_SCREENSHOTS.map((src, i) => (
                        <CarouselItem key={src} className="pl-0">
                          <div className="flex h-[min(70vh,600px)] w-full items-center justify-center bg-neutral-50 px-1 py-2 sm:h-[min(65vh,560px)]">
                            <img
                              src={src}
                              alt={i === 0 ? "Aplikacja Honly — lista nadchodzących wizyt" : `Zrzut ekranu aplikacji Honly ${i + 1}`}
                              className="max-h-full w-full max-w-full object-contain object-top"
                              width={1080}
                              height={2340}
                              loading={i === 0 ? "eager" : "lazy"}
                              decoding="async"
                              draggable={false}
                            />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious
                      className="-left-1 border-neutral-200 bg-white text-neutral-800 shadow-md hover:bg-neutral-50 sm:-left-3"
                      aria-label="Poprzedni ekran"
                    />
                    <CarouselNext
                      className="-right-1 border-neutral-200 bg-white text-neutral-800 shadow-md hover:bg-neutral-50 sm:-right-3"
                      aria-label="Następny ekran"
                    />
                  </Carousel>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Story */}
      <motion.section className="border-b border-neutral-100 bg-neutral-50/80 py-20 sm:py-28" {...fadeUp}>
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
            Czas to coś więcej niż kalendarz
          </h2>
          <div className="mt-8 space-y-6 text-lg leading-relaxed text-neutral-600">
            <p>Każda wizyta to moment dla Ciebie. Chwila, którą rezerwujesz w swoim dniu.</p>
            <p>W codziennym chaosie łatwo coś zgubić — wiadomości, potwierdzenia, kontakt do salonu.</p>
            <p className="text-neutral-800">
              Honly powstało po to, żeby przywrócić porządek Twojemu czasowi.
            </p>
            <p>
              To miejsce, gdzie każda wizyta jest zapisana, każde miejsce zapamiętane, a kolejna rezerwacja zajmuje tylko
              chwilę.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Features */}
      <motion.section className="py-20 sm:py-28" {...fadeUp}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="mx-auto max-w-3xl text-balance text-center text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
            Wszystko, czego potrzebujesz — w jednej aplikacji
          </h2>
          <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="group rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg"
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition group-hover:bg-primary/15">
                  <Icon className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <h3 className="text-lg font-semibold text-neutral-950">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </motion.section>

      {/* Value */}
      <motion.section className="border-y border-neutral-100 bg-neutral-50 py-20 sm:py-24" {...fadeUp}>
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
            Nie organizuj czasu. Miej go pod kontrolą.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-neutral-600">
            Honly eliminuje chaos związany z wizytami.
          </p>
          <p className="mt-3 text-lg font-medium text-neutral-800">
            Mniej stresu. Więcej spokoju. Pełna kontrola nad Twoim czasem.
          </p>
        </div>
      </motion.section>

      {/* Salon — subtelnie wobec apki klienckiej; bez „karty”, mocna typografia */}
      <motion.section
        id="dla-salonow"
        className="border-t border-neutral-200/80 bg-neutral-50 py-14 sm:py-16"
        {...fadeUp}
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-12 xl:gap-16">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Dla salonów</p>
              <h2 className="mt-3 text-balance text-2xl font-semibold leading-[1.2] tracking-tight text-neutral-950 sm:text-3xl sm:leading-[1.15]">
                Masz salon? Honly pracuje także dla Ciebie.
              </h2>
              <p className="mt-4 text-lg font-normal leading-relaxed text-neutral-600 sm:text-xl">
                Nowoczesne narzędzie do zarządzania wizytami, klientami i rezerwacjami — w jednym miejscu.
              </p>

              <div className="mt-8 space-y-4 text-base leading-relaxed text-neutral-700">
                <p>
                  <span className="font-semibold text-neutral-900">Honly to nie tylko aplikacja dla klientów.</span>
                </p>
                <p>To także system, który pomaga salonowi działać sprawniej.</p>
              </div>

              <blockquote className="mt-6 border-l-[3px] border-primary pl-5 text-[17px] font-medium leading-snug text-neutral-900 sm:text-lg sm:leading-relaxed">
                Zarządzaj kalendarzem, klientami i wizytami bez chaosu — wszystko w jednym, prostym systemie.
              </blockquote>

              <ul className="mt-8 space-y-3 text-base text-neutral-800">
                <li className="flex gap-3">
                  <span className="mt-[0.35em] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  <span className="font-medium text-neutral-950">Zarządzanie kalendarzem i wizytami</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-[0.35em] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  <span className="font-medium text-neutral-950">Baza klientów i historia usług</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-[0.35em] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  <span className="font-medium text-neutral-950">Automatyczne rezerwacje online</span>
                </li>
              </ul>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-baseline">
                <Link
                  to="/rejestracja-salonu"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Zarejestruj swój salon
                  <ArrowRight className="h-4 w-4 opacity-90" aria-hidden />
                </Link>
                <a
                  href="mailto:rodo@honly.app.pl?subject=Honly%20dla%20salonu%20%E2%80%94%20pytanie"
                  className="text-sm text-neutral-500 underline decoration-neutral-400/80 underline-offset-[5px] transition hover:text-neutral-800"
                >
                  Dowiedz się więcej
                </a>
              </div>
            </div>

            <div className="w-full select-none" aria-hidden>
              <div className="relative flex min-h-[300px] w-full items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary/[0.14] via-primary/[0.05] to-neutral-100/95 ring-1 ring-neutral-200/60 sm:min-h-[360px] lg:min-h-[420px] xl:min-h-[460px]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,hsl(var(--primary)/0.16),transparent_65%)]" />
                <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-primary/[0.08] sm:h-48 sm:w-48" />
                <div className="pointer-events-none absolute -left-6 top-1/4 h-24 w-24 rounded-full bg-neutral-300/25 sm:h-28 sm:w-28" />
                <Scissors
                  className="relative z-[1] h-28 w-28 text-primary/90 sm:h-36 sm:w-36 lg:h-40 lg:w-40 xl:h-44 xl:w-44"
                  strokeWidth={1.1}
                  aria-hidden
                />
                <Sparkles
                  className="absolute right-[10%] top-[12%] z-[1] h-16 w-16 text-primary/75 sm:h-[4.5rem] sm:w-[4.5rem] lg:top-[14%] lg:h-20 lg:w-20"
                  strokeWidth={1.2}
                  aria-hidden
                />
                <Calendar
                  className="absolute bottom-[14%] left-[8%] z-[1] h-16 w-16 text-primary/55 sm:h-[4.25rem] sm:w-[4.25rem] lg:bottom-[16%] lg:h-20 lg:w-20"
                  strokeWidth={1.1}
                  aria-hidden
                />
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* CTA — aplikacja kliencka */}
      <motion.section className="py-20 sm:py-28" {...fadeUp}>
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Aplikacja dla klientów</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
            Zacznij korzystać z Honly już dziś
          </h2>
          <p className="mt-4 text-lg text-neutral-600">Twój czas zasługuje na lepsze doświadczenie.</p>
          <div className="mt-10 flex flex-col items-center gap-8">
            <StoreDownloadButtons />
            <StoreBadgesRow />
          </div>
        </div>
      </motion.section>

      <footer className="border-t border-neutral-200 bg-neutral-50/50 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 px-4 text-sm text-neutral-600 sm:flex-row sm:px-6">
          <p className="text-neutral-500">© {new Date().getFullYear()} Honly</p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            <Link to="/polityka-prywatnosci" state={{ from: "/aplikacja" }} className="transition hover:text-neutral-950">
              Polityka prywatności
            </Link>
            <Link to="/regulamin" className="transition hover:text-neutral-950">
              Regulamin
            </Link>
            <a href="mailto:rodo@honly.app.pl" className="transition hover:text-neutral-950">
              Kontakt
            </a>
          </div>
        </div>
      </footer>
    </PageTransition>
  );
}
