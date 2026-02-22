import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Copy, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PageTransition } from '@/components/motion';
import { createStaffException, getSalonStaff, getStaffSchedule, saveStaffSchedule } from '@/lib/api';
import { toast } from 'sonner';

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

export default function StaffScheduleEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<ScheduleDay[]>(defaultWeek);
  const [exceptions, setExceptions] = useState<ExceptionDay[]>([]);
  const [exceptionForm, setExceptionForm] = useState({ date: '', label: '', start: '', end: '' });
  const [bulkDays, setBulkDays] = useState<string[]>(['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek']);
  const [rotationRule, setRotationRule] = useState<'none' | 'biweekly' | 'monthly'>('none');

  const staff = staffList.find((sp: any) => sp.id === selectedStaffId);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getSalonStaff()
      .then(res => {
        if (!mounted) return;
        setStaffList(res.staff || []);
        const fallbackId = res.staff?.[0]?.id || '';
        setSelectedStaffId(id || fallbackId);
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [id]);

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

  const filteredBulkDays = useMemo(() => weekDaysFull.filter(d => bulkDays.includes(d)), [bulkDays]);

  if (loading) {
    return (
      <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6 pb-8">
        <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground">
          Ładowanie grafiku...
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6 pb-8">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/panel/grafik')} className="rounded-xl h-9 px-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold lg:text-2xl truncate">Edytuj grafik</h1>
          <p className="text-sm text-muted-foreground truncate">{staff?.name || 'Wybierz pracownika'}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-muted-foreground">Pracownik</span>
        <Select
          value={selectedStaffId}
          onValueChange={(value) => {
            setSelectedStaffId(value);
            navigate(`/panel/grafik/${value}`);
          }}
        >
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

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-border p-4">
            <h2 className="text-sm font-semibold mb-3">Masowe ustawienia</h2>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <Input type="time" defaultValue="09:00" className="h-9 rounded-lg" />
              <Input type="time" defaultValue="17:00" className="h-9 rounded-lg" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {weekDaysFull.map(day => {
                const checked = bulkDays.includes(day);
                return (
                  <label key={day} className="flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => {
                        setBulkDays(prev =>
                          value ? [...prev, day] : prev.filter(d => d !== day),
                        );
                      }}
                    />
                    {day.slice(0, 2)}
                  </label>
                );
              })}
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-muted-foreground">Reguła rotacyjna</span>
              <Select value={rotationRule} onValueChange={(value) => setRotationRule(value as typeof rotationRule)}>
                <SelectTrigger className="h-8 rounded-lg text-xs w-40">
                  <SelectValue placeholder="Brak" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="none">Brak</SelectItem>
                  <SelectItem value="biweekly">Co drugi tydzień</SelectItem>
                  <SelectItem value="monthly">Co 4 tygodnie</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-xl h-8 text-xs" onClick={() => toast('Ustawiono Pon–Pt 09:00–17:00')}>
                Pon–Pt 9–17
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl h-8 text-xs" onClick={() => toast('Weekend ustawiony jako OFF')}>
                Weekend OFF
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl h-8 text-xs" onClick={() => toast('Zastosowano do wszystkich dni')}>
                Wszystkie dni
              </Button>
            </div>
            {filteredBulkDays.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-2">
                Wybrane dni: {filteredBulkDays.join(', ')}
              </p>
            )}
          </div>

          <div className="bg-card rounded-2xl border border-border p-4">
            <h2 className="text-sm font-semibold mb-3">Tygodniowa dostępność</h2>
            <div className="space-y-2">
              {availability.map(day => (
                <div key={day.day} className="grid grid-cols-[1fr_auto] items-center gap-2 border border-border rounded-xl p-3">
                  <div>
                    <p className="text-sm font-medium">{day.day}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="time"
                        value={day.from}
                        onChange={(e) => setAvailability(prev => prev.map(d => d.day === day.day ? { ...d, from: e.target.value } : d))}
                        className="h-9 rounded-lg w-28"
                        disabled={!day.available}
                      />
                      <span className="text-xs text-muted-foreground">—</span>
                      <Input
                        type="time"
                        value={day.to}
                        onChange={(e) => setAvailability(prev => prev.map(d => d.day === day.day ? { ...d, to: e.target.value } : d))}
                        className="h-9 rounded-lg w-28"
                        disabled={!day.available}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={day.available}
                      onCheckedChange={(checked) => setAvailability(prev => prev.map(d => d.day === day.day ? { ...d, available: checked } : d))}
                    />
                    <span className="text-xs text-muted-foreground">Dostępny</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Button variant="outline" size="sm" className="rounded-xl h-8 text-xs" onClick={() => toast('Skopiowano na cały tydzień')}>
                <Copy className="w-3.5 h-3.5 mr-1" />Zastosuj do wszystkich dni
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl h-8 text-xs" onClick={() => toast('Skopiowano grafik na kolejny tydzień')}>
                <Copy className="w-3.5 h-3.5 mr-1" />Skopiuj na kolejny tydzień
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-border p-4">
            <h2 className="text-sm font-semibold mb-3">Wyjątki</h2>
            <div className="space-y-2">
              {exceptions.map(ex => (
                <div key={`${ex.date}-${ex.label}`} className="bg-muted/30 rounded-xl p-3">
                  <p className="text-xs font-semibold">{ex.date}</p>
                  <p className="text-xs text-muted-foreground">{ex.label} • {ex.hours}</p>
                </div>
              ))}
              {exceptions.length === 0 && (
                <p className="text-xs text-muted-foreground">Brak wyjątków</p>
              )}
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4">
            <h2 className="text-sm font-semibold mb-3">Dodaj wyjątek</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Data</label>
                <Input
                  type="date"
                  value={exceptionForm.date}
                  onChange={(e) => setExceptionForm(prev => ({ ...prev, date: e.target.value }))}
                  className="h-10 rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Opis</label>
                <Input
                  placeholder="Np. urlop"
                  value={exceptionForm.label}
                  onChange={(e) => setExceptionForm(prev => ({ ...prev, label: e.target.value }))}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Od</label>
                  <Input
                    type="time"
                    value={exceptionForm.start}
                    onChange={(e) => setExceptionForm(prev => ({ ...prev, start: e.target.value }))}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Do</label>
                  <Input
                    type="time"
                    value={exceptionForm.end}
                    onChange={(e) => setExceptionForm(prev => ({ ...prev, end: e.target.value }))}
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>
              <Button
                className="rounded-xl w-full"
                onClick={async () => {
                  if (!selectedStaffId) return;
                  if (!exceptionForm.date) {
                    toast.error('Wybierz datę wyjątku');
                    return;
                  }
                  const hours = exceptionForm.start && exceptionForm.end ? `${exceptionForm.start}–${exceptionForm.end}` : '—';
                  const next = {
                    date: exceptionForm.date,
                    label: exceptionForm.label || 'Wyjątek',
                    hours,
                    start: exceptionForm.start,
                    end: exceptionForm.end,
                  };
                  const updated = [...exceptions, next];
                const created = await createStaffException(selectedStaffId, {
                  date: exceptionForm.date,
                  start: exceptionForm.start || undefined,
                  end: exceptionForm.end || undefined,
                  label: exceptionForm.label || 'Wyjątek',
                });
                const createdEx = created.exception
                  ? {
                      date: created.exception.date,
                      label: created.exception.label || 'Wyjątek',
                      hours: created.exception.start && created.exception.end ? `${created.exception.start}–${created.exception.end}` : '—',
                      start: created.exception.start || '',
                      end: created.exception.end || '',
                    }
                  : next;
                setExceptions(prev => [...prev, createdEx]);
                  setExceptionForm({ date: '', label: '', start: '', end: '' });
                  toast.success('Wyjątek zapisany');
                }}
              >
                Dodaj wyjątek
              </Button>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4">
            <h2 className="text-sm font-semibold mb-3">Zapisz grafik</h2>
            <Button
              className="rounded-xl w-full gap-2"
              onClick={async () => {
                if (!selectedStaffId) return;
                await saveStaffSchedule({
                  staffId: selectedStaffId,
                  availability: availability.map(d => ({
                    weekday: weekDaysFull.indexOf(d.day),
                    start: d.from,
                    end: d.to,
                    active: d.available,
                  })),
                  exceptions: exceptions.map(ex => ({
                    date: ex.date,
                    start: ex.start || undefined,
                    end: ex.end || undefined,
                    label: ex.label,
                    active: true,
                  })),
                });
                toast.success('Grafik zapisany');
              }}
            >
              <Save className="w-4 h-4" />Zapisz zmiany
            </Button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
