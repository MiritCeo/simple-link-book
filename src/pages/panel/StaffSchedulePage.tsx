import { useMemo, useState, useEffect } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageTransition, MotionList, MotionItem, HoverCard } from '@/components/motion';
import { getSalonStaff, getStaffSchedule } from '@/lib/api';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const dayNames = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
const weekDaysFull = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];

type ScheduleDay = { day: string; available: boolean; from: string; to: string };
type ExceptionDay = { date: string; label: string; hours: string; start?: string; end?: string };

const defaultWeek: ScheduleDay[] = [
  { day: 'Poniedziałek', available: true, from: '09:00', to: '17:00' },
  { day: 'Wtorek', available: true, from: '10:00', to: '18:00' },
  { day: 'Środa', available: true, from: '09:00', to: '17:00' },
  { day: 'Czwartek', available: true, from: '09:00', to: '17:00' },
  { day: 'Piątek', available: true, from: '09:00', to: '15:00' },
  { day: 'Sobota', available: false, from: '—', to: '—' },
  { day: 'Niedziela', available: false, from: '—', to: '—' },
];

const getWeekIndex = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // Monday=0
  d.setDate(d.getDate() - day);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - yearStart.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
};

export default function StaffSchedulePage() {
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [view, setView] = useState<'week' | 'month'>('week');
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [rotationRule, setRotationRule] = useState<'none' | 'biweekly' | 'monthly'>('none');

  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<ScheduleDay[]>(defaultWeek);
  const [exceptions, setExceptions] = useState<ExceptionDay[]>([]);
  const staff = staffList.find((sp: any) => sp.id === selectedStaffId);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getSalonStaff()
      .then(res => {
        if (!mounted) return;
        setStaffList(res.staff || []);
        setSelectedStaffId(res.staff?.[0]?.id || '');
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedStaffId) return;
    getStaffSchedule(selectedStaffId).then(res => {
      const mapped = (res.availability || []).map((a: any) => ({
        day: weekDaysFull[a.weekday],
        available: a.active,
        from: a.start,
        to: a.end,
      })) as ScheduleDay[];
      setAvailability(mapped.length ? mapped : defaultWeek);
      const ex = (res.exceptions || []).map((e: any) => ({
        date: e.date,
        label: e.label || 'Wyjątek',
        hours: e.start && e.end ? `${e.start}–${e.end}` : '—',
        start: e.start || '',
        end: e.end || '',
      })) as ExceptionDay[];
      setExceptions(ex);
    });
  }, [selectedStaffId]);

  const schedule = availability.length ? availability : defaultWeek;

  const monthDays = useMemo(() => {
    const start = new Date(monthCursor);
    const first = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    const startOffset = first.getDay();
    const daysInMonth = last.getDate();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    return Array.from({ length: totalCells }, (_, i) => {
      const dayIndex = i - startOffset + 1;
      if (dayIndex < 1 || dayIndex > daysInMonth) return '';
      const d = new Date(start.getFullYear(), start.getMonth(), dayIndex);
      return d.toISOString().split('T')[0];
    });
  }, [monthCursor]);

  const shiftMonth = (dir: number) => {
    const d = new Date(monthCursor);
    d.setMonth(d.getMonth() + dir);
    d.setDate(1);
    setMonthCursor(d.toISOString().split('T')[0]);
  };

  const monthLabel = () => {
    const d = new Date(monthCursor);
    const months = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  return (
    <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6 pb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold lg:text-2xl">Grafik pracowników</h1>
          <p className="text-sm text-muted-foreground">Planowanie dostępności zespołu</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl h-9"
          onClick={() => selectedStaffId && navigate(`/panel/grafik/${selectedStaffId}`)}
        >
          Edytuj grafik
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Pracownik</span>
          <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
            <SelectTrigger className="h-9 rounded-xl text-sm w-56">
              <SelectValue placeholder="Wybierz pracownika" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {staffList.map((sp: any) => (
                <SelectItem key={sp.id} value={sp.id}>{sp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 bg-muted rounded-xl p-1 w-fit">
          <button
            onClick={() => setView('week')}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              view === 'week' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
            }`}
          >
            Tydzień
          </button>
          <button
            onClick={() => setView('month')}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              view === 'month' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
            }`}
          >
            Miesiąc
          </button>
        </div>
      </div>

      {view === 'week' && (
        <div className="lg:grid lg:grid-cols-[1fr_320px] gap-6">
          <MotionList className="space-y-2">
            {schedule.map((day, idx) => (
              <MotionItem key={day.day}>
                <HoverCard className="bg-card rounded-2xl p-4 border border-border flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{day.day}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {day.available ? `${day.from}–${day.to}` : 'Niedostępny'}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {day.available ? 'Dostępny' : 'OFF'}
                  </Badge>
                </HoverCard>
              </MotionItem>
            ))}
          </MotionList>

          <div className="mt-4 lg:mt-0">
            <h3 className="text-sm font-semibold mb-2">Wyjątki</h3>
            <div className="space-y-2">
              {exceptions.map(ex => (
                <div key={ex.date} className="bg-card rounded-xl border border-border p-3">
                  <p className="text-xs font-semibold">{ex.date}</p>
                  <p className="text-xs text-muted-foreground">{ex.label} • {ex.hours}</p>
                </div>
              ))}
              {exceptions.length === 0 && (
                <p className="text-xs text-muted-foreground">Brak wyjątków</p>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'month' && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-2">
            <motion.button whileHover={{ x: -2 }} whileTap={{ scale: 0.9 }} onClick={() => shiftMonth(-1)} className="touch-target flex items-center justify-center">
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
            <span className="text-sm font-medium">{monthLabel()}</span>
            <motion.button whileHover={{ x: 2 }} whileTap={{ scale: 0.9 }} onClick={() => shiftMonth(1)} className="touch-target flex items-center justify-center">
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>
          <div className="grid grid-cols-7 gap-2 text-[10px] text-muted-foreground mb-2">
            {dayNames.map(d => (
              <div key={d} className="text-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {monthDays.map((date, idx) => {
              if (!date) return <div key={`empty-${idx}`} className="h-20 rounded-xl bg-muted/30" />;
              const d = new Date(date);
              const weekday = weekDaysFull[(d.getDay() + 6) % 7];
              const dayRule = schedule.find(s => s.day === weekday);
              const weekIndex = getWeekIndex(d);
              const rotationLabel = rotationRule === 'biweekly'
                ? (weekIndex % 2 === 0 ? 'A' : 'B')
                : rotationRule === 'monthly'
                  ? `T${(weekIndex % 4) + 1}`
                  : '';
              return (
                <div key={date} className="h-20 rounded-xl border border-border bg-card p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{d.getDate()}</span>
                    <div className="flex items-center gap-1">
                      {rotationLabel && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                          {rotationLabel}
                        </span>
                      )}
                      <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-1">
                    {dayRule?.available ? `${dayRule.from}–${dayRule.to}` : 'OFF'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </PageTransition>
  );
}
