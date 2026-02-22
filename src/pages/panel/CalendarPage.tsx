import { useEffect, useState, useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight, Clock, User, List, LayoutGrid, Filter, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { statusLabels, statusColors, type Appointment } from '@/data/mockData';
import { PageTransition, MotionList, MotionItem, HoverCard } from '@/components/motion';
import { motion, AnimatePresence } from 'framer-motion';
import { createAppointment, createClient, createSalonException, createStaffException, getSalonAppointments, getSalonBreaks, getSalonClients, getSalonExceptions, getSalonHours, getSalonServices, getSalonStaff, getStaffSchedule, updateAppointment, updateClient } from '@/lib/api';
import { toast } from 'sonner';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [view, setView] = useState<'day-list' | 'day-timeline' | 'week' | 'month'>('day-list');
  const [selectedSpecialist, setSelectedSpecialist] = useState<string>('all');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeAptId, setActiveAptId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '' });
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [selectedSpecialistId, setSelectedSpecialistId] = useState<string>('any');
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState(selectedDate);
  const [appointmentTime, setAppointmentTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [salonHours, setSalonHours] = useState<any[]>([]);
  const [salonExceptions, setSalonExceptions] = useState<any[]>([]);
  const [salonBreaks, setSalonBreaks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffSchedules, setStaffSchedules] = useState<Record<string, { availability: any[]; exceptions: any[] }>>({});
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockDate, setBlockDate] = useState('');
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockStaffId, setBlockStaffId] = useState<'salon' | string>('salon');
  const [blockReason, setBlockReason] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editStatus, setEditStatus] = useState<Appointment['status']>('scheduled');
  const [editStaffId, setEditStaffId] = useState('any');
  const [editServiceIds, setEditServiceIds] = useState<string[]>([]);
  const [editNotes, setEditNotes] = useState('');
  const [editServiceSearch, setEditServiceSearch] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editClientEmail, setEditClientEmail] = useState('');

  const dayNames = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
  const dayNamesFull = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = (d.getDay() + 6) % 7; // Monday=0
    d.setDate(d.getDate() - day);
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

  const loadData = () => Promise.all([
    getSalonServices(),
    getSalonStaff(),
    getSalonClients(),
    getSalonAppointments(),
    getSalonHours(),
    getSalonExceptions(),
    getSalonBreaks(),
  ]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    loadData()
      .then(([servicesRes, staffRes, clientsRes, apptsRes, hoursRes, exceptionsRes, breaksRes]) => {
        if (!mounted) return;
        setServices(servicesRes.services || []);
        setStaff(staffRes.staff || []);
        setClients(clientsRes.clients || []);
        setAppointments(apptsRes.appointments || []);
        setSalonHours(hoursRes.hours || []);
        setSalonExceptions(exceptionsRes.exceptions || []);
        setSalonBreaks(breaksRes.breaks || []);
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const dayAppointments = useMemo(() => {
    let appts = appointments.filter((a: any) => a.date === selectedDate);
    if (selectedSpecialist !== 'all') {
      appts = appts.filter((a: any) => a.staff?.name === selectedSpecialist);
    }
    return appts;
  }, [appointments, selectedDate, selectedSpecialist]);
  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter((c: any) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [clientSearch, clients]);
  const specialistServiceIds = useMemo(() => {
    if (selectedSpecialistId === 'any') return null;
    const sp = staff.find((s: any) => s.id === selectedSpecialistId);
    return sp?.services?.map((s: any) => s.id) ?? [];
  }, [selectedSpecialistId, staff]);
  const filteredServices = useMemo(() => {
    const activeServices = services.filter((s: any) => s.active !== false);
    const base = specialistServiceIds ? activeServices.filter((s: any) => specialistServiceIds.includes(s.id)) : activeServices;
    if (!serviceSearch) return base;
    const q = serviceSearch.toLowerCase();
    return base.filter(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
  }, [serviceSearch, specialistServiceIds, services]);
  const selectedServices = useMemo(
    () => services.filter((s: any) => s.active !== false && selectedServiceIds.includes(s.id)),
    [selectedServiceIds, services],
  );
  useEffect(() => {
    if (!specialistServiceIds) return;
    setSelectedServiceIds(prev => prev.filter(id => specialistServiceIds.includes(id)));
  }, [specialistServiceIds]);
  useEffect(() => {
    const loadSchedule = async (staffId: string) => {
      if (!staffId || staffId === 'any' || staffSchedules[staffId]) return;
      const res = await getStaffSchedule(staffId);
      setStaffSchedules(prev => ({ ...prev, [staffId]: { availability: res.availability || [], exceptions: res.exceptions || [] } }));
    };
    loadSchedule(selectedSpecialistId);
    loadSchedule(editStaffId);
  }, [selectedSpecialistId, editStaffId, staffSchedules]);
  const filteredSpecialists = useMemo(() => {
    const activeStaff = staff.filter((sp: any) => sp.active !== false);
    if (selectedServiceIds.length === 0) return activeStaff;
    return activeStaff.filter((sp: any) => selectedServiceIds.every(id => sp.services?.some((s: any) => s.id === id)));
  }, [selectedServiceIds, staff]);
  const selectedSpecialistDetails = useMemo(
    () => staff.find((sp: any) => sp.id === selectedSpecialistId),
    [selectedSpecialistId, staff],
  );
  const estimatedDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
  const estimatedCost = selectedServices.reduce((sum, s) => sum + s.price, 0);
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
  const mapStatus = (status?: string) => (status || 'SCHEDULED').toLowerCase().replace(/_/g, '-');
  const addTimeOptions = useMemo(() => {
    if (!appointmentDate || selectedSpecialistId === 'any') return [];
    const window = getEffectiveWindow(appointmentDate, selectedSpecialistId);
    if (!window) return [];
    const startWindow = toMinutes(window.start);
    const endWindow = toMinutes(window.end);
    const options: string[] = [];
    for (let m = startWindow; m <= endWindow; m += 30) {
      const h = Math.floor(m / 60);
      const mm = m % 60;
      options.push(`${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
    }
    const dur = estimatedDuration || 30;
    const breakWindows = breakWindowsForDate(appointmentDate);
    return options.filter((t) => {
      const appointmentStart = toMinutes(t);
      const start = appointmentStart - bufferMinutes.before;
      const end = appointmentStart + dur + bufferMinutes.after;
      const breakOverlap = breakWindows.some(w => start < w.end && end > w.start);
      if (breakOverlap) return false;
      const conflict = appointments.some((a: any) => {
        if (a.staff?.id !== selectedSpecialistId) return false;
        if (a.date !== appointmentDate) return false;
        const s = toMinutes(a.time) - bufferMinutes.before;
        const e = s + a.duration + bufferMinutes.before + bufferMinutes.after;
        return start < e && end > s && !['cancelled', 'no-show'].includes(mapStatus(a.status));
      });
      return !conflict;
    });
  }, [appointmentDate, selectedSpecialistId, estimatedDuration, appointments, salonHours, salonExceptions, staffSchedules, salonBreaks, bufferMinutes]);
  const addTimeAvailable = useMemo(() => {
    if (!appointmentDate || !appointmentTime) return true;
    const window = getEffectiveWindow(appointmentDate, selectedSpecialistId);
    if (!window) return false;
    const t = toMinutes(appointmentTime);
    const startM = toMinutes(window.start);
    const endM = toMinutes(window.end);
    const dur = estimatedDuration || 30;
    const start = t - bufferMinutes.before;
    const end = t + dur + bufferMinutes.after;
    const breakOverlap = breakWindowsForDate(appointmentDate).some(w => start < w.end && end > w.start);
    if (breakOverlap) return false;
    if (selectedSpecialistId === 'any') {
      return t >= startM && t <= endM;
    }
    return addTimeOptions.includes(appointmentTime);
  }, [appointmentDate, appointmentTime, selectedSpecialistId, addTimeOptions, salonHours, salonExceptions, staffSchedules, salonBreaks, estimatedDuration, bufferMinutes]);
  useEffect(() => {
    if (selectedSpecialistId === 'any') return;
    if (appointmentTime && !addTimeOptions.includes(appointmentTime)) {
      setAppointmentTime('');
    }
  }, [selectedSpecialistId, addTimeOptions, appointmentTime]);
  const canSaveAppointment = !!appointmentDate && !!appointmentTime && selectedServiceIds.length > 0 && (
    clientMode === 'existing'
      ? Boolean(selectedClientId)
      : Boolean(newClient.name.trim() && newClient.phone.trim())
  ) && addTimeAvailable;
  const resetAppointmentForm = () => {
    setClientMode('existing');
    setClientSearch('');
    setSelectedClientId(null);
    setNewClient({ name: '', phone: '', email: '' });
    setServiceSearch('');
    setSelectedServiceIds([]);
    setAppointmentNotes('');
    setSelectedSpecialistId('any');
    setAppointmentTime('');
    setAppointmentDate(selectedDate);
  };
  const resetBlockForm = () => {
    setBlockDate(selectedDate || new Date().toISOString().split('T')[0]);
    setBlockStart('');
    setBlockEnd('');
    setBlockStaffId('salon');
    setBlockReason('');
  };
  const activeApt = appointments.find(a => a.id === activeAptId);
  const openDetails = (id: string) => {
    const apt = appointments.find(a => a.id === id);
    setActiveAptId(id);
    setDetailsOpen(true);
    setEditMode(false);
    if (apt) {
      setEditDate(apt.date);
      setEditTime(apt.time);
      setEditStatus(mapStatus(apt.status) as Appointment['status']);
      setEditStaffId(apt.staff?.id || 'any');
      setEditServiceIds(apt.appointmentServices?.map((s: any) => s.service.id) || []);
      setEditNotes(apt.notes || '');
      setEditServiceSearch('');
      setEditClientName(apt.client?.name || '');
      setEditClientPhone(apt.client?.phone || '');
      setEditClientEmail(apt.client?.email || '');
    }
  };
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
  const editConflict = useMemo(() => {
    if (!activeAptId || editStaffId === 'any' || !editDate || !editTime) return false;
    const dur = editDuration || activeApt?.duration || 0;
    const appointmentStart = toMinutes(editTime);
    const start = appointmentStart - bufferMinutes.before;
    const end = appointmentStart + dur + bufferMinutes.after;
    const breakOverlap = breakWindowsForDate(editDate).some(w => start < w.end && end > w.start);
    if (breakOverlap) return true;
    return appointments.some((a: any) => {
      if (a.id === activeAptId) return false;
      if (a.staff?.id !== editStaffId) return false;
      if (a.date !== editDate) return false;
      const s = toMinutes(a.time) - bufferMinutes.before;
      const e = s + a.duration + bufferMinutes.before + bufferMinutes.after;
      return start < e && end > s && !['cancelled', 'no-show'].includes(mapStatus(a.status));
    });
  }, [activeAptId, editStaffId, editDate, editTime, editDuration, activeApt, appointments, salonBreaks, bufferMinutes]);
  const editTimeOptions = useMemo(() => {
    if (!editDate) return [];
    const window = getEffectiveWindow(editDate, editStaffId);
    if (!window) return editTime ? [editTime] : [];
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
      if (editStaffId === 'any') return true;
      const appointmentStart = toMinutes(t);
      const start = appointmentStart - bufferMinutes.before;
      const end = appointmentStart + dur + bufferMinutes.after;
      const breakOverlap = breakWindows.some(w => start < w.end && end > w.start);
      if (breakOverlap) return false;
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
  }, [editDate, editStaffId, editDuration, activeApt, appointments, activeAptId, salonHours, salonExceptions, staffSchedules, editTime, salonBreaks, bufferMinutes]);

  const shiftWeek = (dir: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d.toISOString().split('T')[0]);
  };
  const shiftMonth = (dir: number) => {
    const d = new Date(monthCursor);
    d.setMonth(d.getMonth() + dir);
    d.setDate(1);
    setMonthCursor(d.toISOString().split('T')[0]);
  };

  const getMonthLabel = () => {
    const d = new Date(weekDays[3] || weekStart);
    const months = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  };
  const getMonthCursorLabel = () => {
    const d = new Date(monthCursor);
    const months = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  };
  const openAddForDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setAppointmentDate(dateStr);
    setAppointmentTime('');
    setAddOpen(true);
  };
  const handleSaveAppointment = async () => {
    if (!canSaveAppointment || saving) return;
    try {
      setSaving(true);
      let clientId = selectedClientId;
      if (clientMode === 'new') {
        const created = await createClient({
          name: newClient.name.trim(),
          phone: newClient.phone.trim(),
          email: newClient.email?.trim() || undefined,
          notes: undefined,
        });
        clientId = created.client.id;
      }
      if (!clientId) throw new Error('Brak klienta');
      await createAppointment({
        date: appointmentDate,
        time: appointmentTime,
        duration: estimatedDuration || 30,
        notes: appointmentNotes || undefined,
        clientId,
        staffId: selectedSpecialistId !== 'any' ? selectedSpecialistId : undefined,
        serviceIds: selectedServiceIds,
      });
      toast.success('Wizyta dodana');
      resetAppointmentForm();
      setAddOpen(false);
      const [servicesRes, staffRes, clientsRes, apptsRes, hoursRes, exceptionsRes, breaksRes] = await loadData();
      setServices(servicesRes.services || []);
      setStaff(staffRes.staff || []);
      setClients(clientsRes.clients || []);
      setAppointments(apptsRes.appointments || []);
      setSalonHours(hoursRes.hours || []);
      setSalonExceptions(exceptionsRes.exceptions || []);
      setSalonBreaks(breaksRes.breaks || []);
    } catch (err: any) {
      toast.error(err.message || 'Nie udało się dodać wizyty');
    } finally {
      setSaving(false);
    }
  };
  const getAppointmentPosition = (apt: Appointment) => {
    const [h, m] = apt.time.split(':').map(Number);
    const top = ((h - 8) * 60 + m) * (64 / 60);
    const height = apt.duration * (64 / 60);
    return { top, height: Math.max(height, 24) };
  };

  const specialistAvailability = useMemo(() => {
    return staff.filter((sp: any) => sp.active !== false).map((sp: any) => {
      const dayAppts = appointments.filter((a: any) => a.date === selectedDate && a.staff?.name === sp.name);
      const minutes = dayAppts.reduce((sum, a) => sum + a.duration, 0);
      const capacity = 8 * 60;
      const pct = Math.min(Math.round((minutes / capacity) * 100), 100);
      return { ...sp, minutes, pct, available: minutes < capacity };
    });
  }, [selectedDate, appointments, staff]);
  const availabilityById = useMemo(() => {
    const map = new Map<string, { pct: number; available: boolean }>();
    specialistAvailability.forEach(sp => map.set(sp.id, { pct: sp.pct, available: sp.available }));
    return map;
  }, [specialistAvailability]);
  const visibleSpecialists = useMemo(() => {
    const base = filteredSpecialists;
    if (!showAvailableOnly) return base;
    return base.filter(sp => availabilityById.get(sp.id)?.available !== false);
  }, [filteredSpecialists, showAvailableOnly, availabilityById]);

  return (
    <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold lg:text-2xl">Kalendarz</h1>
        <div className="flex items-center gap-2">
          {loading && (
            <span className="text-xs text-muted-foreground hidden sm:inline">Ładowanie...</span>
          )}
          <div className="hidden sm:flex items-center bg-muted rounded-xl p-1">
            <button
              onClick={() => setView('day-list')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                view === 'day-list' || view === 'day-timeline' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
            >
              Dzień
            </button>
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
          <Dialog open={blockOpen} onOpenChange={(open) => { setBlockOpen(open); if (open) resetBlockForm(); }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-10 hidden sm:inline-flex">
                <Ban className="w-4 h-4" />
                Zablokuj czas
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>Zablokuj czas</DialogTitle>
                <DialogDescription>Zablokuj termin w kalendarzu salonu</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Data</label>
                    <Input type="date" value={blockDate} onChange={e => setBlockDate(e.target.value)} className="h-11 rounded-xl" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Specjalista</label>
                    <Select value={blockStaffId} onValueChange={(val) => setBlockStaffId(val)}>
                      <SelectTrigger className="h-11 rounded-xl text-sm">
                        <SelectValue placeholder="Cały salon" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        <SelectItem value="salon">Cały salon</SelectItem>
                        {staff.filter((sp: any) => sp.active !== false).map((sp: any) => (
                          <SelectItem key={sp.id} value={sp.id}>{sp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Od</label>
                    <Input type="time" value={blockStart} onChange={(e) => setBlockStart(e.target.value)} className="h-11 rounded-xl" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Do</label>
                    <Input type="time" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} className="h-11 rounded-xl" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Powód</label>
                  <Textarea value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Np. przerwa techniczna" className="rounded-xl min-h-[90px]" />
                </div>
              </div>
              <DialogFooter className="pt-2">
                <Button variant="outline" className="rounded-xl" onClick={() => setBlockOpen(false)}>Anuluj</Button>
                <Button
                  className="rounded-xl"
                  onClick={async () => {
                    if (!blockDate || !blockStart || !blockEnd) {
                      toast.error('Uzupełnij datę i godziny');
                      return;
                    }
                    if (toMinutes(blockEnd) <= toMinutes(blockStart)) {
                      toast.error('Godzina zakończenia musi być później');
                      return;
                    }
                    try {
                      if (blockStaffId === 'salon') {
                        const res = await createSalonException({
                          date: blockDate,
                          label: blockReason || 'Blokada',
                          start: blockStart,
                          end: blockEnd,
                          closed: false,
                        });
                        setSalonExceptions(prev => [...prev, res.exception]);
                      } else {
                        await createStaffException(blockStaffId, {
                          date: blockDate,
                          start: blockStart,
                          end: blockEnd,
                          label: blockReason || 'Blokada',
                        });
                        const schedule = await getStaffSchedule(blockStaffId);
                        setStaffSchedules(prev => ({ ...prev, [blockStaffId]: { availability: schedule.availability || [], exceptions: schedule.exceptions || [] } }));
                      }
                      toast.success('Czas zablokowany');
                      setBlockOpen(false);
                    } catch (err: any) {
                      toast.error(err.message || 'Nie udało się zablokować czasu');
                    }
                  }}
                >
                  Zablokuj
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetAppointmentForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl gap-1.5 h-10" onClick={() => setAddOpen(true)}>
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Dodaj wizytę</span>
                <span className="sm:hidden">Dodaj</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Dodaj wizytę</DialogTitle>
                <DialogDescription>Uzupełnij dane wizyty i potwierdź dodanie</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={clientMode === 'existing' ? 'secondary' : 'outline'}
                      size="sm"
                      className="rounded-xl h-8 text-xs"
                      onClick={() => setClientMode('existing')}
                    >
                      Z bazy klientów
                    </Button>
                    <Button
                      type="button"
                      variant={clientMode === 'new' ? 'secondary' : 'outline'}
                      size="sm"
                      className="rounded-xl h-8 text-xs"
                      onClick={() => setClientMode('new')}
                    >
                      Nowy klient
                    </Button>
                  </div>
                  {clientMode === 'existing' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium mb-1.5 block">Wybierz klienta</label>
                      <Input
                        placeholder="Szukaj klienta po imieniu lub telefonie..."
                        value={clientSearch}
                        onChange={e => setClientSearch(e.target.value)}
                        className="h-10 rounded-xl"
                      />
                      <div className="max-h-28 overflow-auto rounded-xl border border-border bg-card">
                        {filteredClients.map(client => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => setSelectedClientId(client.id)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${
                              selectedClientId === client.id ? 'bg-primary/5 text-primary' : ''
                            }`}
                          >
                            <span className="font-medium">{client.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">{client.phone}</span>
                          </button>
                        ))}
                        {filteredClients.length === 0 && (
                          <p className="text-xs text-muted-foreground px-3 py-4 text-center">Brak wyników</p>
                        )}
                      </div>
                      {!selectedClientId && (
                        <p className="text-xs text-destructive">Wymagane: wybierz klienta</p>
                      )}
                    </div>
                  )}
                  {clientMode === 'new' && (
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Imię i nazwisko</label>
                        <Input
                          placeholder="Np. Joanna Majewska"
                          value={newClient.name}
                          onChange={e => setNewClient(d => ({ ...d, name: e.target.value }))}
                          className="h-10 rounded-xl"
                        />
                        {!newClient.name.trim() && (
                          <p className="text-xs text-destructive mt-1">Wymagane</p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">Telefon</label>
                          <Input
                            placeholder="+48 500 000 000"
                            value={newClient.phone}
                            onChange={e => setNewClient(d => ({ ...d, phone: e.target.value }))}
                            className="h-10 rounded-xl"
                          />
                          {!newClient.phone.trim() && (
                            <p className="text-xs text-destructive mt-1">Wymagane</p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">Email</label>
                          <Input
                            placeholder="anna@example.com"
                            value={newClient.email}
                            onChange={e => setNewClient(d => ({ ...d, email: e.target.value }))}
                            className="h-10 rounded-xl"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Data</label>
                    <Input type="date" value={appointmentDate} onChange={e => setAppointmentDate(e.target.value)} className="h-11 rounded-xl" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Godzina</label>
                    {selectedSpecialistId === 'any' ? (
                      <Input type="time" value={appointmentTime} onChange={e => setAppointmentTime(e.target.value)} className="h-11 rounded-xl" />
                    ) : (
                      <Select value={appointmentTime} onValueChange={setAppointmentTime}>
                        <SelectTrigger className="h-11 rounded-xl text-sm">
                          <SelectValue placeholder="Wybierz godzinę" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {addTimeOptions.map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                          {addTimeOptions.length === 0 && (
                            <SelectItem value="-" disabled>Brak dostępnych godzin</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                    {!addTimeAvailable && (
                      <p className="text-xs text-destructive mt-1">Wybrana godzina jest niedostępna</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium mb-1.5 block">Usługi</label>
                  <Input
                    placeholder="Szukaj usługi..."
                    value={serviceSearch}
                    onChange={e => setServiceSearch(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                  <div className="max-h-32 overflow-auto rounded-xl border border-border bg-card">
                    {filteredServices.map(service => {
                      const checked = selectedServiceIds.includes(service.id);
                      return (
                        <label key={service.id} className="flex items-start gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => {
                              setSelectedServiceIds(prev =>
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
                    {filteredServices.length === 0 && (
                      <p className="text-xs text-muted-foreground px-3 py-4 text-center">Brak wyników</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Wybrane: {selectedServices.length}</span>
                    <span>Szacowany czas: {estimatedDuration || '—'} min</span>
                  </div>
                  {selectedServiceIds.length === 0 && (
                    <p className="text-xs text-destructive">Wymagane: wybierz co najmniej jedną usługę</p>
                  )}
                </div>
                {(selectedServiceIds.length > 0 || selectedSpecialistId !== 'any') && (
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Specjalista</label>
                    {selectedServiceIds.length === 0 && selectedSpecialistDetails && (
                      <div className="rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm mb-2">
                        <p className="font-medium">{selectedSpecialistDetails.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedSpecialistDetails.role}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Wybrany z kafelka. Wybierz usługi, aby dopasować dostępność.
                        </p>
                      </div>
                    )}
                    <Select value={selectedSpecialistId} onValueChange={setSelectedSpecialistId}>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Wybierz specjalistę" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        <SelectItem value="any">Dowolny specjalista</SelectItem>
                        {selectedSpecialistDetails && !visibleSpecialists.some(sp => sp.id === selectedSpecialistDetails.id) && (
                          <SelectItem value={selectedSpecialistDetails.id}>
                            {selectedSpecialistDetails.name} — {selectedSpecialistDetails.role}
                          </SelectItem>
                        )}
                        {visibleSpecialists.map(sp => {
                          const av = availabilityById.get(sp.id);
                          return (
                            <SelectItem key={sp.id} value={sp.id}>
                              {sp.name} — {sp.role} {av ? `• ${av.pct}%` : ''}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {visibleSpecialists.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">Brak specjalistów dla wybranych usług</p>
                    )}
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Notatka</label>
                  <Textarea
                    placeholder="Dodatkowe uwagi do wizyty"
                    value={appointmentNotes}
                    onChange={e => setAppointmentNotes(e.target.value)}
                    className="rounded-xl min-h-[90px]"
                  />
                </div>
                <div className="bg-secondary/40 rounded-xl border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Szacowany koszt</span>
                    <span className="font-semibold">{estimatedCost || '—'} zł</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                    <span>Szacowany czas</span>
                    <span>{estimatedDuration || '—'} min</span>
                  </div>
                </div>
              </div>
              <DialogFooter className="pt-2">
                <DialogClose asChild>
                  <Button variant="outline" className="rounded-xl">Anuluj</Button>
                </DialogClose>
                <Button
                  className="rounded-xl"
                  disabled={!canSaveAppointment || saving}
                  onClick={handleSaveAppointment}
                >
                  {saving ? 'Zapisywanie...' : 'Dodaj'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {(view === 'day-list' || view === 'day-timeline') && (
        <div className="hidden sm:flex items-center bg-muted rounded-xl p-1 mb-3 w-fit">
          <button
            onClick={() => setView('day-list')}
            className={`p-2 rounded-lg transition-colors ${view === 'day-list' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
            title="Widok listy"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('day-timeline')}
            className={`p-2 rounded-lg transition-colors ${view === 'day-timeline' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
            title="Widok osi czasu"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      )}

      {(view === 'day-list' || view === 'day-timeline') && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Dostępność zespołu</h3>
            <span className="text-xs text-muted-foreground">Dzień: {selectedDate}</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant={showAvailableOnly ? 'secondary' : 'outline'}
              size="sm"
              className="rounded-xl h-8 text-xs"
              onClick={() => setShowAvailableOnly(v => !v)}
            >
              {showAvailableOnly ? 'Tylko dostępni' : 'Pokaż wszystkich'}
            </Button>
            <span className="text-[11px] text-muted-foreground">Filtr działa też w wyborze specjalisty</span>
          </div>
          <div className="flex gap-2 overflow-auto pb-1">
            {(showAvailableOnly ? specialistAvailability.filter(sp => sp.available) : specialistAvailability).map(sp => (
              <button
                key={sp.id}
                type="button"
                onClick={() => { if (sp.id) { setSelectedSpecialistId(sp.id); setAddOpen(true); } }}
                className="min-w-[160px] rounded-xl border border-border bg-card px-3 py-2 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-[10px] font-semibold text-accent-foreground">
                    {(sp.name || '')
                      .split(' ')
                      .filter(Boolean)
                      .map((n: string) => n[0])
                      .join('') || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{sp.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{sp.role}</p>
                  </div>
                </div>
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${sp.pct}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Obłożenie: {sp.pct}% • {sp.available ? 'Dostępny' : 'Brak miejsc'}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Week/Month selector */}
      {(view === 'day-list' || view === 'day-timeline' || view === 'week') && (
        <div className="flex items-center justify-between mb-2">
          <motion.button whileHover={{ x: -2 }} whileTap={{ scale: 0.9 }} onClick={() => shiftWeek(-1)} className="touch-target flex items-center justify-center">
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
          <span className="text-sm font-medium">{getMonthLabel()}</span>
          <motion.button whileHover={{ x: 2 }} whileTap={{ scale: 0.9 }} onClick={() => shiftWeek(1)} className="touch-target flex items-center justify-center">
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </div>
      )}
      {view === 'month' && (
        <div className="flex items-center justify-between mb-2">
          <motion.button whileHover={{ x: -2 }} whileTap={{ scale: 0.9 }} onClick={() => shiftMonth(-1)} className="touch-target flex items-center justify-center">
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
          <span className="text-sm font-medium">{getMonthCursorLabel()}</span>
          <motion.button whileHover={{ x: 2 }} whileTap={{ scale: 0.9 }} onClick={() => shiftMonth(1)} className="touch-target flex items-center justify-center">
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </div>
      )}

      {/* Week days */}
      {(view === 'day-list' || view === 'day-timeline' || view === 'week') && (
        <div className="grid grid-cols-7 gap-1 mb-6">
          {weekDays.map(date => {
            const d = new Date(date);
            const isSelected = selectedDate === date;
            const dayAppts = appointments.filter((a: any) => a.date === date && (selectedSpecialist === 'all' || a.staff?.name === selectedSpecialist));
            return (
              <motion.button
                key={date}
                onClick={() => { setSelectedDate(date); if (view === 'week') openAddForDate(date); }}
                whileTap={{ scale: 0.93 }}
                className={`flex flex-col items-center py-2 rounded-xl transition-all ${
                  isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
                layout
              >
                <span className="text-[10px] uppercase lg:text-xs">{dayNames[d.getDay()]}</span>
                <span className="text-lg font-semibold lg:text-xl">{d.getDate()}</span>
                {dayAppts.length > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-primary-foreground/60' : 'bg-primary/40'}`}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Specialist filter */}
      {view !== 'month' && (
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <Select value={selectedSpecialist} onValueChange={setSelectedSpecialist}>
            <SelectTrigger className="h-9 rounded-xl text-sm w-full sm:w-56">
              <SelectValue placeholder="Wszyscy specjaliści" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">Wszyscy specjaliści</SelectItem>
              {staff.map((sp: any) => (
                <SelectItem key={sp.id} value={sp.name}>{sp.name} — {sp.role}</SelectItem>
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
      )}

      {(view === 'day-list' || view === 'day-timeline') && (
        <div className="hidden lg:flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold">
            {dayNamesFull[new Date(selectedDate).getDay()]}, {new Date(selectedDate).getDate()}.{String(new Date(selectedDate).getMonth() + 1).padStart(2, '0')}
          </h2>
          <Badge variant="secondary" className="text-xs">{dayAppointments.length} wizyt</Badge>
        </div>
      )}

      {/* Timeline view (desktop) */}
      {view === 'day-timeline' && (
        <motion.div
          className="hidden sm:block"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative border border-border rounded-2xl bg-card overflow-hidden">
            {HOURS.map(hour => (
              <div key={hour} className="flex items-start border-b border-border last:border-0" style={{ height: 64 }}>
                <div className="w-16 shrink-0 text-xs text-muted-foreground py-1 px-3 text-right border-r border-border">
                  {String(hour).padStart(2, '0')}:00
                </div>
                <div className="flex-1 relative" />
              </div>
            ))}
            <div className="absolute top-0 left-16 right-0 bottom-0">
              {dayAppointments.map((apt: any, i: number) => {
                const pos = getAppointmentPosition(apt as Appointment);
                const statusKey = mapStatus(apt.status);
                return (
                  <motion.div
                    key={apt.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    className={`absolute left-1 right-1 rounded-lg px-3 py-1.5 border cursor-pointer hover:opacity-90 transition-opacity overflow-hidden ${statusColors[statusKey as keyof typeof statusColors]} border-current/10`}
                    style={{ top: pos.top, height: pos.height }}
                    onClick={() => openDetails(apt.id)}
                  >
                    <p className="text-xs font-semibold truncate">{apt.time} — {apt.appointmentServices?.map((s: any) => s.service.name).join(', ')}</p>
                    <p className="text-[10px] truncate opacity-70">{apt.client?.name} • {apt.staff?.name || 'Dowolny'}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* List view */}
      {(view === 'day-list' || view === 'day-timeline') && (
        <div className={view === 'day-timeline' ? 'sm:hidden' : ''}>
          <MotionList className="space-y-3" key={selectedDate + selectedSpecialist}>
            {dayAppointments.length === 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-muted-foreground text-center py-12"
              >
                Brak wizyt w tym dniu
              </motion.p>
            )}
            {dayAppointments.map((apt: any) => {
              const statusKey = mapStatus(apt.status);
              return (
              <MotionItem key={apt.id}>
                <HoverCard className="bg-card rounded-2xl p-4 border border-border lg:flex lg:items-center lg:gap-6 lg:px-6">
                  <div className="flex items-start justify-between mb-2 lg:mb-0 lg:flex-col lg:items-start lg:gap-0.5 lg:w-24 lg:shrink-0">
                    <div className="flex items-center gap-2 lg:flex-col lg:items-start lg:gap-0">
                      <Clock className="w-4 h-4 text-muted-foreground lg:hidden" />
                      <span className="font-semibold text-sm lg:text-base">{apt.time}</span>
                      <span className="text-xs text-muted-foreground">({apt.duration} min)</span>
                    </div>
                    <Badge variant="secondary" className={`text-[10px] lg:mt-1 ${statusColors[statusKey as keyof typeof statusColors]}`}>
                      {statusLabels[statusKey as keyof typeof statusLabels]}
                    </Badge>
                  </div>
                  <div className="lg:flex-1">
                    <p className="font-medium lg:text-base">{apt.appointmentServices?.map((s: any) => s.service.name).join(', ')}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{apt.client?.name}</span>
                      <span>{apt.staff?.name || 'Dowolny'}</span>
                    </div>
                  </div>
                  <div className="hidden lg:flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs" onClick={() => openDetails(apt.id)}>
                      Szczegóły
                    </Button>
                  </div>
                </HoverCard>
              </MotionItem>
            );})}
          </MotionList>
        </div>
      )}

      {/* Desktop: week overview */}
      {view === 'week' && (
      <MotionList className="hidden lg:grid lg:grid-cols-7 gap-2 mt-8">
        <h3 className="col-span-7 text-base font-semibold mb-1">Przegląd tygodnia</h3>
        {weekDays.map(date => {
          const d = new Date(date);
          const dayAppts = appointments.filter((a: any) => a.date === date && (selectedSpecialist === 'all' || a.staff?.name === selectedSpecialist));
          const isSelected = selectedDate === date;
          return (
            <MotionItem key={date}>
              <HoverCard
                onClick={() => openAddForDate(date)}
                className={`text-left p-3 rounded-xl border cursor-pointer transition-all min-h-[120px] ${
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
                      <span className="text-muted-foreground">{apt.appointmentServices?.map((s: any) => s.service.name).join(', ')}</span>
                    </div>
                  ))}
                  {dayAppts.length > 3 && (
                    <p className="text-[10px] text-muted-foreground">+{dayAppts.length - 3} więcej</p>
                  )}
                  {dayAppts.length === 0 && (
                    <p className="text-[10px] text-muted-foreground italic">Brak wizyt</p>
                  )}
                </div>
              </HoverCard>
            </MotionItem>
          );
        })}
      </MotionList>
      )}

      {/* Month view */}
      {view === 'month' && (
        <div className="mt-4">
          <div className="grid grid-cols-7 gap-2 text-[10px] text-muted-foreground mb-2">
            {dayNames.map(d => (
              <div key={d} className="text-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {monthDays.map((date, idx) => {
              if (!date) return <div key={`empty-${idx}`} className="h-20 rounded-xl bg-muted/30" />;
              const d = new Date(date);
              const dayAppts = appointments.filter((a: any) => a.date === date && (selectedSpecialist === 'all' || a.staff?.name === selectedSpecialist));
              return (
                <button
                  key={date}
                  onClick={() => openAddForDate(date)}
                  className={`h-20 rounded-xl border border-border text-left p-2 hover:border-primary/40 transition-colors ${
                    date === selectedDate ? 'border-primary bg-primary/5' : 'bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{d.getDate()}</span>
                    {dayAppts.length > 0 && (
                      <Badge variant="secondary" className="text-[9px]">{dayAppts.length}</Badge>
                    )}
                  </div>
                  {dayAppts.slice(0, 2).map(apt => (
                    <div key={apt.id} className="text-[9px] text-muted-foreground truncate mt-1">
                      {apt.time} {apt.client?.name}
                    </div>
                  ))}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={detailsOpen} onOpenChange={(open) => { setDetailsOpen(open); if (!open) setEditMode(false); }}>
        <DialogContent className="rounded-2xl">
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
                  <p className="text-xs text-muted-foreground mt-2">Czas: {editDuration || activeApt.duration} min</p>
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
                  <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="rounded-xl min-h-[80px]" />
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
                    const [, , , apptsRes, hoursRes, exceptionsRes, breaksRes] = await loadData();
                    setAppointments(apptsRes.appointments || []);
                    setSalonHours(hoursRes.hours || []);
                    setSalonExceptions(exceptionsRes.exceptions || []);
                    setSalonBreaks(breaksRes.breaks || []);
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
    </PageTransition>
  );
}
