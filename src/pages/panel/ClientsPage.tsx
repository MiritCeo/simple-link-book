import { useState, useMemo } from 'react';
import { Search, Phone, Mail, ChevronRight, Plus, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockClients } from '@/data/mockData';

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search) return mockClients;
    const q = search.toLowerCase();
    return mockClients.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [search]);

  const activeClient = mockClients.find(c => c.id === selectedClient);

  return (
    <div className="px-4 pt-4 lg:px-8 lg:pt-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold lg:text-2xl">Klienci</h1>
        <Button size="sm" className="rounded-xl gap-1.5 h-10 hidden lg:inline-flex">
          <Plus className="w-4 h-4" />Dodaj klienta
        </Button>
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

          <div className="space-y-2">
            {filtered.map(client => (
              <button
                key={client.id}
                onClick={() => setSelectedClient(client.id)}
                className={`w-full text-left bg-card rounded-2xl p-4 border flex items-center gap-3 touch-target transition-all ${
                  selectedClient === client.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                }`}
              >
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

        {/* Client detail panel - desktop only */}
        <div className="hidden lg:block flex-1">
          {activeClient ? (
            <div className="bg-card rounded-2xl border border-border p-6 sticky top-20">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center font-bold text-lg text-accent-foreground">
                  {activeClient.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h2 className="text-lg font-bold">{activeClient.name}</h2>
                  <p className="text-sm text-muted-foreground">{activeClient.phone}</p>
                  {activeClient.email && <p className="text-sm text-muted-foreground">{activeClient.email}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-muted rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold">{activeClient.visits}</p>
                  <p className="text-xs text-muted-foreground">Wizyt</p>
                </div>
                <div className="bg-muted rounded-xl p-3 text-center">
                  <p className="text-sm font-semibold">{activeClient.lastVisit}</p>
                  <p className="text-xs text-muted-foreground">Ostatnia wizyta</p>
                </div>
                <div className="bg-muted rounded-xl p-3 text-center">
                  <p className="text-sm font-semibold">—</p>
                  <p className="text-xs text-muted-foreground">Wydane</p>
                </div>
              </div>

              {activeClient.notes && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold mb-2">Notatki</h3>
                  <p className="text-sm text-muted-foreground bg-muted rounded-xl p-3">{activeClient.notes}</p>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-2">Historia wizyt</h3>
                <p className="text-sm text-muted-foreground italic">Brak szczegółowej historii w wersji demo</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-9">
                  <Phone className="w-3.5 h-3.5" />Zadzwoń
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-9">
                  <Mail className="w-3.5 h-3.5" />Email
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <User className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Wybierz klienta z listy, aby zobaczyć szczegóły</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
