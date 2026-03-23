import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Shield, UserX, UserCheck, RefreshCw, LogOut, Trash2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageTransition, MotionList, MotionItem, HoverCard } from '@/components/motion';
import { toast } from 'sonner';
import { createAdminOwner, deleteAdminOwner, getAdminOwners, updateAdminOwner } from '@/lib/api';
import { clearAuth, getRole } from '@/lib/auth';

export default function SuperAdminPage() {
  const navigate = useNavigate();
  const role = getRole();
  const [owners, setOwners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [passwordDialogOwner, setPasswordDialogOwner] = useState<any | null>(null);
  const [deleteDialogOwner, setDeleteDialogOwner] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: '',
    phone: '',
    password: '',
    salonName: '',
    salonSlug: '',
  });

  const loadOwners = async () => {
    setLoading(true);
    try {
      const res = await getAdminOwners();
      setOwners(res.owners || []);
    } catch (err: any) {
      toast.error(err.message || 'Nie udało się pobrać ownerów');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadOwners();
  }, [navigate]);

  const stats = useMemo(() => {
    const active = owners.filter(o => o.active).length;
    const inactive = owners.filter(o => !o.active).length;
    return { total: owners.length, active, inactive };
  }, [owners]);

  if (role !== 'SUPER_ADMIN') {
    return (
      <PageTransition className="px-6 py-10">
        <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground">
          Brak dostępu.
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6 pb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold lg:text-2xl">Super Admin</h1>
            <p className="text-sm text-muted-foreground">Zarządzanie właścicielami salonów</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl h-9 gap-1.5"
            onClick={loadOwners}
          >
            <RefreshCw className="w-4 h-4" />Odśwież
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl h-9 gap-1.5"
            onClick={() => {
              clearAuth();
              navigate('/login');
            }}
          >
            <LogOut className="w-4 h-4" />Wyloguj
          </Button>
          <Button size="sm" className="rounded-xl h-9 gap-1.5" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4" />Dodaj ownera
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
        <span>Łącznie: {stats.total}</span>
        <span>•</span>
        <span>Aktywni: {stats.active}</span>
        <span>•</span>
        <span>Nieaktywni: {stats.inactive}</span>
      </div>

      {loading ? (
        <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground">
          Ładowanie ownerów...
        </div>
      ) : owners.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground text-center">
          Brak ownerów
        </div>
      ) : (
        <MotionList className="space-y-2">
          {owners.map(owner => (
            <MotionItem key={owner.id}>
              <HoverCard className="bg-card rounded-2xl p-4 border border-border flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{owner.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{owner.phone}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {owner.salon?.name || 'Brak salonu'}
                    </Badge>
                    {!owner.active && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">Oczekuje aktywacji</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-9 text-xs gap-1.5"
                    onClick={() => {
                      setPasswordDialogOwner(owner);
                      setNewPassword('');
                    }}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    Zmień hasło
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-9 text-xs gap-1.5"
                    onClick={async () => {
                      try {
                        const res = await updateAdminOwner(owner.id, { active: !owner.active });
                        await loadOwners();
                        if (owner.active) {
                          toast.success('Owner dezaktywowany');
                          return;
                        }
                        const info = res.activationEmail;
                        if (!info?.attempted) {
                          toast.success("Owner aktywowany");
                          return;
                        }
                        if (info.sent && info.sandbox) {
                          toast.success("Owner aktywowany. SendGrid przyjął e-mail w trybie sandbox (bez dostarczenia).");
                        } else if (info.sent) {
                          toast.success(
                            `Owner aktywowany. SendGrid przyjął e-mail${info.messageId ? ` (ID: ${info.messageId})` : ""}.`,
                          );
                        } else {
                          const reasonMap: Record<string, string> = {
                            missing_config: "brak konfiguracji SendGrid (SENDGRID_API_KEY / SENDGRID_FROM)",
                            fetch_unavailable: "brak dostępnego fetch w backendzie",
                            sendgrid_error: "błąd API SendGrid",
                            exception: "błąd podczas wysyłki",
                          };
                          toast.warning(
                            `Owner aktywowany, ale e-mail nie został wysłany: ${reasonMap[info.reason || ""] || "nieznany powód"}.`,
                          );
                        }
                      } catch (err: any) {
                        toast.error(err.message || 'Błąd zapisu');
                      }
                    }}
                  >
                    {owner.active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                    {owner.active ? 'Dezaktywuj' : 'Aktywuj'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-9 text-xs gap-1.5 text-destructive"
                    onClick={() => setDeleteDialogOwner(owner)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Usuń salon
                  </Button>
                </div>
              </HoverCard>
            </MotionItem>
          ))}
        </MotionList>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Dodaj ownera</DialogTitle>
            <DialogDescription>Utwórz nowego właściciela i salon</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <Input value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Telefon</label>
              <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Hasło</label>
              <Input type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} className="h-11 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nazwa salonu</label>
                <Input value={form.salonName} onChange={(e) => setForm(f => ({ ...f, salonName: e.target.value }))} className="h-11 rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Slug salonu</label>
                <Input value={form.salonSlug} onChange={(e) => setForm(f => ({ ...f, salonSlug: e.target.value }))} className="h-11 rounded-xl" />
              </div>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>Anuluj</Button>
            <Button
              className="rounded-xl"
              disabled={saving}
              onClick={async () => {
                if (!form.email || !form.phone || !form.password || !form.salonName || !form.salonSlug) {
                  toast.error('Uzupełnij wszystkie pola');
                  return;
                }
                setSaving(true);
                try {
                  await createAdminOwner({
                    email: form.email,
                    phone: form.phone,
                    password: form.password,
                    salonName: form.salonName,
                    salonSlug: form.salonSlug,
                  });
                  await loadOwners();
                  setForm({ email: '', phone: '', password: '', salonName: '', salonSlug: '' });
                  setDialogOpen(false);
                  toast.success('Owner utworzony');
                } catch (err: any) {
                  toast.error(err.message || 'Błąd zapisu');
                } finally {
                  setSaving(false);
                }
              }}
            >
              Dodaj ownera
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!passwordDialogOwner}
        onOpenChange={(open) => {
          if (!open) {
            setPasswordDialogOwner(null);
            setNewPassword('');
          }
        }}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Ręczna zmiana hasła ownera</DialogTitle>
            <DialogDescription>
              {passwordDialogOwner
                ? `Owner: ${passwordDialogOwner.email}`
                : 'Ustaw nowe hasło i wyślij je e-mailem do ownera.'}
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Nowe hasło</label>
            <Input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-11 rounded-xl"
              placeholder="Minimum 8 znaków"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Po zapisie owner otrzyma e-mail z nowym hasłem.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setPasswordDialogOwner(null)}>
              Anuluj
            </Button>
            <Button
              className="rounded-xl"
              onClick={async () => {
                if (!passwordDialogOwner) return;
                if (!newPassword || newPassword.length < 8) {
                  toast.error('Hasło musi mieć minimum 8 znaków');
                  return;
                }
                try {
                  const res = await updateAdminOwner(passwordDialogOwner.id, { password: newPassword });
                  await loadOwners();
                  setPasswordDialogOwner(null);
                  setNewPassword('');
                  const info = res.passwordEmail;
                  if (!info?.attempted) {
                    toast.success('Hasło zmienione');
                    return;
                  }
                  if (info.sent && info.sandbox) {
                    toast.success('Hasło zmienione. E-mail przyjęty w trybie sandbox (bez dostarczenia).');
                  } else if (info.sent) {
                    toast.success(`Hasło zmienione. E-mail z nowym hasłem został wysłany${info.messageId ? ` (ID: ${info.messageId})` : ''}.`);
                  } else {
                    toast.warning('Hasło zmienione, ale e-mail z nowym hasłem nie został wysłany.');
                  }
                } catch (err: any) {
                  toast.error(err.message || 'Nie udało się zmienić hasła');
                }
              }}
            >
              Zapisz i wyślij e-mail
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteDialogOwner}
        onOpenChange={(open) => {
          if (!open) setDeleteDialogOwner(null);
        }}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Usunąć salon całkowicie?</DialogTitle>
            <DialogDescription>
              {deleteDialogOwner?.salon?.name
                ? `Ta operacja usunie salon "${deleteDialogOwner.salon.name}" wraz z danymi powiązanymi i ownerem.`
                : 'Ta operacja usunie ownera i dane salonu bez możliwości cofnięcia.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteDialogOwner(null)}>
              Anuluj
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={async () => {
                if (!deleteDialogOwner) return;
                try {
                  await deleteAdminOwner(deleteDialogOwner.id);
                  await loadOwners();
                  setDeleteDialogOwner(null);
                  toast.success('Salon i owner zostali usunięci');
                } catch (err: any) {
                  toast.error(err.message || 'Nie udało się usunąć salonu');
                }
              }}
            >
              Usuń na stałe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
