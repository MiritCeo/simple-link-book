import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, AlertTriangle, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
} from "@/components/ui/alert-dialog";
import { PageTransition } from "@/components/motion";
import { toast } from "sonner";
import { getInventoryItems, createInventoryItem, updateInventoryItem, deactivateInventoryItem, getInventorySettings, getInventoryUnits, getInventoryMovements, getInventoryCategories } from "@/lib/api";
import { getInventoryRole } from "@/lib/auth";

const navTabs = [
  { label: "Asortyment", path: "/panel/magazyn" },
  { label: "Aktywności", path: "/panel/magazyn/ruchy" },
  { label: "Ustawienia", path: "/panel/magazyn/ustawienia" },
];

type InventoryItemForm = {
  id?: string;
  name: string;
  categoryId?: string | null;
  category: string;
  unit: string;
  stock: number;
  minStock: number;
  purchasePrice: number;
  salePrice: number;
  active: boolean;
};

export default function InventoryItemsPage() {
  const navigate = useNavigate();
  const inventoryRole = getInventoryRole();
  const canManage = inventoryRole === "ADMIN" || inventoryRole === "MANAGER";
  const canDelete = inventoryRole === "ADMIN";
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [defaultMinStock, setDefaultMinStock] = useState(0);
  const [search, setSearch] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState<any | null>(null);
  const [form, setForm] = useState<InventoryItemForm>({
    name: "",
    category: "",
    unit: "",
    stock: 0,
    minStock: 0,
    purchasePrice: 0,
    salePrice: 0,
    active: true,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsRes, settingsRes, unitsRes, movementsRes, categoriesRes] = await Promise.all([
        getInventoryItems(),
        getInventorySettings(),
        getInventoryUnits(),
        getInventoryMovements(),
        getInventoryCategories(),
      ]);
      setItems(itemsRes.items || []);
      setUnits(unitsRes.units || []);
      setMovements(movementsRes.movements || []);
      setCategories(categoriesRes.categories || []);
      setDefaultMinStock(settingsRes.setting?.defaultMinStock ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((item) => {
      const match = !search || item.name.toLowerCase().includes(q) || (item.category || "").toLowerCase().includes(q);
      const low = item.stock <= item.minStock;
      const categoryMatch = categoryFilter === "all" || item.categoryId === categoryFilter;
      return match && categoryMatch && (!onlyLow || low);
    });
  }, [items, onlyLow, search, categoryFilter]);

  const totals = useMemo(() => {
    const totalItems = items.length;
    const totalCost = items.reduce((sum, item) => sum + (item.stock || 0) * (item.purchasePrice || 0), 0);
    const totalValue = items.reduce((sum, item) => sum + (item.stock || 0) * (item.salePrice || 0), 0);
    const lowCount = items.filter((item) => item.stock <= item.minStock).length;
    return { totalItems, totalCost, totalValue, lowCount };
  }, [items]);

  const openCreate = () => {
    setForm({
      name: "",
      categoryId: categories[0]?.id || null,
      category: "",
      unit: units[0]?.name || "",
      stock: 0,
      minStock: defaultMinStock,
      purchasePrice: 0,
      salePrice: 0,
      active: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setForm({
      id: item.id,
      name: item.name || "",
      categoryId: item.categoryId || null,
      category: item.category || "",
      unit: item.unit || "",
      stock: item.stock || 0,
      minStock: item.minStock || 0,
      purchasePrice: item.purchasePrice || 0,
      salePrice: item.salePrice || 0,
      active: item.active !== false,
    });
    setDialogOpen(true);
  };

  const categoryOptions = useMemo(() => {
    const byParent = new Map<string | null, any[]>();
    categories.forEach((cat: any) => {
      const key = cat.parentId || null;
      const list = byParent.get(key) || [];
      list.push(cat);
      byParent.set(key, list);
    });
    const walk = (parentId: string | null, depth: number): Array<{ id: string; name: string }> => {
      const list = (byParent.get(parentId) || []).sort((a, b) => a.name.localeCompare(b.name));
      return list.flatMap((cat) => [
        { id: cat.id, name: `${"— ".repeat(depth)}${cat.name}` },
        ...walk(cat.id, depth + 1),
      ]);
    };
    return walk(null, 0);
  }, [categories]);

  const openHistory = (item: any) => {
    setHistoryItem(item);
    setHistoryOpen(true);
  };

  const saveItem = async () => {
    try {
      if (!form.name || !form.categoryId || !form.unit) {
        toast.error("Uzupełnij wymagane pola");
        return;
      }
      if (form.id) {
        await updateInventoryItem(form.id, {
          name: form.name,
          categoryId: form.categoryId,
          unit: form.unit,
          stock: form.stock,
          minStock: form.minStock,
          purchasePrice: form.purchasePrice,
          salePrice: form.salePrice,
          active: form.active,
        });
        toast.success("Produkt zaktualizowany");
      } else {
        await createInventoryItem({
          name: form.name,
          categoryId: form.categoryId,
          unit: form.unit,
          stock: form.stock,
          minStock: form.minStock,
          purchasePrice: form.purchasePrice,
          salePrice: form.salePrice,
          active: form.active,
        });
        toast.success("Produkt dodany");
      }
      setDialogOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Błąd zapisu");
    }
  };

  const deactivateItem = async (id: string) => {
    try {
      await deactivateInventoryItem(id);
      toast.success("Produkt dezaktywowany");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Błąd usuwania");
    }
  };

  return (
    <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6 pb-8">
      <div className="flex items-center gap-2 mb-4">
        <div>
          <h1 className="text-xl font-bold lg:text-2xl">Magazyn</h1>
          <p className="text-sm text-muted-foreground">Asortyment i stany magazynowe</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {navTabs.map((tab) => (
          <Button
            key={tab.path}
            variant={tab.path === "/panel/magazyn" ? "default" : "outline"}
            size="sm"
            className="rounded-xl"
            onClick={() => navigate(tab.path)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 mb-4 lg:grid-cols-4">
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Produkty</p>
          <p className="text-lg font-semibold">{totals.totalItems}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Niski stan</p>
          <p className="text-lg font-semibold">{totals.lowCount}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Wartość zakupu</p>
          <p className="text-lg font-semibold">{totals.totalCost} zł</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Wartość sprzedaży</p>
          <p className="text-lg font-semibold">{totals.totalValue} zł</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-4 mb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj produktu..."
              className="h-10 rounded-xl pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-10 rounded-xl text-xs w-48">
                <SelectValue placeholder="Wszystkie kategorie" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">Wszystkie kategorie</SelectItem>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant={onlyLow ? "default" : "outline"} size="sm" className="rounded-xl" onClick={() => setOnlyLow(!onlyLow)}>
              <AlertTriangle className="w-4 h-4 mr-2" />
              Niski stan
            </Button>
            {canManage && (
              <Button size="sm" className="rounded-xl" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Dodaj produkt
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border">
        {loading && <div className="p-6 text-sm text-muted-foreground">Ładowanie magazynu...</div>}
        {!loading && filtered.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">Brak produktów spełniających kryteria.</div>
        )}
        {!loading && filtered.map((item) => {
          const lowStock = item.stock <= item.minStock;
          return (
            <div key={item.id} className="flex flex-col gap-3 px-4 py-3 border-b border-border last:border-b-0 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{item.name}</p>
                  {!item.active && <Badge variant="outline" className="text-[10px]">Nieaktywny</Badge>}
                  {lowStock && item.active && <Badge variant="destructive" className="text-[10px]">Niski stan</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{item.category || "Brak kategorii"} • {item.unit}</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>Stan: <strong className="text-foreground">{item.stock}</strong></span>
                <span>Min: {item.minStock}</span>
                <span>Koszt: {item.purchasePrice} zł</span>
                <span>Cena: {item.salePrice} zł</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => openHistory(item)}>
                  <History className="w-4 h-4" />
                </Button>
                {canManage && (
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => openEdit(item)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
                {canDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-xl text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Dezaktywować produkt?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Produkt pozostanie w historii ruchów, ale zniknie z aktywnej listy.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deactivateItem(item.id)}>Dezaktywuj</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edytuj produkt" : "Dodaj produkt"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Nazwa</label>
              <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="h-10 rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Kategoria</label>
              <Select
                value={form.categoryId || "none"}
                onValueChange={(value) => setForm((prev) => ({ ...prev, categoryId: value === "none" ? null : value }))}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Wybierz kategorię" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {categoryOptions.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Jednostka</label>
              <Input value={form.unit} onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))} className="h-10 rounded-xl" placeholder="szt / ml / g" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Stan</label>
                <Input type="number" value={form.stock} onChange={(e) => setForm((prev) => ({ ...prev, stock: Number(e.target.value) }))} className="h-10 rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Minimalny stan</label>
                <Input type="number" value={form.minStock} onChange={(e) => setForm((prev) => ({ ...prev, minStock: Number(e.target.value) }))} className="h-10 rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Cena zakupu</label>
                <Input type="number" value={form.purchasePrice} onChange={(e) => setForm((prev) => ({ ...prev, purchasePrice: Number(e.target.value) }))} className="h-10 rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Cena sprzedaży</label>
                <Input type="number" value={form.salePrice} onChange={(e) => setForm((prev) => ({ ...prev, salePrice: Number(e.target.value) }))} className="h-10 rounded-xl" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anuluj</Button>
            <Button onClick={saveItem}>Zapisz</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>Historia ruchów</DialogTitle>
          </DialogHeader>
          <div className="text-sm font-medium">{historyItem?.name || "Produkt"}</div>
          <div className="max-h-72 overflow-auto mt-2 border border-border rounded-xl">
            {(movements || [])
              .filter((movement) => movement.item?.id === historyItem?.id)
              .map((movement) => (
                <div key={movement.id} className="flex items-center justify-between px-3 py-2 border-b border-border last:border-b-0 text-xs">
                  <div>
                    <p className="font-medium">{movement.type === "IN" ? "Przyjęcie" : movement.type === "OUT" ? "Wydanie" : "Korekta"}</p>
                    <p className="text-muted-foreground">{new Date(movement.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{movement.quantity}</p>
                    <p className="text-muted-foreground">{movement.note || "—"}</p>
                  </div>
                </div>
              ))}
            {historyItem && (movements || []).filter((movement) => movement.item?.id === historyItem?.id).length === 0 && (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">Brak ruchów dla tego produktu.</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryOpen(false)}>Zamknij</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </PageTransition>
  );
}
