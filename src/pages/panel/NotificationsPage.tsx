import { useEffect, useState } from 'react';
import { Bell, Mail, MessageSquare, Clock, Check, Smartphone, Trash2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PageTransition, MotionList, MotionItem, HoverCard } from '@/components/motion';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  icon: typeof Bell;
  sms: boolean;
  email: boolean;
  timing?: string;
}

const eventMeta = [
  { id: 'BOOKING_CONFIRMATION', label: 'Potwierdzenie rezerwacji', description: 'Wyślij klientowi potwierdzenie po dokonaniu rezerwacji', icon: Check, timing: undefined },
  { id: 'REMINDER_24H', label: 'Przypomnienie (24h przed)', description: 'Przypomnij klientowi o wizycie dzień wcześniej', icon: Clock, timing: '24h' },
  { id: 'REMINDER_2H', label: 'Przypomnienie (2h przed)', description: 'Przypomnij klientowi na krótko przed wizytą', icon: Bell, timing: '2h' },
  { id: 'CANCELLATION', label: 'Anulowanie wizyty', description: 'Powiadom klienta o anulowaniu wizyty', icon: MessageSquare, timing: undefined },
  { id: 'FOLLOWUP', label: 'Wiadomość po wizycie', description: 'Podziękuj klientowi i zaproś na kolejną wizytę', icon: Mail, timing: '1h' },
];

/** Zgodne z `renderTemplate` w notificationService (treść szablonu, bez prefiksu SMS). */
const templatePlaceholders: Array<{ key: string; desc: string }> = [
  { key: 'client_name', desc: 'imię i nazwisko klienta' },
  { key: 'salon_name', desc: 'nazwa salonu' },
  { key: 'date', desc: 'data wizyty' },
  { key: 'time', desc: 'godzina wizyty' },
  { key: 'service', desc: 'lista usług (oddzielone przecinkiem)' },
  { key: 'staff', desc: 'przypisany pracownik lub „Dowolny”' },
  { key: 'cancel_link', desc: 'link do odwołania / zarządzania wizytą (dla potwierdzenia system może dopisać go automatycznie, jeśli go brakuje)' },
];

