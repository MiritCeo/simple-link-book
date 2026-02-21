import { useMemo } from 'react';
import { CalendarDays, DollarSign, Users, TrendingUp, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockAppointments, mockClients, mockSpecialists, statusLabels, statusColors } from '@/data/mockData';
import { PageTransition, MotionList, MotionItem, HoverCard } from '@/components/motion';
import { motion } from 'framer-motion';

const TODAY = '2026-02-21';

export default function DashboardPage() {
  const todayAppts = useMemo(() => mockAppointments.filter(a => a.date === TODAY), []);
  const completedToday = todayAppts.filter(a => a.status === 'completed' || a.status === 'in-progress');
  const scheduledToday = todayAppts.filter(a => a.status === 'scheduled' || a.status === 'confirmed');

  const todayRevenue = useMemo(() => {
    return todayAppts
      .filter(a => a.status !== 'cancelled' && a.status !== 'no-show')
      .reduce((sum, a) => {
        // simple mock: map service names to prices
        const prices: Record<string, number> = {
          'Strzyżenie damskie': 120, 'Strzyżenie męskie': 70, 'Koloryzacja': 250,
          'Balayage': 450, 'Manicure hybrydowy': 100, 'Pedicure': 130,
          'Henna brwi i rzęs': 60, 'Laminacja brwi': 120,
        };
        return sum + (prices[a.serviceName] || 100);
      }, 0);
  }, [todayAppts]);

  const occupancyPercent = Math.round((todayAppts.length / 10) * 100); // mock: 10 slots max

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
      label: 'Przychód dziś',
      value: `${todayRevenue} zł`,
      icon: DollarSign,
      change: '+15% vs śr.',
      up: true,
      color: 'text-success',
      bg: 'bg-success/10',
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
      value: mockClients.length,
      icon: Users,
      change: '+1 nowy ten tydzień',
      up: true,
      color: 'text-accent-foreground',
      bg: 'bg-accent',
    },
  ];

  // Mock hourly data for a simple bar chart
  const hours = Array.from({ length: 11 }, (_, i) => {
    const h = i + 9;
    const count = todayAppts.filter(a => {
      const aptH = parseInt(a.time.split(':')[0]);
      return aptH === h;
    }).length;
    return { hour: `${h}:00`, count, max: 3 };
  });

  // Specialist workload
  const specialistLoad = mockSpecialists.map(sp => {
    const appts = todayAppts.filter(a => a.specialistName === sp.name);
    const totalMin = appts.reduce((s, a) => s + a.duration, 0);
    return { ...sp, appointments: appts.length, totalMinutes: totalMin };
  });

  return (
    <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6 pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold lg:text-2xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Sobota, 21 lutego 2026</p>
        </div>
        <Badge variant="secondary" className="text-xs">Na żywo</Badge>
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
          {/* Hourly activity */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="bg-card rounded-2xl p-5 border border-border"
          >
            <h2 className="font-semibold mb-4">Aktywność dziś</h2>
            <div className="flex items-end gap-1.5 h-28">
              {hours.map((h, i) => (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(h.count / 3) * 100}%` }}
                    transition={{ delay: 0.3 + i * 0.04, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                    className={`w-full rounded-t-md min-h-[4px] ${h.count > 0 ? 'bg-primary' : 'bg-border'}`}
                    style={{ maxHeight: '100%' }}
                  />
                  <span className="text-[9px] text-muted-foreground hidden sm:block">{h.hour.split(':')[0]}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-muted-foreground sm:hidden">
              <span>9:00</span>
              <span>14:00</span>
              <span>19:00</span>
            </div>
          </motion.div>

          {/* Upcoming appointments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Nadchodzące wizyty</h2>
              <Button variant="ghost" size="sm" className="rounded-xl h-8 text-xs text-muted-foreground">
                Zobacz wszystkie
              </Button>
            </div>
            <MotionList className="space-y-2">
              {scheduledToday.slice(0, 4).map(apt => (
                <MotionItem key={apt.id}>
                  <HoverCard className="bg-card rounded-xl p-3.5 border border-border flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{apt.clientName}</p>
                        <Badge variant="secondary" className={`text-[9px] shrink-0 ${statusColors[apt.status]}`}>
                          {statusLabels[apt.status]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{apt.serviceName} • {apt.specialistName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{apt.time}</p>
                      <p className="text-[10px] text-muted-foreground">{apt.duration} min</p>
                    </div>
                  </HoverCard>
                </MotionItem>
              ))}
              {scheduledToday.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Brak nadchodzących wizyt</p>
              )}
            </MotionList>
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
    </PageTransition>
  );
}
