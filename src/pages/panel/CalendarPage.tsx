import { useEffect, useState, useMemo, type CSSProperties, type ReactNode } from 'react';
import { Plus, ChevronLeft, ChevronRight, Clock, User, List, LayoutGrid, Filter, Ban } from 'lucide-react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDraggable, useDroppable, type DragEndEvent, type DragMoveEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { statusLabels, statusColors, type Appointment } from '@/data/mockData';
import { getReadableTextColor } from '@/lib/color';
import { PageTransition, MotionList, MotionItem, HoverCard } from '@/components/motion';
import { motion, AnimatePresence } from 'framer-motion';
import { createAppointment, createClient, createSalonException, createStaffException, getSalonAppointments, getSalonBreaks, getSalonClients, getSalonExceptions, getSalonHours, getSalonServices, getSalonStaff, getStaffSchedule, updateAppointment, updateClient } from '@/lib/api';
import { toast } from 'sonner';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);

const ColumnDropZone = ({
  id,
  staffId,
  className,
  style,
  children,
  dragPreview,
}: {
  id: string;
  staffId?: string | null;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  dragPreview?: { top: number; time: string } | null;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id, data: { staffId, mode: 'column' } });
  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? 'bg-primary/5 outline outline-1 outline-primary/40' : ''}`}
      style={style}
    >
      {dragPreview && (
        <>
          <div
            className="absolute left-0 right-0 h-0.5 bg-primary/80"
            style={{ top: dragPreview.top }}
          />
          <div
            className="absolute -left-1 translate-x-0 -translate-y-1/2 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded shadow"
            style={{ top: dragPreview.top }}
          >
            {dragPreview.time}
          </div>
        </>
      )}
      {children}
    </div>
  );
};

const DayDropZone = ({
  id,
  date,
  className,
  children,
}: {
  id: string;
  date: string;
  className?: string;
  children: ReactNode;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id, data: { date, mode: 'day' } });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? 'outline outline-1 outline-primary/40 bg-primary/5' : ''}`}>
      {children}
    </div>
  );
};

const getAppointmentColor = (apt: any) =>
  apt.appointmentServices?.find((s: any) => s.service?.color)?.service?.color || '';

const getInitials = (name?: string) =>
  name ? name.split(' ').map(part => part[0]).slice(0, 2).join('') : '';

const getServiceBadges = (apt: any) => {
  const services = apt.appointmentServices || [];
  return services.map((s: any) => {
    const color = s.service?.color;
    const textColor = getReadableTextColor(color);
    return (
      <span
        key={s.service.id}
        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium mr-1"
        style={{ backgroundColor: color || 'var(--muted)', color: color ? textColor : 'var(--muted-foreground)' }}
      >
        {s.service.name}
      </span>
    );
  });
};

const DraggableAppointment = ({
  apt,
  top,
  height,
  width,
  left,
  statusKey,
  compactTimeline,
  onClick,
}: {
  apt: any;
  top: number;
  height: number;
  width: string;
  left: string;
  statusKey: string;
  compactTimeline: boolean;
  onClick: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: apt.id,
    data: { appointment: apt, top, mode: 'timeline' },
  });
  const style: React.CSSProperties = {
    top,
    height,
    width,
    left,
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 20 : 1,
    opacity: isDragging ? 0.85 : 1,
  };
  const color = getAppointmentColor(apt);
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`absolute rounded-lg border cursor-pointer hover:opacity-90 transition-opacity overflow-hidden ${statusColors[statusKey as keyof typeof statusColors]} border-current/10 ${
        compactTimeline ? 'px-2 py-1' : 'px-3 py-1.5'
      }`}
      style={style}
      onClick={onClick}
    >
      <p className={`font-semibold truncate ${compactTimeline ? 'text-[10px]' : 'text-xs'}`}>
        {color && <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ backgroundColor: color }} />}
        {apt.time} — {apt.appointmentServices?.map((s: any) => s.service.name).join(', ')}
      </p>
      {!compactTimeline && (
        <p className="text-[10px] truncate opacity-70">{apt.client?.name}</p>
      )}
    </div>
  );
};

