import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PageTransition, MotionList, MotionItem, HoverCard } from '@/components/motion';
import { motion } from 'framer-motion';
import { createSalonException, deleteSalonException, getSalonExceptions, getSalonHours, saveSalonHours } from '@/lib/api';
import { toast } from 'sonner';

const dayNames = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];

export default function HoursSettingsPage() {
  const navigate = useNavigate();
  const [editHoursOpen, setEditHoursOpen] = useState(false);
  const [addExceptionOpen, setAddExceptionOpen] = useState(false);
  const [hours, setHours] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingHours, setEditingHours] = useState<any[]>([]);
  const [exceptionForm, setExceptionForm] = useState({ date: '', label: '', start: '', end: '' });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([getSalonHours(), getSalonExceptions()])
      .then(([hoursRes, exceptionsRes]) => {
        if (!mounted) return;
        setHours(hoursRes.hours || []);
        setExceptions(exceptionsRes.exceptions || []);
        setEditingHours(hoursRes.hours || []);
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  return (
    <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6 pb-8">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/panel/ustawienia')} className="rounded-xl h-9 px-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold lg:text-2xl">Godziny pracy</h1>
          <p className="text-sm text-muted-foreground">CRUD godzin pracy (placeholder)</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Tydzień</h2>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl h-9 gap-1.5"
            onClick={() => { setEditingHours(hours); setEditHoursOpen(true); }}
          >
            <Pencil className="w-4 h-4" />Edytuj godziny
          </Button>
        </motion.div>
      </div>

      {loading ? (
        <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground mb-6">
          Ładowanie godzin...
        </div>
      ) : (
        <MotionList className="space-y-2 mb-6">
          {hours.map(day => (
            <MotionItem key={day.weekday}>
              <HoverCard className="bg-card rounded-2xl p-4 border border-border flex items-center justify-between">
                <span className="text-sm font-medium">{dayNames[day.weekday]}</span>
                <span className="text-sm text-muted-foreground">
                  {day.active ? `${day.open}–${day.close}` : 'Zamknięte'}
                </span>
              </HoverCard>
            </MotionItem>
          ))}
        </MotionList>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Wyjątki / święta</h2>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button size="sm" className="rounded-xl h-9 gap-1.5" onClick={() => setAddExceptionOpen(true)}>
            <Plus className="w-4 h-4" />Dodaj wyjątek
          </Button>
        </motion.div>
      </div>

      <MotionList className="space-y-2">
        {exceptions.map(ex => (
          <MotionItem key={ex.id}>
            <HoverCard className="bg-card rounded-2xl p-4 border border-border flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{ex.date}</p>
                <p className="text-xs text-muted-foreground">{ex.label || 'Wyjątek'}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {ex.closed ? 'Zamknięte' : (ex.start && ex.end ? `${ex.start}–${ex.end}` : '—')}
                </span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs text-destructive">
                      Usuń
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Usunąć wyjątek?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Ta akcja jest nieodwracalna. Wyjątek zostanie usunięty.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Anuluj</AlertDialogCancel>
                      <AlertDialogAction
                        className="rounded-xl"
                        onClick={async () => {
                          await deleteSalonException(ex.id);
                          setExceptions(prev => prev.filter((e: any) => e.id !== ex.id));
                          toast.success('Wyjątek usunięty');
                        }}
                      >
                        Usuń
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </HoverCard>
          </MotionItem>
        ))}
        {!loading && exceptions.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">Brak wyjątków</p>
        )}
      </MotionList>

      <Dialog open={editHoursOpen} onOpenChange={setEditHoursOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edytuj godziny pracy</DialogTitle>
            <DialogDescription>Formularz CRUD (placeholder)</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {editingHours.map((day: any) => (
              <div key={day.weekday} className="grid grid-cols-[1fr_1fr_1fr] gap-2 items-center">
                <span className="text-sm font-medium">{dayNames[day.weekday]}</span>
                <Input
                  value={day.open}
                  onChange={(e) => setEditingHours(prev => prev.map((d: any) => d.weekday === day.weekday ? { ...d, open: e.target.value, active: true } : d))}
                  className="h-10 rounded-xl"
                />
                <Input
                  value={day.close}
                  onChange={(e) => setEditingHours(prev => prev.map((d: any) => d.weekday === day.weekday ? { ...d, close: e.target.value, active: true } : d))}
                  className="h-10 rounded-xl"
                />
              </div>
            ))}
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setEditHoursOpen(false)}>Anuluj</Button>
            <Button
              className="rounded-xl"
              onClick={async () => {
                try {
                  await saveSalonHours(editingHours);
                  setHours(editingHours);
                  setEditHoursOpen(false);
                  toast.success('Godziny zapisane');
                } catch (err: any) {
                  toast.error(err.message || 'Błąd zapisu');
                }
              }}
            >
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addExceptionOpen} onOpenChange={setAddExceptionOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Dodaj wyjątek</DialogTitle>
            <DialogDescription>Formularz CRUD (placeholder)</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Data</label>
              <Input type="date" value={exceptionForm.date} onChange={(e) => setExceptionForm(prev => ({ ...prev, date: e.target.value }))} className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Opis</label>
              <Input value={exceptionForm.label} onChange={(e) => setExceptionForm(prev => ({ ...prev, label: e.target.value }))} placeholder="Np. skrócony dzień" className="h-11 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Od</label>
                <Input type="time" value={exceptionForm.start} onChange={(e) => setExceptionForm(prev => ({ ...prev, start: e.target.value }))} className="h-11 rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Do</label>
                <Input type="time" value={exceptionForm.end} onChange={(e) => setExceptionForm(prev => ({ ...prev, end: e.target.value }))} className="h-11 rounded-xl" />
              </div>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setAddExceptionOpen(false)}>Anuluj</Button>
            <Button
              className="rounded-xl"
              onClick={async () => {
                if (!exceptionForm.date) {
                  toast.error('Wybierz datę wyjątku');
                  return;
                }
                try {
                  const created = await createSalonException({
                    date: exceptionForm.date,
                    label: exceptionForm.label || undefined,
                    start: exceptionForm.start || undefined,
                    end: exceptionForm.end || undefined,
                    closed: !exceptionForm.start && !exceptionForm.end,
                  });
                  setExceptions(prev => [...prev, created.exception]);
                  setExceptionForm({ date: '', label: '', start: '', end: '' });
                  setAddExceptionOpen(false);
                  toast.success('Wyjątek dodany');
                } catch (err: any) {
                  toast.error(err.message || 'Błąd zapisu');
                }
              }}
            >
              Dodaj wyjątek
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
