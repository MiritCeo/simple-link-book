import { useState, useMemo } from 'react';
import { Phone, MessageSquare, Clock, User, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockAppointments, mockSpecialists, statusLabels, statusColors } from '@/data/mockData';

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
    <div className="px-4 pt-4 lg:px-8 lg:pt-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold lg:text-2xl">Wizyty</h1>
        <Badge variant="secondary" className="text-xs">{filtered.length} wizyt</Badge>
      </div>

      {/* Tabs + Filter row */}
      <div className="lg:flex lg:items-center lg:gap-4 mb-4 space-y-3 lg:space-y-0">
        <div className="flex gap-1 bg-muted rounded-xl p-1 lg:w-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 lg:flex-none lg:px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
            >
              {tab.label}
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
          {selectedSpecialist !== 'all' && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedSpecialist('all')} className="rounded-xl h-9 text-xs text-muted-foreground shrink-0">
              Wyczyść
            </Button>
          )}
        </div>
      </div>

      {/* List - mobile cards / desktop table-like */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">Brak wizyt</p>
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
          <div key={apt.id} className="bg-card rounded-2xl p-4 border border-border lg:grid lg:grid-cols-[1fr_1fr_140px_120px_160px] lg:items-center lg:gap-4 lg:px-6 lg:py-3 lg:rounded-xl">
            {/* Client */}
            <div className="mb-2 lg:mb-0">
              <p className="font-medium text-sm">{apt.clientName}</p>
              <p className="text-xs text-muted-foreground lg:hidden">{apt.serviceName}</p>
            </div>

            {/* Service + Specialist (desktop) */}
            <div className="hidden lg:block">
              <p className="text-sm">{apt.serviceName}</p>
              <p className="text-xs text-muted-foreground">{apt.specialistName}</p>
            </div>

            {/* Time */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 lg:mb-0">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{apt.time} ({apt.duration} min)</span>
              <span className="flex items-center gap-1 lg:hidden"><User className="w-3.5 h-3.5" />{apt.specialistName}</span>
            </div>

            {/* Status - on mobile it's top-right, desktop inline */}
            <div className="hidden lg:block">
              <Badge variant="secondary" className={`text-[10px] ${statusColors[apt.status]}`}>
                {statusLabels[apt.status]}
              </Badge>
            </div>

            {/* Mobile status badge - positioned via flex */}
            <div className="lg:hidden absolute top-4 right-4">
              {/* handled below */}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-9 flex-1 lg:flex-none">
                <Phone className="w-3.5 h-3.5" /><span className="lg:hidden">Zadzwoń</span>
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-9 flex-1 lg:flex-none">
                <MessageSquare className="w-3.5 h-3.5" /><span className="lg:hidden">SMS</span>
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl h-9 hidden lg:inline-flex text-xs">
                Szczegóły
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
