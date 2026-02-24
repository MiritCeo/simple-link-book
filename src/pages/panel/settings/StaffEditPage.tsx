import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageTransition } from '@/components/motion';
import { toast } from 'sonner';
import { createStaffAccount, getSalonServices, getSalonStaff, updateStaff, updateStaffAccount } from '@/lib/api';

export default function StaffEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<any | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [form, setForm] = useState({ name: '', role: '', phone: '' });
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [accountRole, setAccountRole] = useState<'OWNER' | 'STAFF'>('STAFF');
  const [inventoryRole, setInventoryRole] = useState<'ADMIN' | 'MANAGER' | 'STAFF'>('STAFF');

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [staffRes, servicesRes] = await Promise.all([getSalonStaff(), getSalonServices()]);
      const staffRec = (staffRes.staff || []).find((s: any) => s.id === id) || null;
      setStaff(staffRec);
      setServices(servicesRes.services || []);
      if (staffRec) {
        setForm({ name: staffRec.name || '', role: staffRec.role || '', phone: staffRec.phone || '' });
        setSelectedServiceIds(staffRec.services?.map((s: any) => s.id) ?? []);
        setAccountEmail(staffRec.user?.email || '');
        setAccountRole(staffRec.user?.role || 'STAFF');
        setInventoryRole(staffRec.inventoryRole || 'STAFF');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const filteredServices = useMemo(() => {
    const active = services.filter((s: any) => s.active !== false);
    if (!serviceSearch) return active;
    const q = serviceSearch.toLowerCase();
    return active.filter((s: any) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
  }, [serviceSearch, services]);

  if (loading) {
    return (
      <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6 pb-8">
        <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground">
          Ładowanie danych pracownika...
        </div>
      </PageTransition>
    );
  }

  if (!staff) {
    return (
      <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6 pb-8">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/panel/ustawienia/pracownicy')} className="rounded-xl h-9 px-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold lg:text-2xl">Edytuj pracownika</h1>
            <p className="text-sm text-muted-foreground">Nie znaleziono pracownika</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground">
          Ten pracownik nie istnieje lub został usunięty.
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6 pb-8">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/panel/ustawienia/pracownicy')} className="rounded-xl h-9 px-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold lg:text-2xl truncate">Edytuj pracownika</h1>
          <p className="text-sm text-muted-foreground truncate">{staff.name}</p>
        </div>
        {staff.active === false && (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">Nieaktywny</Badge>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-border p-4">
            <h2 className="text-sm font-semibold mb-3">Dane pracownika</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Imię i nazwisko</label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="h-11 rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Rola</label>
                <Input value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))} className="h-11 rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Telefon</label>
                <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className="h-11 rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Uprawnienia magazynowe</label>
                <Select value={inventoryRole} onValueChange={(val) => setInventoryRole(val as 'ADMIN' | 'MANAGER' | 'STAFF')}>
                  <SelectTrigger className="h-11 rounded-xl text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="ADMIN">Administrator (pełne zarządzanie)</SelectItem>
                    <SelectItem value="MANAGER">Kierownik (obsługa magazynu)</SelectItem>
                    <SelectItem value="STAFF">Pracownik (tylko odczyt)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4">
            <h2 className="text-sm font-semibold mb-3">Usługi</h2>
            <Input
              placeholder="Szukaj usługi..."
              value={serviceSearch}
              onChange={e => setServiceSearch(e.target.value)}
              className="h-10 rounded-xl mb-3"
            />
            <div className="max-h-64 overflow-auto rounded-xl border border-border bg-card">
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

        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-border p-4">
            <h2 className="text-sm font-semibold mb-3">Konto pracownika</h2>
            {staff.user ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span>Email</span>
                  <span className="text-muted-foreground">{staff.user.email}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>Rola</span>
                  <span className="text-muted-foreground">{staff.user.role}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>Status</span>
                  <span className="text-muted-foreground">{staff.user.active ? 'Aktywne' : 'Nieaktywne'}</span>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Zmień rolę</label>
                  <Select value={accountRole} onValueChange={(val) => setAccountRole(val as 'OWNER' | 'STAFF')}>
                    <SelectTrigger className="h-9 rounded-xl text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="OWNER">OWNER</SelectItem>
                      <SelectItem value="STAFF">STAFF</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-8 text-xs mt-2"
                    onClick={async () => {
                      try {
                        await updateStaffAccount(staff.id, { role: accountRole });
                        await loadData();
                        toast.success('Rola zaktualizowana');
                      } catch (err: any) {
                        toast.error(err.message || 'Błąd zapisu');
                      }
                    }}
                  >
                    Zapisz rolę
                  </Button>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Nowe hasło</label>
                  <Input value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="••••••••" className="h-10 rounded-xl" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-8 text-xs"
                    onClick={async () => {
                      try {
                        await updateStaffAccount(staff.id, { active: !staff.user.active });
                        await loadData();
                        toast.success(staff.user.active ? 'Pracownik dezaktywowany' : 'Pracownik aktywowany');
                      } catch (err: any) {
                        toast.error(err.message || 'Błąd zapisu');
                      }
                    }}
                  >
                    {staff.user.active ? 'Dezaktywuj' : 'Aktywuj'}
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-xl h-8 text-xs"
                    onClick={async () => {
                      if (!resetPassword || resetPassword.length < 8) {
                        toast.error('Hasło musi mieć min. 8 znaków');
                        return;
                      }
                      try {
                        await updateStaffAccount(staff.id, { password: resetPassword });
                        setResetPassword('');
                        toast.success('Hasło zresetowane');
                      } catch (err: any) {
                        toast.error(err.message || 'Błąd zapisu');
                      }
                    }}
                  >
                    Resetuj hasło
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Email</label>
                  <Input value={accountEmail} onChange={(e) => setAccountEmail(e.target.value)} placeholder="pracownik@example.com" className="h-10 rounded-xl" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Rola</label>
                  <Select value={accountRole} onValueChange={(val) => setAccountRole(val as 'OWNER' | 'STAFF')}>
                    <SelectTrigger className="h-9 rounded-xl text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="OWNER">OWNER</SelectItem>
                      <SelectItem value="STAFF">STAFF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Hasło</label>
                  <Input value={accountPassword} onChange={(e) => setAccountPassword(e.target.value)} placeholder="••••••••" className="h-10 rounded-xl" />
                </div>
                <Button
                  size="sm"
                  className="rounded-xl h-8 text-xs"
                  onClick={async () => {
                    if (!accountEmail || accountPassword.length < 8) {
                      toast.error('Podaj email i hasło (min. 8 znaków)');
                      return;
                    }
                    try {
                      await createStaffAccount(staff.id, { email: accountEmail, password: accountPassword });
                      await updateStaffAccount(staff.id, { role: accountRole });
                      await loadData();
                      toast.success('Konto pracownika utworzone');
                    } catch (err: any) {
                      toast.error(err.message || 'Błąd zapisu');
                    }
                  }}
                >
                  Utwórz konto
                </Button>
              </div>
            )}
          </div>

          <div className="bg-card rounded-2xl border border-border p-4">
            <h2 className="text-sm font-semibold mb-3">Zapisz zmiany</h2>
            <Button
              className="rounded-xl w-full gap-2"
              onClick={async () => {
                if (!form.name.trim() || !form.role.trim()) {
                  toast.error('Uzupełnij imię i rolę');
                  return;
                }
                try {
                  await updateStaff(staff.id, { ...form, serviceIds: selectedServiceIds, inventoryRole });
                  await loadData();
                  toast.success('Pracownik zaktualizowany');
                } catch (err: any) {
                  toast.error(err.message || 'Błąd zapisu');
                }
              }}
            >
              <Save className="w-4 h-4" />Zapisz dane pracownika
            </Button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
