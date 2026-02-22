import { useLocation, useNavigate } from 'react-router-dom';
import { clearAuth, getRole } from '@/lib/auth';
import { LayoutDashboard, CalendarDays, ClipboardList, Users, Bell, Settings, CalendarClock, LogOut } from 'lucide-react';

const navItems = [
  { path: '/panel/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/panel/kalendarz', label: 'Kalendarz', icon: CalendarDays },
  { path: '/panel/wizyty', label: 'Wizyty', icon: ClipboardList },
  { path: '/panel/klienci', label: 'Klienci', icon: Users },
  { path: '/panel/grafik', label: 'Grafik', icon: CalendarClock },
  { path: '/panel/powiadomienia', label: 'Powiadomienia', icon: Bell },
  { path: '/panel/ustawienia', label: 'Ustawienia', icon: Settings },
];

// Bottom nav shows fewer items on mobile
const mobileNavItems = [
  navItems[0], // Dashboard
  navItems[1], // Kalendarz
  navItems[2], // Wizyty
  navItems[4], // Grafik
];

export function Sidebar({ logoUrl, salonName }: { logoUrl?: string | null; salonName?: string | null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const role = getRole();
  const logoSrc = logoUrl || '/purebooklogo.svg';
  const name = salonName || 'Salon';
  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };
  const visibleItems = role === 'STAFF'
    ? navItems.filter(item => !['/panel/ustawienia', '/panel/powiadomienia', '/panel/grafik', '/panel/dashboard'].includes(item.path))
    : navItems;

  return (
    <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-card h-screen sticky top-0">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-border">
        <div className="w-8 h-8 flex items-center justify-center">
          <img src={logoSrc} alt="Logo salonu" className="w-7 h-7" />
        </div>
        <span className="font-bold text-sm">{name}</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map(item => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-border space-y-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Wyloguj się
        </button>
        <p className="text-[10px] text-muted-foreground">purebook.pl v1.0</p>
      </div>
    </aside>
  );
}

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const role = getRole();
  const visibleMobileItems = role === 'STAFF'
    ? mobileNavItems.filter(item => !['/panel/dashboard', '/panel/grafik'].includes(item.path))
    : mobileNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border safe-bottom z-50 lg:hidden">
      <div className="max-w-lg mx-auto flex">
        {visibleMobileItems.map(item => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center py-2 pt-3 gap-0.5 transition-colors touch-target ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
