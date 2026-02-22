import { useMemo, useState, useEffect } from 'react';
import { ArrowLeft, Plus, Search, Trash2, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import { createService, deleteService, getSalonServices, updateService } from '@/lib/api';
import { toast } from 'sonner';
import { PageTransition, MotionList, MotionItem, HoverCard } from '@/components/motion';
import { motion } from 'framer-motion';

export default function ServicesSettingsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeServiceId, setActiveServiceId] = useState<string | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', category: '', duration: 30, price: 0, description: '' });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getSalonServices()
      .then(res => { if (mounted) setServices(res.services || []); })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!search) return services;
    const q = search.toLowerCase();
    return services.filter((s: any) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
  }, [search, services]);

  const activeService = services.find((s: any) => s.id === activeServiceId);
  const openCreate = () => {
    setActiveServiceId(null);
    setForm({ name: '', category: '', duration: 30, price: 0, description: '' });
    setDialogOpen(true);
  };
  const openEdit = (id: string) => {
    const svc = services.find((s: any) => s.id === id);
    setActiveServiceId(id);
    setForm({
      name: svc?.name || '',
      category: svc?.category || '',
      duration: svc?.duration || 30,
      price: svc?.price || 0,
      description: svc?.description || '',
    });
    setDialogOpen(true);
  };

  const refresh = () => getSalonServices().then(res => setServices(res.services || []));

  return (
    <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6 pb-8">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/panel/ustawienia')} className="rounded-xl h-9 px-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold lg:text-2xl">Usługi</h1>
          <p className="text-sm text-muted-foreground">Zarządzaj usługami i cenami</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj usługi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl"
          />
        </div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button className="rounded-xl h-11 gap-1.5" onClick={openCreate}>
            <Plus className="w-4 h-4" />Dodaj usługę
          </Button>
        </motion.div>
      </div>

      <p className="text-xs text-muted-foreground mb-3">{filtered.length} usług</p>

      {loading ? (
        <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground">
          Ładowanie usług...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground text-center">
          Brak usług
        </div>
      ) : (
        <MotionList className="space-y-2">
          {filtered.map(service => (
            <MotionItem key={service.id}>
              <HoverCard className="bg-card rounded-2xl p-4 border border-border flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{service.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{service.description || 'Brak opisu'}</p>
                <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-[10px]">{service.category}</Badge>
                  {service.active === false && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">Nieaktywna</Badge>
                  )}
                    <span className="text-[11px] text-muted-foreground">{service.duration} min</span>
                    <span className="text-[11px] text-muted-foreground">{service.price} zł</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs gap-1.5" onClick={() => openEdit(service.id)}>
                    <Pencil className="w-3.5 h-3.5" />Edytuj
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs gap-1.5 text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />{service.active === false ? 'Aktywuj' : 'Dezaktywuj'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                      <AlertDialogHeader>
                      <AlertDialogTitle>{service.active === false ? 'Aktywować usługę?' : 'Dezaktywować usługę?'}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {service.active === false ? 'Usługa wróci do oferty.' : 'Usługa nie będzie widoczna w rezerwacjach.'}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Anuluj</AlertDialogCancel>
                  <AlertDialogAction
                    className="rounded-xl"
                    onClick={() => {
                      const nextActive = service.active === false;
                      updateService(service.id, { ...service, active: nextActive })
                        .then(() => refresh())
                        .then(() => toast.success(nextActive ? 'Usługa aktywowana' : 'Usługa dezaktywowana'))
                        .catch((err) => toast.error(err.message || 'Błąd zapisu'));
                    }}
                  >
                    {service.active === false ? 'Aktywuj' : 'Dezaktywuj'}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{activeService ? 'Edytuj usługę' : 'Dodaj usługę'}</DialogTitle>
            <DialogDescription>Formularz usługi</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Nazwa usługi</label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Np. Strzyżenie damskie" className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Kategoria</label>
              <Input value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Np. Fryzjerstwo" className="h-11 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Czas trwania (min)</label>
                <Input value={form.duration} onChange={(e) => setForm(f => ({ ...f, duration: Number(e.target.value) }))} placeholder="45" className="h-11 rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Cena (zł)</label>
                <Input value={form.price} onChange={(e) => setForm(f => ({ ...f, price: Number(e.target.value) }))} placeholder="120" className="h-11 rounded-xl" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Opis</label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Opcjonalny opis usługi" className="rounded-xl min-h-[90px]" />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>Anuluj</Button>
            <Button
              className="rounded-xl"
              onClick={async () => {
                try {
                  if (activeServiceId) {
                    await updateService(activeServiceId, form);
                    toast.success('Usługa zaktualizowana');
                  } else {
                    await createService(form);
                    toast.success('Usługa dodana');
                  }
                  await refresh();
                  setDialogOpen(false);
                } catch (err: any) {
                  toast.error(err.message || 'Błąd zapisu');
                }
              }}
            >
              {activeServiceId ? 'Zapisz zmiany' : 'Dodaj usługę'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
