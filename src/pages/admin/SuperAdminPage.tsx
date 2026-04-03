import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Shield, UserX, UserCheck, RefreshCw, LogOut, Trash2, KeyRound, Mail, Building2, Users, Send, Info, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageTransition, MotionList, MotionItem, HoverCard } from '@/components/motion';
import { toast } from 'sonner';
import {
  createAdminOwner,
  deleteAdminOwner,
  deleteAdminClient,
  getAdminClients,
  getAdminOwners,
  getAdminSalons,
  resendAdminClientPasswordReset,
  resendAdminOwnerActivation,
  sendAdminEmail,
  updateAdminOwner,
  getAdminFeedback,
  patchAdminFeedback,
} from '@/lib/api';
import { clearAuth, getRole } from '@/lib/auth';

const feedbackStatusLabels: Record<string, string> = {
  NEW: 'Nowe',
  UNDER_REVIEW: 'W analizie',
  IN_VOTING: 'W głosowaniu',
  PLANNED: 'Zaplanowane',
  DONE: 'Zrobione',
  DECLINED: 'Odrzucone',
};

export default function SuperAdminPage() {
  const navigate = useNavigate();
  const role = getRole();
  const [owners, setOwners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [passwordDialogOwner, setPasswordDialogOwner] = useState<any | null>(null);
  const [deleteDialogOwner, setDeleteDialogOwner] = useState<any | null>(null);
  const [confirmOwnerDeleteEmail, setConfirmOwnerDeleteEmail] = useState('');
  const [deleteDialogClient, setDeleteDialogClient] = useState<any | null>(null);
  const [confirmClientDeleteEmail, setConfirmClientDeleteEmail] = useState('');
  const [confirmClientDeletePhone, setConfirmClientDeletePhone] = useState('');
  const [mailDialogOpen, setMailDialogOpen] = useState(false);
  const [mailForm, setMailForm] = useState({ to: '', subject: '', html: '' });
  const [salons, setSalons] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [clientsTotal, setClientsTotal] = useState(0);
  const [clientPage, setClientPage] = useState(1);
  const [clientSearch, setClientSearch] = useState('');
  const [clientSearchDebounced, setClientSearchDebounced] = useState('');
  const [clientsLoading, setClientsLoading] = useState(false);
  const [adminTab, setAdminTab] = useState('owners');
  const [feedbackItems, setFeedbackItems] = useState<any[]>([]);
  const [feedbackTotal, setFeedbackTotal] = useState(0);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [feedbackStatus, setFeedbackStatus] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackDialog, setFeedbackDialog] = useState<any | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({ status: 'NEW', adminNote: '', publicReply: '' });
  const [feedbackSaving, setFeedbackSaving] = useState(false);
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

  useEffect(() => {
    const t = window.setTimeout(() => setClientSearchDebounced(clientSearch.trim()), 350);
    return () => window.clearTimeout(t);
  }, [clientSearch]);

  const loadSalons = async () => {
    try {
      const res = await getAdminSalons();
      setSalons(res.salons || []);
    } catch (err: any) {
      toast.error(err.message || 'Nie udało się pobrać salonów');
    }
  };

  const loadClients = async () => {
    setClientsLoading(true);
    try {
      const res = await getAdminClients({ q: clientSearchDebounced || undefined, page: clientPage, pageSize: 25 });
      setClients(res.clients || []);
      setClientsTotal(res.total ?? 0);
    } catch (err: any) {
      toast.error(err.message || 'Nie udało się pobrać klientów');
    } finally {
      setClientsLoading(false);
    }
  };

  useEffect(() => {
    if (adminTab !== 'clients') return;
    loadClients();
  }, [clientSearchDebounced, clientPage, adminTab]);

  useEffect(() => {
    if (adminTab !== 'feedback') return;
    let cancelled = false;
    setFeedbackLoading(true);
    getAdminFeedback({
      status: feedbackStatus || undefined,
      page: feedbackPage,
      pageSize: 25,
    })
      .then((res) => {
        if (cancelled) return;
        setFeedbackItems(res.feedback || []);
        setFeedbackTotal(res.total ?? 0);
      })
      .catch((err: any) => {
        if (!cancelled) toast.error(err.message || 'Nie udało się wczytać zgłoszeń');
      })
      .finally(() => {
        if (!cancelled) setFeedbackLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [adminTab, feedbackPage, feedbackStatus]);

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
            <p className="text-sm text-muted-foreground">Salony, właściciele, klienci — dane i wiadomości</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl h-9 gap-1.5"
            onClick={() => setMailDialogOpen(true)}
          >
            <Mail className="w-4 h-4" />
            Wyślij e-mail
          </Button>
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

      <Tabs
        value={adminTab}
        onValueChange={(v) => {
          setAdminTab(v);
          if (v === 'salons') loadSalons();
          if (v === 'clients') loadClients();
        }}
        className="space-y-4"
      >
        <TabsList className="rounded-xl flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="owners" className="rounded-lg gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Właściciele
          </TabsTrigger>
          <TabsTrigger value="salons" className="rounded-lg gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Salony
          </TabsTrigger>
          <TabsTrigger value="clients" className="rounded-lg gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Klienci
          </TabsTrigger>
          <TabsTrigger value="feedback" className="rounded-lg gap-1.5">
            <Lightbulb className="w-3.5 h-3.5" />
            Zgłoszenia
          </TabsTrigger>
        </TabsList>

        <TabsContent value="owners" className="mt-4 space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Łącznie: {stats.total}</span>
        <span>•</span>
        <span>Aktywni: {stats.active}</span>
        <span>•</span>
        <span>Nieaktywni: {stats.inactive}</span>
      </div>
      <p className="flex gap-2 items-start rounded-xl border border-border/80 bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary" aria-hidden />
        <span>
          <span className="font-medium text-foreground">E-mail / link</span>
          {' — '}wysyła na adres e-mail właściciela wiadomość z informacją o koncie salonu oraz{' '}
          <strong className="font-medium text-foreground">linkiem do strony logowania</strong> do panelu.
          Możesz użyć tego jako przypomnienia albo zaraz po aktywacji konta przełącznikiem „Aktywuj”.
        </span>
      </p>

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
                <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 max-w-[min(100%,380px)]">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-9 text-xs gap-1.5"
                    title="Wysyła e-mail do ownera z informacją o koncie i linkiem do logowania do panelu salonu (SendGrid)."
                    onClick={async () => {
                      try {
                        const res = await resendAdminOwnerActivation(owner.id);
                        const info = res.email;
                        if (info?.sent) {
                          toast.success('Wysłano e-mail z linkiem do logowania (SendGrid przyjął wiadomość).');
                        } else {
                          toast.warning('Nie udało się wysłać e-maila.');
                        }
                      } catch (err: any) {
                        toast.error(err.message || 'Błąd wysyłki');
                      }
                    }}
                  >
                    <Send className="w-3.5 h-3.5" />
                    E-mail / link
                  </Button>
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
                    onClick={() => {
                      setDeleteDialogOwner(owner);
                      setConfirmOwnerDeleteEmail('');
                    }}
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
        </TabsContent>

        <TabsContent value="salons" className="mt-4">
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <p className="text-sm font-medium">Lista salonów</p>
              <Button variant="outline" size="sm" className="rounded-xl h-8 text-xs" onClick={loadSalons}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Odśwież
              </Button>
            </div>
            <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
              {salons.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Wybierz zakładkę lub odśwież — brak danych.</p>
              ) : (
                salons.map((s) => (
                  <div key={s.id} className="p-3 flex flex-wrap items-start justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{s.slug}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.phone}</p>
                    </div>
                    <div className="text-right text-xs">
                      {s.owner ? (
                        <>
                          <p className="text-foreground">{s.owner.email}</p>
                          <Badge variant="secondary" className="text-[10px] mt-1">
                            {s.owner.active ? 'aktywny' : 'nieaktywny'}
                          </Badge>
                        </>
                      ) : (
                        <span className="text-muted-foreground">brak ownera</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="clients" className="mt-4 space-y-3">
          <Input
            placeholder="Szukaj po imieniu, telefonie, e-mailu…"
            value={clientSearch}
            onChange={(e) => {
              setClientSearch(e.target.value);
              setClientPage(1);
            }}
            className="h-10 rounded-xl max-w-md"
          />
          <p className="text-xs text-muted-foreground">
            Znaleziono: {clientsTotal}. Usunięcie klienta jest nieodwracalne — wymaga wpisania e-maila (lub numeru, jeśli brak e-maila).
          </p>
          {clientsLoading ? (
            <div className="text-sm text-muted-foreground p-4">Ładowanie…</div>
          ) : (
            <MotionList className="space-y-2">
              {clients.map((c) => (
                <MotionItem key={c.id}>
                  <HoverCard className="bg-card rounded-2xl p-4 border border-border flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.phone}</p>
                      {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge variant="secondary" className="text-[10px]">{c.salon?.name || '—'}</Badge>
                        {c.account ? (
                          <Badge variant="outline" className="text-[10px]">Konto app: {c.account.email}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">Bez konta aplikacji</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {c.account && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl h-8 text-xs"
                          onClick={async () => {
                            try {
                              const res = await resendAdminClientPasswordReset(c.account.id);
                              if (res.email?.sent) toast.success('Link resetu hasła wysłany.');
                              else toast.warning('SendGrid nie dostarczył — sprawdź logi.');
                            } catch (err: any) {
                              toast.error(err.message || 'Błąd');
                            }
                          }}
                        >
                          Reset hasła
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl h-8 text-xs text-destructive"
                        onClick={() => {
                          setDeleteDialogClient(c);
                          setConfirmClientDeleteEmail('');
                          setConfirmClientDeletePhone('');
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Usuń
                      </Button>
                    </div>
                  </HoverCard>
                </MotionItem>
              ))}
            </MotionList>
          )}
          {clientsTotal > 25 && (
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={clientPage <= 1}
                onClick={() => setClientPage((p) => Math.max(1, p - 1))}
              >
                Poprzednia
              </Button>
              <span className="text-xs text-muted-foreground">Strona {clientPage}</span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={clientPage * 25 >= clientsTotal}
                onClick={() => setClientPage((p) => p + 1)}
              >
                Następna
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="feedback" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={feedbackStatus || 'all'}
              onValueChange={(v) => {
                setFeedbackStatus(v === 'all' ? '' : v);
                setFeedbackPage(1);
              }}
            >
              <SelectTrigger className="w-[200px] rounded-xl h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie statusy</SelectItem>
                {Object.entries(feedbackStatusLabels).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              Łącznie: {feedbackTotal}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Widzisz salon, autora i liczbę głosów. Możesz zmienić status, dodać notatkę wewnętrzną, publiczną odpowiedź
            oraz otworzyć pomysł do głosowania (wszystkie salony, anonimowo).
          </p>
          {feedbackLoading ? (
            <div className="text-sm text-muted-foreground p-4">Ładowanie…</div>
          ) : feedbackItems.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground text-center">
              Brak zgłoszeń.
            </div>
          ) : (
            <MotionList className="space-y-2">
              {feedbackItems.map((f) => (
                <MotionItem key={f.id}>
                  <button
                    type="button"
                    className="w-full text-left bg-card rounded-2xl p-4 border border-border hover:bg-muted/30 transition-colors"
                    onClick={() => {
                      setFeedbackDialog(f);
                      setFeedbackForm({
                        status: f.status,
                        adminNote: f.adminNote || '',
                        publicReply: f.publicReply || '',
                      });
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{f.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {f.salon?.name || '—'} · {f.author?.email || '—'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 shrink-0">
                        <Badge variant="secondary" className="text-[10px]">
                          {feedbackStatusLabels[f.status] || f.status}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] tabular-nums">
                          {f.voteCount ?? 0} głosów
                        </Badge>
                      </div>
                    </div>
                  </button>
                </MotionItem>
              ))}
            </MotionList>
          )}
          {feedbackTotal > 25 && (
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={feedbackPage <= 1}
                onClick={() => setFeedbackPage((p) => Math.max(1, p - 1))}
              >
                Poprzednia
              </Button>
              <span className="text-xs text-muted-foreground">Strona {feedbackPage}</span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={feedbackPage * 25 >= feedbackTotal}
                onClick={() => setFeedbackPage((p) => p + 1)}
              >
                Następna
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

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
          if (!open) {
            setDeleteDialogOwner(null);
            setConfirmOwnerDeleteEmail('');
          }
        }}
      >
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>Usunąć salon całkowicie?</DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="block">
                {deleteDialogOwner?.salon?.name
                  ? `Zostanie trwale usunięty salon „${deleteDialogOwner.salon.name}” wraz z wizytami, klientami CRM, usługami i kontem właściciela. Tej operacji nie można cofnąć.`
                  : 'Zostanie trwale usunięty właściciel i powiązane dane.'}
              </span>
              <span className="block font-medium text-foreground">
                Aby potwierdzić, wpisz poniżej dokładnie adres e-mail ownera:{' '}
                <span className="font-mono text-xs">{deleteDialogOwner?.email}</span>
              </span>
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Potwierdzenie e-mailem</label>
            <Input
              className="h-11 rounded-xl"
              placeholder={deleteDialogOwner?.email || 'email@…'}
              value={confirmOwnerDeleteEmail}
              onChange={(e) => setConfirmOwnerDeleteEmail(e.target.value)}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteDialogOwner(null)}>
              Anuluj
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={
                !deleteDialogOwner ||
                confirmOwnerDeleteEmail.trim().toLowerCase() !== deleteDialogOwner.email.trim().toLowerCase()
              }
              onClick={async () => {
                if (!deleteDialogOwner) return;
                try {
                  await deleteAdminOwner(deleteDialogOwner.id, confirmOwnerDeleteEmail.trim());
                  await loadOwners();
                  setDeleteDialogOwner(null);
                  setConfirmOwnerDeleteEmail('');
                  toast.success('Salon i owner zostali usunięci z bazy');
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

      <Dialog
        open={!!deleteDialogClient}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialogClient(null);
            setConfirmClientDeleteEmail('');
            setConfirmClientDeletePhone('');
          }
        }}
      >
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>Usunąć klienta na zawsze?</DialogTitle>
            <DialogDescription>
              Usunięte zostaną wizyty, konto aplikacji (jeśli jest) i rekord CRM. Ten sam e-mail / telefon będzie można ponownie użyć po rejestracji.
            </DialogDescription>
          </DialogHeader>
          {deleteDialogClient && (deleteDialogClient.email?.trim() || deleteDialogClient.account?.email?.trim()) ? (
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Wpisz e-mail (klienta lub konta): {deleteDialogClient.account?.email || deleteDialogClient.email}
              </label>
              <Input
                className="h-11 rounded-xl"
                value={confirmClientDeleteEmail}
                onChange={(e) => setConfirmClientDeleteEmail(e.target.value)}
                autoComplete="off"
              />
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Brak e-maila — wpisz numer telefonu (tylko cyfry, jak w bazie)
              </label>
              <Input
                className="h-11 rounded-xl font-mono"
                value={confirmClientDeletePhone}
                onChange={(e) => setConfirmClientDeletePhone(e.target.value.replace(/\D/g, ''))}
                placeholder="np. 575730760"
                autoComplete="off"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteDialogClient(null)}>
              Anuluj
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={(() => {
                if (!deleteDialogClient) return true;
                const hasEmail = !!(deleteDialogClient.account?.email?.trim() || deleteDialogClient.email?.trim());
                const expectedMail = (deleteDialogClient.account?.email || deleteDialogClient.email || '').trim().toLowerCase();
                const emailOk = hasEmail && confirmClientDeleteEmail.trim().toLowerCase() === expectedMail;
                const phoneOk =
                  !hasEmail &&
                  confirmClientDeletePhone.replace(/\D/g, '') === deleteDialogClient.phone.replace(/\D/g, '') &&
                  deleteDialogClient.phone.replace(/\D/g, '').length >= 6;
                return hasEmail ? !emailOk : !phoneOk;
              })()}
              onClick={async () => {
                if (!deleteDialogClient) return;
                try {
                  await deleteAdminClient(deleteDialogClient.id, {
                    confirmEmail:
                      deleteDialogClient.email?.trim() || deleteDialogClient.account?.email?.trim()
                        ? confirmClientDeleteEmail.trim()
                        : undefined,
                    confirmPhoneDigits:
                      deleteDialogClient.email?.trim() || deleteDialogClient.account?.email?.trim()
                        ? undefined
                        : confirmClientDeletePhone.replace(/\D/g, ''),
                  });
                  await loadClients();
                  setDeleteDialogClient(null);
                  toast.success('Klient usunięty z bazy');
                } catch (err: any) {
                  toast.error(err.message || 'Nie udało się usunąć');
                }
              }}
            >
              Usuń trwale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mailDialogOpen} onOpenChange={setMailDialogOpen}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle>Wyślij e-mail (SendGrid)</DialogTitle>
            <DialogDescription>Jednorazowa wiadomość na podany adres — użyj ostrożnie.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Do (e-mail)</label>
              <Input
                className="h-11 rounded-xl"
                value={mailForm.to}
                onChange={(e) => setMailForm((f) => ({ ...f, to: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Temat</label>
              <Input
                className="h-11 rounded-xl"
                value={mailForm.subject}
                onChange={(e) => setMailForm((f) => ({ ...f, subject: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Treść (HTML)</label>
              <Textarea
                className="rounded-xl min-h-[140px] font-mono text-xs"
                value={mailForm.html}
                onChange={(e) => setMailForm((f) => ({ ...f, html: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setMailDialogOpen(false)}>
              Anuluj
            </Button>
            <Button
              className="rounded-xl"
              onClick={async () => {
                try {
                  await sendAdminEmail(mailForm);
                  toast.success('Wysłano lub przyjęto przez SendGrid');
                  setMailDialogOpen(false);
                  setMailForm({ to: '', subject: '', html: '' });
                } catch (err: any) {
                  toast.error(err.message || 'Błąd wysyłki');
                }
              }}
            >
              Wyślij
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!feedbackDialog}
        onOpenChange={(open) => {
          if (!open) setFeedbackDialog(null);
        }}
      >
        <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Zgłoszenie</DialogTitle>
            <DialogDescription className="space-y-1">
              {feedbackDialog && (
                <>
                  <span className="block text-foreground font-medium">{feedbackDialog.title}</span>
                  <span className="block text-xs">
                    Salon: {feedbackDialog.salon?.name || '—'} ({feedbackDialog.salon?.slug || '—'})
                  </span>
                  <span className="block text-xs">Autor: {feedbackDialog.author?.email || '—'}</span>
                  <span className="block text-xs tabular-nums">
                    Głosy: {feedbackDialog.voteCount ?? 0}
                    {feedbackDialog.votingOpenedAt && (
                      <> · Głosowanie od {new Date(feedbackDialog.votingOpenedAt).toLocaleString('pl-PL')}</>
                    )}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {feedbackDialog && (
            <div className="space-y-3 text-sm">
              <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">
                {feedbackDialog.body}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select
                  value={feedbackForm.status}
                  onValueChange={(v) => setFeedbackForm((f) => ({ ...f, status: v }))}
                >
                  <SelectTrigger className="rounded-xl h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(feedbackStatusLabels).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Notatka wewnętrzna</label>
                <Textarea
                  value={feedbackForm.adminNote}
                  onChange={(e) => setFeedbackForm((f) => ({ ...f, adminNote: e.target.value }))}
                  className="rounded-xl min-h-[72px] text-xs"
                  placeholder="Widoczna tylko dla super admina"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Publiczna odpowiedź (dla salonu)</label>
                <Textarea
                  value={feedbackForm.publicReply}
                  onChange={(e) => setFeedbackForm((f) => ({ ...f, publicReply: e.target.value }))}
                  className="rounded-xl min-h-[72px] text-xs"
                  placeholder="Pojawi się przy zgłoszeniu w panelu salonu"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between sm:items-center">
            <Button
              type="button"
              variant="secondary"
              className="rounded-xl w-full sm:w-auto"
              disabled={feedbackSaving || !feedbackDialog}
              onClick={async () => {
                if (!feedbackDialog) return;
                setFeedbackSaving(true);
                try {
                  const res = await patchAdminFeedback(feedbackDialog.id, { openForVoting: true });
                  const updated = res.feedback;
                  setFeedbackItems((items) => items.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)));
                  setFeedbackDialog(updated);
                  setFeedbackForm({
                    status: updated.status,
                    adminNote: updated.adminNote || '',
                    publicReply: updated.publicReply || '',
                  });
                  toast.success('Otwarto do głosowania');
                } catch (err: any) {
                  toast.error(err.message || 'Błąd zapisu');
                } finally {
                  setFeedbackSaving(false);
                }
              }}
            >
              Otwórz do głosowania
            </Button>
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <Button variant="outline" className="rounded-xl" onClick={() => setFeedbackDialog(null)}>
                Zamknij
              </Button>
              <Button
                className="rounded-xl"
                disabled={feedbackSaving || !feedbackDialog}
                onClick={async () => {
                  if (!feedbackDialog) return;
                  setFeedbackSaving(true);
                  try {
                    const res = await patchAdminFeedback(feedbackDialog.id, {
                      status: feedbackForm.status,
                      adminNote: feedbackForm.adminNote.trim() || null,
                      publicReply: feedbackForm.publicReply.trim() || null,
                    });
                    const updated = res.feedback;
                    setFeedbackItems((items) => items.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)));
                    setFeedbackDialog(updated);
                    setFeedbackForm({
                      status: updated.status,
                      adminNote: updated.adminNote || '',
                      publicReply: updated.publicReply || '',
                    });
                    toast.success('Zapisano');
                  } catch (err: any) {
                    toast.error(err.message || 'Błąd zapisu');
                  } finally {
                    setFeedbackSaving(false);
                  }
                }}
              >
                Zapisz
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