export default function NotificationsPage() {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<any | null>(null);
  const [templateForm, setTemplateForm] = useState({ event: 'BOOKING_CONFIRMATION', channel: 'SMS', subject: '', body: '' });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const eventIcon = (id: string) => eventMeta.find(e => e.id === id)?.icon || Bell;
  const eventLabel = (id: string) => eventMeta.find(e => e.id === id)?.label || id;
  const eventDesc = (id: string) => eventMeta.find(e => e.id === id)?.description || '';
  const eventTiming = (id: string) => eventMeta.find(e => e.id === id)?.timing;

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      import('@/lib/api').then(m => m.getNotificationSettings()),
      import('@/lib/api').then(m => m.getNotificationTemplates()),
    ]).then(([settingsRes, templatesRes]) => {
      if (!mounted) return;
      const anySms = (settingsRes.settings || []).some((s: any) => s.smsEnabled);
      const anyEmail = (settingsRes.settings || []).some((s: any) => s.emailEnabled);
      const mapped: NotificationSetting[] = settingsRes.settings.map((s: any) => ({
        id: s.event,
        label: eventLabel(s.event),
        description: eventDesc(s.event),
        icon: eventIcon(s.event),
        sms: s.smsEnabled,
        email: s.emailEnabled,
        timing: eventTiming(s.event),
      }));
      setSettings(mapped);
      setTemplates(templatesRes.templates || []);
      setSmsEnabled(anySms);
      setEmailEnabled(anyEmail);
    }).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const toggleChannel = (id: string, channel: 'sms' | 'email') => {
    setSettings(prev => prev.map(s =>
      s.id === id ? { ...s, [channel]: !s[channel] } : s
    ));
  };

  const handleSave = () => {
    import('@/lib/api')
      .then(m => m.saveNotificationSettings(settings.map(s => ({
        event: s.id,
        smsEnabled: smsEnabled ? s.sms : false,
        emailEnabled: emailEnabled ? s.email : false,
        timingMinutes: s.timing ? (s.timing.includes('24') ? 1440 : s.timing.includes('2') ? 120 : 60) : null,
      }))))
      .then(() => toast.success('Ustawienia powiadomień zapisane!'))
      .catch((err) => toast.error(err.message || 'Błąd zapisu'));
  };

  return (
    <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6 pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold lg:text-2xl">Powiadomienia</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Zarządzaj przypomnieniami SMS i email</p>
        </div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button onClick={handleSave} className="rounded-xl h-10 gap-1.5">
            <Check className="w-4 h-4" />
            <span className="hidden sm:inline">Zapisz</span>
          </Button>
        </motion.div>
      </div>

      <div className="w-full max-w-7xl mx-auto lg:grid lg:grid-cols-2 lg:gap-8 xl:gap-10 lg:items-start">
        {/* Lewa kolumna: kanały + zdarzenia */}
        <div className="min-w-0 space-y-4">
          {/* Global toggles */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-card rounded-2xl p-5 border border-border mb-4"
          >
            <h2 className="font-semibold mb-4">Kanały</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">SMS</p>
                    <p className="text-xs text-muted-foreground">Powiadomienia tekstowe na telefon klienta</p>
                  </div>
                </div>
                <Switch checked={smsEnabled} onCheckedChange={setSmsEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Email</p>
                    <p className="text-xs text-muted-foreground">Wiadomości email do klienta</p>
                  </div>
                </div>
                <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
              </div>
            </div>
          </motion.div>

          {/* Per-notification settings */}
          <h2 className="font-semibold mb-3">Automatyczne wiadomości</h2>
          {loading ? (
            <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground">
              Ładowanie ustawień...
            </div>
          ) : (
            <MotionList className="space-y-2">
              {settings.map(setting => (
              <MotionItem key={setting.id}>
                <HoverCard className="bg-card rounded-2xl p-4 border border-border lg:p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <setting.icon className="w-5 h-5 text-secondary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{setting.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Switch
                            checked={setting.sms && smsEnabled}
                            onCheckedChange={() => toggleChannel(setting.id, 'sms')}
                            disabled={!smsEnabled}
                            className="scale-90"
                          />
                          <span className={`text-xs font-medium ${!smsEnabled ? 'text-muted-foreground' : ''}`}>SMS</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Switch
                            checked={setting.email && emailEnabled}
                            onCheckedChange={() => toggleChannel(setting.id, 'email')}
                            disabled={!emailEnabled}
                            className="scale-90"
                          />
                          <span className={`text-xs font-medium ${!emailEnabled ? 'text-muted-foreground' : ''}`}>Email</span>
                        </label>
                        {setting.timing && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md ml-auto">{setting.timing} przed</span>
                        )}
                      </div>
                    </div>
                  </div>
                </HoverCard>
              </MotionItem>
              ))}
            </MotionList>
          )}
        </div>

        {/* Prawa kolumna: szablony + zmienne */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="bg-card rounded-2xl p-5 border border-border mt-6 lg:mt-0 min-w-0 lg:sticky lg:top-6"
        >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Szablony wiadomości</h2>
              <span className="text-[10px] text-muted-foreground">zarządzanie treścią</span>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-3 mb-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-1.5">
                  <p className="font-medium text-foreground">Zmienne w treści (wstaw w nawiasach klamrowych)</p>
                  <p>Przykład: <span className="font-mono text-[11px] text-foreground">Przypomnienie: wizyta w {'{salon_name}'} dnia {'{date}'} o {'{time}'}.</span></p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {templatePlaceholders.map(p => (
                      <li key={p.key}>
                        <span className="font-mono text-[11px] text-foreground">{'{' + p.key + '}'}</span>
                        {' — '}{p.desc}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] pt-1">
                    Przed treścią SMS system dodaje prefiks z nazwą salonu w nawiasie kwadratowym — pochodzi on z <span className="text-foreground font-medium">nazwy salonu w ustawieniach profilu</span>, tak jak zmienna {'{salon_name}'} w szablonie.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {templates.map(tpl => (
                <div key={tpl.id} className="flex items-center justify-between gap-2 bg-muted rounded-xl px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{eventLabel(tpl.event)} • {tpl.channel}</p>
                    <p className="text-[11px] text-muted-foreground">{tpl.active ? 'Aktywny' : 'Nieaktywny'}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl h-8 text-xs"
                      onClick={() => {
                        setActiveTemplate(tpl);
                        setTemplateForm({
                          event: tpl.event,
                          channel: tpl.channel,
                          subject: tpl.subject || '',
                          body: tpl.body || '',
                        });
                        setTemplateOpen(true);
                      }}
                    >
                      Edytuj
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      aria-label="Usuń szablon"
                      onClick={() => setDeleteTarget({
                        id: tpl.id,
                        label: `${eventLabel(tpl.event)} • ${tpl.channel}`,
                      })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {templates.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Brak szablonów</p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl h-8 text-xs w-full"
                onClick={() => {
                  setActiveTemplate(null);
                  setTemplateForm({ event: 'BOOKING_CONFIRMATION', channel: 'SMS', subject: '', body: '' });
                  setTemplateOpen(true);
                }}
              >
                Dodaj szablon
              </Button>
            </div>
        </motion.div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć szablon?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `Szablon „${deleteTarget.label}” zostanie trwale usunięty.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Anuluj</AlertDialogCancel>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={deleting}
              onClick={async () => {
                if (!deleteTarget) return;
                try {
                  setDeleting(true);
                  await import('@/lib/api').then(m => m.deleteNotificationTemplate(deleteTarget.id));
                  setTemplates(prev => prev.filter(t => t.id !== deleteTarget.id));
                  toast.success('Szablon usunięty');
                  setDeleteTarget(null);
                } catch (err: any) {
                  toast.error(err.message || 'Nie udało się usunąć szablonu');
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? 'Usuwanie...' : 'Usuń'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AnimatePresence>
        {templateOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle>{activeTemplate ? 'Edytuj szablon' : 'Dodaj szablon'}</DialogTitle>
                  <DialogDescription>Ustaw treść wiadomości</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Zdarzenie</label>
                    <Select value={templateForm.event} onValueChange={(val) => setTemplateForm(f => ({ ...f, event: val }))}>
                      <SelectTrigger className="h-10 rounded-xl text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {eventMeta.map(e => (
                          <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Kanał</label>
                    <Select value={templateForm.channel} onValueChange={(val) => setTemplateForm(f => ({ ...f, channel: val }))}>
                      <SelectTrigger className="h-10 rounded-xl text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        <SelectItem value="SMS">SMS</SelectItem>
                        <SelectItem value="EMAIL">Email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {templateForm.channel === 'EMAIL' && (
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Temat</label>
                      <Input value={templateForm.subject} onChange={(e) => setTemplateForm(f => ({ ...f, subject: e.target.value }))} className="h-10 rounded-xl" />
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Treść</label>
                    <Textarea
                      value={templateForm.body}
                      onChange={(e) => setTemplateForm(f => ({ ...f, body: e.target.value }))}
                      className="rounded-xl min-h-[120px] text-sm"
                      placeholder="Np. Przypomnienie: Twoja wizyta w {salon_name} dnia {date} o {time}."
                    />
                  </div>
                </div>
                <DialogFooter className="pt-2 flex-wrap gap-2 sm:justify-between">
                  <div>
                    {activeTemplate && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setTemplateOpen(false);
                          setDeleteTarget({
                            id: activeTemplate.id,
                            label: `${eventLabel(activeTemplate.event)} • ${activeTemplate.channel}`,
                          });
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-1.5" />
                        Usuń szablon
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2 ml-auto">
                  <Button variant="outline" className="rounded-xl" onClick={() => setTemplateOpen(false)}>Anuluj</Button>
                  <Button
                    className="rounded-xl"
                    onClick={async () => {
                      try {
                        if (!templateForm.body.trim()) {
                          toast.error('Uzupełnij treść szablonu');
                          return;
                        }
                        if (activeTemplate) {
                          const res = await import('@/lib/api').then(m => m.updateNotificationTemplate(activeTemplate.id, {
                            subject: templateForm.subject || undefined,
                            body: templateForm.body,
                            active: true,
                          }));
                          setTemplates(prev => prev.map(t => t.id === activeTemplate.id ? res.template : t));
                          toast.success('Szablon zapisany');
                        } else {
                          const exists = templates.some(t => t.event === templateForm.event && t.channel === templateForm.channel);
                          if (exists) {
                            toast.error('Szablon dla tego zdarzenia i kanału już istnieje');
                            return;
                          }
                          const res = await import('@/lib/api').then(m => m.createNotificationTemplate({
                            event: templateForm.event,
                            channel: templateForm.channel as any,
                            subject: templateForm.subject || undefined,
                            body: templateForm.body,
                            active: true,
                          }));
                          setTemplates(prev => [...prev, res.template]);
                          toast.success('Szablon dodany');
                        }
                        setTemplateOpen(false);
                      } catch (err: any) {
                        toast.error(err.message || 'Błąd zapisu');
                      }
                    }}
                  >
                    Zapisz
                  </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}

