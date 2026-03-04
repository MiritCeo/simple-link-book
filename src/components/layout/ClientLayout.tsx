import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import ClientBottomNav, { ClientSidebar } from './ClientBottomNav';
import { getClientMe, getClientSalons, switchClientSalon } from '@/lib/api';

export default function ClientLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [salons, setSalons] = useState<Array<{ id: string; name: string; slug: string; clientId: string }>>(() => {
    try {
      const raw = localStorage.getItem('client_salons');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [activeSalonId, setActiveSalonId] = useState<string | null>(() => localStorage.getItem('client_salon_id'));
  const [clientName, setClientName] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem("client_token");
    if (!token) {
      navigate("/konto/logowanie", { replace: true, state: { from: location.pathname } });
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    let mounted = true;
    getClientSalons()
      .then((res) => {
        if (!mounted) return;
        const list = res.salons || [];
        setSalons(list);
        localStorage.setItem('client_salons', JSON.stringify(list));
        if (res.activeSalonId) {
          setActiveSalonId(res.activeSalonId);
          localStorage.setItem('client_salon_id', res.activeSalonId);
        }
      })
      .catch(() => {});
    getClientMe()
      .then((res) => {
        if (!mounted) return;
        setClientName(res.client?.name || '');
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const handleSwitchSalon = async (salonId: string) => {
    if (!salonId || salonId === activeSalonId) return;
    try {
      await switchClientSalon(salonId);
      setActiveSalonId(salonId);
      window.location.reload();
    } catch {
      // ignore switch errors to avoid breaking layout
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <ClientSidebar
        salons={salons}
        activeSalonId={activeSalonId}
        onSwitchSalon={handleSwitchSalon}
        clientName={clientName}
      />

      <div className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <header className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border z-40 lg:hidden">
          <div className="max-w-lg mx-auto flex items-center gap-2 px-4 h-14">
            <img src="/purebooklogo.svg" alt="purebook" className="w-6 h-6" />
            <span className="font-bold text-sm">Moje konto</span>
            {salons.length > 1 && (
              <select
                value={activeSalonId || ''}
                onChange={(e) => e.target.value && handleSwitchSalon(e.target.value)}
                className="ml-auto max-w-[140px] rounded-md border border-input bg-background px-2 py-1 text-xs"
              >
                {salons.map(salon => (
                  <option key={salon.id} value={salon.id}>{salon.name}</option>
                ))}
              </select>
            )}
          </div>
        </header>

        <main className="max-w-lg mx-auto pb-24 lg:max-w-4xl lg:pb-6">
          <Outlet />
        </main>
      </div>

      <ClientBottomNav />
    </div>
  );
}
