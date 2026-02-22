import { useMemo, useState, useEffect } from 'react';
import { ArrowLeft, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
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
import { createStaff, getSalonServices, getSalonStaff, updateStaff } from '@/lib/api';
import { toast } from 'sonner';
import { PageTransition, MotionList, MotionItem, HoverCard } from '@/components/motion';
import { motion } from 'framer-motion';

export default function StaffSettingsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([getSalonStaff(), getSalonServices()])
      .then(([staffRes, servicesRes]) => {
        if (!mounted) return;
        setStaff(staffRes.staff || []);
        setServices(servicesRes.services || []);
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!search) return staff;
    const q = search.toLowerCase();
    return staff.filter((s: any) => s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q));
  }, [search, staff]);
  const filteredServices = useMemo(() => {
    const active = services.filter((s: any) => s.active !== false);
    if (!serviceSearch) return active;
    const q = serviceSearch.toLowerCase();
    return active.filter((s: any) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
  }, [serviceSearch, services]);

  const [form, setForm] = useState({ name: '', role: '', phone: '' });
  const openCreate = () => { 
    setSelectedServiceIds([]); 
    setServiceSearch(''); 
    setForm({ name: '', role: '', phone: '' });
    setDialogOpen(true); 
  };
  const openEdit = (id: string) => navigate(`/panel/ustawienia/pracownicy/${id}`);

  return (
    <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6 pb-8">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/panel/ustawienia')} className="rounded-xl h-9 px-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold lg:text-2xl">Pracownicy</h1>
          <p className="text-sm text-muted-foreground">Zarządzaj zespołem i kontami</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj pracownika..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl"
          />
        </div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button className="rounded-xl h-11 gap-1.5" onClick={openCreate}>
            <Plus className="w-4 h-4" />Dodaj pracownika
          </Button>
        </motion.div>
      </div>

      <p className="text-xs text-muted-foreground mb-3">{filtered.length} pracowników</p>

      {loading ? (
        <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground">
          Ładowanie pracowników...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground text-center">
          Brak pracowników
        </div>
      ) : (
        <MotionList className="space-y-2">
          {filtered.map(staff => (
            <MotionItem key={staff.id}>
              <HoverCard className="bg-card rounded-2xl p-4 border border-border flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{staff.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{staff.role}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {staff.services?.length ?? 0} usług
                    </Badge>
                  {staff.active === false && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">Nieaktywny</Badge>
                  )}
                    {(staff.services || []).slice(0, 2).map((service: any) => (
                      <span key={service.id} className="text-[11px] text-muted-foreground">
                        {service.name}
                      </span>
                    ))}
                    {(staff.services || []).length > 2 && (
                      <span className="text-[11px] text-muted-foreground">+{(staff.services || []).length - 2}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-9 text-xs"
                    onClick={() => navigate(`/panel/grafik/${staff.id}`)}
                  >
                    Grafik
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs gap-1.5" onClick={() => openEdit(staff.id)}>
                    <Pencil className="w-3.5 h-3.5" />Edytuj
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs gap-1.5 text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />{staff.active === false ? 'Aktywuj' : 'Dezaktywuj'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                      <AlertDialogHeader>
                      <AlertDialogTitle>{staff.active === false ? 'Aktywować pracownika?' : 'Dezaktywować pracownika?'}</AlertDialogTitle>
                        <AlertDialogDescription>
                        {staff.active === false ? 'Pracownik wróci do listy.' : 'Pracownik nie będzie dostępny w rezerwacjach.'}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Anuluj</AlertDialogCancel>
                  <AlertDialogAction
                    className="rounded-xl"
                    onClick={() => {
                    const nextActive = staff.active === false;
                    updateStaff(staff.id, {
                      name: staff.name,
                      role: staff.role,
                      phone: staff.phone,
                      active: nextActive,
                      serviceIds: staff.services?.map((s: any) => s.id) ?? [],
                    })
                      .then(() => getSalonStaff().then(res => setStaff(res.staff || [])))
                      .then(() => toast.success(nextActive ? 'Pracownik aktywowany' : 'Pracownik dezaktywowany'))
                      .catch((err) => toast.error(err.message || 'Błąd zapisu'));
                    }}
                  >
                  {staff.active === false ? 'Aktywuj' : 'Dezaktywuj'}
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

      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold">Grafik pracowników</h2>
            <p className="text-xs text-muted-foreground">Zarządzaj dostępnościami w dedykowanym module</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl h-9 text-xs"
            onClick={() => navigate('/panel/grafik')}
          >
            Otwórz grafik
          </Button>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 text-xs text-muted-foreground">
          Przejdź do modułu „Grafik”, aby ustawiać dostępności, wyjątki i reguły rotacyjne.
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Dodaj pracownika</DialogTitle>
            <DialogDescription>Utwórz nowego pracownika w salonie</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Imię i nazwisko</label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Np. Anna Kowalska" className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Rola</label>
              <Input value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Np. Fryzjer stylista" className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Telefon</label>
              <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+48 500 000 000" className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Usługi</label>
              <Input
                placeholder="Szukaj usługi..."
                value={serviceSearch}
                onChange={e => setServiceSearch(e.target.value)}
                className="h-10 rounded-xl mb-2"
              />
              <div className="max-h-36 overflow-auto rounded-xl border border-border bg-card">
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
              <div className="text-xs text-muted-foreground mt-2">
                Wybrane: {selectedServiceIds.length}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>Anuluj</Button>
            <Button
              className="rounded-xl"
              onClick={async () => {
                try {
                  await createStaff({ ...form, serviceIds: selectedServiceIds });
                  toast.success('Pracownik dodany');
                  const res = await getSalonStaff();
                  setStaff(res.staff || []);
                  setDialogOpen(false);
                } catch (err: any) {
                  toast.error(err.message || 'Błąd zapisu');
                }
              }}
            >
              Dodaj pracownika
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </PageTransition>
  );
}
