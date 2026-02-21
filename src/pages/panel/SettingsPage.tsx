import { useState } from 'react';
import { Copy, QrCode, Link2, ChevronRight, Plus, Clock, Users, Scissors, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { mockSalon, mockServices, mockSpecialists } from '@/data/mockData';

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
    <div className="px-4 pt-4">
      <h1 className="text-xl font-bold mb-4">Ustawienia</h1>

      {/* Booking link */}
      <div className="bg-card rounded-2xl p-5 border border-border mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Link rezerwacyjny</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Udostępnij klientom ten link, aby mogli rezerwować wizyty online.</p>
        <div className="flex gap-2 mb-3">
          <Input value={bookingUrl} readOnly className="h-10 rounded-xl text-xs bg-muted" />
          <Button variant="outline" size="sm" onClick={copyLink} className="rounded-xl h-10 px-3 shrink-0">
            <Copy className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowQR(!showQR)} className="rounded-xl h-9 gap-1.5">
            <QrCode className="w-4 h-4" />Kod QR
          </Button>
        </div>
        {showQR && (
          <div className="mt-4 flex justify-center p-4 bg-white rounded-xl">
            <QRCodeSVG value={bookingUrl} size={180} />
          </div>
        )}
      </div>

      {/* Settings sections */}
      <div className="space-y-2">
        {sections.map(sec => (
          <button key={sec.label} className="w-full text-left bg-card rounded-2xl p-4 border border-border flex items-center gap-3 touch-target hover:border-primary/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
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
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-8 mb-4">purebook.pl v1.0</p>
    </div>
  );
}
