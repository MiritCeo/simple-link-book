import { useMemo, useState, useEffect } from 'react';
import { ArrowLeft, Plus, Search, Trash2, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [tab, setTab] = useState<'active' | 'inactive' | 'deleted'>('active');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeServiceId, setActiveServiceId] = useState<string | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogService, setDeleteDialogService] = useState<any | null>(null);
  const [replacementServiceId, setReplacementServiceId] = useState<string>('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteStats, setDeleteStats] = useState<{ total: number; upcoming: number; past: number } | null>(null);
  const [form, setForm] = useState({
    name: '',
    category: '',
    duration: 30,
    price: 0,
    description: '',
    color: '',
    bookingVisible: true,
  });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getSalonServices()
      .then(res => { if (mounted) setServices(res.services || []); })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const activeServices = useMemo(() => services.filter((s: any) => s.active === true), [services]);
  const inactiveServices = useMemo(
    () => services.filter((s: any) => s.active === false && !/\[USUNIĘTA\]$/i.test(String(s.name || ''))),
    [services],
  );
  const deletedServices = useMemo(
    () => services.filter((s: any) => s.active === false && /\[USUNIĘTA\]$/i.test(String(s.name || ''))),
    [services],
  );
  const tabData = useMemo(() => {
    if (tab === 'inactive') return inactiveServices;
    if (tab === 'deleted') return deletedServices;
    return activeServices;
  }, [tab, activeServices, inactiveServices, deletedServices]);

  const filtered = useMemo(() => {
    if (!search) return tabData;
    const q = search.toLowerCase();
    return tabData.filter((s: any) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
  }, [search, tabData]);
  const replacementOptions = useMemo(
    () => activeServices.filter((s: any) => !deleteDialogService || s.id !== deleteDialogService.id),
    [activeServices, deleteDialogService],
  );

  const activeService = services.find((s: any) => s.id === activeServiceId);
  const categorySuggestions = useMemo(() => {
    const unique = Array.from(
      new Set(
        services
          .map((s: any) => String(s.category || '').trim())
          .filter(Boolean),
      ),
    );
    return unique.sort((a, b) => a.localeCompare(b, 'pl'));
  }, [services]);
  const openCreate = () => {
    setActiveServiceId(null);
    setForm({ name: '', category: '', duration: 30, price: 0, description: '', color: '', bookingVisible: true });
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
      color: svc?.color || '',
      bookingVisible: svc?.bookingVisible !== false,
    });
    setDialogOpen(true);
  };

  const refresh = () => getSalonServices().then(res => setServices(res.services || []));
  const toUpdatePayload = (service: any, overrides?: Partial<{
    name: string;
    category: string;
    duration: number;
    price: number;
    description?: string;
    color?: string;
    active?: boolean;
    bookingVisible?: boolean;
  }>) => ({
    name: String(service?.name || '').trim(),
    category: String(service?.category || '').trim(),
    duration: Number(service?.duration || 0),
    price: Number(service?.price || 0),
    description: typeof service?.description === 'string' ? service.description : undefined,
    color: typeof service?.color === 'string' ? service.color : undefined,
    active: typeof service?.active === 'boolean' ? service.active : undefined,
    bookingVisible: typeof service?.bookingVisible === 'boolean' ? service.bookingVisible : undefined,
    ...(overrides || {}),
  });

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

      <div className="mb-3 flex flex-wrap gap-2">
        <Button size="sm" variant={tab === 'active' ? 'default' : 'outline'} className="rounded-xl h-8 text-xs" onClick={() => setTab('active')}>
          Aktywne ({activeServices.length})
        </Button>
        <Button size="sm" variant={tab === 'inactive' ? 'default' : 'outline'} className="rounded-xl h-8 text-xs" onClick={() => setTab('inactive')}>
          Nieaktywne ({inactiveServices.length})
        </Button>
        <Button size="sm" variant={tab === 'deleted' ? 'default' : 'outline'} className="rounded-xl h-8 text-xs" onClick={() => setTab('deleted')}>
          Usunięte ({deletedServices.length})
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mb-3">{filtered.length} usług</p>

      {loading ? (
        <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground">
          Ładowanie usług...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground text-center">
          Brak usług w tej zakładce
        </div>
      ) : (
        <MotionList className="space-y-2">
          {filtered.map(service => (
            <MotionItem key={service.id}>
              {(() => {
                const isDeleted = /\[USUNIĘTA\]$/i.test(String(service.name || ''));
                return (
              <HoverCard className="bg-card rounded-2xl p-4 border border-border flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {service.color && (
                      <span className="inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: service.color }} />
                    )}
                    <p className="font-medium text-sm">{service.name.replace(/\s*\[USUNIĘTA\]$/i, '')}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{service.description || 'Brak opisu'}</p>
                {!isDeleted && (
                  <div className="mt-2 flex items-center gap-2">
                    <Switch
                      checked={service.bookingVisible !== false}
                      onCheckedChange={(checked) => {
                        updateService(service.id, toUpdatePayload(service, { bookingVisible: checked }))
                          .then(() => refresh())
                          .then(() => toast.success(checked ? 'Usługa widoczna w rezerwacji' : 'Usługa ukryta w rezerwacji'))
                          .catch((err) => toast.error(err.message || 'Błąd zapisu'));
                      }}
                    />
                    <span className="text-xs text-muted-foreground">
                      Widoczna w rezerwacji
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-[10px]">{service.category}</Badge>
                  {service.active === false && !isDeleted && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">Nieaktywna</Badge>
                  )}
                  {isDeleted && (
                    <Badge variant="outline" className="text-[10px] text-destructive">Usunięta</Badge>
                  )}
                  {service.bookingVisible === false && !isDeleted && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">Ukryta w rezerwacji</Badge>
                  )}
                    <span className="text-[11px] text-muted-foreground">{service.duration} min</span>
                    <span className="text-[11px] text-muted-foreground">{service.price} zł</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs gap-1.5" onClick={() => openEdit(service.id)}>
                    <Pencil className="w-3.5 h-3.5" />Edytuj
                  </Button>
                  {!isDeleted && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs gap-1.5">
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
                      updateService(service.id, toUpdatePayload(service, { active: nextActive }))
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
                  )}
                  {!isDeleted && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs gap-1.5 text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />Usuń
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Usunąć usługę?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Usługa trafi do zakładki Usunięte. Jeśli ma przypisane wizyty, trzeba wskazać usługę zastępczą.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Anuluj</AlertDialogCancel>
                        <AlertDialogAction
                          className="rounded-xl"
                          onClick={() => {
                            setDeleteDialogService(service);
                            setReplacementServiceId('');
                            setDeleteStats(null);
                          }}
                        >
                          Dalej
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  )}
                </div>
              </HoverCard>
                );
              })()}
            </MotionItem>
          ))}
        </MotionList>
      )}

      <Dialog
        open={!!deleteDialogService}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialogService(null);
            setReplacementServiceId('');
            setDeleteStats(null);
          }
        }}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Usuń usługę</DialogTitle>
            <DialogDescription>
              {deleteDialogService ? `Usługa: ${String(deleteDialogService.name || '').replace(/\s*\[USUNIĘTA\]$/i, '')}` : 'Wybierz sposób usunięcia usługi.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {deleteStats && (
              <div className="rounded-xl border border-border p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Wykryto przypisane wizyty</p>
                <p>Łącznie: {deleteStats.total}</p>
                <p>Nadchodzące: {deleteStats.upcoming}</p>
                <p>Historyczne: {deleteStats.past}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Przepisz wizyty do usługi</label>
              <Select value={replacementServiceId} onValueChange={setReplacementServiceId}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Wybierz usługę zastępczą (gdy są wizyty)" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {replacementOptions.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {String(s.name || '').replace(/\s*\[USUNIĘTA\]$/i, '')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteDialogService(null)}>
              Anuluj
            </Button>
            <Button
              className="rounded-xl"
              disabled={deleteLoading}
              onClick={async () => {
                if (!deleteDialogService) return;
                setDeleteLoading(true);
                try {
                  const result = await deleteService(deleteDialogService.id, replacementServiceId ? { replacementServiceId } : undefined);
                  await refresh();
                  setDeleteDialogService(null);
                  setReplacementServiceId('');
                  setDeleteStats(null);
                  toast.success(
                    result.reassignedAppointments && result.reassignedAppointments > 0
                      ? `Usługa usunięta. Przepisano ${result.reassignedAppointments} wizyt.`
                      : 'Usługa usunięta.',
                  );
                } catch (err: any) {
                  if (err?.code === 'service_has_appointments') {
                    setDeleteStats(err.stats || null);
                    toast.warning(err.messagePl || 'Usługa ma przypisane wizyty — wybierz zastępstwo.');
                  } else {
                    toast.error(err.messagePl || err.message || 'Nie udało się usunąć usługi');
                  }
                } finally {
                  setDeleteLoading(false);
                }
              }}
            >
              {deleteLoading ? 'Usuwanie...' : 'Usuń usługę'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <Input
                value={form.category}
                onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="Np. Fryzjerstwo"
                className="h-11 rounded-xl"
                list="service-category-suggestions"
              />
              <datalist id="service-category-suggestions">
                {categorySuggestions.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
              {!!categorySuggestions.length && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Możesz wybrać istniejącą kategorię lub wpisać nową.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Czas trwania (min)</label>
                <Input value={form.duration} onChange={(e) => setForm(f => ({ ...f, duration: Number(e.target.value) }))} placeholder="45" className="h-11 rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Cena (zł)</label>
                <Input value={form.price} onChange={(e) => setForm(f => ({ ...f, price: Number(e.target.value) }))} placeholder="120" className="h-11 rounded-xl" />
                <p className="mt-1 text-xs text-muted-foreground">
                  Ustaw <span className="font-medium">0 zł</span>, jeśli cena ma być ukryta w formularzu rezerwacji.
                </p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Opis</label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Opcjonalny opis usługi" className="rounded-xl min-h-[90px]" />
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
              <label className="text-sm font-medium">Kolor</label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={form.color || '#e11d48'}
                  onChange={(e) => setForm(f => ({ ...f, color: e.target.value }))}
                  className="h-10 w-16 p-1 rounded-xl"
                />
                <Input
                  placeholder="#E11D48"
                  value={form.color}
                  onChange={(e) => setForm(f => ({ ...f, color: e.target.value }))}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-medium">Widoczna w formularzu rezerwacji</p>
                <p className="text-xs text-muted-foreground">Gdy wyłączone, usługa zostaje w panelu, ale klient jej nie zobaczy.</p>
              </div>
              <Switch
                checked={form.bookingVisible}
                onCheckedChange={(checked) => setForm(f => ({ ...f, bookingVisible: checked }))}
              />
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
