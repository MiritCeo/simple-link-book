import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, ArrowRight, Repeat, Star, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { statusLabels, statusColors, type Appointment } from '@/data/mockData';
import { PageTransition, MotionList, MotionItem, HoverCard } from '@/components/motion';
import { motion } from 'framer-motion';
import { getClientAppointments, getClientMe } from '@/lib/api';

const dayNames = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
const monthNames = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

type ClientAppointment = Appointment & { cancelToken?: string | null; salonSlug?: string | null };

const mapStatus = (status?: string): Appointment['status'] => {
  switch (status) {
    case 'CONFIRMED':
      return 'confirmed';
    case 'IN_PROGRESS':
      return 'in-progress';
    case 'COMPLETED':
      return 'completed';
    case 'CANCELLED':
      return 'cancelled';
    case 'NO_SHOW':
      return 'no-show';
    case 'SCHEDULED':
    default:
      return 'scheduled';
  }
};

const toDateTime = (date: string, time: string) => new Date(`${date}T${time}:00`);

export default function ClientDashboard() {
  const navigate = useNavigate();
  const [client, setClient] = useState<{ name: string; phone: string; email?: string } | null>(null);
  const [appointments, setAppointments] = useState<ClientAppointment[]>([]);
  const [rawAppointments, setRawAppointments] = useState<any[]>([]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]}`;
  };

  useEffect(() => {
    let mounted = true;
    Promise.all([getClientMe(), getClientAppointments()])
      .then(([meRes, apptRes]) => {
        if (!mounted) return;
        setClient(meRes.client);
        setRawAppointments(apptRes.appointments || []);
        const mapped = (apptRes.appointments || []).map((apt: any) => ({
          id: apt.id,
          clientName: meRes.client?.name || '',
          clientPhone: meRes.client?.phone || '',
          serviceName: apt.appointmentServices?.map((s: any) => s.service?.name).filter(Boolean).join(' + ') || 'Usługa',
          specialistName: apt.staff?.name || 'Dowolny',
          date: apt.date,
          time: apt.time,
          duration: apt.duration || 0,
          status: mapStatus(apt.status),
          cancelToken: apt.cancelToken || null,
          salonSlug: apt.salon?.slug || null,
        })) as ClientAppointment[];
        setAppointments(mapped);
      })
      .catch(() => {
        if (!mounted) return;
        setAppointments([]);
        setRawAppointments([]);
      });
    return () => { mounted = false; };
  }, []);

  const now = new Date();
  const upcomingAppointments = useMemo(
    () => appointments
      .filter(a => ['scheduled', 'confirmed', 'in-progress'].includes(a.status))
      .filter(a => toDateTime(a.date, a.time) >= now)
      .sort((a, b) => toDateTime(a.date, a.time).getTime() - toDateTime(b.date, b.time).getTime()),
    [appointments],
  );
  const pastAppointments = useMemo(
    () => appointments
      .filter(a => ['completed', 'cancelled', 'no-show'].includes(a.status) || toDateTime(a.date, a.time) < now)
      .sort((a, b) => toDateTime(b.date, b.time).getTime() - toDateTime(a.date, a.time).getTime()),
    [appointments],
  );

  const nextAppointment = upcomingAppointments[0];
  const quickBookOptions = useMemo(() => {
    const completed = rawAppointments
      .filter(a => a.status === 'COMPLETED')
      .sort((a, b) => toDateTime(b.date, b.time).getTime() - toDateTime(a.date, a.time).getTime())
      .slice(0, 2);
    return completed.map((a: any) => {
      const services = a.appointmentServices || [];
      const serviceName = services.map((s: any) => s.service?.name).filter(Boolean).join(' + ') || 'Usługa';
      const price = services.reduce((sum: number, s: any) => sum + (s.service?.price || 0), 0);
      const date = new Date(a.date);
      const lastDate = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`;
      return {
        service: serviceName,
        specialist: a.staff?.name || 'Dowolny',
        lastDate,
        price,
        salonSlug: a.salon?.slug,
      };
    });
  }, [rawAppointments]);

  const salonInfo = rawAppointments[0]?.salon;
  const totalSpent = rawAppointments
    .filter(a => a.status === 'COMPLETED')
    .reduce((sum, a) => sum + (a.appointmentServices || []).reduce((s: number, svc: any) => s + (svc.service?.price || 0), 0), 0);

  return (
    <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6 pb-8">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-xl font-bold lg:text-2xl">Cześć, {client?.name || '👋'}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Co nowego w Twoich wizytach?</p>
      </div>

      {/* Next appointment - hero card */}
      {nextAppointment && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">Najbliższa wizyta</p>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-lg">{nextAppointment.serviceName}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{nextAppointment.specialistName}</p>
              <div className="flex items-center gap-3 mt-2 text-sm">
                <span className="flex items-center gap-1 font-medium">
                  <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                  {formatDate(nextAppointment.date)}
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  {nextAppointment.time}
                </span>
              </div>
            </div>
            <Badge className={`${statusColors[nextAppointment.status]} text-[10px] shrink-0`}>
              {statusLabels[nextAppointment.status]}
            </Badge>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl h-9 text-xs flex-1"
              disabled={!nextAppointment?.cancelToken}
              onClick={() => nextAppointment?.cancelToken && window.open(`/cancel/${nextAppointment.cancelToken}`, '_blank', 'noopener,noreferrer')}
            >
              Przełóż wizytę
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl h-9 text-xs text-destructive"
              disabled={!nextAppointment?.cancelToken}
              onClick={() => nextAppointment?.cancelToken && window.open(`/cancel/${nextAppointment.cancelToken}`, '_blank', 'noopener,noreferrer')}
            >
              Odwołaj
            </Button>
          </div>
        </motion.div>
      )}

      <div className="lg:grid lg:grid-cols-2 lg:gap-6">
        {/* Quick re-book */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Umów ponownie</h2>
            <Repeat className="w-4 h-4 text-muted-foreground" />
          </div>
          <MotionList className="space-y-2 mb-6">
          {quickBookOptions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Brak historii do szybkiego rebookingu</p>
          )}
          {quickBookOptions.map(opt => (
              <MotionItem key={opt.service}>
                <HoverCard
                  onClick={() => opt.salonSlug && navigate(`/s/${opt.salonSlug}`)}
                  className="bg-card rounded-xl p-4 border border-border flex items-center gap-3 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Star className="w-4 h-4 text-secondary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{opt.service}</p>
                    <p className="text-xs text-muted-foreground">u {opt.specialist} • ostatnio {opt.lastDate}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{opt.price ? `${opt.price} zł` : '—'}</p>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
                  </div>
                </HoverCard>
              </MotionItem>
            ))}
          </MotionList>

          {/* Upcoming */}
          {upcomingAppointments.length > 1 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Zaplanowane</h2>
                <button onClick={() => navigate('/konto/wizyty')} className="text-xs text-primary font-medium hover:underline">
                  Wszystkie
                </button>
              </div>
              <MotionList className="space-y-2">
                {upcomingAppointments.slice(1).map(apt => (
                  <MotionItem key={apt.id}>
                    <HoverCard className="bg-card rounded-xl p-3.5 border border-border flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-accent-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{apt.serviceName}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(apt.date)} • {apt.time}</p>
                      </div>
                      <Badge className={`${statusColors[apt.status]} text-[9px] shrink-0`}>
                        {statusLabels[apt.status]}
                      </Badge>
                    </HoverCard>
                  </MotionItem>
                ))}
              </MotionList>
            </div>
          )}
        </div>

        {/* Right: salon info */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="bg-card rounded-2xl p-5 border border-border mb-4"
          >
            <h2 className="font-semibold mb-3">Mój salon</h2>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="font-bold text-primary text-sm">
                  {salonInfo?.name ? salonInfo.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2) : 'PB'}
                </span>
              </div>
              <div>
                <p className="font-bold">{salonInfo?.name || 'Salon'}</p>
                <p className="text-xs text-muted-foreground">{salonInfo?.description || '—'}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>{salonInfo?.address || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4 shrink-0" />
                <span>{salonInfo?.hours || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4 shrink-0" />
                <span>{salonInfo?.phone || '—'}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex-1">
                <Button onClick={() => salonInfo?.slug && navigate(`/s/${salonInfo.slug}`)} className="w-full rounded-xl h-10 gap-1.5">
                  <CalendarDays className="w-4 h-4" />Umów wizytę
                </Button>
              </motion.div>
              <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 shrink-0">
                <Phone className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="grid grid-cols-3 gap-2"
          >
            {[
              { label: 'Wizyt łącznie', value: String(appointments.length) },
              { label: 'Ostatnia', value: pastAppointments[0] ? formatDate(pastAppointments[0].date).split(', ')[1] : '—' },
              { label: 'Wydane', value: totalSpent ? `${totalSpent} zł` : '—' },
            ].map((stat) => (
              <div key={stat.label} className="bg-card rounded-xl p-3 border border-border text-center">
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
