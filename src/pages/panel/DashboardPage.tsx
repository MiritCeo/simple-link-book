import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, CalendarX2, Users, TrendingUp, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { statusLabels, statusColors } from '@/data/mockData';
import { getReadableTextColor } from '@/lib/color';
import { PageTransition, MotionList, MotionItem, HoverCard } from '@/components/motion';
import { motion } from 'framer-motion';
import { getSalonAppointments, getSalonClients, getSalonStaff } from '@/lib/api';

export default function DashboardPage() {
  const isDeletedStaff = (member: any) =>
    member?.active === false || /\[USUNIĘTY\]$/i.test(String(member?.role || ''));
  const isDeletedService = (service: any) =>
    service?.active === false || /\[USUNIĘTA\]$/i.test(String(service?.name || ''));
  const toMinutes = (time?: string) => {
    if (!time) return 0;
    const [h, m] = String(time).split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };
  const getServiceBadges = (apt: any) => {
    const services = (apt.appointmentServices || []).filter((s: any) => !isDeletedService(s.service));
    return services.map((s: any) => {
      const color = s.service?.color;
      const textColor = getReadableTextColor(color);
      return (
        <span
          key={s.service.id}
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium mr-1"
          style={{ backgroundColor: color || 'var(--muted)', color: color ? textColor : 'var(--muted-foreground)' }}
        >
          {s.service.name}
        </span>
      );
    });
  };
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [clientsTotal, setClientsTotal] = useState(0);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const mapStatus = (status?: string) => (status || 'SCHEDULED').toLowerCase().replace(/_/g, '-');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([getSalonAppointments(), getSalonClients({ page: 1, pageSize: 1 }), getSalonStaff()])
      .then(([apptsRes, clientsRes, staffRes]) => {
        if (!mounted) return;
        setAppointments(apptsRes.appointments || []);
        setClientsTotal(clientsRes.total || clientsRes.clients?.length || 0);
        setStaff(staffRes.staff || []);
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const todayLabel = new Date().toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedTodayLabel = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1);
  const todayAppts = useMemo(() => appointments.filter(a => a.date === today), [appointments, today]);
  const completedToday = todayAppts.filter(a => ['completed', 'in-progress'].includes(mapStatus(a.status)));
  const scheduledToday = todayAppts.filter(a => ['scheduled', 'confirmed'].includes(mapStatus(a.status)));
  const cancelledToday = todayAppts.filter(a => mapStatus(a.status) === 'cancelled');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeAptId, setActiveAptId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'visit' | 'client' | 'history'>('visit');
  const [pinsOpen, setPinsOpen] = useState(false);
  const [pinnedStaffIds, setPinnedStaffIds] = useState<string[]>([]);
  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter(a => a.date >= today && ['scheduled', 'confirmed'].includes(mapStatus(a.status)))
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }, [appointments, today]);
  const activeApt = upcomingAppointments.find(a => a.id === activeAptId);
  const openDetails = (id: string) => {
    setActiveAptId(id);
    setDetailTab('visit');
    setDetailsOpen(true);
  };
  const activeStaff = useMemo(() => staff.filter((s: any) => !isDeletedStaff(s)), [staff]);

  useEffect(() => {
    if (!activeStaff.length) {
      setPinnedStaffIds([]);
      return;
    }
    const storageKey = 'dashboard_pinned_staff_ids';
    const raw = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
    const saved = raw ? (JSON.parse(raw) as string[]) : [];
    const validSaved = saved.filter(id => activeStaff.some((s: any) => s.id === id)).slice(0, 4);
    if (validSaved.length) {
      setPinnedStaffIds(validSaved);
      return;
    }
    setPinnedStaffIds(activeStaff.slice(0, 4).map((s: any) => s.id));
  }, [activeStaff]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('dashboard_pinned_staff_ids', JSON.stringify(pinnedStaffIds.slice(0, 4)));
  }, [pinnedStaffIds]);

  const pinnedStaff = useMemo(
    () => pinnedStaffIds.map(id => activeStaff.find((s: any) => s.id === id)).filter(Boolean) as any[],
    [pinnedStaffIds, activeStaff],
  );
  const timelineAppointments = useMemo(() => {
    return todayAppts.filter((a: any) => pinnedStaff.some((s: any) => s.id === a.staff?.id));
  }, [todayAppts, pinnedStaff]);
  const timelineStart = useMemo(() => {
    if (!timelineAppointments.length) return 8 * 60;
    const minStart = Math.min(...timelineAppointments.map((a: any) => toMinutes(a.time)));
    return Math.max(6 * 60, Math.floor(minStart / 30) * 30 - 30);
  }, [timelineAppointments]);
  const timelineEnd = useMemo(() => {
    if (!timelineAppointments.length) return 20 * 60;
    const maxEnd = Math.max(...timelineAppointments.map((a: any) => toMinutes(a.time) + (a.duration || 30)));
    return Math.min(23 * 60, Math.ceil(maxEnd / 30) * 30 + 30);
  }, [timelineAppointments]);
  const timelineRange = Math.max(30, timelineEnd - timelineStart);

  const capacitySlots = Math.max(1, staff.length * 8); // rough: 8 slots per staff/day
  const occupancyPercent = Math.min(100, Math.round((todayAppts.length / capacitySlots) * 100));

  const stats = [
    {
      label: 'Wizyty dziś',
      value: todayAppts.length,
      icon: CalendarDays,
      change: '+2 vs wczoraj',
      up: true,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Odwołane dziś',
      value: cancelledToday.length,
      icon: CalendarX2,
      change: 'Anulowane wizyty',
      up: false,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
    {
      label: 'Obłożenie',
      value: `${occupancyPercent}%`,
      icon: TrendingUp,
      change: 'Dobry dzień',
      up: true,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    {
      label: 'Aktywni klienci',
      value: clientsTotal,
      icon: Users,
      change: '+1 nowy ten tydzień',
      up: true,
      color: 'text-accent-foreground',
      bg: 'bg-accent',
    },
  ];

  // Specialist workload
  const specialistLoad = activeStaff.map((sp: any) => {
    const appts = todayAppts.filter(a => a.staff?.name === sp.name);
    const totalMin = appts.reduce((s, a) => s + a.duration, 0);
    return { ...sp, appointments: appts.length, totalMinutes: totalMin };
  });
  const clientHistory = useMemo(() => {
    if (!activeApt?.client?.id) return [];
    return appointments
      .filter((a: any) => a.client?.id === activeApt.client.id)
      .sort((a: any, b: any) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
  }, [appointments, activeApt]);

  return (
    <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6 pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold lg:text-2xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{formattedTodayLabel}</p>
        </div>
        <Badge variant="secondary" className="text-xs">{loading ? 'Ładowanie...' : 'Na żywo'}</Badge>
      </div>

      {/* Stats cards */}
      <MotionList className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map(stat => (
          <MotionItem key={stat.label}>
            <HoverCard className="bg-card rounded-2xl p-4 border border-border lg:p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="flex items-center gap-0.5 text-[10px] text-success font-medium">
                  {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  <span className="hidden sm:inline">{stat.change}</span>
                </div>
              </div>
              <p className="text-2xl font-bold lg:text-3xl">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </HoverCard>
          </MotionItem>
        ))}
      </MotionList>

      <div className="lg:grid lg:grid-cols-3 lg:gap-6">
        {/* Left: activity chart + upcoming */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="bg-card rounded-2xl p-5 border border-border"
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold">Timeline dnia</h2>
                <p className="text-xs text-muted-foreground">Widok dla maksymalnie 4 przypiętych pracowników</p>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs" onClick={() => setPinsOpen(true)}>
                Przypnij pracowników
              </Button>
            </div>
            {pinnedStaff.length === 0 ? (
              <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
                Wybierz pracowników do przypięcia, aby zobaczyć timeline.
              </div>
            ) : (
              <div className="space-y-3 overflow-x-auto pb-1">
                <div className="min-w-[720px]">
                  <div className="relative ml-[132px] h-6 text-[10px] text-muted-foreground">
                    {Array.from({ length: Math.floor(timelineRange / 60) + 1 }, (_, i) => {
                      const minute = timelineStart + i * 60;
                      const left = ((minute - timelineStart) / timelineRange) * 100;
                      return (
                        <div key={minute} className="absolute -translate-x-1/2" style={{ left: `${left}%` }}>
                          {formatTime(minute)}
                        </div>
                      );
                    })}
                  </div>
                  <div className="space-y-2">
                    {pinnedStaff.map((sp: any) => {
                      const rowAppts = todayAppts
                        .filter((a: any) => a.staff?.id === sp.id)
                        .sort((a: any, b: any) => a.time.localeCompare(b.time));
                      return (
                        <div key={sp.id} className="flex items-center gap-3">
                          <div className="w-[120px] shrink-0">
                            <p className="text-xs font-medium truncate">{sp.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{sp.role}</p>
                          </div>
                          <div className="relative h-12 flex-1 rounded-xl bg-muted/50 border border-border">
                            {Array.from({ length: Math.floor(timelineRange / 60) + 1 }, (_, i) => {
                              const minute = timelineStart + i * 60;
                              const left = ((minute - timelineStart) / timelineRange) * 100;
                              return <div key={minute} className="absolute top-0 bottom-0 w-px bg-border/60" style={{ left: `${left}%` }} />;
                            })}
                            {rowAppts.map((apt: any) => {
                              const start = toMinutes(apt.time);
                              const end = start + (apt.duration || 30);
                              const left = ((start - timelineStart) / timelineRange) * 100;
                              const width = Math.max(5, ((end - start) / timelineRange) * 100);
                              return (
                                <button
                                  key={apt.id}
                                  type="button"
                                  className="absolute top-1 bottom-1 rounded-lg bg-primary/85 text-primary-foreground px-2 text-[10px] text-left overflow-hidden hover:bg-primary"
                                  style={{ left: `${left}%`, width: `${width}%` }}
                                  onClick={() => openDetails(apt.id)}
                                  title={`${apt.time} • ${apt.client?.name || 'Klient'}`}
                                >
                                  <span className="truncate block">{apt.time} • {apt.client?.name || 'Klient'}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          <Dialog open={pinsOpen} onOpenChange={setPinsOpen}>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>Przypięci pracownicy</DialogTitle>
                <DialogDescription>Wybierz do 4 osób widocznych na timeline dashboardu.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {activeStaff.map((sp: any) => {
                  const checked = pinnedStaffIds.includes(sp.id);
                  const disabled = !checked && pinnedStaffIds.length >= 4;
                  return (
                    <label key={sp.id} className={`flex items-center gap-3 rounded-xl border p-3 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => {
                          setPinnedStaffIds(prev => {
                            if (value) {
                              if (prev.includes(sp.id) || prev.length >= 4) return prev;
                              return [...prev, sp.id];
                            }
                            return prev.filter(id => id !== sp.id);
                          });
                        }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{sp.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{sp.role}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
              <DialogFooter>
                <Button variant="outline" className="rounded-xl" onClick={() => setPinsOpen(false)}>Zamknij</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Upcoming appointments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Nadchodzące wizyty</h2>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl h-8 text-xs text-muted-foreground"
                onClick={() => navigate('/panel/wizyty')}
              >
                Zobacz wszystkie
              </Button>
            </div>
            {upcomingAppointments.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-4 text-sm text-muted-foreground">
                Brak nadchodzących wizyt
              </div>
            ) : (
              <MotionList className="space-y-2">
                {upcomingAppointments.slice(0, 4).map(apt => (
                  <MotionItem key={apt.id}>
                    <HoverCard
                      className="bg-card rounded-xl p-3.5 border border-border flex items-center gap-3 cursor-pointer"
                      onClick={() => openDetails(apt.id)}
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{apt.client?.name}</p>
                          <Badge variant="secondary" className={`text-[9px] shrink-0 ${statusColors[mapStatus(apt.status) as keyof typeof statusColors]}`}>
                            {statusLabels[mapStatus(apt.status) as keyof typeof statusLabels]}
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {getServiceBadges(apt)}
                          <span className="text-[10px] text-muted-foreground">{apt.staff?.name || 'Dowolny'}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">{apt.time}</p>
                        <p className="text-[10px] text-muted-foreground">{apt.duration} min</p>
                      </div>
                    </HoverCard>
                  </MotionItem>
                ))}
              </MotionList>
            )}
          </div>
        </div>

        {/* Right: specialist workload */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mt-6 lg:mt-0"
        >
          <h2 className="font-semibold mb-3">Obłożenie zespołu</h2>
          <div className="space-y-3">
            {specialistLoad.map((sp, i) => {
              const pct = Math.min((sp.totalMinutes / 480) * 100, 100); // 8h = 480min
              return (
                <motion.div
                  key={sp.id}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.08 }}
                  className="bg-card rounded-xl p-4 border border-border"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center font-semibold text-xs text-accent-foreground">
                      {sp.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{sp.name}</p>
                      <p className="text-[10px] text-muted-foreground">{sp.role}</p>
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">{sp.appointments} wizyt</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.5 + i * 0.08, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{sp.totalMinutes} min / 480 min ({Math.round(pct)}%)</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="right" className="w-[420px] sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Szczegóły wizyty</SheetTitle>
            <SheetDescription>Informacje o wizycie i kliencie</SheetDescription>
          </SheetHeader>
          {activeApt ? (
            <>
              <div className="mt-4 flex items-center gap-2">
                <Button size="sm" variant={detailTab === 'visit' ? 'secondary' : 'outline'} className="rounded-xl h-8 text-xs" onClick={() => setDetailTab('visit')}>
                  Wizyta
                </Button>
                <Button size="sm" variant={detailTab === 'client' ? 'secondary' : 'outline'} className="rounded-xl h-8 text-xs" onClick={() => setDetailTab('client')}>
                  Klient
                </Button>
                <Button size="sm" variant={detailTab === 'history' ? 'secondary' : 'outline'} className="rounded-xl h-8 text-xs" onClick={() => setDetailTab('history')}>
                  Historia
                </Button>
              </div>

              {detailTab === 'visit' ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-xl border border-border p-3 space-y-2">
                    <div className="flex justify-between"><span className="text-sm text-muted-foreground">Klient</span><span className="text-sm font-medium">{activeApt.client?.name}</span></div>
                    <div className="flex justify-between"><span className="text-sm text-muted-foreground">Telefon</span><span className="text-sm font-medium">{activeApt.client?.phone || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-sm text-muted-foreground">Email</span><span className="text-sm font-medium">{activeApt.client?.email || '—'}</span></div>
                  </div>
                  <div className="rounded-xl border border-border p-3 space-y-2">
                    <div>
                      <span className="text-sm text-muted-foreground">Usługi</span>
                      <div className="mt-1 flex flex-wrap items-center gap-1">{getServiceBadges(activeApt)}</div>
                    </div>
                    <div className="flex justify-between"><span className="text-sm text-muted-foreground">Specjalista</span><span className="text-sm font-medium">{activeApt.staff?.name || 'Dowolny'}</span></div>
                    <div className="flex justify-between"><span className="text-sm text-muted-foreground">Data</span><span className="text-sm font-medium">{activeApt.date}</span></div>
                    <div className="flex justify-between"><span className="text-sm text-muted-foreground">Godzina</span><span className="text-sm font-medium">{activeApt.time}</span></div>
                    <div className="flex justify-between"><span className="text-sm text-muted-foreground">Status</span><span className="text-sm font-medium">{statusLabels[mapStatus(activeApt.status) as keyof typeof statusLabels]}</span></div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground block mb-1">Notatki klienta</span>
                    <Textarea readOnly value={activeApt.client?.notes || '—'} className="rounded-xl min-h-[120px] bg-muted/30" />
                  </div>
                </div>
              ) : detailTab === 'client' ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-border p-3 bg-card">
                    <p className="text-sm font-semibold">{activeApt.client?.name}</p>
                    <p className="text-xs text-muted-foreground">{activeApt.client?.phone || '—'}</p>
                    {activeApt.client?.email && <p className="text-xs text-muted-foreground">{activeApt.client.email}</p>}
                    <p className="text-xs text-muted-foreground mt-2">
                      Wizyt: {clientHistory.length}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Notatki klienta</label>
                    <Textarea readOnly value={activeApt.client?.notes || '—'} className="rounded-xl min-h-[180px] bg-muted/30" />
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {clientHistory.map((apt: any) => (
                    <div key={apt.id} className="rounded-xl border border-border p-3">
                      <p className="text-xs text-muted-foreground">{apt.date} • {apt.time}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1">{getServiceBadges(apt)}</div>
                      <p className="text-xs text-muted-foreground">{apt.staff?.name || 'Dowolny'}</p>
                    </div>
                  ))}
                  {clientHistory.length === 0 && (
                    <p className="text-sm text-muted-foreground">Brak historii wizyt</p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl h-9"
                  disabled={!activeApt.client?.phone}
                  onClick={() => activeApt.client?.phone && window.open(`tel:${activeApt.client.phone}`, '_self')}
                >
                  Zadzwoń
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl h-9"
                  disabled={!activeApt.client?.phone}
                  onClick={() => activeApt.client?.phone && window.open(`sms:${activeApt.client.phone}`, '_self')}
                >
                  SMS
                </Button>
                <Button
                  className="rounded-xl h-9"
                  onClick={() => {
                    if (!activeApt?.id) return;
                    setDetailsOpen(false);
                    navigate(`/panel/wizyty?edit=${activeApt.id}`);
                  }}
                >
                  Edytuj
                </Button>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Brak danych wizyty</p>
          )}
        </SheetContent>
      </Sheet>
    </PageTransition>
  );
}
