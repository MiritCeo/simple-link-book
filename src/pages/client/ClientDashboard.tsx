import { useNavigate } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, ArrowRight, Repeat, Star, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockSalon, mockServices, statusLabels, statusColors, type Appointment } from '@/data/mockData';
import { PageTransition, MotionList, MotionItem, HoverCard } from '@/components/motion';
import { motion } from 'framer-motion';

// Mock client appointments
const clientAppointments: Appointment[] = [
  { id: 'c1', clientName: 'Joanna Majewska', clientPhone: '+48 501 234 567', serviceName: 'Strzyżenie damskie', specialistName: 'Anna Kowalska', date: '2026-02-24', time: '10:00', duration: 45, status: 'confirmed' },
  { id: 'c2', clientName: 'Joanna Majewska', clientPhone: '+48 501 234 567', serviceName: 'Koloryzacja', specialistName: 'Marta Nowak', date: '2026-03-05', time: '14:00', duration: 120, status: 'scheduled' },
];

const pastAppointments: Appointment[] = [
  { id: 'p1', clientName: 'Joanna Majewska', clientPhone: '+48 501 234 567', serviceName: 'Strzyżenie damskie', specialistName: 'Anna Kowalska', date: '2026-02-14', time: '11:00', duration: 45, status: 'completed' },
  { id: 'p2', clientName: 'Joanna Majewska', clientPhone: '+48 501 234 567', serviceName: 'Manicure hybrydowy', specialistName: 'Karolina Wiśniewska', date: '2026-02-07', time: '15:00', duration: 60, status: 'completed' },
  { id: 'p3', clientName: 'Joanna Majewska', clientPhone: '+48 501 234 567', serviceName: 'Balayage', specialistName: 'Anna Kowalska', date: '2026-01-20', time: '09:00', duration: 180, status: 'completed' },
];

const quickBookOptions = [
  { service: 'Strzyżenie damskie', specialist: 'Anna Kowalska', lastDate: '14.02', price: 120 },
  { service: 'Manicure hybrydowy', specialist: 'Karolina Wiśniewska', lastDate: '07.02', price: 100 },
];

const dayNames = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
const monthNames = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

export default function ClientDashboard() {
  const navigate = useNavigate();

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]}`;
  };

  const nextAppointment = clientAppointments[0];

  return (
    <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6 pb-8">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-xl font-bold lg:text-2xl">Cześć, Joanna 👋</h1>
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
            <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs flex-1">
              Przełóż wizytę
            </Button>
            <Button variant="ghost" size="sm" className="rounded-xl h-9 text-xs text-destructive">
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
            {quickBookOptions.map((opt, i) => (
              <MotionItem key={opt.service}>
                <HoverCard
                  onClick={() => navigate('/s/studio-bella')}
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
                    <p className="text-sm font-semibold">{opt.price} zł</p>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
                  </div>
                </HoverCard>
              </MotionItem>
            ))}
          </MotionList>

          {/* Upcoming */}
          {clientAppointments.length > 1 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Zaplanowane</h2>
                <button onClick={() => navigate('/konto/wizyty')} className="text-xs text-primary font-medium hover:underline">
                  Wszystkie
                </button>
              </div>
              <MotionList className="space-y-2">
                {clientAppointments.slice(1).map(apt => (
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
                <span className="font-bold text-primary text-sm">SB</span>
              </div>
              <div>
                <p className="font-bold">{mockSalon.name}</p>
                <p className="text-xs text-muted-foreground">{mockSalon.description}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>{mockSalon.address}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4 shrink-0" />
                <span>{mockSalon.hours}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4 shrink-0" />
                <span>{mockSalon.phone}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex-1">
                <Button onClick={() => navigate('/s/studio-bella')} className="w-full rounded-xl h-10 gap-1.5">
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
              { label: 'Wizyt łącznie', value: '12' },
              { label: 'Ostatnia', value: '14.02' },
              { label: 'Wydane', value: '1 850 zł' },
            ].map((stat, i) => (
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
