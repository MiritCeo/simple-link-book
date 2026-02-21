import { useState, useMemo } from 'react';
import { Search, Phone, Mail, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { mockClients } from '@/data/mockData';

export default function ClientsPage() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return mockClients;
    const q = search.toLowerCase();
    return mockClients.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [search]);

  return (
    <div className="px-4 pt-4">
      <h1 className="text-xl font-bold mb-4">Klienci</h1>

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

      <div className="space-y-2">
        {filtered.map(client => (
          <button key={client.id} className="w-full text-left bg-card rounded-2xl p-4 border border-border flex items-center gap-3 touch-target hover:border-primary/30 transition-all">
            <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center font-semibold text-sm text-accent-foreground shrink-0">
              {client.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{client.name}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span>{client.visits} wizyt</span>
                <span>Ostatnia: {client.lastVisit}</span>
              </div>
              {client.notes && <p className="text-xs text-muted-foreground italic mt-1 truncate">{client.notes}</p>}
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
