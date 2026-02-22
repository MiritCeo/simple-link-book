import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, QrCode, Link2, ChevronRight, Clock, Users, Scissors, Palette, ExternalLink, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { getSalonProfile, getSalonServices, getSalonStaff, updateSalonProfile } from '@/lib/api';
import { PageTransition, MotionList, MotionItem, HoverCard } from '@/components/motion';
import { motion, AnimatePresence } from 'framer-motion';
import { getRole } from '@/lib/auth';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [showQR, setShowQR] = useState(false);
  const [salon, setSalon] = useState<any | null>(null);
  const [servicesCount, setServicesCount] = useState(0);
  const [staffCount, setStaffCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    address: '',
    phone: '',
    hours: '',
    description: '',
    accentColor: '#111827',
    logoUrl: '',
  });
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://purebook.pl';
  const bookingUrl = salon ? `${origin}/s/${salon.slug}` : '';
  const role = getRole();

  useEffect(() => {
    let mounted = true;
    Promise.all([getSalonProfile(), getSalonServices(), getSalonStaff()])
      .then(([profileRes, servicesRes, staffRes]) => {
        if (!mounted) return;
        setSalon(profileRes.salon);
        setProfileForm({
          name: profileRes.salon?.name || '',
          address: profileRes.salon?.address || '',
          phone: profileRes.salon?.phone || '',
          hours: profileRes.salon?.hours || '',
          description: profileRes.salon?.description || '',
          accentColor: profileRes.salon?.accentColor || '#111827',
          logoUrl: profileRes.salon?.logoUrl || '',
        });
        setServicesCount(servicesRes.services?.length || 0);
        setStaffCount(staffRes.staff?.length || 0);
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const copyLink = async () => {
    if (!bookingUrl) {
      toast.error('Brak linku rezerwacyjnego');
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(bookingUrl);
      } else {
        const el = document.createElement('textarea');
        el.value = bookingUrl;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      toast.success('Link skopiowany!');
    } catch {
      toast.error('Nie udało się skopiować linku');
    }
  };

  const sections = [
    { icon: Store, label: 'Salony', desc: 'Zarządzaj salonami i dostępem', route: '/panel/ustawienia/salony' },
    { icon: Scissors, label: 'Usługi', count: servicesCount, desc: 'Zarządzaj usługami i cenami', route: '/panel/ustawienia/uslugi' },
    { icon: Users, label: 'Pracownicy', count: staffCount, desc: 'Zarządzaj zespołem', route: '/panel/ustawienia/pracownicy' },
    { icon: Clock, label: 'Godziny pracy', desc: 'Ustaw godziny otwarcia i wyjątki', route: '/panel/ustawienia/godziny' },
    { icon: Clock, label: 'Przerwy i bufory', desc: 'Konfiguruj przerwy oraz bufory czasowe', route: '/panel/ustawienia/przerwy' },
    { icon: Palette, label: 'Personalizacja', desc: 'Logo, kolory, nazwa salonu', anchor: 'personalizacja' },
  ];

  return (
    <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6">
      <h1 className="text-xl font-bold mb-4 lg:text-2xl lg:mb-6">Ustawienia</h1>

      <div className="lg:grid lg:grid-cols-2 lg:gap-6">
        {/* Left column */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="bg-card rounded-2xl p-5 border border-border mb-4 lg:p-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Link rezerwacyjny</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Udostępnij klientom ten link, aby mogli rezerwować wizyty online.</p>
            <div className="flex gap-2 mb-3">
              <Input value={bookingUrl || '—'} readOnly className="h-10 rounded-xl text-xs bg-muted" />
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" size="sm" onClick={copyLink} className="rounded-xl h-10 px-3 shrink-0" disabled={!bookingUrl}>
                  <Copy className="w-4 h-4" />
                </Button>
              </motion.div>
            </div>
            <div className="flex gap-2">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button variant="secondary" size="sm" onClick={() => setShowQR(!showQR)} className="rounded-xl h-9 gap-1.5">
                  <QrCode className="w-4 h-4" />Kod QR
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-xl h-9 gap-1.5"
                  onClick={() => {
                    if (!bookingUrl) {
                      toast.error('Brak linku rezerwacyjnego');
                      return;
                    }
                    window.open(bookingUrl, '_blank', 'noopener,noreferrer');
                  }}
                  disabled={!bookingUrl}
                >
                  <ExternalLink className="w-4 h-4" />Podgląd strony
                </Button>
              </motion.div>
            </div>
            <AnimatePresence>
              {showQR && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 flex justify-center p-4 bg-background rounded-xl border border-border">
                    <QRCodeSVG value={bookingUrl} size={180} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Salon info (desktop) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="hidden lg:block bg-card rounded-2xl p-6 border border-border mb-4"
          >
            <h2 className="font-semibold mb-3">Dane salonu</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Nazwa</span><span className="font-medium">{salon?.name || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Adres</span><span className="font-medium">{salon?.address || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Telefon</span><span className="font-medium">{salon?.phone || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Godziny</span><span className="font-medium">{salon?.hours || '—'}</span></div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="bg-card rounded-2xl p-5 border border-border mb-4 lg:p-6"
            id="personalizacja"
          >
            <h2 className="font-semibold mb-3">Personalizacja salonu</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Logo salonu</label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl border border-border bg-background flex items-center justify-center">
                    <img
                      src={profileForm.logoUrl || '/purebooklogo.svg'}
                      alt="Logo salonu"
                      className="w-8 h-8"
                    />
                  </div>
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        const result = typeof reader.result === 'string' ? reader.result : '';
                        if (result) setProfileForm(f => ({ ...f, logoUrl: result }));
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="h-11 rounded-xl"
                  />
                  {profileForm.logoUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl h-11"
                      onClick={() => setProfileForm(f => ({ ...f, logoUrl: '' }))}
                    >
                      Usuń
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG lub SVG. Logo pojawi się w panelu i na stronie rezerwacji.</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nazwa</label>
                <Input value={profileForm.name} onChange={(e) => setProfileForm(f => ({ ...f, name: e.target.value }))} className="h-11 rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Adres</label>
                <Input value={profileForm.address} onChange={(e) => setProfileForm(f => ({ ...f, address: e.target.value }))} className="h-11 rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Telefon</label>
                <Input value={profileForm.phone} onChange={(e) => setProfileForm(f => ({ ...f, phone: e.target.value }))} className="h-11 rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Godziny</label>
                <Input value={profileForm.hours} onChange={(e) => setProfileForm(f => ({ ...f, hours: e.target.value }))} className="h-11 rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Opis</label>
                <Input value={profileForm.description} onChange={(e) => setProfileForm(f => ({ ...f, description: e.target.value }))} className="h-11 rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Kolor akcentu</label>
                <Input type="color" value={profileForm.accentColor} onChange={(e) => setProfileForm(f => ({ ...f, accentColor: e.target.value }))} className="h-11 rounded-xl p-1" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Button
                className="rounded-xl h-10"
                disabled={saving || role !== 'OWNER'}
                onClick={async () => {
                  try {
                    setSaving(true);
                    const res = await updateSalonProfile({
                      ...profileForm,
                      logoUrl: profileForm.logoUrl || null,
                    });
                    setSalon(res.salon);
                    toast.success('Zapisano dane salonu');
                  } catch (err: any) {
                    toast.error(err.message || 'Błąd zapisu');
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </Button>
              {role !== 'OWNER' && (
                <span className="text-xs text-muted-foreground">Tylko OWNER może edytować dane</span>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right column - settings sections */}
        <div>
          <h2 className="font-semibold mb-3 hidden lg:block">Zarządzanie</h2>
          {loading ? (
            <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground">
              Ładowanie ustawień...
            </div>
          ) : (
            <MotionList className="space-y-2">
              {sections.map(sec => (
                <MotionItem key={sec.label}>
                  <HoverCard
                    onClick={() => {
                      if (sec.route) {
                        navigate(sec.route);
                        return;
                      }
                      if (sec.anchor) {
                        const el = document.getElementById(sec.anchor);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className={`w-full text-left bg-card rounded-2xl p-4 border border-border flex items-center gap-3 touch-target lg:p-5 ${
                      sec.route || sec.anchor ? 'cursor-pointer' : 'opacity-80'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0 lg:w-12 lg:h-12">
                      <sec.icon className="w-5 h-5 text-secondary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{sec.label}</p>
                        {sec.count !== undefined && <span className="text-xs text-muted-foreground">({sec.count})</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">{sec.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </HoverCard>
                </MotionItem>
              ))}
            </MotionList>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-8 mb-4 lg:text-left">purebook.pl v1.0</p>
    </PageTransition>
  );
}
