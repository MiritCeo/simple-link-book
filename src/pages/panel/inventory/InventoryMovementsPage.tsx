import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageTransition } from "@/components/motion";
import { toast } from "sonner";
import { getInventoryItems, getInventoryMovements, createInventoryMovement } from "@/lib/api";
import { getInventoryRole } from "@/lib/auth";

const navTabs = [
  { label: "Asortyment", path: "/panel/magazyn" },
  { label: "Ruchy", path: "/panel/magazyn/ruchy" },
  { label: "Ustawienia", path: "/panel/magazyn/ustawienia" },
];

export default function InventoryMovementsPage() {
  const navigate = useNavigate();
  const inventoryRole = getInventoryRole();
  const canManage = inventoryRole === "ADMIN" || inventoryRole === "MANAGER";
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "IN" | "OUT" | "ADJUST">("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ itemId: "", type: "IN", quantity: 1, note: "" });

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsRes, movementsRes] = await Promise.all([getInventoryItems(), getInventoryMovements()]);
      setItems(itemsRes.items || []);
      setMovements(movementsRes.movements || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return movements.filter((m: any) => {
      const name = m.item?.name || "";
      const matchesQuery = !search || name.toLowerCase().includes(q) || m.type.toLowerCase().includes(q);
      const matchesType = typeFilter === "ALL" || m.type === typeFilter;
      const created = new Date(m.createdAt);
      const fromOk = !dateFrom || created >= new Date(`${dateFrom}T00:00:00`);
      const toOk = !dateTo || created <= new Date(`${dateTo}T23:59:59`);
      return matchesQuery && matchesType && fromOk && toOk;
    });
  }, [movements, search, typeFilter, dateFrom, dateTo]);

  const usageReport = useMemo(() => {
    const map = new Map<string, { id: string; name: string; quantity: number; cost: number }>();
    filtered
      .filter((m: any) => m.type === "OUT")
      .forEach((m: any) => {
        const key = m.item?.id || "unknown";
        const entry = map.get(key) || { id: key, name: m.item?.name || "Produkt", quantity: 0, cost: 0 };
        entry.quantity += m.quantity;
        entry.cost += (m.quantity || 0) * (m.item?.purchasePrice || 0);
        map.set(key, entry);
      });
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
  }, [filtered]);

  const openCreate = () => {
    setForm({ itemId: items[0]?.id || "", type: "IN", quantity: 1, note: "" });
    setDialogOpen(true);
  };

  const saveMovement = async () => {
    if (!form.itemId) {
      toast.error("Wybierz produkt");
      return;
    }
    try {
      await createInventoryMovement({
        itemId: form.itemId,
        type: form.type as "IN" | "OUT" | "ADJUST",
        quantity: Number(form.quantity),
        note: form.note || undefined,
      });
      toast.success("Ruch dodany");
      setDialogOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Błąd zapisu");
    }
  };

  return (
    <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6 pb-8">
      <div className="flex items-center gap-2 mb-4">
        <div>
          <h1 className="text-xl font-bold lg:text-2xl">Magazyn</h1>
          <p className="text-sm text-muted-foreground">Ruchy magazynowe</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {navTabs.map((tab) => (
          <Button
            key={tab.path}
            variant={tab.path === "/panel/magazyn/ruchy" ? "default" : "outline"}
            size="sm"
            className="rounded-xl"
            onClick={() => navigate(tab.path)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-border p-4 mb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj ruchu..."
              className="h-10 rounded-xl pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as "ALL" | "IN" | "OUT" | "ADJUST")}>
              <SelectTrigger className="h-10 rounded-xl text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="ALL">Wszystkie</SelectItem>
                <SelectItem value="IN">Przyjęcia</SelectItem>
                <SelectItem value="OUT">Wydania</SelectItem>
                <SelectItem value="ADJUST">Korekty</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10 rounded-xl text-xs" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10 rounded-xl text-xs" />
            {canManage && (
              <Button size="sm" className="rounded-xl" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Dodaj ruch
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-4 mb-4">
        <h2 className="text-sm font-semibold mb-3">Raport zużycia (wydania)</h2>
        {usageReport.length === 0 && (
          <p className="text-xs text-muted-foreground">Brak wydań w wybranym zakresie.</p>
        )}
        {usageReport.length > 0 && (
          <div className="space-y-2">
            {usageReport.map((row) => (
              <div key={row.id} className="flex items-center justify-between text-xs border-b border-border last:border-b-0 pb-2">
                <span className="font-medium">{row.name}</span>
                <span>Ilość: <strong className="text-foreground">{row.quantity}</strong> • Koszt: {row.cost} zł</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border">
        {loading && <div className="p-6 text-sm text-muted-foreground">Ładowanie ruchów...</div>}
        {!loading && filtered.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">Brak ruchów spełniających kryteria.</div>
        )}
        {!loading && filtered.map((movement: any) => (
          <div key={movement.id} className="flex flex-col gap-2 px-4 py-3 border-b border-border last:border-b-0 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-medium">{movement.item?.name || "Produkt"}</p>
              <p className="text-xs text-muted-foreground">
                {movement.type === "IN" ? "Przyjęcie" : movement.type === "OUT" ? "Wydanie" : "Korekta"} • {new Date(movement.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              Ilość: <span className="text-foreground font-medium">{movement.quantity}</span>
            </div>
            <div className="text-xs text-muted-foreground">{movement.note || "—"}</div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>Dodaj ruch magazynowy</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Produkt</label>
              <Select value={form.itemId} onValueChange={(value) => setForm((prev) => ({ ...prev, itemId: value }))}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Wybierz produkt" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Typ ruchu</label>
                <Select value={form.type} onValueChange={(value) => setForm((prev) => ({ ...prev, type: value }))}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="IN">Przyjęcie</SelectItem>
                    <SelectItem value="OUT">Wydanie</SelectItem>
                    <SelectItem value="ADJUST">Korekta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">
                  {form.type === "ADJUST" ? "Ustaw stan na" : "Ilość"}
                </label>
                <Input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Notatka</label>
              <Input value={form.note} onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))} className="h-10 rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anuluj</Button>
            <Button onClick={saveMovement}>Zapisz</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
