import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { statusLabels, statusColors, type Appointment } from '@/data/mockData';
import { PageTransition, MotionList, MotionItem, HoverCard } from '@/components/motion';
import { motion } from 'framer-motion';
import { getClientAppointments, getClientMe } from '@/lib/api';

const tabs = [
  { key: 'upcoming', label: 'Nadchodzące' },
  { key: 'past', label: 'Historia' },
];

const dayNames = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
const monthNames = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

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

type ClientAppointment = Appointment & { cancelToken?: string | null };

export default function ClientAppointments() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [appointments, setAppointments] = useState<ClientAppointment[]>([]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  };

  useEffect(() => {
    let mounted = true;
    Promise.all([getClientMe(), getClientAppointments()])
      .then(([meRes, apptRes]) => {
        if (!mounted) return;
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
        })) as ClientAppointment[];
        setAppointments(mapped);
      })
      .catch(() => {
        if (!mounted) return;
        setAppointments([]);
      });
    return () => { mounted = false; };
  }, []);

  const now = new Date();
  const upcoming = useMemo(
    () => appointments
      .filter(a => ['scheduled', 'confirmed', 'in-progress'].includes(a.status))
      .filter(a => toDateTime(a.date, a.time) >= now)
      .sort((a, b) => toDateTime(a.date, a.time).getTime() - toDateTime(b.date, b.time).getTime()),
    [appointments],
  );
  const past = useMemo(
    () => appointments
      .filter(a => ['completed', 'cancelled', 'no-show'].includes(a.status) || toDateTime(a.date, a.time) < now)
      .sort((a, b) => toDateTime(b.date, b.time).getTime() - toDateTime(a.date, a.time).getTime()),
    [appointments],
  );
  const visibleAppointments = activeTab === 'upcoming' ? upcoming : past;

  return (
    <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6 pb-8">
      <h1 className="text-xl font-bold lg:text-2xl mb-1">Moje wizyty</h1>
      <p className="text-sm text-muted-foreground mb-4">Przeglądaj i zarządzaj swoimi wizytami</p>

      {/* Tabs */}
      <div className="relative flex gap-1 bg-muted rounded-xl p-1 mb-5 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-5 py-2.5 rounded-lg text-sm font-medium transition-colors z-10 ${
              activeTab === tab.key ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            {activeTab === tab.key && (
              <motion.div
                layoutId="client-tab-bg"
                className="absolute inset-0 bg-card shadow-sm rounded-lg"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      <MotionList className="space-y-3" key={activeTab}>
        {visibleAppointments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">Brak wizyt</p>
        )}
        {visibleAppointments.map(apt => (
          <MotionItem key={apt.id}>
            <HoverCard className="bg-card rounded-2xl p-4 border border-border">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold">{apt.serviceName}</p>
                  <p className="text-sm text-muted-foreground">{apt.specialistName}</p>
                </div>
                <Badge className={`${statusColors[apt.status]} text-[10px] shrink-0`}>
                  {statusLabels[apt.status]}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {formatDate(apt.date)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {apt.time} ({apt.duration} min)
                </span>
              </div>
              {activeTab === 'upcoming' && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-9 text-xs flex-1"
                    disabled={!apt.cancelToken}
                    onClick={() => apt.cancelToken && window.open(`/cancel/${apt.cancelToken}`, '_blank', 'noopener,noreferrer')}
                  >
                    Przełóż
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl h-9 text-xs text-destructive"
                    disabled={!apt.cancelToken}
                    onClick={() => apt.cancelToken && window.open(`/cancel/${apt.cancelToken}`, '_blank', 'noopener,noreferrer')}
                  >
                    Odwołaj
                  </Button>
                </div>
              )}
              {activeTab === 'past' && apt.status === 'completed' && (
                <Button variant="secondary" size="sm" className="rounded-xl h-9 text-xs gap-1.5">
                  Umów ponownie
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </HoverCard>
          </MotionItem>
        ))}
      </MotionList>
    </PageTransition>
  );
}
