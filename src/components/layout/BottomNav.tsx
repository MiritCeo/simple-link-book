import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, ClipboardList, Users, Settings } from 'lucide-react';

const navItems = [
  { path: '/panel/kalendarz', label: 'Kalendarz', icon: CalendarDays },
  { path: '/panel/wizyty', label: 'Wizyty', icon: ClipboardList },
  { path: '/panel/klienci', label: 'Klienci', icon: Users },
  { path: '/panel/ustawienia', label: 'Ustawienia', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-card h-screen sticky top-0">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <CalendarDays className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-sm">Studio Bella</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => {
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
      <div className="px-5 py-4 border-t border-border">
        <p className="text-[10px] text-muted-foreground">purebook.pl v1.0</p>
      </div>
    </aside>
  );
}

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border safe-bottom z-50 lg:hidden">
      <div className="max-w-lg mx-auto flex">
        {navItems.map(item => {
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
