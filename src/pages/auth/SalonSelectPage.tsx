import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getSalons, setActiveSalonId, setRole } from '@/lib/auth';
import { switchSalon } from '@/lib/api';
import { toast } from 'sonner';

export default function SalonSelectPage() {
  const navigate = useNavigate();
  const [salons, setSalonsList] = useState<Array<{ id: string; name: string; slug: string; role: 'OWNER' | 'STAFF' }>>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const list = getSalons();
    setSalonsList(list);
    if (!list.length) {
      navigate('/panel/kalendarz');
    }
  }, [navigate]);

  const handleSelect = async (salonId: string, role: 'OWNER' | 'STAFF') => {
    try {
      setLoadingId(salonId);
      await switchSalon(salonId);
      setActiveSalonId(salonId);
      setRole(role);
      navigate('/panel/kalendarz');
    } catch (err: any) {
      toast.error(err.message || 'Nie udało się wybrać salonu');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <img src="/purebooklogo.svg" alt="purebook" className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold">Wybierz salon</h1>
          <p className="text-sm text-muted-foreground mt-1">Masz dostęp do kilku salonów</p>
        </div>

        <div className="space-y-3">
          {salons.map(salon => (
            <Button
              key={salon.id}
              variant="outline"
              className="w-full h-12 rounded-xl justify-between"
              onClick={() => handleSelect(salon.id, salon.role)}
              disabled={loadingId === salon.id}
            >
              <span className="font-medium">{salon.name}</span>
              <span className="text-xs text-muted-foreground">{salon.role}</span>
            </Button>
          ))}
          {salons.length === 0 && (
            <p className="text-sm text-muted-foreground text-center">Brak salonów do wyboru</p>
          )}
        </div>
      </div>
    </div>
  );
}
