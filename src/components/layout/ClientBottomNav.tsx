import { useLocation, useNavigate } from 'react-router-dom';
import { Home, CalendarDays, User, LogOut } from 'lucide-react';

const navItems = [
  { path: '/konto', label: 'Start', icon: Home, exact: true },
  { path: '/konto/wizyty', label: 'Moje wizyty', icon: CalendarDays },
  { path: '/konto/profil', label: 'Profil', icon: User },
];

export function ClientSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <aside className="hidden lg:flex flex-col w-56 border-r border-border bg-card h-screen sticky top-0">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-border">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-4 h-4 text-primary" />
        </div>
        <div>
          <span className="font-bold text-sm block leading-tight">Joanna</span>
          <span className="text-[10px] text-muted-foreground">Moje konto</span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => {
          const active = isActive(item.path, item.exact);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
          onClick={() => navigate('/s/studio-bella')}
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

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border safe-bottom z-50 lg:hidden">
      <div className="max-w-lg mx-auto flex">
        {navItems.map(item => {
          const active = isActive(item.path, item.exact);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center py-2 pt-3 gap-0.5 transition-colors touch-target ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
