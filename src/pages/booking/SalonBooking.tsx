import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, Phone, ArrowLeft, Check, Search, User, CalendarDays, ChevronLeft, ChevronRight, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { type TimeSlot } from '@/data/mockData';
import { createPublicAppointment, getPublicAvailability, getPublicSalon } from '@/lib/api';

const STEPS = ['Usługa', 'Specjalista', 'Termin', 'Dane', 'Potwierdzenie'];

const ease = [0.25, 0.1, 0.25, 1] as const;

const pageVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 60 : -60, scale: 0.97 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -60 : 60, scale: 0.97 }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease } },
};

export default function SalonBooking() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const normalizedSlug = slug?.toLowerCase();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1=forward, -1=back
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [selectedSpecialist, setSelectedSpecialist] = useState<any | null>(null);
  const [anySpecialist, setAnySpecialist] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [clientData, setClientData] = useState({ name: '', phone: '', email: '', notes: '' });
  const [bookingComplete, setBookingComplete] = useState(false);
  const [cancelToken, setCancelToken] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [registerData, setRegisterData] = useState({ password: '', confirmPassword: '' });
  const [registered, setRegistered] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [salon, setSalon] = useState<any | null>(null);
  const accentHex = salon?.accentColor || '#CD798A';
  const logoSrc = salon?.logoUrl || '/purebooklogo.svg';

  const hexToHsl = (hex: string) => {
    const value = hex.replace('#', '');
    if (![3, 6].includes(value.length)) return null;
    const full = value.length === 3 ? value.split('').map(c => c + c).join('') : value;
    const num = parseInt(full, 16);
    const r = ((num >> 16) & 255) / 255;
    const g = ((num >> 8) & 255) / 255;
    const b = (num & 255) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
        default:
          break;
      }
      h /= 6;
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const accentHsl = useMemo(() => hexToHsl(accentHex), [accentHex]);
  const accentVars = accentHsl ? ({
    ['--primary' as any]: accentHsl,
    ['--ring' as any]: accentHsl,
    ['--sidebar-primary' as any]: accentHsl,
  }) : undefined;
  const [services, setServices] = useState<any[]>([]);
  const [specialists, setSpecialists] = useState<any[]>([]);
  const [loadingSalon, setLoadingSalon] = useState(true);
  const [salonError, setSalonError] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  useEffect(() => {
    if (slug && normalizedSlug && slug !== normalizedSlug) {
      navigate(`/s/${normalizedSlug}`, { replace: true });
      return;
    }
    let mounted = true;
    setLoadingSalon(true);
    setSalonError(null);
    if (!normalizedSlug) return;
    getPublicSalon(normalizedSlug)
      .then(data => {
        if (!mounted) return;
        setSalon(data.salon);
        setServices(data.services || []);
        setSpecialists(data.staff || []);
      })
      .catch(err => {
        if (!mounted) return;
        setSalonError(err.message || 'Nie udało się pobrać danych salonu');
      })
      .finally(() => mounted && setLoadingSalon(false));
    return () => { mounted = false; };
  }, [slug, normalizedSlug, navigate]);

  const filteredServices = useMemo(() => {
    if (!searchQuery) return services;
    const q = searchQuery.toLowerCase();
    return services.filter(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
  }, [searchQuery, services]);

  const groupedServices = useMemo(() => {
    const groups: Record<string, Service[]> = {};
    filteredServices.forEach(s => {
      if (!groups[s.category]) groups[s.category] = [];
      groups[s.category].push(s);
    });
    return groups;
  }, [filteredServices]);

  const availableSpecialists = useMemo(() => {
    if (!selectedService) return [];
    return specialists.filter(sp => sp.services?.some((s: any) => s.id === selectedService.id));
  }, [selectedService, specialists]);

  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  const weekDays = useMemo(() => {
    const start = new Date(weekStart);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  }, [weekStart]);

  useEffect(() => {
    let mounted = true;
    if (!normalizedSlug || !selectedDate || !selectedService) {
      setTimeSlots([]);
      return () => { mounted = false; };
    }
    setSlotsLoading(true);
    setSlotsError(null);
    const staffId = anySpecialist ? undefined : selectedSpecialist?.id;
    getPublicAvailability({ slug: normalizedSlug, date: selectedDate, serviceId: selectedService.id, staffId })
      .then(res => {
        if (!mounted) return;
        const slots = (res.slots || []).map(time => ({ time, available: true }));
        setTimeSlots(slots);
      })
      .catch(err => {
        if (!mounted) return;
        setTimeSlots([]);
        setSlotsError(err.message || 'Nie udało się pobrać godzin');
      })
      .finally(() => mounted && setSlotsLoading(false));
    return () => { mounted = false; };
  }, [normalizedSlug, selectedDate, selectedService, selectedSpecialist, anySpecialist]);

  const availableSlots = useMemo(() => timeSlots.filter(s => s.available), [timeSlots]);
  const recommendedSlots = useMemo(() => availableSlots.slice(0, 3), [availableSlots]);
  const nearestSlot = recommendedSlots[0];

  const dayNames = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
  const monthNames = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return { day: d.getDate(), weekday: dayNames[d.getDay()], month: monthNames[d.getMonth()] };
  };

  const shiftWeek = (dir: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d.toISOString().split('T')[0]);
  };

  const goNext = () => { setDirection(1); setStep(s => s + 1); };
  const goBack = () => { setDirection(-1); setStep(s => s - 1); };

  const handleBook = async () => {
    if (!normalizedSlug || !selectedService || !selectedDate || !selectedTime || !clientData.name || !clientData.phone) {
      setBookingError('Uzupełnij wymagane dane przed potwierdzeniem.');
      return;
    }
    setBookingLoading(true);
    setBookingError(null);
    try {
      const res = await createPublicAppointment(normalizedSlug, {
        date: selectedDate,
        time: selectedTime,
        notes: clientData.notes || undefined,
        serviceId: selectedService.id,
        staffId: anySpecialist ? undefined : selectedSpecialist?.id,
        client: {
          name: clientData.name,
          phone: clientData.phone,
          email: clientData.email || undefined,
          notes: clientData.notes || undefined,
        },
      });
      setCancelToken(res.cancelToken || null);
      setBookingComplete(true);
      setStep(6);
    } catch (err: any) {
      setBookingError(err.message || 'Nie udało się zapisać wizyty.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleRegister = () => {
    if (registerData.password.length >= 8 && registerData.password === registerData.confirmPassword) {
      setRegistered(true);
      setShowRegister(false);
    }
  };

  // Landing page
  if (step === 0) {
    return (
      <div className="min-h-screen bg-background" style={accentVars}>
        {loadingSalon && (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">Ładowanie danych salonu...</div>
        )}
        {salonError && (
          <div className="px-6 py-10 text-center text-sm text-destructive">{salonError}</div>
        )}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-primary text-primary-foreground px-6 pt-12 pb-8"
          style={{ backgroundColor: accentHex }}
        >
          <div className="max-w-lg mx-auto">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 20 }}
              className="w-16 h-16 flex items-center justify-center mb-4"
            >
              <img src={logoSrc} alt="Logo salonu" className="w-12 h-12" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="text-2xl font-bold mb-1"
            >
              {salon?.name || 'Salon'}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="text-primary-foreground/80 text-sm mb-4"
            >
              {salon?.description || 'Opis salonu'}
            </motion.p>
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="space-y-2 text-sm text-primary-foreground/70"
            >
              {[
                { icon: MapPin, text: salon?.address || '—' },
                { icon: Clock, text: salon?.hours || '—' },
                { icon: Phone, text: salon?.phone || '—' },
              ].map((item, i) => (
                <motion.div key={i} variants={fadeUp} className="flex items-center gap-2">
                  <item.icon className="w-4 h-4" />{item.text}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>

        <div className="max-w-lg mx-auto px-6 -mt-4">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button onClick={() => { setDirection(1); setStep(1); }} size="lg" className="w-full h-14 text-lg rounded-2xl shadow-lg bg-foreground text-background hover:bg-foreground/90">
                Umów wizytę
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="mt-8 space-y-4"
          >
            <motion.h2 variants={fadeUp} className="text-lg font-semibold">Nasze usługi</motion.h2>
            {Object.entries(groupedServices).map(([cat, services]) => (
              <motion.div key={cat} variants={fadeUp}>
                <p className="text-sm text-muted-foreground font-medium mb-2">{cat}</p>
                {services.map(s => (
                  <div key={s.id} className="flex justify-between items-center py-3 border-b border-border last:border-0">
                    <div>
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.duration} min</p>
                    </div>
                    <p className="font-semibold text-sm">{s.price} zł</p>
                  </div>
                ))}
              </motion.div>
            ))}
          </motion.div>
          <p className="text-xs text-muted-foreground text-center mt-8 mb-6">Powered by purebook.pl</p>
        </div>
      </div>
    );
  }

  // Success page
  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-background px-6 py-12">
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, ease }} className="max-w-sm mx-auto">
          {/* Success header */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
            className="text-center mb-6"
          >
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 250 }}
              >
                <Check className="w-10 h-10 text-success" />
              </motion.div>
            </div>
            <h1 className="text-2xl font-bold mb-2">Wizyta umówiona!</h1>
            <p className="text-muted-foreground">Potwierdzenie zostanie wysłane na podany numer telefonu.</p>
          </motion.div>

          {/* Summary */}
          <motion.div
            initial="hidden" animate="visible" variants={stagger}
            className="bg-card rounded-2xl p-5 border border-border text-left space-y-3 mb-6"
          >
            {[
              ['Usługa', selectedService?.name],
              ['Specjalista', anySpecialist ? 'Dowolny' : selectedSpecialist?.name],
              ['Data', selectedDate],
              ['Godzina', selectedTime],
              ['Cena', `${selectedService?.price} zł`],
            ].map(([label, value]) => (
              <motion.div key={label} variants={fadeUp} className="flex justify-between">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-medium">{value}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Register prompt */}
          <AnimatePresence mode="wait">
            {!registered && !showRegister && (
              <motion.div
                key="prompt"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease }}
                className="bg-secondary/50 rounded-2xl p-5 border border-border mb-6"
              >
                <div className="flex items-start gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                    className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0"
                  >
                    <User className="w-5 h-5 text-primary" />
                  </motion.div>
                  <div>
                    <p className="font-semibold text-sm">Załóż konto i zapamiętaj dane</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Następnym razem nie musisz wpisywać danych — rezerwacja w kilka sekund. Będziesz też mógł zarządzać swoimi wizytami.
                    </p>
                    <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                      {['Szybsza rezerwacja bez wpisywania danych', 'Historia wizyt w jednym miejscu', 'Łatwe odwoływanie i zmiana terminów'].map((t, i) => (
                        <motion.li
                          key={t}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + i * 0.1 }}
                          className="flex items-center gap-1.5"
                        >
                          <Check className="w-3 h-3 text-primary" />{t}
                        </motion.li>
                      ))}
                    </ul>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button onClick={() => setShowRegister(true)} size="sm" className="mt-3 rounded-xl h-10 w-full">
                        Utwórz konto
                      </Button>
                    </motion.div>
                    <button onClick={() => {}} className="text-xs text-muted-foreground mt-2 block text-center w-full hover:underline">
                      Nie teraz, dziękuję
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {showRegister && !registered && (
              <motion.div
                key="register"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4, ease }}
                className="overflow-hidden"
              >
                <div className="bg-card rounded-2xl p-5 border border-border mb-6">
                  <h3 className="font-semibold mb-1">Utwórz konto</h3>
                  <p className="text-xs text-muted-foreground mb-4">Ustaw hasło, a Twoje dane ({clientData.name}, {clientData.phone}) zostaną zapamiętane.</p>
                  
                  {clientData.email && (
                    <div className="mb-3">
                      <label className="text-sm font-medium mb-1.5 block">Email</label>
                      <Input value={clientData.email} readOnly className="h-12 rounded-xl bg-muted text-muted-foreground" />
                    </div>
                  )}
                  {!clientData.email && (
                    <div className="mb-3">
                      <label className="text-sm font-medium mb-1.5 block">Email *</label>
                      <Input 
                        placeholder="twoj@email.com" 
                        value={clientData.email} 
                        onChange={e => setClientData(d => ({ ...d, email: e.target.value }))} 
                        className="h-12 rounded-xl" 
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Potrzebujemy emaila do logowania</p>
                    </div>
                  )}
                  <div className="mb-3">
                    <label className="text-sm font-medium mb-1.5 block">Hasło *</label>
                    <Input 
                      type="password" 
                      placeholder="Min. 8 znaków" 
                      value={registerData.password} 
                      onChange={e => setRegisterData(d => ({ ...d, password: e.target.value }))} 
                      className="h-12 rounded-xl" 
                    />
                  </div>
                  <div className="mb-4">
                    <label className="text-sm font-medium mb-1.5 block">Powtórz hasło *</label>
                    <Input 
                      type="password" 
                      placeholder="Powtórz hasło" 
                      value={registerData.confirmPassword} 
                      onChange={e => setRegisterData(d => ({ ...d, confirmPassword: e.target.value }))} 
                      className="h-12 rounded-xl" 
                    />
                    {registerData.confirmPassword && registerData.password !== registerData.confirmPassword && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-destructive mt-1">Hasła nie są identyczne</motion.p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowRegister(false)} className="flex-1 h-12 rounded-xl">
                      Anuluj
                    </Button>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                      <Button 
                        onClick={handleRegister} 
                        disabled={registerData.password.length < 8 || registerData.password !== registerData.confirmPassword || (!clientData.email)}
                        className="w-full h-12 rounded-xl"
                      >
                        Zarejestruj się
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}

            {registered && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="bg-success/5 rounded-2xl p-5 border border-success/20 mb-6 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: 'spring' }}
                >
                  <Check className="w-8 h-8 text-success mx-auto mb-2" />
                </motion.div>
                <p className="font-semibold text-sm">Konto utworzone!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Twoje dane zostały zapamiętane. Następnym razem wystarczy się zalogować.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="space-y-3">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button variant="outline" className="w-full h-12 rounded-xl gap-2" disabled>
                <CalendarPlus className="w-4 h-4" />Dodaj do kalendarza
              </Button>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">Funkcja dostępna wkrótce.</p>
            </motion.div>
            <Button
              variant="ghost"
              className="w-full h-12 rounded-xl text-destructive"
              disabled={!cancelToken}
              onClick={() => {
                if (!cancelToken) return;
                window.open(`/cancel/${cancelToken}`, '_blank', 'noopener,noreferrer');
              }}
            >
              Zmień / Odwołaj wizytę
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              {cancelToken
                ? 'Bezpieczny link jest gotowy — możesz zmienić lub odwołać wizytę.'
                : 'Link do zmiany i odwołania zostanie wysłany w bezpiecznej wiadomości.'}
            </p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Multi-step form
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-lg mx-auto flex items-center px-4 h-14">
          <motion.button whileHover={{ x: -3 }} whileTap={{ scale: 0.9 }} onClick={goBack} className="touch-target flex items-center justify-center -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <span className="ml-3 font-semibold text-sm">{salon?.name || 'Salon'}</span>
        </div>
        {/* Stepper */}
        <div className="max-w-lg mx-auto px-6 pb-3">
          <div className="flex items-center gap-1">
            {STEPS.map((label, i) => (
              <div key={label} className="flex-1 relative">
                <div className="h-1 rounded-full bg-border overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: i + 1 <= step ? '100%' : '0%' }}
                    transition={{ duration: 0.4, ease, delay: i * 0.05 }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Krok {step} z {STEPS.length} — {STEPS[step - 1]}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 pt-4 pb-8">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease }}
          >
            {/* Step 1: Service */}
            {step === 1 && (
              <div>
                <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-xl font-bold mb-1">Wybierz usługę</motion.h2>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-sm text-muted-foreground mb-4">Co chcesz zrobić?</motion.p>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Szukaj usługi..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-12 rounded-xl" />
                </motion.div>
                <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-5">
                  {Object.entries(groupedServices).map(([cat, services]) => (
                    <motion.div key={cat} variants={fadeUp}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat}</p>
                      <div className="space-y-2">
                        {services.map((s, i) => (
                          <motion.button
                            key={s.id}
                            variants={fadeUp}
                            whileHover={{ y: -2, boxShadow: '0 6px 20px -6px hsl(var(--foreground) / 0.07)' }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => { setSelectedService(s); goNext(); }}
                            className={`w-full text-left p-4 rounded-xl border transition-colors touch-target ${
                              selectedService?.id === s.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{s.name}</p>
                                {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
                              </div>
                              <div className="text-right shrink-0 ml-3">
                                <p className="font-semibold">{s.price} zł</p>
                                <p className="text-xs text-muted-foreground">{s.duration} min</p>
                              </div>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            )}

            {/* Step 2: Specialist */}
            {step === 2 && (
              <div>
                <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-xl font-bold mb-1">Wybierz specjalistę</motion.h2>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-sm text-muted-foreground mb-4">Kto ma wykonać usługę?</motion.p>
                <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-2">
                  <motion.button
                    variants={fadeUp}
                    whileHover={{ y: -2, boxShadow: '0 6px 20px -6px hsl(var(--foreground) / 0.07)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setAnySpecialist(true); setSelectedSpecialist(null); goNext(); }}
                    className={`w-full text-left p-4 rounded-xl border transition-colors touch-target ${
                      anySpecialist ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                        <User className="w-5 h-5 text-secondary-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">Dowolny specjalista</p>
                        <p className="text-xs text-muted-foreground">Najbliższy wolny termin</p>
                      </div>
                    </div>
                  </motion.button>
                  {availableSpecialists.map(sp => (
                    <motion.button
                      key={sp.id}
                      variants={fadeUp}
                      whileHover={{ y: -2, boxShadow: '0 6px 20px -6px hsl(var(--foreground) / 0.07)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { setAnySpecialist(false); setSelectedSpecialist(sp); goNext(); }}
                      className={`w-full text-left p-4 rounded-xl border transition-colors touch-target ${
                        selectedSpecialist?.id === sp.id && !anySpecialist ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <motion.div
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                          className="w-12 h-12 rounded-full bg-accent flex items-center justify-center font-semibold text-accent-foreground"
                        >
                          {sp.name.split(' ').map(n => n[0]).join('')}
                        </motion.div>
                        <div>
                          <p className="font-medium">{sp.name}</p>
                          <p className="text-xs text-muted-foreground">{sp.role}</p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              </div>
            )}

            {/* Step 3: Date/Time */}
            {step === 3 && (
              <div>
                <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-xl font-bold mb-1">Wybierz termin</motion.h2>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-sm text-muted-foreground mb-4">Kiedy chcesz przyjść?</motion.p>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="flex items-center justify-between mb-3">
                  <motion.button whileHover={{ x: -3 }} whileTap={{ scale: 0.9 }} onClick={() => shiftWeek(-1)} className="touch-target flex items-center justify-center">
                    <ChevronLeft className="w-5 h-5" />
                  </motion.button>
                  <span className="text-sm font-medium capitalize">
                    {(() => { const d = formatDate(weekDays[0]); return `${d.day} ${d.month}`; })()} – {(() => { const d = formatDate(weekDays[6]); return `${d.day} ${d.month}`; })()}
                  </span>
                  <motion.button whileHover={{ x: 3 }} whileTap={{ scale: 0.9 }} onClick={() => shiftWeek(1)} className="touch-target flex items-center justify-center">
                    <ChevronRight className="w-5 h-5" />
                  </motion.button>
                </motion.div>

                <motion.div initial="hidden" animate="visible" variants={stagger} className="grid grid-cols-7 gap-1 mb-6">
                  {weekDays.map(date => {
                    const f = formatDate(date);
                    const isSelected = selectedDate === date;
                    const isToday = date === new Date().toISOString().split('T')[0];
                    return (
                      <motion.button
                        key={date}
                        variants={scaleIn}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { setSelectedDate(date); setSelectedTime(''); }}
                        className={`flex flex-col items-center py-2 px-1 rounded-xl text-center transition-colors ${
                          isSelected ? 'bg-primary text-primary-foreground' : isToday ? 'bg-accent' : 'hover:bg-muted'
                        }`}
                      >
                        <span className="text-[10px] uppercase">{f.weekday}</span>
                        <span className="text-lg font-semibold">{f.day}</span>
                      </motion.button>
                    );
                  })}
                </motion.div>

                <AnimatePresence>
                  {selectedDate && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3, ease }}
                    >
                      {slotsLoading && (
                        <p className="text-sm text-muted-foreground text-center py-6">Ładowanie dostępnych godzin...</p>
                      )}
                      {!slotsLoading && slotsError && (
                        <p className="text-sm text-destructive text-center py-6">{slotsError}</p>
                      )}
                      {availableSlots.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 }}
                          className="bg-secondary/50 rounded-2xl p-4 border border-border mb-4"
                        >
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Najbliższy termin</p>
                          {nearestSlot && (
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">{selectedDate}</p>
                                <p className="text-xs text-muted-foreground">Najbliższy dostępny slot</p>
                              </div>
                              <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => setSelectedTime(nearestSlot.time)}
                                className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground"
                              >
                                {nearestSlot.time}
                              </motion.button>
                            </div>
                          )}
                          {recommendedSlots.length > 1 && (
                            <div className="mt-3">
                              <p className="text-[11px] text-muted-foreground mb-2">Rekomendacje</p>
                              <div className="flex gap-2 flex-wrap">
                                {recommendedSlots.slice(1).map(slot => (
                                  <button
                                    key={slot.time}
                                    onClick={() => setSelectedTime(slot.time)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-card border border-border hover:border-primary/30 transition-colors"
                                  >
                                    {slot.time}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}

                      <p className="text-sm font-medium mb-3">Dostępne godziny</p>
                      <motion.div initial="hidden" animate="visible" variants={stagger} className="grid grid-cols-4 gap-2">
                        {availableSlots.map(slot => (
                          <motion.button
                            key={slot.time}
                            variants={scaleIn}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.93 }}
                            onClick={() => setSelectedTime(slot.time)}
                            className={`py-3 rounded-xl text-sm font-medium transition-colors touch-target ${
                              selectedTime === slot.time ? 'bg-primary text-primary-foreground' : 'bg-card border border-border hover:border-primary/30'
                            }`}
                          >
                            {slot.time}
                          </motion.button>
                        ))}
                      </motion.div>
                      {availableSlots.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">Brak dostępnych terminów w tym dniu</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {selectedTime && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-6"
                    >
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button onClick={goNext} size="lg" className="w-full h-14 rounded-2xl text-base">
                          Dalej
                        </Button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Step 4: Client data */}
            {step === 4 && (
              <div>
                <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-xl font-bold mb-1">Twoje dane</motion.h2>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-sm text-muted-foreground mb-4">Potrzebujemy ich do potwierdzenia wizyty</motion.p>

                {/* Login hint */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                  className="bg-secondary/50 rounded-xl p-4 mb-5 border border-border"
                >
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Masz już konto?</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Zaloguj się, a dane uzupełnią się automatycznie — nie musisz ich wpisywać za każdym razem.
                      </p>
                      <button className="text-sm font-semibold text-primary mt-2 inline-block hover:underline">
                        Zaloguj się
                      </button>
                    </div>
                  </div>
                </motion.div>

                <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-4">
                  {[
                    { label: 'Imię i nazwisko *', placeholder: 'Anna Kowalska', field: 'name' as const },
                    { label: 'Telefon *', placeholder: '+48 500 000 000', field: 'phone' as const },
                    { label: <>Email <span className="text-muted-foreground font-normal">(opcjonalnie)</span></>, placeholder: 'anna@example.com', field: 'email' as const },
                  ].map(({ label, placeholder, field }) => (
                    <motion.div key={field} variants={fadeUp}>
                      <label className="text-sm font-medium mb-1.5 block">{label}</label>
                      <Input
                        placeholder={placeholder}
                        value={clientData[field]}
                        onChange={e => setClientData(d => ({ ...d, [field]: e.target.value }))}
                        className="h-12 rounded-xl"
                      />
                    </motion.div>
                  ))}
                  <motion.div variants={fadeUp}>
                    <label className="text-sm font-medium mb-1.5 block">Notatka do wizyty <span className="text-muted-foreground font-normal">(opcjonalnie)</span></label>
                    <Textarea placeholder="Np. chcę odświeżyć kolor, mam uczulenie na..." value={clientData.notes} onChange={e => setClientData(d => ({ ...d, notes: e.target.value }))} className="rounded-xl min-h-[80px]" />
                  </motion.div>
                </motion.div>

                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-xs text-muted-foreground mt-4 mb-2">
                  Kontynuując, rezerwujesz jako gość. Możesz też utworzyć konto po wizycie.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={goNext}
                    size="lg"
                    className="w-full h-14 rounded-2xl text-base mt-2"
                    disabled={!clientData.name || !clientData.phone}
                  >
                    Przejdź do podsumowania
                  </Button>
                </motion.div>
              </div>
            )}

            {/* Step 5: Confirm */}
            {step === 5 && (
              <div>
                <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-xl font-bold mb-1">Podsumowanie</motion.h2>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-sm text-muted-foreground mb-4">Sprawdź szczegóły wizyty</motion.p>

                <motion.div
                  initial="hidden" animate="visible" variants={stagger}
                  className="bg-card rounded-2xl p-5 border border-border space-y-4 mb-6"
                >
                  {[
                    ['Usługa', selectedService?.name],
                    ['Czas trwania', `${selectedService?.duration} min`],
                    ['Specjalista', anySpecialist ? 'Dowolny specjalista' : selectedSpecialist?.name],
                    ['Data', selectedDate],
                    ['Godzina', selectedTime],
                  ].map(([label, value]) => (
                    <motion.div key={label} variants={fadeUp} className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <span className="text-sm font-medium">{value}</span>
                    </motion.div>
                  ))}
                  <motion.div variants={fadeUp} className="border-t border-border pt-3 flex justify-between">
                    <span className="text-sm font-semibold">Do zapłaty</span>
                    <span className="text-sm font-bold">{selectedService?.price} zł</span>
                  </motion.div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-card rounded-2xl p-5 border border-border space-y-2 mb-6"
                >
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dane kontaktowe</p>
                  <p className="text-sm font-medium">{clientData.name}</p>
                  <p className="text-sm text-muted-foreground">{clientData.phone}</p>
                  {clientData.email && <p className="text-sm text-muted-foreground">{clientData.email}</p>}
                  {clientData.notes && <p className="text-sm text-muted-foreground italic">„{clientData.notes}"</p>}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={handleBook}
                    size="lg"
                    className="w-full h-14 rounded-2xl text-base"
                    disabled={bookingLoading}
                  >
                    {bookingLoading ? 'Rezerwuję...' : 'Potwierdzam rezerwację'}
                  </Button>
                </motion.div>
                {bookingError && (
                  <p className="text-xs text-destructive text-center mt-3">{bookingError}</p>
                )}
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} className="text-xs text-muted-foreground text-center mt-3">
                  Otrzymasz SMS z potwierdzeniem wizyty
                </motion.p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
