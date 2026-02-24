import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import BottomNav, { Sidebar } from './BottomNav';
import { LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { clearAuth, getRole } from '@/lib/auth';
import { getSalonProfile } from '@/lib/api';

export default function PanelLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [salonName, setSalonName] = useState<string | null>(null);
  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    const role = getRole();
    if (role === 'SUPER_ADMIN') {
      navigate('/admin', { replace: true });
      return;
    }
    if (role === 'STAFF') {
      const allowed = ['/panel/kalendarz', '/panel/wizyty', '/panel/klienci', '/panel/magazyn'];
      const isAllowed = allowed.some(path => location.pathname.startsWith(path));
      if (!isAllowed) {
        navigate('/panel/kalendarz', { replace: true });
      }
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    let active = true;
    const loadProfile = () => {
      getSalonProfile()
        .then(res => {
          if (!active) return;
          setLogoUrl(res.salon?.logoUrl || null);
          setSalonName(res.salon?.name || null);
        })
        .catch(() => {});
    };
    loadProfile();
    const handleSalonChanged = () => loadProfile();
    window.addEventListener("salonChanged", handleSalonChanged);
    return () => {
      active = false;
      window.removeEventListener("salonChanged", handleSalonChanged);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar logoUrl={logoUrl} salonName={salonName} />

      <div className="flex-1 min-w-0">
        {/* Mobile top bar - hidden on desktop (sidebar has logo) */}
        <header className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border z-40 lg:hidden">
          <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2">
              <img src={logoUrl || '/purebooklogo.svg'} alt="Logo salonu" className="w-6 h-6" />
              <span className="font-bold text-sm">{salonName || 'Salon'}</span>
            </div>
            <button
              onClick={handleLogout}
              className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Wyloguj się"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="max-w-lg mx-auto pb-24 lg:max-w-none lg:pb-6">
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
