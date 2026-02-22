import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
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
import { createSalonBreak, deleteSalonBreak, getSalonBreaks } from '@/lib/api';
import { toast } from 'sonner';

export default function BreaksSettingsPage() {
  const navigate = useNavigate();
  const [breakOpen, setBreakOpen] = useState(false);
  const [bufferOpen, setBufferOpen] = useState(false);
  const [breaks, setBreaks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [breakForm, setBreakForm] = useState({ label: '', days: '', start: '', end: '' });
  const [bufferForm, setBufferForm] = useState({ label: '', minutes: '' });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getSalonBreaks()
      .then(res => { if (mounted) setBreaks(res.breaks || []); })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const breakRules = breaks.filter(b => b.type === 'BREAK');
  const buffers = breaks.filter(b => b.type === 'BUFFER');

  return (
    <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6 pb-8">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/panel/ustawienia')} className="rounded-xl h-9 px-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold lg:text-2xl">Przerwy i bufory</h1>
          <p className="text-sm text-muted-foreground">CRUD przerw i buforów (placeholder)</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Przerwy</h2>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button size="sm" className="rounded-xl h-9 gap-1.5" onClick={() => setBreakOpen(true)}>
            <Plus className="w-4 h-4" />Dodaj przerwę
          </Button>
        </motion.div>
      </div>

      {loading ? (
        <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground mb-6">
          Ładowanie przerw...
        </div>
      ) : breakRules.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground mb-6 text-center">
          Brak przerw
        </div>
      ) : (
        <MotionList className="space-y-2 mb-6">
          {breakRules.map(rule => (
            <MotionItem key={rule.id}>
              <HoverCard className="bg-card rounded-2xl p-4 border border-border flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{rule.label}</p>
                  <p className="text-xs text-muted-foreground">{rule.days || '—'} • {rule.start && rule.end ? `${rule.start}–${rule.end}` : '—'}</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs gap-1.5 text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />Usuń
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Usunąć przerwę?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Ta akcja jest nieodwracalna. Przerwa zostanie usunięta.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Anuluj</AlertDialogCancel>
                      <AlertDialogAction
                        className="rounded-xl"
                        onClick={async () => {
                          await deleteSalonBreak(rule.id);
                          setBreaks(prev => prev.filter(b => b.id !== rule.id));
                          toast.success('Przerwa usunięta');
                        }}
                      >
                        Usuń
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </HoverCard>
            </MotionItem>
          ))}
        </MotionList>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Bufory czasowe</h2>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button variant="outline" size="sm" className="rounded-xl h-9 gap-1.5" onClick={() => setBufferOpen(true)}>
            <Plus className="w-4 h-4" />Dodaj bufor
          </Button>
        </motion.div>
      </div>

      {loading ? (
        <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground">
          Ładowanie buforów...
        </div>
      ) : buffers.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground text-center">
          Brak buforów
        </div>
      ) : (
        <MotionList className="space-y-2">
          {buffers.map(buf => (
            <MotionItem key={buf.id}>
              <HoverCard className="bg-card rounded-2xl p-4 border border-border flex items-center justify-between">
                <span className="text-sm font-medium">{buf.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{buf.minutes ? `${buf.minutes} min` : '—'}</span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs text-destructive">
                        Usuń
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Usunąć bufor?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Ta akcja jest nieodwracalna. Bufor zostanie usunięty.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Anuluj</AlertDialogCancel>
                        <AlertDialogAction
                          className="rounded-xl"
                          onClick={async () => {
                            await deleteSalonBreak(buf.id);
                            setBreaks(prev => prev.filter(b => b.id !== buf.id));
                            toast.success('Bufor usunięty');
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
        </MotionList>
      )}

      <Dialog open={breakOpen} onOpenChange={setBreakOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Dodaj przerwę</DialogTitle>
            <DialogDescription>Formularz CRUD (placeholder)</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Nazwa</label>
              <Input placeholder="Np. przerwa obiadowa" value={breakForm.label} onChange={(e) => setBreakForm(prev => ({ ...prev, label: e.target.value }))} className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Dni</label>
              <Input placeholder="Np. Pn–Pt" value={breakForm.days} onChange={(e) => setBreakForm(prev => ({ ...prev, days: e.target.value }))} className="h-11 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Od</label>
                <Input type="time" value={breakForm.start} onChange={(e) => setBreakForm(prev => ({ ...prev, start: e.target.value }))} className="h-11 rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Do</label>
                <Input type="time" value={breakForm.end} onChange={(e) => setBreakForm(prev => ({ ...prev, end: e.target.value }))} className="h-11 rounded-xl" />
              </div>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setBreakOpen(false)}>Anuluj</Button>
            <Button
              className="rounded-xl"
              onClick={async () => {
                if (!breakForm.label) {
                  toast.error('Podaj nazwę przerwy');
                  return;
                }
                try {
                  const created = await createSalonBreak({
                    type: 'BREAK',
                    label: breakForm.label,
                    days: breakForm.days || undefined,
                    start: breakForm.start || undefined,
                    end: breakForm.end || undefined,
                  });
                  setBreaks(prev => [...prev, created.break]);
                  setBreakForm({ label: '', days: '', start: '', end: '' });
                  setBreakOpen(false);
                  toast.success('Przerwa dodana');
                } catch (err: any) {
                  toast.error(err.message || 'Błąd zapisu');
                }
              }}
            >
              Dodaj przerwę
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bufferOpen} onOpenChange={setBufferOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Dodaj bufor</DialogTitle>
            <DialogDescription>Formularz CRUD (placeholder)</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Typ bufora</label>
              <Input placeholder="Np. przed wizytą" value={bufferForm.label} onChange={(e) => setBufferForm(prev => ({ ...prev, label: e.target.value }))} className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Czas (min)</label>
              <Input placeholder="10" value={bufferForm.minutes} onChange={(e) => setBufferForm(prev => ({ ...prev, minutes: e.target.value }))} className="h-11 rounded-xl" />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setBufferOpen(false)}>Anuluj</Button>
            <Button
              className="rounded-xl"
              onClick={async () => {
                if (!bufferForm.label || !bufferForm.minutes) {
                  toast.error('Uzupełnij typ i czas bufora');
                  return;
                }
                try {
                  const created = await createSalonBreak({
                    type: 'BUFFER',
                    label: bufferForm.label,
                    minutes: Number(bufferForm.minutes),
                  });
                  setBreaks(prev => [...prev, created.break]);
                  setBufferForm({ label: '', minutes: '' });
                  setBufferOpen(false);
                  toast.success('Bufor dodany');
                } catch (err: any) {
                  toast.error(err.message || 'Błąd zapisu');
                }
              }}
            >
              Dodaj bufor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
