import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageTransition } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { attachClientSalon, getClientSalons, switchClientSalon } from '@/lib/api';

export default function ClientSalons() {
  const navigate = useNavigate();
  const [salons, setSalons] = useState<Array<{ id: string; name: string; slug: string; clientId: string; address?: string }>>([]);
  const [activeSalonId, setActiveSalonId] = useState<string | null>(localStorage.getItem('client_salon_id'));
  const [attachToken, setAttachToken] = useState('');
  const [attachingSalon, setAttachingSalon] = useState(false);

  const loadSalons = async () => {
    const res = await getClientSalons();
    setSalons(res.salons || []);
    if (res.activeSalonId) {
      setActiveSalonId(res.activeSalonId);
      localStorage.setItem('client_salon_id', res.activeSalonId);
    }
  };

  useEffect(() => {
    loadSalons().catch(() => {});
  }, []);

  const handleSwitchSalon = async (salonId: string) => {
    if (!salonId || salonId === activeSalonId) return;
    try {
      await switchClientSalon(salonId);
      setActiveSalonId(salonId);
      window.location.reload();
    } catch (err: any) {
      toast.error(err?.message || 'Nie udało się przełączyć salonu');
    }
  };

  const handleAttachSalon = async () => {
    if (!attachToken.trim()) {
      toast.error('Wpisz kod lub token z SMS');
      return;
    }
    try {
      setAttachingSalon(true);
      await attachClientSalon(attachToken.trim());
      setAttachToken('');
      await loadSalons();
      toast.success('Salon został dodany');
    } catch (err: any) {
      toast.error(err?.message || 'Nie udało się dodać salonu');
    } finally {
      setAttachingSalon(false);
    }
  };

  return (
    <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6 pb-8">
      <h1 className="text-xl font-bold lg:text-2xl mb-1">Moje salony</h1>
      <p className="text-sm text-muted-foreground mb-6">Zarządzaj salonami przypisanymi do konta</p>

      <div className="mb-6 bg-card rounded-2xl p-5 border border-border">
        <label className="text-sm font-medium mb-2 block">Dodaj salon (kod z SMS / QR)</label>
        <div className="flex gap-2">
          <Input
            value={attachToken}
            onChange={(e) => setAttachToken(e.target.value)}
            placeholder="Wklej kod lub token"
            className="h-11 rounded-xl"
          />
          <Button onClick={handleAttachSalon} disabled={attachingSalon} className="h-11 rounded-xl">
            {attachingSalon ? 'Dodawanie...' : 'Dodaj'}
          </Button>
        </div>
      </div>

      {salons.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Brak przypisanych salonów</p>
      ) : (
        <div className="grid gap-3">
          {salons.map((salon) => (
            <motion.div
              key={salon.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-muted/20 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{salon.name}</p>
                  <p className="text-xs text-muted-foreground">{salon.address || '—'}</p>
                </div>
                {activeSalonId === salon.id ? (
                  <span className="text-[10px] uppercase tracking-wide text-primary">aktywny</span>
                ) : (
                  <Button size="sm" variant="outline" className="rounded-lg h-8" onClick={() => handleSwitchSalon(salon.id)}>
                    Przełącz
                  </Button>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  className="rounded-xl h-9 flex-1"
                  onClick={() => salon.slug && navigate(`/s/${salon.slug}`)}
                >
                  Umów wizytę ponownie
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl h-9 flex-1"
                  onClick={() => navigate(`/konto/wizyty?salonId=${salon.id}&tab=past`)}
                >
                  Zobacz historię
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </PageTransition>
  );
}
