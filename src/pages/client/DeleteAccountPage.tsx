import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { PageTransition } from '@/components/motion';
import { toast } from 'sonner';
import { deleteClientAccount } from '@/lib/api';

export default function DeleteAccountPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) {
      toast.error('Zaznacz potwierdzenie, aby kontynuować.');
      return;
    }
    if (!password.trim()) {
      toast.error('Podaj hasło do konta.');
      return;
    }
    setLoading(true);
    try {
      await deleteClientAccount({ password });
      toast.success('Konto zostało usunięte.');
      navigate('/konto/logowanie', { replace: true });
    } catch (err: any) {
      toast.error(err?.message || 'Nie udało się usunąć konta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition className="px-4 pt-4 pb-28 lg:pb-8 max-w-lg mx-auto">
      <h1 className="text-xl font-bold lg:text-2xl mb-1">Usuń konto</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Trwale usuniesz konto w aplikacji Honly oraz powiązane dane (logowanie, ulubione, oceny, powiadomienia). Dane
        widoczne u salonów w ramach historii wizyt mogą zostać zanonimizowane —{' '}
        <Link to="/polityka-prywatnosci" className="text-primary underline underline-offset-2">
          polityka prywatności
        </Link>
        .
      </p>

      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 flex gap-3 mb-6">
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground leading-relaxed">
          <p className="font-medium text-foreground mb-1">Operacja jest nieodwracalna</p>
          <p>
            Nie będziesz mógł odzyskać dostępu do tego konta aplikacji. Jeśli korzystasz z panelu salonu pod tym samym
            adresem e-mail, może on pozostać aktywny niezależnie — to osobny system logowania.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-5 space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium">Hasło do konta</label>
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-xl"
            placeholder="Wpisz hasło, aby potwierdzić"
          />
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} className="mt-1" />
          <span className="text-sm text-muted-foreground leading-snug">
            Rozumiem, że konto i powiązane dane w aplikacji zostaną trwale usunięte lub zanonimizowane zgodnie z opisem
            powyżej.
          </span>
        </label>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" className="rounded-xl flex-1" onClick={() => navigate(-1)}>
            Anuluj
          </Button>
          <Button type="submit" variant="destructive" className="rounded-xl flex-1" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Usuń konto na stałe
          </Button>
        </div>
      </form>
    </PageTransition>
  );
}
