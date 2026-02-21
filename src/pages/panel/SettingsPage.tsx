import { useState } from 'react';
import { Copy, QrCode, Link2, ChevronRight, Clock, Users, Scissors, Palette, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { mockSalon, mockServices, mockSpecialists } from '@/data/mockData';
import { PageTransition, MotionList, MotionItem, HoverCard } from '@/components/motion';
import { motion, AnimatePresence } from 'framer-motion';

export default function SettingsPage() {
  const [showQR, setShowQR] = useState(false);
  const bookingUrl = `https://purebook.pl/s/${mockSalon.slug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(bookingUrl);
    toast.success('Link skopiowany!');
  };

  const sections = [
    { icon: Scissors, label: 'Usługi', count: mockServices.length, desc: 'Zarządzaj usługami i cenami' },
    { icon: Users, label: 'Pracownicy', count: mockSpecialists.length, desc: 'Zarządzaj zespołem' },
    { icon: Clock, label: 'Godziny pracy', desc: 'Ustaw godziny otwarcia i przerwy' },
    { icon: Palette, label: 'Personalizacja', desc: 'Logo, kolory, nazwa salonu' },
  ];

  return (
    <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6">
      <h1 className="text-xl font-bold mb-4 lg:text-2xl lg:mb-6">Ustawienia</h1>

      <div className="lg:grid lg:grid-cols-2 lg:gap-6">
        {/* Left column */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="bg-card rounded-2xl p-5 border border-border mb-4 lg:p-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Link rezerwacyjny</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Udostępnij klientom ten link, aby mogli rezerwować wizyty online.</p>
            <div className="flex gap-2 mb-3">
              <Input value={bookingUrl} readOnly className="h-10 rounded-xl text-xs bg-muted" />
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" size="sm" onClick={copyLink} className="rounded-xl h-10 px-3 shrink-0">
                  <Copy className="w-4 h-4" />
                </Button>
              </motion.div>
            </div>
            <div className="flex gap-2">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button variant="secondary" size="sm" onClick={() => setShowQR(!showQR)} className="rounded-xl h-9 gap-1.5">
                  <QrCode className="w-4 h-4" />Kod QR
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button variant="secondary" size="sm" className="rounded-xl h-9 gap-1.5" onClick={() => window.open(`/s/${mockSalon.slug}`, '_blank')}>
                  <ExternalLink className="w-4 h-4" />Podgląd strony
                </Button>
              </motion.div>
            </div>
            <AnimatePresence>
              {showQR && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 flex justify-center p-4 bg-background rounded-xl border border-border">
                    <QRCodeSVG value={bookingUrl} size={180} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Salon info (desktop) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="hidden lg:block bg-card rounded-2xl p-6 border border-border mb-4"
          >
            <h2 className="font-semibold mb-3">Dane salonu</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Nazwa</span><span className="font-medium">{mockSalon.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Adres</span><span className="font-medium">{mockSalon.address}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Telefon</span><span className="font-medium">{mockSalon.phone}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Godziny</span><span className="font-medium">{mockSalon.hours}</span></div>
            </div>
          </motion.div>
        </div>

        {/* Right column - settings sections */}
        <div>
          <h2 className="font-semibold mb-3 hidden lg:block">Zarządzanie</h2>
          <MotionList className="space-y-2">
            {sections.map(sec => (
              <MotionItem key={sec.label}>
                <HoverCard className="w-full text-left bg-card rounded-2xl p-4 border border-border flex items-center gap-3 touch-target cursor-pointer lg:p-5">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0 lg:w-12 lg:h-12">
                    <sec.icon className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{sec.label}</p>
                      {sec.count !== undefined && <span className="text-xs text-muted-foreground">({sec.count})</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{sec.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </HoverCard>
              </MotionItem>
            ))}
          </MotionList>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-8 mb-4 lg:text-left">purebook.pl v1.0</p>
    </PageTransition>
  );
}
