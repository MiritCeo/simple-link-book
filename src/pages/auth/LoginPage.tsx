import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { login } from '@/lib/api';
import { setActiveSalonId, setSalons } from '@/lib/auth';
import { toast } from 'sonner';
import ClientLoginPage from './ClientLoginPage';

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const isClientLogin = new URLSearchParams(location.search).get('client') === '1';

  if (isClientLogin) {
    return <ClientLoginPage />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await login(email, password);
      if (data.salons?.length) {
        setSalons(data.salons as any);
      }
      if (data.salonId) {
        setActiveSalonId(data.salonId);
      }
      if (data.role === 'SUPER_ADMIN') {
        navigate('/admin');
        return;
      }
      if (data.salons && data.salons.length > 1) {
        navigate('/wybierz-salon');
        return;
      }
      navigate('/panel/kalendarz');
    } catch (err: any) {
      toast.error(err.message || 'Nie udało się zalogować');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <img src="/purebooklogo.svg" alt="purebook" className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold">purebook</h1>
          <p className="text-sm text-muted-foreground mt-1">Zaloguj się do panelu salonu</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Email</label>
            <Input type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} className="h-12 rounded-xl" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Hasło</label>
            <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="h-12 rounded-xl" />
          </div>
          <Button type="submit" size="lg" className="w-full h-14 rounded-2xl text-base">
            Zaloguj się
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Nie masz konta? <button className="text-primary font-medium">Zarejestruj salon</button>
        </p>
      </div>
    </div>
  );
}
