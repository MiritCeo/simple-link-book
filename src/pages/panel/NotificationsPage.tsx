import { useState } from 'react';
import { Bell, Mail, MessageSquare, Clock, ChevronRight, Check, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const defaultSettings: NotificationSetting[] = [
  { id: 'confirmation', label: 'Potwierdzenie rezerwacji', description: 'Wyślij klientowi potwierdzenie po dokonaniu rezerwacji', icon: Check, sms: true, email: true },
  { id: 'reminder_24h', label: 'Przypomnienie (24h przed)', description: 'Przypomnij klientowi o wizycie dzień wcześniej', icon: Clock, sms: true, email: false, timing: '24h' },
  { id: 'reminder_2h', label: 'Przypomnienie (2h przed)', description: 'Przypomnij klientowi na krótko przed wizytą', icon: Bell, sms: true, email: false, timing: '2h' },
  { id: 'cancellation', label: 'Anulowanie wizyty', description: 'Powiadom klienta o anulowaniu wizyty', icon: MessageSquare, sms: true, email: true },
  { id: 'followup', label: 'Wiadomość po wizycie', description: 'Podziękuj klientowi i zaproś na kolejną wizytę', icon: Mail, sms: false, email: true },
];

export default function NotificationsPage() {
  const [settings, setSettings] = useState<NotificationSetting[]>(defaultSettings);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [senderName, setSenderName] = useState('Studio Bella');
  const [replyEmail, setReplyEmail] = useState('kontakt@studiobella.pl');

  const toggleChannel = (id: string, channel: 'sms' | 'email') => {
    setSettings(prev => prev.map(s =>
      s.id === id ? { ...s, [channel]: !s[channel] } : s
    ));
  };

  const handleSave = () => {
    toast.success('Ustawienia powiadomień zapisane!');
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

      <div className="lg:grid lg:grid-cols-3 lg:gap-6">
        {/* Left: channels config */}
        <div className="lg:col-span-2">
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
        </div>

        {/* Right: sender settings */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="mt-6 lg:mt-0 space-y-4"
        >
          <div className="bg-card rounded-2xl p-5 border border-border">
            <h2 className="font-semibold mb-4">Nadawca</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nazwa SMS</label>
                <Input value={senderName} onChange={e => setSenderName(e.target.value)} className="h-11 rounded-xl" placeholder="Nazwa salonu" />
                <p className="text-[10px] text-muted-foreground mt-1">Wyświetla się jako nadawca SMS (max 11 znaków)</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Adres email nadawcy</label>
                <Input value={replyEmail} onChange={e => setReplyEmail(e.target.value)} className="h-11 rounded-xl" placeholder="kontakt@salon.pl" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-5 border border-border">
            <h2 className="font-semibold mb-3">Podgląd SMS</h2>
            <div className="bg-muted rounded-xl p-4">
              <p className="text-[10px] text-muted-foreground font-medium mb-1">{senderName}</p>
              <p className="text-xs leading-relaxed">
                Cześć Joanna! 👋 Przypominamy o wizycie jutro (22.02) o 09:00 w {senderName}.
                Usługa: Strzyżenie damskie. Do zobaczenia!
                Odwołaj: purebook.pl/cancel/abc123
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">~1 SMS (148 znaków)</p>
          </div>

          <div className="bg-secondary/50 rounded-2xl p-5 border border-border">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Integracja SMS</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Aby wysyłać prawdziwe SMS-y, podłącz bramkę SMS (np. SMSAPI, Twilio). Aktualnie podgląd jest w trybie demo.
                </p>
                <Button variant="outline" size="sm" className="rounded-xl h-9 mt-3 text-xs gap-1.5">
                  Konfiguruj bramkę
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
