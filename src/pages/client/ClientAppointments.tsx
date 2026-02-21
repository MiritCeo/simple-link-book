import { useState } from 'react';
import { CalendarDays, Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { statusLabels, statusColors, type Appointment } from '@/data/mockData';
import { PageTransition, MotionList, MotionItem, HoverCard } from '@/components/motion';
import { motion } from 'framer-motion';

const upcoming: Appointment[] = [
  { id: 'c1', clientName: 'Joanna Majewska', clientPhone: '+48 501 234 567', serviceName: 'Strzyżenie damskie', specialistName: 'Anna Kowalska', date: '2026-02-24', time: '10:00', duration: 45, status: 'confirmed' },
  { id: 'c2', clientName: 'Joanna Majewska', clientPhone: '+48 501 234 567', serviceName: 'Koloryzacja', specialistName: 'Marta Nowak', date: '2026-03-05', time: '14:00', duration: 120, status: 'scheduled' },
];

const past: Appointment[] = [
  { id: 'p1', clientName: 'Joanna Majewska', clientPhone: '+48 501 234 567', serviceName: 'Strzyżenie damskie', specialistName: 'Anna Kowalska', date: '2026-02-14', time: '11:00', duration: 45, status: 'completed' },
  { id: 'p2', clientName: 'Joanna Majewska', clientPhone: '+48 501 234 567', serviceName: 'Manicure hybrydowy', specialistName: 'Karolina Wiśniewska', date: '2026-02-07', time: '15:00', duration: 60, status: 'completed' },
  { id: 'p3', clientName: 'Joanna Majewska', clientPhone: '+48 501 234 567', serviceName: 'Balayage', specialistName: 'Anna Kowalska', date: '2026-01-20', time: '09:00', duration: 180, status: 'completed' },
  { id: 'p4', clientName: 'Joanna Majewska', clientPhone: '+48 501 234 567', serviceName: 'Henna brwi i rzęs', specialistName: 'Ewa Zielińska', date: '2026-01-10', time: '16:00', duration: 30, status: 'completed' },
  { id: 'p5', clientName: 'Joanna Majewska', clientPhone: '+48 501 234 567', serviceName: 'Strzyżenie damskie', specialistName: 'Anna Kowalska', date: '2025-12-20', time: '10:00', duration: 45, status: 'completed' },
  { id: 'p6', clientName: 'Joanna Majewska', clientPhone: '+48 501 234 567', serviceName: 'Pedicure', specialistName: 'Karolina Wiśniewska', date: '2025-12-10', time: '13:00', duration: 75, status: 'cancelled' },
];

const tabs = [
  { key: 'upcoming', label: 'Nadchodzące' },
  { key: 'past', label: 'Historia' },
];

const dayNames = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
const monthNames = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

export default function ClientAppointments() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const appointments = activeTab === 'upcoming' ? upcoming : past;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  };

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
        {appointments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">Brak wizyt</p>
        )}
        {appointments.map(apt => (
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
                  <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs flex-1">
                    Przełóż
                  </Button>
                  <Button variant="ghost" size="sm" className="rounded-xl h-9 text-xs text-destructive">
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
