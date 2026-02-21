import { useState, useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight, Clock, User, List, LayoutGrid, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockAppointments, mockSpecialists, statusLabels, statusColors, type Appointment } from '@/data/mockData';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 - 19:00

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState('2026-02-21');
  const [view, setView] = useState<'list' | 'timeline'>('list');
  const [selectedSpecialist, setSelectedSpecialist] = useState<string>('all');

  const dayNames = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
  const dayNamesFull = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date('2026-02-16');
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

  const appointments = useMemo(() => {
    let appts = mockAppointments.filter(a => a.date === selectedDate);
    if (selectedSpecialist !== 'all') {
      appts = appts.filter(a => a.specialistName === selectedSpecialist);
    }
    return appts;
  }, [selectedDate, selectedSpecialist]);

  const allWeekAppointments = mockAppointments.filter(a => weekDays.includes(a.date));

  const shiftWeek = (dir: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d.toISOString().split('T')[0]);
  };

  const getMonthLabel = () => {
    const d = new Date(weekDays[3] || weekStart);
    const months = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const getAppointmentPosition = (apt: Appointment) => {
    const [h, m] = apt.time.split(':').map(Number);
    const top = ((h - 8) * 60 + m) * (64 / 60); // 64px per hour
    const height = apt.duration * (64 / 60);
    return { top, height: Math.max(height, 24) };
  };

  return (
    <div className="px-4 pt-4 lg:px-8 lg:pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold lg:text-2xl">Kalendarz</h1>
        <div className="flex items-center gap-2">
          {/* View toggle - visible on all sizes */}
          <div className="hidden sm:flex items-center bg-muted rounded-xl p-1">
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-lg transition-colors ${view === 'list' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
              title="Widok listy"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('timeline')}
              className={`p-2 rounded-lg transition-colors ${view === 'timeline' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
              title="Widok osi czasu"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <Button size="sm" className="rounded-xl gap-1.5 h-10">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Dodaj wizytę</span>
            <span className="sm:hidden">Dodaj</span>
          </Button>
        </div>
      </div>

      {/* Week selector */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => shiftWeek(-1)} className="touch-target flex items-center justify-center">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium">{getMonthLabel()}</span>
        <button onClick={() => shiftWeek(1)} className="touch-target flex items-center justify-center">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Week days */}
      <div className="grid grid-cols-7 gap-1 mb-6">
        {weekDays.map(date => {
          const d = new Date(date);
          const isSelected = selectedDate === date;
          const dayAppts = mockAppointments.filter(a => a.date === date && (selectedSpecialist === 'all' || a.specialistName === selectedSpecialist));
          return (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`flex flex-col items-center py-2 rounded-xl transition-all ${
                isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-[10px] uppercase lg:text-xs">{dayNames[d.getDay()]}</span>
              <span className="text-lg font-semibold lg:text-xl">{d.getDate()}</span>
              {dayAppts.length > 0 && (
                <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-primary-foreground/60' : 'bg-primary/40'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Specialist filter */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        <Select value={selectedSpecialist} onValueChange={setSelectedSpecialist}>
          <SelectTrigger className="h-9 rounded-xl text-sm w-full sm:w-56">
            <SelectValue placeholder="Wszyscy specjaliści" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">Wszyscy specjaliści</SelectItem>
            {mockSpecialists.map(sp => (
              <SelectItem key={sp.id} value={sp.name}>{sp.name} — {sp.role}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedSpecialist !== 'all' && (
          <Button variant="ghost" size="sm" onClick={() => setSelectedSpecialist('all')} className="rounded-xl h-9 text-xs text-muted-foreground shrink-0">
            Wyczyść
          </Button>
        )}
      </div>

      <div className="hidden lg:flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold">
          {dayNamesFull[new Date(selectedDate).getDay()]}, {new Date(selectedDate).getDate()}.{String(new Date(selectedDate).getMonth() + 1).padStart(2, '0')}
        </h2>
        <Badge variant="secondary" className="text-xs">{appointments.length} wizyt</Badge>
      </div>

      {/* Timeline view (desktop) */}
      {view === 'timeline' && (
        <div className="hidden sm:block">
          <div className="relative border border-border rounded-2xl bg-card overflow-hidden">
            {/* Hour grid */}
            {HOURS.map(hour => (
              <div key={hour} className="flex items-start border-b border-border last:border-0" style={{ height: 64 }}>
                <div className="w-16 shrink-0 text-xs text-muted-foreground py-1 px-3 text-right border-r border-border">
                  {String(hour).padStart(2, '0')}:00
                </div>
                <div className="flex-1 relative" />
              </div>
            ))}

            {/* Appointments overlay */}
            <div className="absolute top-0 left-16 right-0 bottom-0">
              {appointments.map(apt => {
                const pos = getAppointmentPosition(apt);
                return (
                  <div
                    key={apt.id}
                    className={`absolute left-1 right-1 rounded-lg px-3 py-1.5 border cursor-pointer hover:opacity-90 transition-opacity overflow-hidden ${statusColors[apt.status]} border-current/10`}
                    style={{ top: pos.top, height: pos.height }}
                  >
                    <p className="text-xs font-semibold truncate">{apt.time} — {apt.serviceName}</p>
                    <p className="text-[10px] truncate opacity-70">{apt.clientName} • {apt.specialistName}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* List view (default, always on mobile) */}
      {(view === 'list' || typeof window !== 'undefined') && (
        <div className={view === 'timeline' ? 'sm:hidden' : ''}>
          <div className="space-y-3">
            {appointments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-12">Brak wizyt w tym dniu</p>
            )}
            {appointments.map(apt => (
              <div key={apt.id} className="bg-card rounded-2xl p-4 border border-border lg:flex lg:items-center lg:gap-6 lg:px-6">
                {/* Time block */}
                <div className="flex items-start justify-between mb-2 lg:mb-0 lg:flex-col lg:items-start lg:gap-0.5 lg:w-24 lg:shrink-0">
                  <div className="flex items-center gap-2 lg:flex-col lg:items-start lg:gap-0">
                    <Clock className="w-4 h-4 text-muted-foreground lg:hidden" />
                    <span className="font-semibold text-sm lg:text-base">{apt.time}</span>
                    <span className="text-xs text-muted-foreground">({apt.duration} min)</span>
                  </div>
                  <Badge variant="secondary" className={`text-[10px] lg:mt-1 ${statusColors[apt.status]}`}>
                    {statusLabels[apt.status]}
                  </Badge>
                </div>

                {/* Details */}
                <div className="lg:flex-1">
                  <p className="font-medium lg:text-base">{apt.serviceName}</p>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{apt.clientName}</span>
                    <span>{apt.specialistName}</span>
                  </div>
                </div>

                {/* Desktop actions */}
                <div className="hidden lg:flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs">Szczegóły</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Desktop: week overview table */}
      <div className="hidden lg:block mt-8">
        <h3 className="text-base font-semibold mb-3">Przegląd tygodnia</h3>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(date => {
            const d = new Date(date);
            const dayAppts = mockAppointments.filter(a => a.date === date && (selectedSpecialist === 'all' || a.specialistName === selectedSpecialist));
            const isSelected = selectedDate === date;
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`text-left p-3 rounded-xl border transition-all min-h-[120px] ${
                  isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <p className={`text-xs font-medium mb-2 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                  {dayNames[d.getDay()]} {d.getDate()}
                </p>
                <div className="space-y-1">
                  {dayAppts.slice(0, 3).map(apt => (
                    <div key={apt.id} className="text-[11px] leading-tight">
                      <span className="font-medium">{apt.time}</span>{' '}
                      <span className="text-muted-foreground">{apt.serviceName}</span>
                    </div>
                  ))}
                  {dayAppts.length > 3 && (
                    <p className="text-[10px] text-muted-foreground">+{dayAppts.length - 3} więcej</p>
                  )}
                  {dayAppts.length === 0 && (
                    <p className="text-[10px] text-muted-foreground italic">Brak wizyt</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
