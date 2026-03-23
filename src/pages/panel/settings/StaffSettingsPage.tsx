import { useMemo, useState, useEffect } from 'react';
import { ArrowLeft, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { dedupeSalonStaff, deleteStaff, getSalonStaff } from '@/lib/api';
import { toast } from 'sonner';
import { normalizeAssetUrl } from '@/lib/url';
import { PageTransition, MotionList, MotionItem, HoverCard } from '@/components/motion';
import { motion } from 'framer-motion';

export default function StaffSettingsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dedupeLoading, setDedupeLoading] = useState(false);
  const [deleteDialogStaff, setDeleteDialogStaff] = useState<any | null>(null);
  const [replacementStaffId, setReplacementStaffId] = useState<string>('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteStats, setDeleteStats] = useState<{ total: number; upcoming: number; past: number } | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getSalonStaff()
      .then((staffRes) => {
        if (!mounted) return;
        setStaff(staffRes.staff || []);
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!search) return staff;
    const q = search.toLowerCase();
    return staff.filter((s: any) => s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q));
  }, [search, staff]);
  const openCreate = () => navigate('/panel/ustawienia/pracownicy/nowy');
  const openEdit = (id: string) => navigate(`/panel/ustawienia/pracownicy/${id}`);
  const replacementOptions = useMemo(
    () =>
      staff.filter((s: any) => s.active !== false && deleteDialogStaff && s.id !== deleteDialogStaff.id),
    [staff, deleteDialogStaff],
  );

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
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="rounded-xl h-11"
                disabled={dedupeLoading || loading}
              >
                {dedupeLoading ? 'Scalanie...' : 'Scal duplikaty'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Scalić duplikaty pracowników?</AlertDialogTitle>
                <AlertDialogDescription>
                  Operacja połączy duplikaty po imieniu i nazwisku, przeniesie wizyty/grafik/usługi do rekordu głównego i usunie powtórzenia.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Anuluj</AlertDialogCancel>
                <AlertDialogAction
                  className="rounded-xl"
                  onClick={async () => {
                    setDedupeLoading(true);
                    try {
                      const result = await dedupeSalonStaff();
                      const refreshed = await getSalonStaff();
                      setStaff(refreshed.staff || []);
                      if (result.removed > 0) {
                        toast.success(
                          `Scalono duplikaty: usunięto ${result.removed}, pozostawiono ${result.kept}.`,
                        );
                      } else {
                        toast.info('Nie znaleziono duplikatów pracowników do scalenia.');
                      }
                      if (result.conflicts > 0) {
                        toast.warning(
                          `Wykryto ${result.conflicts} konfliktów kont użytkownika. Sprawdź raport w API (/api/salon/staff/dedupe).`,
                        );
                      }
                    } catch (err: any) {
                      toast.error(err.message || 'Nie udało się scalić duplikatów');
                    } finally {
                      setDedupeLoading(false);
                    }
                  }}
                >
                  Scal teraz
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button className="rounded-xl h-11 gap-1.5" onClick={openCreate}>
              <Plus className="w-4 h-4" />Dodaj pracownika
            </Button>
          </motion.div>
        </div>
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
                <div className="min-w-0 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden text-xs font-semibold">
                    {staff.photoUrl ? (
                      <img src={normalizeAssetUrl(staff.photoUrl)} alt={staff.name} className="h-full w-full object-cover" />
                    ) : (
                      <span>{staff.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}</span>
                    )}
                  </div>
                  <div>
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
                        <Trash2 className="w-3.5 h-3.5" />Usuń
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Usunąć pracownika?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Jeśli pracownik ma przypisane wizyty, system poprosi o przepisanie ich do innej osoby.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Anuluj</AlertDialogCancel>
                        <AlertDialogAction
                          className="rounded-xl"
                          onClick={() => {
                            setDeleteDialogStaff(staff);
                            setReplacementStaffId('');
                            setDeleteStats(null);
                          }}
                        >
                          Dalej
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

      <Dialog
        open={!!deleteDialogStaff}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialogStaff(null);
            setReplacementStaffId('');
            setDeleteStats(null);
          }
        }}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Usuń pracownika</DialogTitle>
            <DialogDescription>
              {deleteDialogStaff ? `Pracownik: ${deleteDialogStaff.name}` : 'Wybierz sposób usunięcia pracownika.'}
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
              <label className="text-sm font-medium mb-1.5 block">Przepisz wizyty do pracownika</label>
              <Select value={replacementStaffId} onValueChange={setReplacementStaffId}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Wybierz pracownika (gdy są wizyty)" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {replacementOptions.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Jeśli pracownik nie ma wizyt, usunięcie przejdzie bez wyboru.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteDialogStaff(null)}>
              Anuluj
            </Button>
            <Button
              className="rounded-xl"
              disabled={deleteLoading}
              onClick={async () => {
                if (!deleteDialogStaff) return;
                setDeleteLoading(true);
                try {
                  const result = await deleteStaff(deleteDialogStaff.id, replacementStaffId ? { replacementStaffId } : undefined);
                  const refreshed = await getSalonStaff();
                  setStaff(refreshed.staff || []);
                  setDeleteDialogStaff(null);
                  setReplacementStaffId('');
                  setDeleteStats(null);
                  toast.success(
                    result.reassignedAppointments && result.reassignedAppointments > 0
                      ? `Pracownik usunięty. Przepisano ${result.reassignedAppointments} wizyt.`
                      : 'Pracownik usunięty.',
                  );
                } catch (err: any) {
                  if (err?.code === 'staff_has_appointments') {
                    setDeleteStats(err.stats || null);
                    toast.warning(err.messagePl || 'Pracownik ma przypisane wizyty — wybierz zastępstwo.');
                  } else {
                    toast.error(err.messagePl || err.message || 'Nie udało się usunąć pracownika');
                  }
                } finally {
                  setDeleteLoading(false);
                }
              }}
            >
              {deleteLoading ? 'Usuwanie...' : 'Usuń pracownika'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </PageTransition>
  );
}
