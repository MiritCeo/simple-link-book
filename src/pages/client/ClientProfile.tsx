import { useState } from 'react';
import { User, Mail, Phone, Lock, Check, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageTransition, MotionList, MotionItem } from '@/components/motion';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function ClientProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    name: 'Joanna Majewska',
    phone: '+48 501 234 567',
    email: 'joanna@example.com',
  });
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);

  const handleSaveProfile = () => {
    setEditingProfile(false);
    toast.success('Dane zostały zaktualizowane');
  };

  const handleChangePassword = () => {
    if (passwords.new.length < 8) {
      toast.error('Hasło musi mieć min. 8 znaków');
      return;
    }
    if (passwords.new !== passwords.confirm) {
      toast.error('Hasła nie są identyczne');
      return;
    }
    setEditingPassword(false);
    setPasswords({ current: '', new: '', confirm: '' });
    toast.success('Hasło zostało zmienione');
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
                <Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} className="h-11 rounded-xl" />
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
              <Button variant="outline" onClick={() => setEditingProfile(false)} className="flex-1 h-11 rounded-xl">
                Anuluj
              </Button>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                <Button onClick={handleSaveProfile} className="w-full h-11 rounded-xl gap-1.5">
                  <Check className="w-4 h-4" />Zapisz
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
                  <Button variant="outline" onClick={() => { setEditingPassword(false); setPasswords({ current: '', new: '', confirm: '' }); }} className="flex-1 h-11 rounded-xl">
                    Anuluj
                  </Button>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                    <Button onClick={handleChangePassword} className="w-full h-11 rounded-xl">
                      Zmień hasło
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
                  onClick={() => navigate('/s/studio-bella')}
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
