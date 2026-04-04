import { useEffect, useState } from 'react';
import { User, Mail, Phone, Lock, Check, LogOut, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageTransition } from '@/components/motion';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { changeClientPassword, getClientMe, updateClientProfile } from '@/lib/api';

export default function ClientProfile() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [salonPanelAvailable, setSalonPanelAvailable] = useState(false);

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
        setSalonPanelAvailable(!!res.salonPanelAvailable);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      const res = await updateClientProfile({
        name: profile.name,
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
      toast.error(err?.message || 'Nie udało się zapisać danych');
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
              <p className="text-sm text-muted-foreground bg-muted rounded-xl px-3 py-2.5">{profile.phone}</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Numer telefonu jest przypisany do historii wizyt i salonów, dlatego nie można go zmienić w profilu.
              </p>
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
              {salonPanelAvailable && (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/login', { state: { prefilledEmail: profile.email } })}
                    className="w-full rounded-xl h-11 gap-2 justify-start"
                  >
                    <Building2 className="w-4 h-4" />
                    Panel salonu (to samo konto e-mail)
                  </Button>
                  <p className="text-[10px] text-muted-foreground mt-1.5 px-0.5">
                    Zaloguj się hasłem do panelu salonu — to osobne konto użytkownika salonu powiązane z tym adresem e-mail.
                  </p>
                </motion.div>
              )}
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
              <Button
                variant="ghost"
                className="w-full rounded-xl h-11 gap-2 justify-start text-destructive hover:text-destructive"
                onClick={() => navigate('/konto/usun-konto')}
              >
                Usuń konto
              </Button>
              <Link
                to="/polityka-prywatnosci"
                state={{ from: location.pathname }}
                className="block text-center text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground pt-1"
              >
                Polityka prywatności
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
