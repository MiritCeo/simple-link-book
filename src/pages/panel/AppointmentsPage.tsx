import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Phone, MessageSquare, Clock, User, Filter, Info, Search, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { statusLabels, statusColors, type Appointment } from '@/data/mockData';
import { PageTransition, MotionList, MotionItem, HoverCard } from '@/components/motion';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { getSalonAppointments, getSalonBreaks, getSalonExceptions, getSalonHours, getSalonServices, getSalonStaff, getStaffSchedule, updateAppointment, updateClient, sendManualSms } from '@/lib/api';

const tabs = [
  { key: 'today', label: 'Dziś' },
  { key: 'upcoming', label: 'Nadchodzące' },
  { key: 'past', label: 'Przeszłe' },
];

export default function AppointmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const handledEditRef = useRef(false);
  const [activeTab, setActiveTab] = useState('today');
  const [selectedSpecialist, setSelectedSpecialist] = useState('all');
  const [statusOverrides, setStatusOverrides] = useState<Record<string, Appointment['status']>>({});
  const [selectedStatus, setSelectedStatus] = useState<'all' | Appointment['status']>('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeAptId, setActiveAptId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editStatus, setEditStatus] = useState<Appointment['status']>('scheduled');
  const [editStaffId, setEditStaffId] = useState('any');
  const [editNotes, setEditNotes] = useState('');
  const [editServiceIds, setEditServiceIds] = useState<string[]>([]);
  const [editServiceSearch, setEditServiceSearch] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editClientEmail, setEditClientEmail] = useState('');
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsPhone, setSmsPhone] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [smsSending, setSmsSending] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [salonBreaks, setSalonBreaks] = useState<any[]>([]);
  const [salonHours, setSalonHours] = useState<any[]>([]);
  const [salonExceptions, setSalonExceptions] = useState<any[]>([]);
  const [staffSchedules, setStaffSchedules] = useState<Record<string, { availability: any[]; exceptions: any[] }>>({});
  const [loading, setLoading] = useState(true);

  const mapStatus = (status?: string) => (status || 'SCHEDULED').toLowerCase().replace(/_/g, '-');
  const toMinutes = (t: string) => {
    const [h, m] = (t || '').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const dayIndexMap: Record<string, number> = {
    Pn: 0, Wt: 1, Śr: 2, Sr: 2, Cz: 3, Pt: 4, So: 5, Sob: 5, Sb: 5, Nd: 6,
  };
  const parseBreakDays = (days?: string) => {
    if (!days) return null as Set<number> | null;
    const set = new Set<number>();
    days.split(',').map(p => p.trim()).filter(Boolean).forEach(part => {
      const sep = part.includes('–') ? '–' : part.includes('-') ? '-' : '';
      if (sep) {
        const [start, end] = part.split(sep).map(s => s.trim());
        const sIdx = dayIndexMap[start];
        const eIdx = dayIndexMap[end];
        if (sIdx === undefined || eIdx === undefined) return;
        if (sIdx <= eIdx) {
          for (let i = sIdx; i <= eIdx; i += 1) set.add(i);
        } else {
          for (let i = sIdx; i < 7; i += 1) set.add(i);
          for (let i = 0; i <= eIdx; i += 1) set.add(i);
        }
      } else {
        const idx = dayIndexMap[part];
        if (idx !== undefined) set.add(idx);
      }
    });
    return set.size ? set : null;
  };
  const breakWindowsForDate = (dateStr: string) => {
    if (!dateStr) return [] as Array<{ start: number; end: number }>;
    const d = new Date(dateStr);
    const weekday = (d.getDay() + 6) % 7;
    return salonBreaks
      .filter((b: any) => b.type === 'BREAK' && b.start && b.end)
      .filter((b: any) => {
        const days = parseBreakDays(b.days);
        return !days || days.has(weekday);
      })
      .map((b: any) => ({ start: toMinutes(b.start), end: toMinutes(b.end) }));
  };
  const bufferMinutes = useMemo(() => {
    let before = 0;
    let after = 0;
    salonBreaks
      .filter((b: any) => b.type === 'BUFFER' && typeof b.minutes === 'number')
      .forEach((b: any) => {
        const label = (b.label || '').toLowerCase();
        if (label.includes('przed')) before += b.minutes;
        else if (label.includes('po')) after += b.minutes;
        else {
          before += b.minutes;
          after += b.minutes;
        }
      });
    return { before, after };
  }, [salonBreaks]);

  const getWindowForDate = (dateStr: string) => {
    if (!dateStr) return null;
    const exception = salonExceptions.find((e: any) => e.date === dateStr);
    if (exception?.closed) return null;
    if (exception?.start && exception?.end) return { start: exception.start, end: exception.end };
    const d = new Date(dateStr);
    const weekday = (d.getDay() + 6) % 7;
    const day = salonHours.find((h: any) => h.weekday === weekday);
    if (!day || !day.active || !day.open || !day.close) return null;
    return { start: day.open, end: day.close };
  };

  const getStaffWindowForDate = (dateStr: string, staffId?: string) => {
    if (!dateStr || !staffId || staffId === 'any') return null;
    const schedule = staffSchedules[staffId];
    if (!schedule) return null;
    const exception = schedule.exceptions?.find((e: any) => e.date === dateStr && e.active !== false);
    if (exception) {
      if (!exception.start || !exception.end) return null;
      return { start: exception.start, end: exception.end };
    }
    const d = new Date(dateStr);
    const weekday = (d.getDay() + 6) % 7;
    const day = schedule.availability?.find((a: any) => a.weekday === weekday);
    if (!day || !day.active || !day.start || !day.end) return null;
    return { start: day.start, end: day.end };
  };

  const getEffectiveWindow = (dateStr: string, staffId?: string) => {
    return getStaffWindowForDate(dateStr, staffId) || getWindowForDate(dateStr);
  };
  const applyStatusUpdate = async (aptId: string, value: Appointment['status']) => {
    setStatusOverrides(prev => ({ ...prev, [aptId]: value }));
    try {
      await updateAppointment(aptId, { status: value.toUpperCase().replace(/-/g, '_') });
      setAppointments(prev => prev.map(a => a.id === aptId ? { ...a, status: value.toUpperCase().replace(/-/g, '_') } : a));
      toast.success('Status zapisany');
    } catch (err: any) {
      toast.error(err.message || 'Błąd zapisu statusu');
    }
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([getSalonAppointments(), getSalonStaff(), getSalonServices(), getSalonBreaks(), getSalonHours(), getSalonExceptions()])
      .then(([apptsRes, staffRes, servicesRes, breaksRes, hoursRes, exceptionsRes]) => {
        if (!mounted) return;
        setAppointments(apptsRes.appointments || []);
        setStaff(staffRes.staff || []);
        setServices(servicesRes.services || []);
        setSalonBreaks(breaksRes.breaks || []);
        setSalonHours(hoursRes.hours || []);
        setSalonExceptions(exceptionsRes.exceptions || []);
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const loadSchedule = async (staffId: string) => {
      if (!staffId || staffId === 'any' || staffSchedules[staffId]) return;
      const res = await getStaffSchedule(staffId);
      setStaffSchedules(prev => ({ ...prev, [staffId]: { availability: res.availability || [], exceptions: res.exceptions || [] } }));
    };
    loadSchedule(editStaffId);
  }, [editStaffId, staffSchedules]);

  const today = new Date().toISOString().split('T')[0];

  const filtered = useMemo(() => {
    let appts = appointments.filter((a: any) => {
      if (activeTab === 'today') return a.date === today;
      if (activeTab === 'upcoming') return a.date > today;
      return a.date < today;
    });
    if (selectedSpecialist !== 'all') {
      appts = appts.filter((a: any) => a.staff?.name === selectedSpecialist);
    }
    if (selectedStatus !== 'all') {
      appts = appts.filter((a: any) => mapStatus(a.status) === selectedStatus);
    }
    if (dateFrom) {
      appts = appts.filter((a: any) => a.date >= dateFrom);
    }
    if (dateTo) {
      appts = appts.filter((a: any) => a.date <= dateTo);
    }
    if (search) {
      const q = search.toLowerCase();
      appts = appts.filter((a: any) =>
        a.client?.name?.toLowerCase().includes(q)
        || a.client?.phone?.toLowerCase().includes(q)
        || a.appointmentServices?.some((s: any) => s.service.name.toLowerCase().includes(q))
        || a.staff?.name?.toLowerCase().includes(q)
      );
    }
    return appts;
  }, [activeTab, selectedSpecialist, selectedStatus, search, dateFrom, dateTo, appointments, today]);
  const activeApt = filtered.find(a => a.id === activeAptId);
  const openDetails = (id: string) => {
    const apt = filtered.find(a => a.id === id);
    setActiveAptId(id);
    setDetailsOpen(true);
    setEditMode(false);
    if (apt) {
      setEditDate(apt.date);
      setEditTime(apt.time);
      setEditStatus(mapStatus(apt.status) as Appointment['status']);
      setEditStaffId(apt.staff?.id || 'any');
      setEditNotes(apt.notes || '');
      setEditServiceIds(apt.appointmentServices?.map((s: any) => s.service.id) || []);
      setEditServiceSearch('');
      setEditClientName(apt.client?.name || '');
      setEditClientPhone(apt.client?.phone || '');
      setEditClientEmail(apt.client?.email || '');
    }
  };

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (!editId || handledEditRef.current) return;
    const apt = appointments.find((a: any) => a.id === editId);
    if (!apt) return;
    handledEditRef.current = true;
    openDetails(editId);
    setEditMode(true);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('edit');
      return next;
    }, { replace: true });
  }, [appointments, openDetails, searchParams, setSearchParams]);

  const editServiceBase = useMemo(() => {
    return services.filter((s: any) => s.active !== false || editServiceIds.includes(s.id));
  }, [services, editServiceIds]);
  const editFilteredServices = useMemo(() => {
    if (!editServiceSearch) return editServiceBase;
    const q = editServiceSearch.toLowerCase();
    return editServiceBase.filter((s: any) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
  }, [editServiceSearch, editServiceBase]);
  const editServices = useMemo(
    () => services.filter((s: any) => editServiceIds.includes(s.id)),
    [editServiceIds, services],
  );
  const editDuration = editServices.reduce((sum, s) => sum + s.duration, 0);
  const editTimeOptions = useMemo(() => {
    if (!editDate) return [];
    const window = getEffectiveWindow(editDate, editStaffId);
    if (!window) return [];
    const startWindow = toMinutes(window.start);
    const endWindow = toMinutes(window.end);
    const options: string[] = [];
    for (let m = startWindow; m <= endWindow; m += 30) {
      const h = Math.floor(m / 60);
      const mm = m % 60;
      options.push(`${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
    }
    const dur = editDuration || activeApt?.duration || 30;
    const breakWindows = breakWindowsForDate(editDate);
    const filtered = options.filter((t) => {
      const appointmentStart = toMinutes(t);
      const start = appointmentStart - bufferMinutes.before;
      const end = appointmentStart + dur + bufferMinutes.after;
      if (start < startWindow || end > endWindow) return false;
      const breakOverlap = breakWindows.some(w => start < w.end && end > w.start);
      if (breakOverlap) return false;
      if (editStaffId === 'any') return true;
      const conflict = appointments.some((a: any) => {
        if (a.id === activeAptId) return false;
        if (a.staff?.id !== editStaffId) return false;
        if (a.date !== editDate) return false;
        const s = toMinutes(a.time) - bufferMinutes.before;
        const e = s + a.duration + bufferMinutes.before + bufferMinutes.after;
        return start < e && end > s && !['cancelled', 'no-show'].includes(mapStatus(a.status));
      });
      return !conflict;
    });
    if (editTime && !filtered.includes(editTime)) {
      return [editTime, ...filtered];
    }
    return filtered;
  }, [editDate, editStaffId, editDuration, activeApt, appointments, activeAptId, salonBreaks, bufferMinutes, salonHours, salonExceptions, staffSchedules, editTime]);
  const editConflict = useMemo(() => {
    if (!activeAptId || !editDate || !editTime) return false;
    const dur = editDuration || activeApt?.duration || 0;
    const appointmentStart = toMinutes(editTime);
    const start = appointmentStart - bufferMinutes.before;
    const end = appointmentStart + dur + bufferMinutes.after;
    const breakOverlap = breakWindowsForDate(editDate).some(w => start < w.end && end > w.start);
    if (breakOverlap) return true;
    const window = getEffectiveWindow(editDate, editStaffId);
    if (!window) return true;
    const startWindow = toMinutes(window.start);
    const endWindow = toMinutes(window.end);
    if (start < startWindow || end > endWindow) return true;
    if (editStaffId === 'any') return false;
    return appointments.some((a: any) => {
      if (a.id === activeAptId) return false;
      if (a.staff?.id !== editStaffId) return false;
      if (a.date !== editDate) return false;
      const s = toMinutes(a.time) - bufferMinutes.before;
      const e = s + a.duration + bufferMinutes.before + bufferMinutes.after;
      return start < e && end > s && !['cancelled', 'no-show'].includes(mapStatus(a.status));
    });
  }, [activeAptId, editStaffId, editDate, editTime, editDuration, activeApt, appointments, salonBreaks, bufferMinutes, salonHours, salonExceptions, staffSchedules]);

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
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj wizyty..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 rounded-xl text-sm"
            />
          </div>
          <div className="hidden lg:flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="h-9 rounded-xl text-sm w-36"
            />
            <span className="text-xs text-muted-foreground">—</span>
            <Input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="h-9 rounded-xl text-sm w-36"
            />
          </div>
          <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as typeof selectedStatus)}>
            <SelectTrigger className="h-9 rounded-xl text-sm w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">Wszystkie statusy</SelectItem>
              {Object.entries(statusLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedSpecialist} onValueChange={setSelectedSpecialist}>
            <SelectTrigger className="h-9 rounded-xl text-sm w-full sm:w-56">
              <SelectValue placeholder="Wszyscy specjaliści" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">Wszyscy specjaliści</SelectItem>
              {staff.map((sp: any) => (
                <SelectItem key={sp.id} value={sp.name}>{sp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AnimatePresence>
            {(selectedSpecialist !== 'all' || selectedStatus !== 'all' || search || dateFrom || dateTo) && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSelectedSpecialist('all'); setSelectedStatus('all'); setSearch(''); setDateFrom(''); setDateTo(''); }}
                  className="rounded-xl h-9 text-xs text-muted-foreground shrink-0"
                >
                  Wyczyść
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-4">
        <Button
          variant={selectedStatus === 'all' ? 'secondary' : 'outline'}
          size="sm"
          className="rounded-xl h-8 text-xs"
          onClick={() => setSelectedStatus('all')}
        >
          Wszystkie
        </Button>
        {(Object.keys(statusLabels) as Array<Appointment['status']>).map(status => (
          <Button
            key={status}
            variant={selectedStatus === status ? 'secondary' : 'outline'}
            size="sm"
            className={`rounded-xl h-8 text-xs ${selectedStatus === status ? '' : 'text-muted-foreground'}`}
            onClick={() => setSelectedStatus(status)}
          >
            {statusLabels[status]}
          </Button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground">
          Ładowanie wizyt...
        </div>
      ) : filtered.length === 0 ? (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted-foreground text-center py-12">
          Brak wizyt dla wybranych filtrów
        </motion.p>
      ) : (
        <MotionList className="space-y-3" key={activeTab + selectedSpecialist}>
          {/* Desktop table header */}
          <div className="hidden lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_120px_160px_120px] gap-3 px-5 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Klient</span>
            <span>Usługa / Specjalista</span>
            <span>Godzina</span>
            <span>Status</span>
            <span>Akcje</span>
          </div>

          {filtered.map((apt: any) => {
          const statusKey = mapStatus(apt.status);
          const currentStatus = statusOverrides[apt.id] ?? statusKey;
          return (
          <MotionItem key={apt.id}>
            <HoverCard className="bg-card rounded-2xl p-4 border border-border lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_120px_160px_120px] lg:items-center lg:gap-3 lg:px-5 lg:py-3 lg:rounded-xl">
              <div className="mb-2 lg:mb-0 min-w-0">
                <p className="font-medium text-sm truncate">{apt.client?.name}</p>
                <p className="text-xs text-muted-foreground lg:hidden">{apt.appointmentServices?.map((s: any) => s.service.name).join(', ')}</p>
              </div>
              <div className="hidden lg:block min-w-0">
                <p className="text-sm truncate">{apt.appointmentServices?.map((s: any) => s.service.name).join(', ')}</p>
                <p className="text-xs text-muted-foreground truncate">{apt.staff?.name || 'Dowolny'}</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 lg:mb-0">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{apt.time} ({apt.duration} min)</span>
                <span className="flex items-center gap-1 lg:hidden"><User className="w-3.5 h-3.5" />{apt.staff?.name || 'Dowolny'}</span>
              </div>
              <div className="hidden lg:block min-w-0">
                <Select
                  value={currentStatus}
                  onValueChange={(value) => applyStatusUpdate(apt.id, value as Appointment['status'])}
                >
                  <SelectTrigger className="h-8 rounded-xl text-xs w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-1 lg:justify-end lg:flex-nowrap min-w-0">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-xl h-8 w-8"
                    onClick={() => toast('Połączenie z klientem (placeholder)')}
                  >
                    <Phone className="w-3.5 h-3.5" /><span className="lg:hidden">Zadzwoń</span>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-xl h-8 w-8"
                    onClick={() => {
                      setSmsPhone(apt.client?.phone || '');
                      setSmsMessage(`Cześć ${apt.client?.name || ''}!`);
                      setSmsOpen(true);
                    }}
                  >
                    <MessageSquare className="w-3.5 h-3.5" /><span className="lg:hidden">SMS</span>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="hidden lg:block">
                  <Button variant="outline" size="icon" className="rounded-xl h-8 w-8" onClick={() => openDetails(apt.id)}>
                    <Info className="w-3.5 h-3.5" />
                  </Button>
                </motion.div>
              </div>
              <div className="lg:hidden mt-3">
                <Select
                  value={currentStatus}
                  onValueChange={(value) => applyStatusUpdate(apt.id, value as Appointment['status'])}
                >
                  <SelectTrigger className="h-9 rounded-xl text-xs w-full">
                    <SelectValue placeholder="Zmień status" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs w-full mt-2" onClick={() => openDetails(apt.id)}>
                  Szczegóły wizyty
                </Button>
              </div>
            </HoverCard>
          </MotionItem>
        );
          })}
        </MotionList>
      )}

      <Dialog open={detailsOpen} onOpenChange={(open) => { setDetailsOpen(open); if (!open) setEditMode(false); }}>
        <DialogContent className="rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Szczegóły wizyty</DialogTitle>
            <DialogDescription>Podgląd wizyty (placeholder)</DialogDescription>
          </DialogHeader>
          {activeApt ? (
            editMode ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Data</label>
                  <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="h-10 rounded-xl" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Godzina</label>
                  {editStaffId === 'any' ? (
                    <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} className="h-10 rounded-xl" />
                  ) : (
                    <Select value={editTime} onValueChange={setEditTime}>
                      <SelectTrigger className="h-10 rounded-xl text-sm">
                        <SelectValue placeholder="Wybierz godzinę" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {editTimeOptions.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                        {editTimeOptions.length === 0 && (
                          <SelectItem value="-" disabled>Brak dostępnych godzin</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Status</label>
                  <Select value={editStatus} onValueChange={(val) => setEditStatus(val as Appointment['status'])}>
                    <SelectTrigger className="h-10 rounded-xl text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {Object.entries(statusLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Specjalista</label>
                  <Select value={editStaffId} onValueChange={setEditStaffId}>
                    <SelectTrigger className="h-10 rounded-xl text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="any">Dowolny</SelectItem>
                      {staff.filter((sp: any) => sp.active !== false).map((sp: any) => (
                        <SelectItem key={sp.id} value={sp.id}>{sp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Usługi</label>
                  <Input
                    placeholder="Szukaj usługi..."
                    value={editServiceSearch}
                    onChange={e => setEditServiceSearch(e.target.value)}
                    className="h-10 rounded-xl mb-2"
                  />
                  <div className="max-h-36 overflow-auto rounded-xl border border-border bg-card">
                    {editFilteredServices.map(service => {
                      const checked = editServiceIds.includes(service.id);
                      return (
                        <label key={service.id} className="flex items-start gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => {
                              setEditServiceIds(prev =>
                                value ? [...prev, service.id] : prev.filter(id => id !== service.id),
                              );
                            }}
                          />
                          <div className="flex-1">
                            <p className="font-medium">{service.name}</p>
                            <p className="text-xs text-muted-foreground">{service.duration} min • {service.price} zł</p>
                          </div>
                        </label>
                      );
                    })}
                    {editFilteredServices.length === 0 && (
                      <p className="text-xs text-muted-foreground px-3 py-4 text-center">Brak wyników</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Czas: {editDuration || activeApt?.duration} min</p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Klient</label>
                  <div className="grid grid-cols-1 gap-2">
                    <Input value={editClientName} onChange={(e) => setEditClientName(e.target.value)} placeholder="Imię i nazwisko" className="h-10 rounded-xl" />
                    <Input value={editClientPhone} onChange={(e) => setEditClientPhone(e.target.value)} placeholder="+48 500 000 000" className="h-10 rounded-xl" />
                    <Input value={editClientEmail} onChange={(e) => setEditClientEmail(e.target.value)} placeholder="email@domain.pl" className="h-10 rounded-xl" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Notatka</label>
                  <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="h-10 rounded-xl" />
                </div>
                {editConflict && (
                  <p className="text-xs text-destructive">Wybrany specjalista ma już wizytę w tym czasie.</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  ['Klient', activeApt.client?.name],
                  ['Usługa', activeApt.appointmentServices?.map((s: any) => s.service.name).join(', ')],
                  ['Specjalista', activeApt.staff?.name || 'Dowolny'],
                  ['Data', activeApt.date],
                  ['Godzina', activeApt.time],
                  ['Status', statusLabels[mapStatus(activeApt.status) as keyof typeof statusLabels]],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="text-sm font-medium">{value}</span>
                  </div>
                ))}
              </div>
            )
          ) : (
            <p className="text-sm text-muted-foreground">Brak danych wizyty</p>
          )}
          <DialogFooter className="pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDetailsOpen(false)}>Zamknij</Button>
            {editMode ? (
              <Button
                className="rounded-xl"
                disabled={editConflict}
                onClick={async () => {
                  if (!activeAptId) return;
                  try {
                    if (!editDate || !editTime || editServiceIds.length === 0) {
                      toast.error('Uzupełnij datę, godzinę i usługi');
                      return;
                    }
                    if (!editClientName || !editClientPhone) {
                      toast.error('Uzupełnij imię i telefon klienta');
                      return;
                    }
                    if (activeApt?.client?.id) {
                      await updateClient(activeApt.client.id, {
                        name: editClientName,
                        phone: editClientPhone,
                        email: editClientEmail || undefined,
                        notes: activeApt.client?.notes || undefined,
                      });
                    }
                    await updateAppointment(activeAptId, {
                      date: editDate,
                      time: editTime,
                      status: editStatus.toUpperCase().replace(/-/g, '_'),
                      staffId: editStaffId === 'any' ? null : editStaffId,
                      notes: editNotes || undefined,
                      serviceIds: editServiceIds,
                      duration: editDuration || activeApt?.duration,
                    });
                    const res = await getSalonAppointments();
                    setAppointments(res.appointments || []);
                    setEditMode(false);
                    toast.success('Wizyta zaktualizowana');
                  } catch (err: any) {
                    const msg = err.message?.includes('not available')
                      ? 'Specjalista jest zajęty w tym czasie'
                      : (err.message || 'Błąd zapisu');
                    toast.error(msg);
                  }
                }}
              >
                Zapisz
              </Button>
            ) : (
              <Button className="rounded-xl" onClick={() => setEditMode(true)}>Edytuj wizytę</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={smsOpen} onOpenChange={setSmsOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Wyślij SMS do klienta</DialogTitle>
            <DialogDescription>Wpisz treść wiadomości i wyślij ją bezpośrednio z panelu.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Numer telefonu</label>
              <Input value={smsPhone} onChange={(e) => setSmsPhone(e.target.value)} className="h-11 rounded-xl" placeholder="+48 500 000 000" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Treść SMS</label>
              <Textarea value={smsMessage} onChange={(e) => setSmsMessage(e.target.value)} className="rounded-xl min-h-[100px]" />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setSmsOpen(false)}>Anuluj</Button>
            <Button
              className="rounded-xl"
              disabled={smsSending || !smsPhone.trim() || !smsMessage.trim()}
              onClick={async () => {
                try {
                  setSmsSending(true);
                  await sendManualSms({ to: smsPhone.trim(), message: smsMessage.trim() });
                  toast.success('SMS wysłany');
                  setSmsOpen(false);
                } catch (err: any) {
                  toast.error(err.message || 'Nie udało się wysłać SMS');
                } finally {
                  setSmsSending(false);
                }
              }}
            >
              {smsSending ? 'Wysyłanie...' : 'Wyślij SMS'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
