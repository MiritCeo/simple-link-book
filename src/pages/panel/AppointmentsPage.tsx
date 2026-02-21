import { useState } from 'react';
import { Phone, MessageSquare, MoreVertical, Clock, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockAppointments, statusLabels, statusColors, type Appointment } from '@/data/mockData';

const tabs = [
  { key: 'today', label: 'Dziś' },
  { key: 'upcoming', label: 'Nadchodzące' },
  { key: 'past', label: 'Przeszłe' },
];

export default function AppointmentsPage() {
  const [activeTab, setActiveTab] = useState('today');

  const filtered = mockAppointments.filter(a => {
    if (activeTab === 'today') return a.date === '2026-02-21';
    if (activeTab === 'upcoming') return a.date > '2026-02-21';
    return a.date < '2026-02-21';
  });

  return (
    <div className="px-4 pt-4">
      <h1 className="text-xl font-bold mb-4">Wizyty</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 mb-4">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">Brak wizyt</p>
        )}
        {filtered.map(apt => (
          <div key={apt.id} className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium">{apt.clientName}</p>
                <p className="text-sm text-muted-foreground">{apt.serviceName}</p>
              </div>
              <Badge variant="secondary" className={`text-[10px] ${statusColors[apt.status]}`}>
                {statusLabels[apt.status]}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{apt.time} ({apt.duration} min)</span>
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{apt.specialistName}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-9 flex-1">
                <Phone className="w-3.5 h-3.5" />Zadzwoń
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-9 flex-1">
                <MessageSquare className="w-3.5 h-3.5" />SMS
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
