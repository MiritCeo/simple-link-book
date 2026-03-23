import type { ReactNode } from "react";
import { Apple, ArrowRight, BadgeCheck, CalendarClock, Check, Smartphone } from "lucide-react";

type AuthSplitLayoutProps = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  points: string[];
  children: ReactNode;
};

export default function AuthSplitLayout({ eyebrow, title, subtitle, points, children }: AuthSplitLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="flex items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-sm">
            {children}

            <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/[0.05] p-4 lg:hidden">
              <p className="text-sm font-semibold text-foreground">Korzystaj też z aplikacji mobilnej</p>
              <p className="mt-1 text-xs text-muted-foreground">
                iOS i Android. Wygodniej umawiasz i edytujesz wizyty z telefonu.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-1.5">
                  <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>Szybki podgląd terminów i powiadomień.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>Zmiana wizyty w kilku kliknięciach.</span>
                </li>
              </ul>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a
                  href="https://honly.app"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-2.5 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-95"
                >
                  <Apple className="h-3.5 w-3.5" />
                  App Store
                </a>
                <a
                  href="https://honly.app"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/35 bg-background px-2.5 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  Google Play
                </a>
              </div>
            </div>
          </div>
        </section>

        <aside className="relative hidden overflow-hidden border-l border-primary/15 bg-gradient-to-br from-[#be5f76] via-[#b8566f] to-[#8f3f57] p-12 text-white lg:flex lg:items-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.2),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(255,255,255,0.16),transparent_42%)]" />
          <div className="absolute -right-16 -top-12 h-56 w-56 rounded-full border border-white/20" />
          <div className="absolute -bottom-20 left-10 h-72 w-72 rounded-full border border-white/15" />
          <div className="relative z-10 max-w-xl">
            {eyebrow ? <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-white/80">{eyebrow}</p> : null}
            <h2 className="text-4xl font-bold leading-tight">{title}</h2>
            <p className="mt-4 text-base leading-relaxed text-white/88">{subtitle}</p>
            <ul className="mt-8 space-y-3">
              {points.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-white/92">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-white" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10 rounded-2xl border border-white/25 bg-white/10 p-5 backdrop-blur-[1px]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Mamy też aplikację mobilną</p>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium">
                    <Apple className="h-3.5 w-3.5" />
                    iOS
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium">
                    <Smartphone className="h-3.5 w-3.5" />
                    Android
                  </span>
                </div>
              </div>
              <ul className="mt-4 space-y-2.5 text-sm text-white/92">
                <li className="flex items-start gap-2.5">
                  <CalendarClock className="mt-0.5 h-4.5 w-4.5 shrink-0" />
                  <span>Szybsze umawianie i edycja wizyt z telefonu.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <BadgeCheck className="mt-0.5 h-4.5 w-4.5 shrink-0" />
                  <span>Powiadomienia i podgląd terminów zawsze pod ręką.</span>
                </li>
              </ul>
              <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <a
                  href="https://honly.app"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-[#8f3f57] transition hover:bg-white/90"
                >
                  <Apple className="h-4 w-4" />
                  App Store
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="https://honly.app"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/35 bg-white/10 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  <Smartphone className="h-4 w-4" />
                  Google Play
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
