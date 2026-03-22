import type { LucideIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, CalendarDays, LogOut, Heart, Compass } from "lucide-react";

type NavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  activeMatch?: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  { path: "/konto", label: "Start", icon: Home, exact: true },
  { path: "/konto/wizyty", label: "Moje wizyty", icon: CalendarDays },
  {
    path: "/konto/ulubione",
    label: "Ulubione",
    icon: Heart,
    activeMatch: (p) => p === "/konto/ulubione",
  },
  {
    path: "/konto/salony",
    label: "Wszystkie salony",
    icon: Compass,
    activeMatch: (p) => p === "/konto/salony",
  },
];

function navItemActive(pathname: string, item: NavItem): boolean {
  if (item.activeMatch) return item.activeMatch(pathname);
  if (item.exact) return pathname === item.path;
  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

type ClientSalon = { id: string; name: string; slug: string; clientId: string };

export function ClientSidebar({
  salons,
  activeSalonId,
  onSwitchSalon,
  clientName,
}: {
  salons: ClientSalon[];
  activeSalonId?: string | null;
  onSwitchSalon: (salonId: string) => void;
  clientName?: string;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="hidden lg:flex flex-col w-56 border-r border-border bg-card h-screen sticky top-0">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-border">
        <div className="w-8 h-8 flex items-center justify-center">
          <img src="/happlogo.svg?v=20260324" alt="honly" className="w-7 h-7" />
        </div>
        <div>
          <span className="font-bold text-sm block leading-tight">{clientName || "Klient"}</span>
          <span className="text-[10px] text-muted-foreground">Moje konto</span>
        </div>
      </div>
      {salons.length > 1 && (
        <div className="px-4 py-3 border-b border-border">
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground block mb-2">Salon</label>
          <select
            value={activeSalonId || ""}
            onChange={(e) => e.target.value && onSwitchSalon(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            {salons.map((salon) => (
              <option key={salon.id} value={salon.id}>
                {salon.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = navItemActive(location.pathname, item);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-border">
        <button
          onClick={() => {
            localStorage.removeItem("client_token");
            localStorage.removeItem("client_id");
            localStorage.removeItem("client_salon_id");
            localStorage.removeItem("client_salons");
            navigate("/konto/logowanie");
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Wyloguj się
        </button>
      </div>
    </aside>
  );
}

export default function ClientBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border safe-bottom z-50 lg:hidden">
      <div className="max-w-lg mx-auto flex">
        {navItems.map((item) => {
          const active = navItemActive(location.pathname, item);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center py-2 pt-3 gap-0.5 transition-colors touch-target ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium leading-tight text-center px-0.5">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
