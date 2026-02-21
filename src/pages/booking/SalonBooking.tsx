import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, Phone, ArrowLeft, Check, Search, User, CalendarDays, ChevronLeft, ChevronRight, CalendarPlus, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { mockSalon, mockServices, mockSpecialists, generateTimeSlots, type Service, type Specialist, type TimeSlot } from '@/data/mockData';

const STEPS = ['Usługa', 'Specjalista', 'Termin', 'Dane', 'Potwierdzenie'];

const pageVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

export default function SalonBooking() {
  const { slug } = useParams();
  const [step, setStep] = useState(0); // 0 = landing
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedSpecialist, setSelectedSpecialist] = useState<Specialist | null>(null);
  const [anySpecialist, setAnySpecialist] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [clientData, setClientData] = useState({ name: '', phone: '', email: '', notes: '' });
  const [bookingComplete, setBookingComplete] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [registerData, setRegisterData] = useState({ password: '', confirmPassword: '' });
  const [registered, setRegistered] = useState(false);

  const salon = mockSalon;

  const filteredServices = useMemo(() => {
    if (!searchQuery) return mockServices;
    const q = searchQuery.toLowerCase();
    return mockServices.filter(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
  }, [searchQuery]);

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
    return mockSpecialists.filter(sp => sp.services.includes(selectedService.id));
  }, [selectedService]);

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

  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];
    return generateTimeSlots(selectedDate);
  }, [selectedDate]);

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

  const goNext = () => setStep(s => s + 1);
  const goBack = () => setStep(s => s - 1);

  const handleBook = () => {
    setBookingComplete(true);
    setStep(6);
  };

  const handleRegister = () => {
    if (registerData.password.length >= 8 && registerData.password === registerData.confirmPassword) {
      setRegistered(true);
      setShowRegister(false);
    }
  };

  if (step === 0) {
    return (
      <div className="min-h-screen bg-background">
        {/* Salon Header */}
        <div className="bg-primary text-primary-foreground px-6 pt-12 pb-8">
          <div className="max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 flex items-center justify-center mb-4">
              <Scissors className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold mb-1">{salon.name}</h1>
            <p className="text-primary-foreground/80 text-sm mb-4">{salon.description}</p>
            <div className="space-y-2 text-sm text-primary-foreground/70">
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{salon.address}</div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4" />{salon.hours}</div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4" />{salon.phone}</div>
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-6 -mt-4">
          <Button onClick={() => setStep(1)} size="lg" className="w-full h-14 text-lg rounded-2xl shadow-lg">
            Umów wizytę
          </Button>

          <div className="mt-8 space-y-4">
            <h2 className="text-lg font-semibold">Nasze usługi</h2>
            {Object.entries(groupedServices).map(([cat, services]) => (
              <div key={cat}>
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
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-8 mb-6">Powered by purebook.pl</p>
        </div>
      </div>
    );
  }


  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-background px-6 py-12">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-sm mx-auto">
          {/* Success header */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-success" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Wizyta umówiona!</h1>
            <p className="text-muted-foreground">Potwierdzenie zostanie wysłane na podany numer telefonu.</p>
          </div>

          {/* Booking summary */}
          <div className="bg-card rounded-2xl p-5 border border-border text-left space-y-3 mb-6">
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Usługa</span><span className="text-sm font-medium">{selectedService?.name}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Specjalista</span><span className="text-sm font-medium">{anySpecialist ? 'Dowolny' : selectedSpecialist?.name}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Data</span><span className="text-sm font-medium">{selectedDate}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Godzina</span><span className="text-sm font-medium">{selectedTime}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Cena</span><span className="text-sm font-medium">{selectedService?.price} zł</span></div>
          </div>

          {/* Register account prompt */}
          {!registered && !showRegister && (
            <div className="bg-secondary/50 rounded-2xl p-5 border border-border mb-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Załóż konto i zapamiętaj dane</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Następnym razem nie musisz wpisywać danych — rezerwacja w kilka sekund. Będziesz też mógł zarządzać swoimi wizytami.
                  </p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                    <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-primary" />Szybsza rezerwacja bez wpisywania danych</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-primary" />Historia wizyt w jednym miejscu</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-primary" />Łatwe odwoływanie i zmiana terminów</li>
                  </ul>
                  <Button onClick={() => setShowRegister(true)} size="sm" className="mt-3 rounded-xl h-10 w-full">
                    Utwórz konto
                  </Button>
                  <button onClick={() => {}} className="text-xs text-muted-foreground mt-2 block text-center w-full hover:underline">
                    Nie teraz, dziękuję
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Register form */}
          {showRegister && !registered && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-5 border border-border mb-6">
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
                  <p className="text-xs text-destructive mt-1">Hasła nie są identyczne</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowRegister(false)} className="flex-1 h-12 rounded-xl">
                  Anuluj
                </Button>
                <Button 
                  onClick={handleRegister} 
                  disabled={registerData.password.length < 8 || registerData.password !== registerData.confirmPassword || (!clientData.email)}
                  className="flex-1 h-12 rounded-xl"
                >
                  Zarejestruj się
                </Button>
              </div>
            </motion.div>
          )}

          {/* Registration success */}
          {registered && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-success/5 rounded-2xl p-5 border border-success/20 mb-6 text-center">
              <Check className="w-8 h-8 text-success mx-auto mb-2" />
              <p className="font-semibold text-sm">Konto utworzone!</p>
              <p className="text-xs text-muted-foreground mt-1">
                Twoje dane zostały zapamiętane. Następnym razem wystarczy się zalogować.
              </p>
            </motion.div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button variant="outline" className="w-full h-12 rounded-xl gap-2"><CalendarPlus className="w-4 h-4" />Dodaj do kalendarza</Button>
            <Button variant="ghost" className="w-full h-12 rounded-xl text-destructive">Zmień / Odwołaj wizytę</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-lg mx-auto flex items-center px-4 h-14">
          <button onClick={goBack} className="touch-target flex items-center justify-center -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="ml-3 font-semibold text-sm">{salon.name}</span>
        </div>
        {/* Stepper */}
        <div className="max-w-lg mx-auto px-6 pb-3">
          <div className="flex items-center gap-1">
            {STEPS.map((label, i) => (
              <div key={label} className="flex-1">
                <div className={`h-1 rounded-full transition-colors ${i + 1 <= step ? 'bg-primary' : 'bg-border'}`} />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Krok {step} z {STEPS.length} — {STEPS[step - 1]}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 pt-4 pb-8">
        <AnimatePresence mode="wait">
          <motion.div key={step} variants={pageVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }}>
            {/* Step 1: Service */}
            {step === 1 && (
              <div>
                <h2 className="text-xl font-bold mb-1">Wybierz usługę</h2>
                <p className="text-sm text-muted-foreground mb-4">Co chcesz zrobić?</p>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Szukaj usługi..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-12 rounded-xl" />
                </div>
                <div className="space-y-5">
                  {Object.entries(groupedServices).map(([cat, services]) => (
                    <div key={cat}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat}</p>
                      <div className="space-y-2">
                        {services.map(s => (
                          <button
                            key={s.id}
                            onClick={() => { setSelectedService(s); goNext(); }}
                            className={`w-full text-left p-4 rounded-xl border transition-all touch-target ${
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
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Specialist */}
            {step === 2 && (
              <div>
                <h2 className="text-xl font-bold mb-1">Wybierz specjalistę</h2>
                <p className="text-sm text-muted-foreground mb-4">Kto ma wykonać usługę?</p>
                <div className="space-y-2">
                  <button
                    onClick={() => { setAnySpecialist(true); setSelectedSpecialist(null); goNext(); }}
                    className={`w-full text-left p-4 rounded-xl border transition-all touch-target ${
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
                  </button>
                  {availableSpecialists.map(sp => (
                    <button
                      key={sp.id}
                      onClick={() => { setAnySpecialist(false); setSelectedSpecialist(sp); goNext(); }}
                      className={`w-full text-left p-4 rounded-xl border transition-all touch-target ${
                        selectedSpecialist?.id === sp.id && !anySpecialist ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center font-semibold text-accent-foreground">
                          {sp.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium">{sp.name}</p>
                          <p className="text-xs text-muted-foreground">{sp.role}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Date/Time */}
            {step === 3 && (
              <div>
                <h2 className="text-xl font-bold mb-1">Wybierz termin</h2>
                <p className="text-sm text-muted-foreground mb-4">Kiedy chcesz przyjść?</p>

                {/* Week selector */}
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => shiftWeek(-1)} className="touch-target flex items-center justify-center"><ChevronLeft className="w-5 h-5" /></button>
                  <span className="text-sm font-medium capitalize">
                    {(() => { const d = formatDate(weekDays[0]); return `${d.day} ${d.month}`; })()} – {(() => { const d = formatDate(weekDays[6]); return `${d.day} ${d.month}`; })()}
                  </span>
                  <button onClick={() => shiftWeek(1)} className="touch-target flex items-center justify-center"><ChevronRight className="w-5 h-5" /></button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-6">
                  {weekDays.map(date => {
                    const f = formatDate(date);
                    const isSelected = selectedDate === date;
                    const isToday = date === new Date().toISOString().split('T')[0];
                    return (
                      <button
                        key={date}
                        onClick={() => { setSelectedDate(date); setSelectedTime(''); }}
                        className={`flex flex-col items-center py-2 px-1 rounded-xl text-center transition-all ${
                          isSelected ? 'bg-primary text-primary-foreground' : isToday ? 'bg-accent' : 'hover:bg-muted'
                        }`}
                      >
                        <span className="text-[10px] uppercase">{f.weekday}</span>
                        <span className="text-lg font-semibold">{f.day}</span>
                      </button>
                    );
                  })}
                </div>

                {selectedDate && (
                  <>
                    <p className="text-sm font-medium mb-3">Dostępne godziny</p>
                    <div className="grid grid-cols-4 gap-2">
                      {timeSlots.filter(s => s.available).map(slot => (
                        <button
                          key={slot.time}
                          onClick={() => setSelectedTime(slot.time)}
                          className={`py-3 rounded-xl text-sm font-medium transition-all touch-target ${
                            selectedTime === slot.time ? 'bg-primary text-primary-foreground' : 'bg-card border border-border hover:border-primary/30'
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                    {timeSlots.filter(s => s.available).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">Brak dostępnych terminów w tym dniu</p>
                    )}
                  </>
                )}

                {selectedTime && (
                  <div className="mt-6">
                    <Button onClick={goNext} size="lg" className="w-full h-14 rounded-2xl text-base">
                      Dalej
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Client data */}
            {step === 4 && (
              <div>
                <h2 className="text-xl font-bold mb-1">Twoje dane</h2>
                <p className="text-sm text-muted-foreground mb-4">Potrzebujemy ich do potwierdzenia wizyty</p>

                {/* Login hint */}
                <div className="bg-secondary/50 rounded-xl p-4 mb-5 border border-border">
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
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Imię i nazwisko *</label>
                    <Input placeholder="Anna Kowalska" value={clientData.name} onChange={e => setClientData(d => ({ ...d, name: e.target.value }))} className="h-12 rounded-xl" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Telefon *</label>
                    <Input placeholder="+48 500 000 000" value={clientData.phone} onChange={e => setClientData(d => ({ ...d, phone: e.target.value }))} className="h-12 rounded-xl" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Email <span className="text-muted-foreground font-normal">(opcjonalnie)</span></label>
                    <Input placeholder="anna@example.com" value={clientData.email} onChange={e => setClientData(d => ({ ...d, email: e.target.value }))} className="h-12 rounded-xl" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Notatka do wizyty <span className="text-muted-foreground font-normal">(opcjonalnie)</span></label>
                    <Textarea placeholder="Np. chcę odświeżyć kolor, mam uczulenie na..." value={clientData.notes} onChange={e => setClientData(d => ({ ...d, notes: e.target.value }))} className="rounded-xl min-h-[80px]" />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-4 mb-2">Kontynuując, rezerwujesz jako gość. Możesz też utworzyć konto po wizycie.</p>

                <Button
                  onClick={goNext}
                  size="lg"
                  className="w-full h-14 rounded-2xl text-base mt-2"
                  disabled={!clientData.name || !clientData.phone}
                >
                  Przejdź do podsumowania
                </Button>
              </div>
            )}

            {/* Step 5: Confirm */}
            {step === 5 && (
              <div>
                <h2 className="text-xl font-bold mb-1">Podsumowanie</h2>
                <p className="text-sm text-muted-foreground mb-4">Sprawdź szczegóły wizyty</p>
                <div className="bg-card rounded-2xl p-5 border border-border space-y-4 mb-6">
                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Usługa</span><span className="text-sm font-medium">{selectedService?.name}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Czas trwania</span><span className="text-sm font-medium">{selectedService?.duration} min</span></div>
                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Specjalista</span><span className="text-sm font-medium">{anySpecialist ? 'Dowolny specjalista' : selectedSpecialist?.name}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Data</span><span className="text-sm font-medium">{selectedDate}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Godzina</span><span className="text-sm font-medium">{selectedTime}</span></div>
                  <div className="border-t border-border pt-3 flex justify-between"><span className="text-sm font-semibold">Do zapłaty</span><span className="text-sm font-bold">{selectedService?.price} zł</span></div>
                </div>
                <div className="bg-card rounded-2xl p-5 border border-border space-y-2 mb-6">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dane kontaktowe</p>
                  <p className="text-sm font-medium">{clientData.name}</p>
                  <p className="text-sm text-muted-foreground">{clientData.phone}</p>
                  {clientData.email && <p className="text-sm text-muted-foreground">{clientData.email}</p>}
                  {clientData.notes && <p className="text-sm text-muted-foreground italic">„{clientData.notes}"</p>}
                </div>
                <Button onClick={handleBook} size="lg" className="w-full h-14 rounded-2xl text-base">
                  Potwierdzam rezerwację
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">Otrzymasz SMS z potwierdzeniem wizyty</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
