import { useState, useMemo } from 'react';
import { Phone, MessageSquare, Clock, User, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockAppointments, mockSpecialists, statusLabels, statusColors } from '@/data/mockData';
import { PageTransition, MotionList, MotionItem, HoverCard } from '@/components/motion';
import { motion, AnimatePresence } from 'framer-motion';

const tabs = [
  { key: 'today', label: 'Dziś' },
  { key: 'upcoming', label: 'Nadchodzące' },
  { key: 'past', label: 'Przeszłe' },
];

export default function AppointmentsPage() {
  const [activeTab, setActiveTab] = useState('today');
  const [selectedSpecialist, setSelectedSpecialist] = useState('all');

  const filtered = useMemo(() => {
    let appts = mockAppointments.filter(a => {
      if (activeTab === 'today') return a.date === '2026-02-21';
      if (activeTab === 'upcoming') return a.date > '2026-02-21';
      return a.date < '2026-02-21';
    });
    if (selectedSpecialist !== 'all') {
      appts = appts.filter(a => a.specialistName === selectedSpecialist);
    }
    return appts;
  }, [activeTab, selectedSpecialist]);

  return (
    <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold lg:text-2xl">Wizyty</h1>
        <Badge variant="secondary" className="text-xs">{filtered.length} wizyt</Badge>
      </div>

      {/* Tabs + Filter row */}
      <div className="lg:flex lg:items-center lg:gap-4 mb-4 space-y-3 lg:space-y-0">
        <div className="relative flex gap-1 bg-muted rounded-xl p-1 lg:w-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex-1 lg:flex-none lg:px-5 py-2.5 rounded-lg text-sm font-medium transition-colors z-10 ${
                activeTab === tab.key ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {activeTab === tab.key && (
                <motion.div
                  layoutId="tab-bg"
                  className="absolute inset-0 bg-card shadow-sm rounded-lg"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <Select value={selectedSpecialist} onValueChange={setSelectedSpecialist}>
            <SelectTrigger className="h-9 rounded-xl text-sm w-full sm:w-56">
              <SelectValue placeholder="Wszyscy specjaliści" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">Wszyscy specjaliści</SelectItem>
              {mockSpecialists.map(sp => (
                <SelectItem key={sp.id} value={sp.name}>{sp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AnimatePresence>
            {selectedSpecialist !== 'all' && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                <Button variant="ghost" size="sm" onClick={() => setSelectedSpecialist('all')} className="rounded-xl h-9 text-xs text-muted-foreground shrink-0">
                  Wyczyść
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* List */}
      <MotionList className="space-y-3" key={activeTab + selectedSpecialist}>
        {filtered.length === 0 && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted-foreground text-center py-12">
            Brak wizyt
          </motion.p>
        )}

        {/* Desktop table header */}
        <div className="hidden lg:grid lg:grid-cols-[1fr_1fr_140px_120px_160px] gap-4 px-6 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Klient</span>
          <span>Usługa / Specjalista</span>
          <span>Godzina</span>
          <span>Status</span>
          <span>Akcje</span>
        </div>

        {filtered.map(apt => (
          <MotionItem key={apt.id}>
            <HoverCard className="bg-card rounded-2xl p-4 border border-border lg:grid lg:grid-cols-[1fr_1fr_140px_120px_160px] lg:items-center lg:gap-4 lg:px-6 lg:py-3 lg:rounded-xl">
              <div className="mb-2 lg:mb-0">
                <p className="font-medium text-sm">{apt.clientName}</p>
                <p className="text-xs text-muted-foreground lg:hidden">{apt.serviceName}</p>
              </div>
              <div className="hidden lg:block">
                <p className="text-sm">{apt.serviceName}</p>
                <p className="text-xs text-muted-foreground">{apt.specialistName}</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 lg:mb-0">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{apt.time} ({apt.duration} min)</span>
                <span className="flex items-center gap-1 lg:hidden"><User className="w-3.5 h-3.5" />{apt.specialistName}</span>
              </div>
              <div className="hidden lg:block">
                <Badge variant="secondary" className={`text-[10px] ${statusColors[apt.status]}`}>
                  {statusLabels[apt.status]}
                </Badge>
              </div>
              <div className="flex gap-2">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-9">
                    <Phone className="w-3.5 h-3.5" /><span className="lg:hidden">Zadzwoń</span>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-9">
                    <MessageSquare className="w-3.5 h-3.5" /><span className="lg:hidden">SMS</span>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="hidden lg:block">
                  <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs">
                    Szczegóły
                  </Button>
                </motion.div>
              </div>
            </HoverCard>
          </MotionItem>
        ))}
      </MotionList>
    </PageTransition>
  );
}
