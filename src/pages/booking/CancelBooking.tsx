import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarX2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PageTransition } from '@/components/motion';
import {
  cancelPublicAppointment,
  getPublicCancelAvailability,
  getPublicCancelDetails,
  requestPublicCancelCode,
  reschedulePublicAppointment,
} from '@/lib/api';
import { toast } from 'sonner';

export default function CancelBooking() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [rescheduling, setRescheduling] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSending, setCodeSending] = useState(false);
  const [codeCooldown, setCodeCooldown] = useState(0);
  const [phoneMask, setPhoneMask] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!token) {
      setError('Nieprawidłowy link');
      setLoading(false);
      return () => { mounted = false; };
    }
    setLoading(true);
    getPublicCancelDetails(token)
      .then(res => {
        if (!mounted) return;
        setAppointment(res.appointment);
        setPhoneMask(res.verification?.phoneMask || null);
        if (res.verification?.sentAt) {
          const sentAt = new Date(res.verification.sentAt).getTime();
          const cooldownLeft = Math.max(0, 45 - Math.floor((Date.now() - sentAt) / 1000));
          setCodeCooldown(cooldownLeft);
        } else {
          setCodeCooldown(0);
        }
        setError(null);
      })
      .catch(err => {
        if (!mounted) return;
        setError(err.message || 'Nie znaleziono wizyty');
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [token]);

  useEffect(() => {
    if (codeCooldown <= 0) return;
    const t = setInterval(() => {
      setCodeCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [codeCooldown]);

  useEffect(() => {
    let mounted = true;
    if (!token || !rescheduleOpen || !newDate) {
      setSlots([]);
      setSlotsError(null);
      return () => { mounted = false; };
    }
    setSlotsLoading(true);
    setSlotsError(null);
    getPublicCancelAvailability(token, newDate)
      .then(res => {
        if (!mounted) return;
        setSlots(res.slots || []);
      })
      .catch(err => {
        if (!mounted) return;
        setSlots([]);
        setSlotsError(err.message || 'Nie udało się pobrać godzin');
      })
      .finally(() => mounted && setSlotsLoading(false));
    return () => { mounted = false; };
  }, [token, rescheduleOpen, newDate]);

  return (
    <PageTransition className="min-h-screen bg-background px-6 py-10">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-3">
            <CalendarX2 className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">Zmień lub odwołaj wizytę</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Unikalny link z wiadomości — bez logowania
          </p>
        </div>

        {actionMessage && (
          <div className="bg-success/10 text-success text-sm rounded-xl p-3 text-center mb-5">
            {actionMessage}
          </div>
        )}
        {loading ? (
          <div className="bg-card rounded-2xl p-5 border border-border text-sm text-muted-foreground text-center mb-5">
            Ładowanie wizyty...
          </div>
        ) : error ? (
          <div className="bg-card rounded-2xl p-5 border border-border text-sm text-destructive text-center mb-5">
            {error}
          </div>
        ) : (
          <div className="bg-card rounded-2xl p-5 border border-border space-y-3 mb-5">
            {[
              ['Usługa', appointment?.appointmentServices?.map((s: any) => s.service.name).join(', ')],
              ['Specjalista', appointment?.staff?.name || 'Dowolny'],
              ['Data', appointment?.date],
              ['Godzina', appointment?.time],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-medium">{value || '—'}</span>
              </div>
            ))}
          </div>
        )}

        <div className="bg-secondary/50 rounded-2xl p-5 border border-border mb-5">
          <div className="flex items-start gap-3">
            <Link2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Weryfikacja SMS</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Aby zmienić termin lub odwołać wizytę, wyślij kod na numer klienta{phoneMask ? ` (${phoneMask})` : ''} i wpisz go poniżej.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Input
                  placeholder="Kod SMS (6 cyfr)"
                  className="h-11 rounded-xl font-mono tracking-widest text-center"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl h-11 shrink-0"
                  disabled={!appointment || codeSending || codeCooldown > 0}
                  onClick={async () => {
                    if (!token) return;
                    setCodeSending(true);
                    try {
                      const res = await requestPublicCancelCode(token);
                      setCodeCooldown(res.retryAfterSeconds || 45);
                      toast.success('Kod SMS został wysłany');
                    } catch (err: any) {
                      toast.error(err.message || 'Nie udało się wysłać kodu');
                    } finally {
                      setCodeSending(false);
                    }
                  }}
                >
                  {codeCooldown > 0 ? `Ponów za ${codeCooldown}s` : codeSending ? 'Wysyłanie…' : 'Wyślij kod'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="text-sm font-medium mb-1.5 block">Powód (opcjonalnie)</label>
        <Textarea
          placeholder="Np. zmiana planów, choroba..."
          className="rounded-xl min-h-[90px]"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        </div>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl"
            disabled={!appointment}
            onClick={() => setRescheduleOpen(prev => !prev)}
          >
            Zmień termin
          </Button>
          {rescheduleOpen && (
            <div className="bg-card rounded-2xl p-5 border border-border space-y-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nowa data</label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => { setNewDate(e.target.value); setNewTime(''); }}
                  className="h-11 rounded-xl"
                />
              </div>
              {newDate && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Nowa godzina</label>
                  {slotsLoading && (
                    <p className="text-sm text-muted-foreground">Ładowanie godzin...</p>
                  )}
                  {!slotsLoading && slotsError && (
                    <p className="text-sm text-destructive">{slotsError}</p>
                  )}
                  {!slotsLoading && !slotsError && (
                    <div className="grid grid-cols-4 gap-2">
                      {slots.map(slot => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setNewTime(slot)}
                          className={`py-2 rounded-lg text-xs font-medium border ${
                            newTime === slot ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/40'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                      {slots.length === 0 && (
                        <p className="col-span-4 text-xs text-muted-foreground text-center">Brak dostępnych godzin</p>
                      )}
                    </div>
                  )}
                </div>
              )}
              <Button
                className="w-full h-11 rounded-xl"
                disabled={!newDate || !newTime || rescheduling || verificationCode.trim().length < 4}
                onClick={async () => {
                  if (!token) return;
                  setRescheduling(true);
                  try {
                    await reschedulePublicAppointment(token, { date: newDate, time: newTime, code: verificationCode.trim() });
                    toast.success('Termin został zmieniony');
                    setActionMessage('Termin został zmieniony.');
                    setRescheduleOpen(false);
                    setNewDate('');
                    setNewTime('');
                    setSlots([]);
                    setAppointment(null);
                  } catch (err: any) {
                    toast.error(err.message || 'Nie udało się zmienić terminu');
                  } finally {
                    setRescheduling(false);
                  }
                }}
              >
                Zapisz nowy termin
              </Button>
            </div>
          )}
        <Button
          className="w-full h-12 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
          disabled={!appointment || cancelling || verificationCode.trim().length < 4}
          onClick={async () => {
            if (!token) return;
            setCancelling(true);
            try {
              await cancelPublicAppointment(token, { code: verificationCode.trim() });
              toast.success('Wizyta odwołana');
              setActionMessage('Wizyta została odwołana.');
              setAppointment(null);
            } catch (err: any) {
              toast.error(err.message || 'Nie udało się odwołać wizyty');
            } finally {
              setCancelling(false);
            }
          }}
        >
          Odwołaj wizytę
        </Button>
        </div>

        <p className="text-[11px] text-muted-foreground text-center mt-4">
          Link jest ważny ok. 7 dni; po udanej zmianie terminu lub odwołaniu wizyty przestaje działać (jednorazowo).
        </p>
      </div>
    </PageTransition>
  );
}
