import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, ClipboardList, Users, Settings } from 'lucide-react';

const navItems = [
  { path: '/panel/kalendarz', label: 'Kalendarz', icon: CalendarDays },
  { path: '/panel/wizyty', label: 'Wizyty', icon: ClipboardList },
  { path: '/panel/klienci', label: 'Klienci', icon: Users },
  { path: '/panel/ustawienia', label: 'Ustawienia', icon: Settings },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border safe-bottom z-50">
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