const DraggableAppointmentChip = ({
  apt,
  className,
  children,
}: {
  apt: any;
  className?: string;
  children: ReactNode;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: apt.id,
    data: { appointment: apt, mode: 'chip' },
  });
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.85 : 1,
  };
  const color = getAppointmentColor(apt);
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={className} style={style}>
      {color && <span className="inline-block h-2 w-2 rounded-full mr-1.5 align-middle" style={{ backgroundColor: color }} />}
      {children}
    </div>
  );
};

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [view, setView] = useState<'day-list' | 'day-timeline' | 'week' | 'month'>('day-list');
  const [selectedSpecialist, setSelectedSpecialist] = useState<string>(() => {
    try {
      return localStorage.getItem('calendar_selected_specialist') || 'all';
    } catch {
      return 'all';
    }
  });
  const [staffFilterIds, setStaffFilterIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('calendar_staff_filters');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [staffFilterActiveOnly, setStaffFilterActiveOnly] = useState(() => {
    try {
      return localStorage.getItem('calendar_staff_active_only') === '1';
    } catch {
      return false;
    }
  });
  const [showStaffFilter, setShowStaffFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | Appointment['status']>(() => {
    try {
      const raw = localStorage.getItem('calendar_status_filter');
      return (raw as 'all' | Appointment['status']) || 'all';
    } catch {
      return 'all';
    }
  });
  const [compactTimeline, setCompactTimeline] = useState(() => {
    try {
      return localStorage.getItem('calendar_compact_timeline') === '1';
    } catch {
      return false;
    }
  });
  const [timelineScale, setTimelineScale] = useState<15 | 30 | 60>(() => {
    try {
      const raw = Number(localStorage.getItem('calendar_timeline_scale'));
      return raw === 15 || raw === 30 || raw === 60 ? raw : 30;
    } catch {
      return 30;
    }
  });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'visit' | 'client' | 'history'>('visit');
  const [clientNoteDraft, setClientNoteDraft] = useState('');
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
  const [customDuration, setCustomDuration] = useState<number | ''>('');
  const [allowConflict, setAllowConflict] = useState(false);
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
  const [editCustomDuration, setEditCustomDuration] = useState<number | ''>('');
  const [editAllowConflict, setEditAllowConflict] = useState(false);
  const [editStatus, setEditStatus] = useState<Appointment['status']>('scheduled');
  const [editStaffId, setEditStaffId] = useState('any');
  const [editServiceIds, setEditServiceIds] = useState<string[]>([]);
  const [editNotes, setEditNotes] = useState('');
  const [editServiceSearch, setEditServiceSearch] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editClientEmail, setEditClientEmail] = useState('');
  const [draggingApt, setDraggingApt] = useState<any | null>(null);
  const [draggingMode, setDraggingMode] = useState<'timeline' | 'chip' | null>(null);
  const [dragPreview, setDragPreview] = useState<{ columnId: string; top: number; time: string } | null>(null);

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
    getSalonClients({ all: true }),
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

  useEffect(() => {
    localStorage.setItem('calendar_staff_filters', JSON.stringify(staffFilterIds));
  }, [staffFilterIds]);
  useEffect(() => {
    localStorage.setItem('calendar_staff_active_only', staffFilterActiveOnly ? '1' : '0');
  }, [staffFilterActiveOnly]);
  useEffect(() => {
    localStorage.setItem('calendar_status_filter', statusFilter);
  }, [statusFilter]);
  useEffect(() => {
    localStorage.setItem('calendar_compact_timeline', compactTimeline ? '1' : '0');
  }, [compactTimeline]);
  useEffect(() => {
    localStorage.setItem('calendar_timeline_scale', String(timelineScale));
  }, [timelineScale]);
  useEffect(() => {
    localStorage.setItem('calendar_selected_specialist', selectedSpecialist);
  }, [selectedSpecialist]);

  const dayAppointments = useMemo(() => {
    let appts = appointments.filter((a: any) => a.date === selectedDate);
    if (staffFilterIds.length > 0) {
      appts = appts.filter((a: any) => {
        if (!a.staff?.id) return staffFilterIds.includes('any');
        return staffFilterIds.includes(a.staff.id);
      });
    } else if (selectedSpecialist !== 'all') {
      appts = appts.filter((a: any) => a.staff?.name === selectedSpecialist);
    }
    if (statusFilter !== 'all') {
      appts = appts.filter((a: any) => mapStatus(a.status) === statusFilter);
    }
    return appts;
  }, [appointments, selectedDate, selectedSpecialist, staffFilterIds, statusFilter]);
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
  const effectiveDuration = customDuration || estimatedDuration || 30;
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
  const formatTime = (totalMinutes: number) => {
    const minutes = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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
    const dur = effectiveDuration;
    const breakWindows = breakWindowsForDate(appointmentDate);
    return options.filter((t) => {
      const appointmentStart = toMinutes(t);
      const start = appointmentStart - bufferMinutes.before;
      const end = appointmentStart + dur + bufferMinutes.after;
      const breakOverlap = breakWindows.some(w => start < w.end && end > w.start);
      if (breakOverlap) return false;
      return true;
    });
  }, [appointmentDate, selectedSpecialistId, effectiveDuration, salonHours, salonExceptions, staffSchedules, salonBreaks, bufferMinutes]);
  const addTimeAvailable = useMemo(() => {
    if (!appointmentDate || !appointmentTime) return true;
    const window = getEffectiveWindow(appointmentDate, selectedSpecialistId);
    if (!window) return false;
    const t = toMinutes(appointmentTime);
    const startM = toMinutes(window.start);
    const endM = toMinutes(window.end);
    const dur = effectiveDuration;
    const start = t - bufferMinutes.before;
    const end = t + dur + bufferMinutes.after;
    const breakOverlap = breakWindowsForDate(appointmentDate).some(w => start < w.end && end > w.start);
    if (breakOverlap) return false;
    if (selectedSpecialistId === 'any') {
      return t >= startM && t <= endM;
    }
    if (allowConflict) {
      return t >= startM && t <= endM;
    }
    return addTimeOptions.includes(appointmentTime);
  }, [appointmentDate, appointmentTime, selectedSpecialistId, addTimeOptions, salonHours, salonExceptions, staffSchedules, salonBreaks, effectiveDuration, bufferMinutes, allowConflict]);
  const addConflict = useMemo(() => {
    if (!appointmentDate || !appointmentTime || selectedSpecialistId === 'any') return false;
    const dur = effectiveDuration;
    const appointmentStart = toMinutes(appointmentTime);
    const start = appointmentStart - bufferMinutes.before;
    const end = appointmentStart + dur + bufferMinutes.after;
    return appointments.some((a: any) => {
      if (a.staff?.id !== selectedSpecialistId) return false;
      if (a.date !== appointmentDate) return false;
      const s = toMinutes(a.time) - bufferMinutes.before;
      const e = s + a.duration + bufferMinutes.before + bufferMinutes.after;
      return start < e && end > s && !['cancelled', 'no-show'].includes(mapStatus(a.status));
    });
  }, [appointmentDate, appointmentTime, selectedSpecialistId, effectiveDuration, appointments, bufferMinutes]);
  const appointmentEndTime = useMemo(() => {
    if (!appointmentTime) return '';
    return formatTime(toMinutes(appointmentTime) + effectiveDuration);
  }, [appointmentTime, effectiveDuration]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over, delta } = event;
    if (!over) return;
    const activeData = active.data.current as any;
    const apt = activeData?.appointment;
    if (!apt) return;
    const overData = over.data.current as any;
    const overStaffId = overData?.staffId ?? null;
    const newStaffId = overStaffId === 'any' ? null : overStaffId ?? (apt.staff?.id ?? null);
    const newDate = overData?.date || selectedDate;
    let newTime = apt.time;
    if (overData?.mode === 'column') {
      const startTop = typeof activeData.top === 'number' ? activeData.top : 0;
      const newTop = startTop + delta.y;
      const minutesOffset = Math.round((newTop / slotPxPerMinute) / timelineScale) * timelineScale;
      newTime = formatTime(8 * 60 + minutesOffset);
    }
    if (newTime === apt.time && (newStaffId ?? null) === (apt.staff?.id ?? null)) return;

    const window = getEffectiveWindow(newDate, newStaffId ?? undefined);
    if (!window) {
      toast.error('Termin jest niedostępny');
      return;
    }
    const startWindow = toMinutes(window.start);
    const endWindow = toMinutes(window.end);
    const start = toMinutes(newTime) - bufferMinutes.before;
    const end = toMinutes(newTime) + (apt.duration || 0) + bufferMinutes.after;
    if (start < startWindow || end > endWindow) {
      toast.error('Wybrana godzina poza grafikiem');
      return;
    }
    const breakOverlap = breakWindowsForDate(newDate).some(w => start < w.end && end > w.start);
    if (breakOverlap) {
      toast.error('Wybrana godzina wypada w przerwie');
      return;
    }
    let allowConflictDrag = false;
    if (newStaffId) {
      const conflict = appointments.some((a: any) => {
        if (a.id === apt.id) return false;
        if (a.staff?.id !== newStaffId) return false;
        if (a.date !== newDate) return false;
        const s = toMinutes(a.time) - bufferMinutes.before;
        const e = s + a.duration + bufferMinutes.before + bufferMinutes.after;
        return start < e && end > s && !['cancelled', 'no-show'].includes(mapStatus(a.status));
      });
      if (conflict) {
        allowConflictDrag = window.confirm('Wizyta koliduje z inną wizytą. Zapisać mimo konfliktu?');
        if (!allowConflictDrag) return;
      }
    }
    try {
      const res = await updateAppointment(apt.id, {
        date: newDate,
        time: newTime,
        staffId: newStaffId === null ? null : newStaffId,
        allowConflict: allowConflictDrag || undefined,
      });
      setAppointments(prev => prev.map(a => (a.id === apt.id ? res.appointment : a)));
      if (newDate !== selectedDate) {
        setSelectedDate(newDate);
        setAppointmentDate(newDate);
      }
      toast.success('Wizyta zaktualizowana');
    } catch (err: any) {
      toast.error(err?.message || 'Nie udało się przenieść wizyty');
    }
  };
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
    setCustomDuration('');
    setAllowConflict(false);
  };
  const resetBlockForm = () => {
    setBlockDate(selectedDate || new Date().toISOString().split('T')[0]);
    setBlockStart('');
    setBlockEnd('');
    setBlockStaffId('salon');
    setBlockReason('');
  };
  const activeApt = appointments.find(a => a.id === activeAptId);
  const clientHistory = useMemo(() => {
    if (!activeApt?.client?.id) return [];
    return appointments
      .filter((a: any) => a.client?.id === activeApt.client.id)
      .sort((a: any, b: any) => (a.date + a.time).localeCompare(b.date + b.time));
  }, [appointments, activeApt]);
  const openDetails = (id: string) => {
    const apt = appointments.find(a => a.id === id);
    setActiveAptId(id);
    setDetailsOpen(true);
    setEditMode(false);
    if (apt) {
      setEditDate(apt.date);
      setEditTime(apt.time);
      setEditCustomDuration('');
      setEditAllowConflict(false);
      setDetailTab('visit');
      setClientNoteDraft(apt.client?.notes || '');
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
  const effectiveEditDuration = editCustomDuration || editDuration || activeApt?.duration || 0;
  const editEndTime = useMemo(() => {
    if (!editTime) return '';
    return formatTime(toMinutes(editTime) + effectiveEditDuration);
  }, [editTime, effectiveEditDuration]);
  const editConflict = useMemo(() => {
    if (!activeAptId || editStaffId === 'any' || !editDate || !editTime) return false;
    const dur = effectiveEditDuration;
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
  }, [activeAptId, editStaffId, editDate, editTime, effectiveEditDuration, activeApt, appointments, salonBreaks, bufferMinutes]);
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
    const dur = effectiveEditDuration || 30;
    const breakWindows = breakWindowsForDate(editDate);
    const filtered = options.filter((t) => {
      if (editStaffId === 'any') return true;
      const appointmentStart = toMinutes(t);
      const start = appointmentStart - bufferMinutes.before;
      const end = appointmentStart + dur + bufferMinutes.after;
      const breakOverlap = breakWindows.some(w => start < w.end && end > w.start);
      if (breakOverlap) return false;
      return true;
    });
    if (editTime && !filtered.includes(editTime)) {
      return [editTime, ...filtered];
    }
    return filtered;
  }, [editDate, editStaffId, effectiveEditDuration, activeApt, appointments, activeAptId, salonHours, salonExceptions, staffSchedules, editTime, salonBreaks, bufferMinutes]);

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
      if (addConflict) {
        const ok = window.confirm('Wizyta koliduje z inną wizytą. Zapisać mimo konfliktu?');
        if (!ok) return;
      }
      await createAppointment({
        date: appointmentDate,
        time: appointmentTime,
        durationOverride: customDuration ? Number(customDuration) : undefined,
        notes: appointmentNotes || undefined,
        clientId,
        staffId: selectedSpecialistId !== 'any' ? selectedSpecialistId : undefined,
        allowConflict: (allowConflict || addConflict) || undefined,
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
  const hourHeight = useMemo(() => {
    const map: Record<15 | 30 | 60, number> = { 15: 96, 30: 64, 60: 48 };
    return map[timelineScale];
  }, [timelineScale]);
  const slotPxPerMinute = hourHeight / 60;
  const getAppointmentPosition = (apt: Appointment) => {
    const [h, m] = apt.time.split(':').map(Number);
    const top = ((h - 8) * 60 + m) * slotPxPerMinute;
    const height = apt.duration * slotPxPerMinute;
    return { top, height: Math.max(height, 20) };
  };

  const buildLaneLayout = (appts: any[]) => {
    const items = appts
      .map(apt => {
        const start = toMinutes(apt.time);
        return { apt, start, end: start + (apt.duration || 0) };
      })
      .sort((a, b) => a.start - b.start || a.end - b.end);
    const layout = new Map<string, { lane: number; laneCount: number }>();
    let cluster: Array<{ apt: any; start: number; end: number }> = [];
    let clusterEnd = -1;
    const flushCluster = () => {
      if (!cluster.length) return;
      const lanesEnd: number[] = [];
      const laneAssignments = new Map<string, number>();
      let maxLanes = 0;
      cluster.forEach(item => {
        let laneIndex = lanesEnd.findIndex(end => end <= item.start);
        if (laneIndex === -1) {
          laneIndex = lanesEnd.length;
          lanesEnd.push(item.end);
        } else {
          lanesEnd[laneIndex] = item.end;
        }
        laneAssignments.set(item.apt.id, laneIndex);
        maxLanes = Math.max(maxLanes, lanesEnd.length);
      });
      cluster.forEach(item => {
        layout.set(item.apt.id, { lane: laneAssignments.get(item.apt.id) || 0, laneCount: maxLanes || 1 });
      });
      cluster = [];
      clusterEnd = -1;
    };
    items.forEach(item => {
      if (!cluster.length || item.start < clusterEnd) {
        cluster.push(item);
        clusterEnd = Math.max(clusterEnd, item.end);
        return;
      }
      flushCluster();
      cluster.push(item);
      clusterEnd = item.end;
    });
    flushCluster();
    return layout;
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

  const timelineColumns = useMemo(() => {
    const columns: Array<{ id: string; name: string; staffId?: string | null }> = [];
    const hasUnassigned = dayAppointments.some((a: any) => !a.staff?.id);
    if (staffFilterIds.length > 0) {
      staffFilterIds.forEach(id => {
        if (id === 'any') {
          columns.push({ id: 'any', name: 'Dowolny', staffId: null });
          return;
        }
        const sp = staff.find((s: any) => s.id === id);
        if (sp) columns.push({ id: sp.id, name: sp.name, staffId: sp.id });
      });
      return columns;
    }
    if (selectedSpecialist !== 'all') {
      const sp = staff.find((s: any) => s.name === selectedSpecialist);
      if (sp) {
        columns.push({ id: sp.id, name: sp.name, staffId: sp.id });
      } else if (hasUnassigned) {
        columns.push({ id: 'any', name: 'Dowolny', staffId: null });
      }
      return columns;
    }
    const base = staffFilterActiveOnly ? visibleSpecialists.filter(sp => sp.active !== false) : visibleSpecialists;
    base.forEach(sp => columns.push({ id: sp.id, name: sp.name, staffId: sp.id }));
    if (hasUnassigned) columns.push({ id: 'any', name: 'Dowolny', staffId: null });
    return columns;
  }, [selectedSpecialist, staffFilterIds, staffFilterActiveOnly, visibleSpecialists, staff, dayAppointments]);

  const getColumnLoadPct = (staffId?: string | null) => {
    const dayAppts = appointments.filter((a: any) => a.date === selectedDate && (
      staffId ? a.staff?.id === staffId : !a.staff?.id
    ));
    const minutes = dayAppts.reduce((sum: number, a: any) => sum + (a.duration || 0), 0);
    const capacity = 8 * 60;
    return Math.min(Math.round((minutes / capacity) * 100), 100);
  };

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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Czas trwania (min)</label>
                    <Input
                      type="number"
                      min={1}
                      placeholder={`${estimatedDuration || 30}`}
                      value={customDuration}
                      onChange={e => setCustomDuration(e.target.value ? Number(e.target.value) : '')}
                      className="h-11 rounded-xl"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Domyślnie z usług: {estimatedDuration || 30} min
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Zakończenie</label>
                    <Input
                      value={appointmentEndTime || '—'}
                      readOnly
                      className="h-11 rounded-xl bg-muted/40"
                    />
                  </div>
                </div>
                {selectedSpecialistId !== 'any' && (
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={allowConflict}
                      onCheckedChange={(checked) => setAllowConflict(Boolean(checked))}
                    />
                    <span>
                      Zezwól na konflikt z innymi wizytami tego specjalisty (wizyty równoległe)
                    </span>
                  </label>
                )}
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
        <div className="flex flex-wrap items-center gap-2 mb-4">
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
          <Button
            variant={staffFilterIds.length > 0 ? 'secondary' : 'outline'}
            size="sm"
            className="rounded-xl h-9 text-xs"
            onClick={() => setShowStaffFilter(v => !v)}
          >
            Pracownicy {staffFilterIds.length > 0 ? `(${staffFilterIds.length})` : ''}
          </Button>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | Appointment['status'])}>
            <SelectTrigger className="h-9 rounded-xl text-sm w-full sm:w-48">
              <SelectValue placeholder="Wszystkie statusy" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">Wszystkie statusy</SelectItem>
              {Object.keys(statusLabels).map(status => (
                <SelectItem key={status} value={status}>
                  {statusLabels[status as keyof typeof statusLabels]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {view === 'day-timeline' && (
            <Select value={String(timelineScale)} onValueChange={(value) => setTimelineScale(Number(value) as 15 | 30 | 60)}>
              <SelectTrigger className="h-9 rounded-xl text-sm w-full sm:w-28">
                <SelectValue placeholder="Skala" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="15">15 min</SelectItem>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="60">60 min</SelectItem>
              </SelectContent>
            </Select>
          )}
          {view === 'day-timeline' && (
            <Button
              variant={compactTimeline ? 'secondary' : 'outline'}
              size="sm"
              className="rounded-xl h-9 text-xs"
              onClick={() => setCompactTimeline(v => !v)}
            >
              {compactTimeline ? 'Tryb normalny' : 'Tryb kompaktowy'}
            </Button>
          )}
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
      {view !== 'month' && showStaffFilter && (
        <div className="mb-4 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Filtr pracowników</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl h-8 text-xs"
                onClick={() => setStaffFilterIds(staff.filter((sp: any) => sp.active !== false).map((sp: any) => sp.id))}
              >
                Zaznacz wszystkich
              </Button>
              <Button
                variant={staffFilterActiveOnly ? 'secondary' : 'outline'}
                size="sm"
                className="rounded-xl h-8 text-xs"
                onClick={() => setStaffFilterActiveOnly(v => !v)}
              >
                Tylko aktywni
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl h-8 text-xs"
                onClick={() => setStaffFilterIds([])}
              >
                Wyczyść
              </Button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(staffFilterActiveOnly ? staff.filter((sp: any) => sp.active !== false) : staff).map((sp: any) => (
              <label key={sp.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={staffFilterIds.includes(sp.id)}
                  onCheckedChange={(checked) => {
                    setStaffFilterIds(prev => checked ? [...prev, sp.id] : prev.filter(id => id !== sp.id));
                  }}
                />
                <span className="flex items-center gap-2">
                  {sp.name}
                  {sp.active === false && (
                    <Badge variant="secondary" className="text-[10px] h-5 px-2">
                      nieaktywny
                    </Badge>
                  )}
                </span>
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={staffFilterIds.includes('any')}
                onCheckedChange={(checked) => {
                  setStaffFilterIds(prev => checked ? [...prev, 'any'] : prev.filter(id => id !== 'any'));
                }}
              />
              <span>Dowolny</span>
            </label>
          </div>
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
      <DndContext
        sensors={sensors}
        onDragStart={(event) => {
          const data = event.active.data.current as any;
          setDraggingApt(data?.appointment || null);
          setDraggingMode(data?.mode || null);
        }}
        onDragMove={(event: DragMoveEvent) => {
          if (view !== 'day-timeline') return;
          const over = event.over;
          const activeData = event.active.data.current as any;
          if (!over || activeData?.mode !== 'timeline') {
            setDragPreview(null);
            return;
          }
          const overData = over.data.current as any;
          if (overData?.mode !== 'column') {
            setDragPreview(null);
            return;
          }
          const startTop = typeof activeData.top === 'number' ? activeData.top : 0;
          const newTop = startTop + event.delta.y;
          const minutesOffset = Math.round((newTop / slotPxPerMinute) / timelineScale) * timelineScale;
          const top = (minutesOffset) * slotPxPerMinute;
          setDragPreview({
            columnId: String(over.id),
            top,
            time: formatTime(8 * 60 + minutesOffset),
          });
        }}
        onDragEnd={(event) => {
          handleDragEnd(event);
          setDraggingApt(null);
          setDraggingMode(null);
          setDragPreview(null);
        }}
        onDragCancel={() => {
          setDraggingApt(null);
          setDraggingMode(null);
          setDragPreview(null);
        }}
      >
      {view === 'day-timeline' && (
          <motion.div
            className="hidden sm:block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="border border-border rounded-2xl bg-card overflow-hidden">
            <div className="overflow-x-auto">
            <div className="min-w-max">
            <div
              className="grid border-b border-border bg-muted/40"
              style={{ gridTemplateColumns: `64px repeat(${Math.max(timelineColumns.length, 1)}, minmax(180px, 1fr))` }}
            >
              <div className="py-2 px-3 text-[10px] uppercase text-muted-foreground">Godzina</div>
              {timelineColumns.length === 0 && (
                <div className="py-2 px-3 text-xs text-muted-foreground">Brak specjalistów</div>
              )}
              {timelineColumns.map(col => {
                const columnStaff = col.staffId ? staff.find((s: any) => s.id === col.staffId) : null;
                return (
                  <div key={col.id} className="py-2 px-3 text-xs font-medium border-l border-border">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        {columnStaff && (
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center overflow-hidden text-[10px] font-semibold">
                            {columnStaff.photoUrl ? (
                              <img src={columnStaff.photoUrl} alt={columnStaff.name} className="h-full w-full object-cover" />
                            ) : (
                              <span>{getInitials(columnStaff.name)}</span>
                            )}
                          </div>
                        )}
                        <span className="whitespace-normal break-words leading-tight" title={col.name}>{col.name}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{getColumnLoadPct(col.staffId)}%</span>
                    </div>
                    <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${getColumnLoadPct(col.staffId)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              className="grid"
              style={{ gridTemplateColumns: `64px repeat(${Math.max(timelineColumns.length, 1)}, minmax(180px, 1fr))` }}
            >
              <div className="border-r border-border" style={{ height: HOURS.length * hourHeight }}>
                {HOURS.map(hour => (
                  <div key={hour} className="border-b border-border last:border-0 px-3 py-1 text-xs text-muted-foreground text-right" style={{ height: hourHeight }}>
                    {String(hour).padStart(2, '0')}:00
                  </div>
                ))}
              </div>
              {timelineColumns.map(col => {
                const columnAppts = dayAppointments.filter((a: any) =>
                  col.staffId ? a.staff?.id === col.staffId : !a.staff?.id,
                );
                const layout = buildLaneLayout(columnAppts);
                return (
                  <ColumnDropZone
                    key={col.id}
                    id={`col-${col.id}`}
                    staffId={col.staffId}
                    className="relative border-l border-border"
                    style={{ height: HOURS.length * hourHeight }}
                    dragPreview={dragPreview && dragPreview.columnId === `col-${col.id}` ? { top: dragPreview.top, time: dragPreview.time } : null}
                  >
                    {HOURS.map(hour => (
                      <div key={hour} className="border-b border-border last:border-0 relative" style={{ height: hourHeight }}>
                        {timelineScale !== 60 && (
                          <>
                            <div className="absolute left-0 right-0 border-t border-border/30" style={{ top: hourHeight / 2 }} />
                            {timelineScale === 15 && (
                              <>
                                <div className="absolute left-0 right-0 border-t border-border/20" style={{ top: hourHeight / 4 }} />
                                <div className="absolute left-0 right-0 border-t border-border/20" style={{ top: (hourHeight / 4) * 3 }} />
                              </>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                    {columnAppts.map((apt: any, i: number) => {
                      const pos = getAppointmentPosition(apt as Appointment);
                      const statusKey = mapStatus(apt.status);
                      const laneInfo = layout.get(apt.id) || { lane: 0, laneCount: 1 };
                      const width = `calc(${100 / laneInfo.laneCount}% - 6px)`;
                      const left = `calc(${(100 / laneInfo.laneCount) * laneInfo.lane}% + 3px)`;
                      return (
                        <DraggableAppointment
                          key={apt.id}
                          apt={apt}
                          top={pos.top}
                          height={pos.height}
                          width={width}
                          left={left}
                          statusKey={statusKey}
                          compactTimeline={compactTimeline}
                          onClick={() => openDetails(apt.id)}
                        />
                      );
                    })}
                  </ColumnDropZone>
                );
              })}
            </div>
            </div>
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
              const color = getAppointmentColor(apt);
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
                    <div className="flex flex-wrap items-center gap-1">
                      {getServiceBadges(apt)}
                    </div>
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
              <DayDropZone id={`day-${date}`} date={date}>
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
                      <DraggableAppointmentChip key={apt.id} apt={apt} className="text-[11px] leading-tight">
                        <span className="font-medium">{apt.time}</span>{' '}
                        <span className="text-muted-foreground">{apt.appointmentServices?.map((s: any) => s.service.name).join(', ')}</span>
                      </DraggableAppointmentChip>
                    ))}
                    {dayAppts.length > 3 && (
                      <p className="text-[10px] text-muted-foreground">+{dayAppts.length - 3} więcej</p>
                    )}
                    {dayAppts.length === 0 && (
                      <p className="text-[10px] text-muted-foreground italic">Brak wizyt</p>
                    )}
                  </div>
                </HoverCard>
              </DayDropZone>
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
                <DayDropZone key={date} id={`day-${date}`} date={date}>
                  <button
                    onClick={() => openAddForDate(date)}
                    className={`h-20 rounded-xl border border-border text-left p-2 hover:border-primary/40 transition-colors w-full ${
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
                </DayDropZone>
              );
            })}
          </div>
        </div>
      )}
        <DragOverlay>
          {draggingApt && draggingMode === 'timeline' && (
            <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 shadow-lg">
              <p className="text-xs font-semibold truncate">
                {draggingApt.time} — {draggingApt.appointmentServices?.map((s: any) => s.service.name).join(', ')}
              </p>
              <p className="text-[10px] truncate opacity-70">{draggingApt.client?.name}</p>
              {dragPreview?.time && (
                <span className="inline-flex mt-1 text-[10px] bg-primary text-white px-1.5 py-0.5 rounded">
                  {dragPreview.time}
                </span>
              )}
            </div>
          )}
          {draggingApt && draggingMode === 'chip' && (
            <div className="rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] shadow-lg">
              <span className="font-medium">{draggingApt.time}</span>{' '}
              <span className="text-muted-foreground">{draggingApt.client?.name}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <Sheet open={detailsOpen} onOpenChange={(open) => { setDetailsOpen(open); if (!open) setEditMode(false); }}>
        <SheetContent side="right" className="w-[420px] sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{activeApt?.client?.name || 'Szczegóły wizyty'}</SheetTitle>
            <SheetDescription>{activeApt ? `${activeApt.date} • ${activeApt.time}` : 'Szczegóły wizyty'}</SheetDescription>
          </SheetHeader>
          {activeApt ? (
            <>
              <div className="mt-4 flex items-center gap-2">
                <Button
                  size="sm"
                  variant={detailTab === 'visit' ? 'secondary' : 'outline'}
                  className="rounded-xl h-8 text-xs"
                  onClick={() => setDetailTab('visit')}
                >
                  Wizyta
                </Button>
                <Button
                  size="sm"
                  variant={detailTab === 'client' ? 'secondary' : 'outline'}
                  className="rounded-xl h-8 text-xs"
                  onClick={() => setDetailTab('client')}
                >
                  Klient
                </Button>
                <Button
                  size="sm"
                  variant={detailTab === 'history' ? 'secondary' : 'outline'}
                  className="rounded-xl h-8 text-xs"
                  onClick={() => setDetailTab('history')}
                >
                  Historia
                </Button>
              </div>
              {detailTab === 'visit' ? (
                editMode ? (
                  <div className="space-y-3 mt-4">
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
                  <p className="text-xs text-muted-foreground mt-2">Czas: {effectiveEditDuration} min</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Czas trwania (min)</label>
                    <Input
                      type="number"
                      min={1}
                      placeholder={`${editDuration || activeApt.duration}`}
                      value={editCustomDuration}
                      onChange={(e) => setEditCustomDuration(e.target.value ? Number(e.target.value) : '')}
                      className="h-10 rounded-xl"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Domyślnie z usług: {editDuration || activeApt.duration} min
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Zakończenie</label>
                    <Input value={editEndTime || '—'} readOnly className="h-10 rounded-xl bg-muted/40" />
                  </div>
                </div>
                {editStaffId !== 'any' && (
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={editAllowConflict}
                      onCheckedChange={(checked) => setEditAllowConflict(Boolean(checked))}
                    />
                    <span>
                      Zezwól na konflikt z innymi wizytami tego specjalisty
                    </span>
                  </label>
                )}
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
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Klient</span>
                  <span className="text-sm font-medium">{activeApt.client?.name}</span>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Usługa</span>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {getServiceBadges(activeApt)}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Specjalista</span>
                  <span className="text-sm font-medium">{activeApt.staff?.name || 'Dowolny'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Data</span>
                  <span className="text-sm font-medium">{activeApt.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Godzina</span>
                  <span className="text-sm font-medium">{activeApt.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className="text-sm font-medium">{statusLabels[mapStatus(activeApt.status) as keyof typeof statusLabels]}</span>
                </div>
              </div>
            )
              ) : detailTab === 'client' ? (
                <div className="space-y-3 mt-4">
                  <div className="rounded-xl border border-border p-3 bg-card">
                    <p className="text-sm font-semibold">{activeApt.client?.name}</p>
                    <p className="text-xs text-muted-foreground">{activeApt.client?.phone}</p>
                    {activeApt.client?.email && <p className="text-xs text-muted-foreground">{activeApt.client?.email}</p>}
                    <p className="text-xs text-muted-foreground mt-2">
                      Wizyt: {clientHistory.length} • Ostatnia: {clientHistory.at(-1)?.date || '—'}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      {activeApt.client?.phone && (
                        <>
                          <Button asChild size="sm" variant="outline" className="rounded-xl h-8 text-xs">
                            <a href={`tel:${activeApt.client.phone}`}>Zadzwoń</a>
                          </Button>
                          <Button asChild size="sm" variant="outline" className="rounded-xl h-8 text-xs">
                            <a href={`sms:${activeApt.client.phone}`}>SMS</a>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Notatki klienta</label>
                    <Textarea
                      value={clientNoteDraft}
                      onChange={(e) => setClientNoteDraft(e.target.value)}
                      className="rounded-xl min-h-[120px]"
                    />
                    <Button
                      size="sm"
                      className="rounded-xl mt-2"
                      onClick={async () => {
                        if (!activeApt.client?.id) return;
                        await updateClient(activeApt.client.id, {
                          notes: clientNoteDraft || undefined,
                        });
                        toast.success('Notatka klienta zapisana');
                      }}
                    >
                      Zapisz notatkę
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 mt-4">
                  {clientHistory.map((apt: any) => (
                    <div key={apt.id} className="rounded-xl border border-border p-3">
                      <p className="text-xs text-muted-foreground">{apt.date} • {apt.time}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {getServiceBadges(apt)}
                      </div>
                      <p className="text-xs text-muted-foreground">{apt.staff?.name || 'Dowolny'}</p>
                    </div>
                  ))}
                  {clientHistory.length === 0 && (
                    <p className="text-sm text-muted-foreground">Brak historii wizyt</p>
                  )}
                </div>
              )}
              <div className="pt-3 flex items-center gap-2">
                {detailTab === 'visit' && (
                  editMode ? (
                    <Button
                      className="rounded-xl"
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
                          if (editConflict) {
                            const ok = window.confirm('Wizyta koliduje z inną wizytą. Zapisać mimo konfliktu?');
                            if (!ok) return;
                          }
                          if (activeApt?.client?.id) {
                            await updateClient(activeApt.client.id, {
                              name: editClientName,
                              phone: editClientPhone,
                              email: editClientEmail || undefined,
                              notes: activeApt.client?.notes || undefined,
                              allergies: activeApt.client?.allergies || undefined,
                            });
                          }
                          await updateAppointment(activeAptId, {
                            date: editDate,
                            time: editTime,
                            status: editStatus.toUpperCase().replace(/-/g, '_'),
                            staffId: editStaffId === 'any' ? null : editStaffId,
                            notes: editNotes || undefined,
                            serviceIds: editServiceIds,
                            durationOverride: editCustomDuration ? Number(editCustomDuration) : undefined,
                            allowConflict: (editAllowConflict || editConflict) || undefined,
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
                  )
                )}
                <Button variant="outline" className="rounded-xl" onClick={() => setDetailsOpen(false)}>Zamknij</Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Brak danych wizyty</p>
          )}
        </SheetContent>
      </Sheet>
    </PageTransition>
  );
}
