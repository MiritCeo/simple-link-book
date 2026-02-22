import { useEffect, useState } from 'react';
import { User, Mail, Phone, Lock, Check, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageTransition } from '@/components/motion';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { changeClientPassword, getClientMe, updateClientProfile } from '@/lib/api';

export default function ClientProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const formatPhonePL = (input: string) => {
    const digits = input.replace(/\D/g, '');
    const withCountry = digits.startsWith('48') ? digits : `48${digits}`;
    const limited = withCountry.slice(0, 11);
    const rest = limited.slice(2);
    const parts = [rest.slice(0, 3), rest.slice(3, 6), rest.slice(6, 9)].filter(Boolean);
    return `+48 ${parts.join(' ')}`.trim();
  };

  const isValidPhonePL = (value: string) => /^\+48\s?\d{3}\s?\d{3}\s?\d{3}$/.test(value);

  useEffect(() => {
    let mounted = true;
    getClientMe()
      .then(res => {
        if (!mounted) return;
        setProfile({
          name: res.client?.name || '',
          phone: res.client?.phone || '',
          email: res.client?.email || '',
        });
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const handleSaveProfile = async () => {
    if (!isValidPhonePL(profile.phone)) {
      toast.error('Podaj poprawny numer telefonu w formacie +48 123 456 789');
      return;
    }
    try {
      setSavingProfile(true);
      const res = await updateClientProfile({
        name: profile.name,
        phone: profile.phone,
        email: profile.email || undefined,
      });
      setProfile({
        name: res.client?.name || '',
        phone: res.client?.phone || '',
        email: res.client?.email || '',
      });
      setEditingProfile(false);
      toast.success('Dane zostały zaktualizowane');
    } catch (err: any) {
      if (err?.message?.includes('format')) {
        toast.error('Podaj numer telefonu w formacie +48 123 456 789');
      } else {
        toast.error(err?.message || 'Nie udało się zapisać danych');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwords.new.length < 8) {
      toast.error('Hasło musi mieć min. 8 znaków');
      return;
    }
    if (passwords.new !== passwords.confirm) {
      toast.error('Hasła nie są identyczne');
      return;
    }
    try {
      setSavingPassword(true);
      await changeClientPassword({ currentPassword: passwords.current, newPassword: passwords.new });
      setEditingPassword(false);
      setPasswords({ current: '', new: '', confirm: '' });
      toast.success('Hasło zostało zmienione');
    } catch (err: any) {
      toast.error(err?.message || 'Nie udało się zmienić hasła');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6 pb-8">
      <h1 className="text-xl font-bold lg:text-2xl mb-1">Mój profil</h1>
      <p className="text-sm text-muted-foreground mb-6">Zarządzaj swoimi danymi i bezpieczeństwem</p>

      <div className="lg:grid lg:grid-cols-2 lg:gap-6">
        {/* Profile info */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-card rounded-2xl p-5 border border-border mb-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Dane osobowe</h2>
            {!editingProfile && (
              <Button variant="ghost" size="sm" onClick={() => setEditingProfile(true)} className="rounded-xl h-8 text-xs">
                Edytuj
              </Button>
            )}
          </div>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="font-bold text-lg text-primary">JM</span>
            </div>
            <div>
              <p className="font-bold">{profile.name}</p>
              <p className="text-xs text-muted-foreground">Klient od stycznia 2025</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" />Imię i nazwisko
              </label>
              {editingProfile ? (
                <Input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} className="h-11 rounded-xl" />
              ) : (
                <p className="text-sm text-muted-foreground bg-muted rounded-xl px-3 py-2.5">{profile.name}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />Telefon
              </label>
              {editingProfile ? (
                <Input
                  value={profile.phone}
                  onChange={e => setProfile(p => ({ ...p, phone: formatPhonePL(e.target.value) }))}
                  className="h-11 rounded-xl"
                  placeholder="+48 123 456 789"
                />
              ) : (
                <p className="text-sm text-muted-foreground bg-muted rounded-xl px-3 py-2.5">{profile.phone}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />Email
              </label>
              {editingProfile ? (
                <Input value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} className="h-11 rounded-xl" />
              ) : (
                <p className="text-sm text-muted-foreground bg-muted rounded-xl px-3 py-2.5">{profile.email}</p>
              )}
            </div>
          </div>

          {editingProfile && (
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setEditingProfile(false)}
                className="flex-1 h-11 rounded-xl"
                disabled={savingProfile}
              >
                Anuluj
              </Button>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                <Button onClick={handleSaveProfile} className="w-full h-11 rounded-xl gap-1.5" disabled={savingProfile}>
                  <Check className="w-4 h-4" />{savingProfile ? 'Zapisywanie...' : 'Zapisz'}
                </Button>
              </motion.div>
            </div>
          )}
        </motion.div>

        <div className="space-y-4">
          {/* Change password */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="bg-card rounded-2xl p-5 border border-border"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-semibold">Zmiana hasła</h2>
              </div>
              {!editingPassword && (
                <Button variant="ghost" size="sm" onClick={() => setEditingPassword(true)} className="rounded-xl h-8 text-xs">
                  Zmień
                </Button>
              )}
            </div>

            {editingPassword ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Obecne hasło</label>
                  <Input type="password" value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} className="h-11 rounded-xl" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Nowe hasło</label>
                  <Input type="password" placeholder="Min. 8 znaków" value={passwords.new} onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))} className="h-11 rounded-xl" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Powtórz nowe hasło</label>
                  <Input type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} className="h-11 rounded-xl" />
                  {passwords.confirm && passwords.new !== passwords.confirm && (
                    <p className="text-xs text-destructive mt-1">Hasła nie są identyczne</p>
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    onClick={() => { setEditingPassword(false); setPasswords({ current: '', new: '', confirm: '' }); }}
                    className="flex-1 h-11 rounded-xl"
                    disabled={savingPassword}
                  >
                    Anuluj
                  </Button>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                    <Button onClick={handleChangePassword} className="w-full h-11 rounded-xl" disabled={savingPassword}>
                      {savingPassword ? 'Zapisywanie...' : 'Zmień hasło'}
                    </Button>
                  </motion.div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Hasło ostatnio zmienione: nigdy</p>
            )}
          </motion.div>

          {/* Preferences / danger zone */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="bg-card rounded-2xl p-5 border border-border"
          >
            <h2 className="font-semibold mb-3">Konto</h2>
            <div className="space-y-3">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  onClick={() => {
                    localStorage.removeItem('client_token');
                    localStorage.removeItem('client_id');
                    localStorage.removeItem('client_salon_id');
                    navigate('/konto/logowanie');
                  }}
                  className="w-full rounded-xl h-11 gap-2 justify-start"
                >
                  <LogOut className="w-4 h-4" />Wyloguj się
                </Button>
              </motion.div>
              <Button variant="ghost" className="w-full rounded-xl h-11 gap-2 justify-start text-destructive hover:text-destructive">
                Usuń konto
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
