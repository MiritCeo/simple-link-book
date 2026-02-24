import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Pencil, ArrowRightLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageTransition, MotionList, MotionItem, HoverCard } from '@/components/motion';
import { getUserSalons, createUserSalon, updateUserSalon, switchSalon } from '@/lib/api';
import { setActiveSalonId, setSalons, getActiveSalonId } from '@/lib/auth';
import { toast } from 'sonner';

export default function SalonsSettingsPage() {
  const navigate = useNavigate();
  const [salons, setSalonsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', phone: '', address: '', hours: '', description: '' });
  const activeSalonId = getActiveSalonId();

  const loadSalons = () => {
    setLoading(true);
    getUserSalons()
      .then(res => {
        setSalonsList(res.salons || []);
        setSalons(res.salons || []);
        window.dispatchEvent(new Event("salonsUpdated"));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSalons();
  }, []);

  const openEdit = (salon: any) => {
    setEditing(salon);
    setForm({
      name: salon.name || '',
      slug: salon.slug || '',
      phone: salon.phone || '',
      address: salon.address || '',
      hours: salon.hours || '',
      description: salon.description || '',
    });
    setEditOpen(true);
  };

  return (
    <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6 pb-8">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/panel/ustawienia')} className="rounded-xl h-9 px-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold lg:text-2xl">Salony</h1>
          <p className="text-sm text-muted-foreground">Zarządzaj salonami w ramach konta</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">{salons.length} salonów</p>
        <Button size="sm" className="rounded-xl h-9 gap-1.5" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" />Dodaj salon
        </Button>
      </div>

      {loading ? (
        <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground">
          Ładowanie salonów...
        </div>
      ) : salons.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground text-center">
          Brak salonów
        </div>
      ) : (
        <MotionList className="space-y-2">
          {salons.map(salon => (
            <MotionItem key={salon.id}>
              <HoverCard className="bg-card rounded-2xl p-4 border border-border flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{salon.name}</p>
                  <p className="text-xs text-muted-foreground">/{salon.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  {activeSalonId === salon.id && (
                    <span className="text-[10px] text-primary">Aktywny</span>
                  )}
                  <span className="text-[10px] text-muted-foreground">{salon.role}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-8 text-xs gap-1.5"
                    onClick={() => openEdit(salon)}
                  >
                    <Pencil className="w-3.5 h-3.5" />Edytuj
                  </Button>
                  {activeSalonId !== salon.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl h-8 text-xs gap-1.5"
                      onClick={async () => {
                        try {
                          await switchSalon(salon.id);
                          setActiveSalonId(salon.id);
                          window.dispatchEvent(new Event("salonChanged"));
                          toast.success('Salon przełączony');
                          navigate('/panel/kalendarz');
                        } catch (err: any) {
                          toast.error(err.message || 'Nie udało się przełączyć salonu');
                        }
                      }}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />Przełącz
                    </Button>
                  )}
                </div>
              </HoverCard>
            </MotionItem>
          ))}
        </MotionList>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Dodaj salon</DialogTitle>
            <DialogDescription>Utwórz nowy salon i przypisz go do konta</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Nazwa</label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Slug</label>
              <Input value={form.slug} onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="np. salon-krakow" className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Telefon</label>
              <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Adres</label>
              <Input value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Godziny</label>
              <Input value={form.hours} onChange={(e) => setForm(f => ({ ...f, hours: e.target.value }))} placeholder="Pn–Pt 9:00–20:00" className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Opis</label>
              <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="h-11 rounded-xl" />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setAddOpen(false)}>Anuluj</Button>
            <Button
              className="rounded-xl"
              onClick={async () => {
                if (!form.name || !form.slug || !form.phone || !form.address) {
                  toast.error('Uzupełnij wymagane поля');
                  return;
                }
                try {
                  await createUserSalon(form);
                  setForm({ name: '', slug: '', phone: '', address: '', hours: '', description: '' });
                  setAddOpen(false);
                  loadSalons();
                  toast.success('Salon dodany');
                } catch (err: any) {
                  toast.error(err.message || 'Błąd zapisu');
                }
              }}
            >
              Dodaj salon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edytuj salon</DialogTitle>
            <DialogDescription>Aktualizuj dane salonu</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Nazwa</label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Slug</label>
              <Input value={form.slug} onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="np. salon-krakow" className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Telefon</label>
              <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Adres</label>
              <Input value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Godziny</label>
              <Input value={form.hours} onChange={(e) => setForm(f => ({ ...f, hours: e.target.value }))} placeholder="Pn–Pt 9:00–20:00" className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Opis</label>
              <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="h-11 rounded-xl" />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setEditOpen(false)}>Anuluj</Button>
            <Button
              className="rounded-xl"
              onClick={async () => {
                if (!editing) return;
                if (!form.name || !form.slug || !form.phone || !form.address) {
                  toast.error('Uzupełnij wymagane pola');
                  return;
                }
                try {
                  await updateUserSalon(editing.id, form);
                  setEditOpen(false);
                  loadSalons();
                  toast.success('Salon zaktualizowany');
                  window.dispatchEvent(new Event("salonChanged"));
                } catch (err: any) {
                  toast.error(err.message || 'Błąd zapisu');
                }
              }}
            >
              Zapisz zmiany
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
