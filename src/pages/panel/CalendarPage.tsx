import { useState, useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockAppointments, statusLabels, statusColors } from '@/data/mockData';

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState('2026-02-21');

  const dayNames = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];

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

  const appointments = mockAppointments.filter(a => a.date === selectedDate);

  const shiftWeek = (dir: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d.toISOString().split('T')[0]);
  };

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Kalendarz</h1>
        <Button size="sm" className="rounded-xl gap-1.5 h-10"><Plus className="w-4 h-4" />Dodaj</Button>
      </div>

      {/* Week selector */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => shiftWeek(-1)} className="touch-target flex items-center justify-center"><ChevronLeft className="w-5 h-5" /></button>
        <span className="text-sm font-medium">Luty 2026</span>
        <button onClick={() => shiftWeek(1)} className="touch-target flex items-center justify-center"><ChevronRight className="w-5 h-5" /></button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-6">
        {weekDays.map(date => {
          const d = new Date(date);
          const isSelected = selectedDate === date;
          return (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`flex flex-col items-center py-2 rounded-xl transition-all ${
                isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <span className="text-[10px] uppercase">{dayNames[d.getDay()]}</span>
              <span className="text-lg font-semibold">{d.getDate()}</span>
            </button>
          );
        })}
      </div>

      {/* Appointments */}
      <div className="space-y-3">
        {appointments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">Brak wizyt w tym dniu</p>
        )}
        {appointments.map(apt => (
          <div key={apt.id} className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-sm">{apt.time}</span>
                <span className="text-xs text-muted-foreground">({apt.duration} min)</span>
              </div>
              <Badge variant="secondary" className={`text-[10px] ${statusColors[apt.status]}`}>
                {statusLabels[apt.status]}
              </Badge>
            </div>
            <p className="font-medium">{apt.serviceName}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{apt.clientName}</span>
              <span>{apt.specialistName}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
