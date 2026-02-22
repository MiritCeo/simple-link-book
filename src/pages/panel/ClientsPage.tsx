import { useState, useMemo, useEffect } from 'react';
import { Search, Phone, Mail, ChevronRight, Plus, User, Pencil, Trash2 } from 'lucide-react';
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
import { createClient, deleteClient, getClientAppointments, getSalonClients, updateClient } from '@/lib/api';
import { statusLabels } from '@/data/mockData';
import { PageTransition, MotionList, MotionItem, HoverCard } from '@/components/motion';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientAppointments, setClientAppointments] = useState<any[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getSalonClients()
      .then(res => { if (mounted) setClients(res.clients || []); })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter((c: any) =>
      c.name.toLowerCase().includes(q)
      || c.phone.includes(q)
      || c.email?.toLowerCase().includes(q),
    );
  }, [search, clients]);

  const activeClient = clients.find((c: any) => c.id === selectedClient);
  const mapStatus = (status?: string) => (status || 'SCHEDULED').toLowerCase().replace(/_/g, '-');
  const openClientDetail = (id: string) => {
    setSelectedClient(id);
    const current = clients.find((c: any) => c.id === id);
    setForm({
      name: current?.name || '',
      phone: current?.phone || '',
      email: current?.email || '',
      notes: current?.notes || '',
    });
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setDetailOpen(true);
    }
  };

  const openEdit = (id: string) => {
    setSelectedClient(id);
    const current = clients.find((c: any) => c.id === id);
    setForm({
      name: current?.name || '',
      phone: current?.phone || '',
      email: current?.email || '',
      notes: current?.notes || '',
    });
    setEditOpen(true);
  };

  useEffect(() => {
    if (!selectedClient) {
      setClientAppointments([]);
      return;
    }
    let mounted = true;
    setAppointmentsLoading(true);
    getClientAppointments(selectedClient)
      .then(res => {
        if (!mounted) return;
        setClientAppointments(res.appointments || []);
      })
      .finally(() => mounted && setAppointmentsLoading(false));
    return () => { mounted = false; };
  }, [selectedClient]);

  const refresh = () => getSalonClients().then(res => setClients(res.clients || []));

  return (
    <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold lg:text-2xl">Klienci</h1>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button size="sm" className="rounded-xl gap-1.5 h-10 hidden lg:inline-flex" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" />Dodaj klienta
          </Button>
        </motion.div>
      </div>

      <div className="lg:flex lg:gap-6">
        {/* Client list */}
        <div className="lg:w-96 lg:shrink-0">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj klienta..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 h-12 rounded-xl"
            />
          </div>

          <p className="text-xs text-muted-foreground mb-3">{filtered.length} klientów</p>

          {loading ? (
            <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground">
              Ładowanie klientów...
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground text-center">
              Brak klientów
            </div>
          ) : (
            <MotionList className="space-y-2" key={search}>
              {filtered.map(client => (
                <MotionItem key={client.id}>
                  <HoverCard
                    onClick={() => openClientDetail(client.id)}
                    className={`w-full text-left bg-card rounded-2xl p-4 border flex items-center gap-3 touch-target cursor-pointer transition-all ${
                      selectedClient === client.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center font-semibold text-sm text-accent-foreground shrink-0">
                      {client.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{client.name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{client.visits ?? '—'} wizyt</span>
                        <span>Ostatnia: {client.lastVisit ?? '—'}</span>
                      </div>
                      {client.notes && <p className="text-xs text-muted-foreground italic mt-1 truncate">{client.notes}</p>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </HoverCard>
                </MotionItem>
              ))}
            </MotionList>
          )}
        </div>

        {/* Client detail panel - desktop only */}
        <div className="hidden lg:block flex-1">
          <AnimatePresence mode="wait">
            {activeClient ? (
              <motion.div
                key={activeClient.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                className="bg-card rounded-2xl border border-border p-6 sticky top-20"
              >
                <div className="flex items-center gap-4 mb-6">
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                    className="w-16 h-16 rounded-full bg-accent flex items-center justify-center font-bold text-lg text-accent-foreground"
                  >
                    {activeClient.name.split(' ').map(n => n[0]).join('')}
                  </motion.div>
                  <div>
                    <h2 className="text-lg font-bold">{activeClient.name}</h2>
                    <p className="text-sm text-muted-foreground">{activeClient.phone}</p>
                    {activeClient.email && <p className="text-sm text-muted-foreground">{activeClient.email}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { value: activeClient.visits ?? '—', label: 'Wizyt' },
                    { value: activeClient.lastVisit ?? '—', label: 'Ostatnia wizyta' },
                    { value: '—', label: 'Wydane' },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.05 }}
                      className="bg-muted rounded-xl p-3 text-center"
                    >
                      <p className={i === 0 ? 'text-2xl font-bold' : 'text-sm font-semibold'}>{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </motion.div>
                  ))}
                </div>

                {activeClient.notes && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold mb-2">Notatki</h3>
                    <p className="text-sm text-muted-foreground bg-muted rounded-xl p-3">{activeClient.notes}</p>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-sm font-semibold mb-2">Historia wizyt</h3>
                  {appointmentsLoading ? (
                    <p className="text-sm text-muted-foreground">Ładowanie historii...</p>
                  ) : clientAppointments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Brak historii wizyt</p>
                  ) : (
                    <div className="space-y-2">
                      {clientAppointments.slice(0, 5).map((apt: any) => (
                        <div key={apt.id} className="bg-muted rounded-xl p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">{apt.date} • {apt.time}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {statusLabels[mapStatus(apt.status) as keyof typeof statusLabels] || apt.status}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {apt.appointmentServices?.map((s: any) => s.service.name).join(', ')} • {apt.staff?.name || 'Dowolny'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl gap-1.5 h-9"
                      onClick={() => toast('Połączenie z klientem')}
                    >
                      <Phone className="w-3.5 h-3.5" />Zadzwoń
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl gap-1.5 h-9"
                      onClick={() => toast('Email do klienta')}
                    >
                      <Mail className="w-3.5 h-3.5" />Email
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl gap-1.5 h-9"
                      onClick={() => openEdit(activeClient.id)}
                    >
                      <Pencil className="w-3.5 h-3.5" />Edytuj
                    </Button>
                  </motion.div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-9 text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />Dezaktywuj
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Dezaktywować klienta?</AlertDialogTitle>
                        <AlertDialogDescription>Klient zniknie z listy, ale dane zostaną zachowane.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Anuluj</AlertDialogCancel>
                        <AlertDialogAction
                          className="rounded-xl"
                          onClick={() => {
                            deleteClient(activeClient.id)
                              .then(() => refresh())
                              .then(() => toast.success('Klient dezaktywowany'))
                              .catch((err) => toast.error(err.message || 'Błąd usuwania'));
                          }}
                        >
                          Dezaktywuj
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-card rounded-2xl border border-border p-12 text-center"
              >
                <User className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Wybierz klienta z listy, aby zobaczyć szczegóły</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Dodaj klienta</DialogTitle>
            <DialogDescription>Formularz klienta</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Imię i nazwisko</label>
              <Input placeholder="Np. Joanna Majewska" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Telefon</label>
              <Input placeholder="+48 500 000 000" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <Input placeholder="anna@example.com" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Notatka</label>
              <Textarea placeholder="Preferencje, alergie..." value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} className="rounded-xl min-h-[90px]" />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setAddOpen(false)}>Anuluj</Button>
            <Button
              className="rounded-xl"
              disabled={!form.name || !form.phone}
              onClick={async () => {
                try {
                  if (!form.name || !form.phone) {
                    toast.error('Uzupełnij imię i telefon');
                    return;
                  }
                  await createClient({ name: form.name, phone: form.phone, email: form.email || undefined, notes: form.notes || undefined });
                  await refresh();
                  setForm({ name: '', phone: '', email: '', notes: '' });
                  setAddOpen(false);
                } catch (err: any) {
                  toast.error(err.message || 'Błąd zapisu');
                }
              }}
            >
              Dodaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Profil klienta</DialogTitle>
            <DialogDescription>Podgląd klienta</DialogDescription>
          </DialogHeader>
          {activeClient ? (
            <div className="space-y-3">
              {[
                ['Imię i nazwisko', activeClient.name],
                ['Telefon', activeClient.phone],
                ['Email', activeClient.email || '—'],
                ['Wizyt', String(activeClient.visits)],
                ['Ostatnia wizyta', activeClient.lastVisit],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-medium">{value}</span>
                </div>
              ))}
              {activeClient.notes && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-1">Notatki</p>
                  <p className="text-sm">{activeClient.notes}</p>
                </div>
              )}
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-1">Historia wizyt</p>
                {appointmentsLoading ? (
                  <p className="text-sm text-muted-foreground">Ładowanie historii...</p>
                ) : clientAppointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Brak historii wizyt</p>
                ) : (
                  <div className="space-y-2">
                    {clientAppointments.slice(0, 3).map((apt: any) => (
                      <div key={apt.id} className="flex justify-between text-sm">
                        <span>{apt.date} {apt.time}</span>
                        <span className="text-muted-foreground">
                          {statusLabels[mapStatus(apt.status) as keyof typeof statusLabels] || apt.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Brak danych klienta</p>
          )}
          <DialogFooter className="pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDetailOpen(false)}>Zamknij</Button>
            <Button
              className="rounded-xl"
              onClick={async () => {
                if (!activeClient) return;
                openEdit(activeClient.id);
                setDetailOpen(false);
              }}
            >
              Edytuj dane
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edytuj klienta</DialogTitle>
            <DialogDescription>Zmień dane klienta</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Imię i nazwisko</label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Telefon</label>
              <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <Input value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Notatka</label>
              <Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} className="rounded-xl min-h-[90px]" />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setEditOpen(false)}>Anuluj</Button>
            <Button
              className="rounded-xl"
              disabled={!form.name || !form.phone || !activeClient}
              onClick={async () => {
                if (!activeClient) return;
                try {
                  if (!form.name || !form.phone) {
                    toast.error('Uzupełnij imię i telefon');
                    return;
                  }
                  await updateClient(activeClient.id, { name: form.name, phone: form.phone, email: form.email || undefined, notes: form.notes || undefined });
                  await refresh();
                  setEditOpen(false);
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
    </PageTransition>
  );
}
