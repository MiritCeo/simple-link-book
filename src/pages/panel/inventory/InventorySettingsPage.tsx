import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageTransition } from "@/components/motion";
import { toast } from "sonner";
import { createInventoryCategory, createInventoryUnit, deleteInventoryCategory, deleteInventoryUnit, getInventoryCategories, getInventorySettings, getInventoryUnits, updateInventoryCategory, updateInventorySettings } from "@/lib/api";
import { getInventoryRole } from "@/lib/auth";

const navTabs = [
  { label: "Asortyment", path: "/panel/magazyn" },
  { label: "Aktywności", path: "/panel/magazyn/ruchy" },
  { label: "Ustawienia", path: "/panel/magazyn/ustawienia" },
];

export default function InventorySettingsPage() {
  const navigate = useNavigate();
  const inventoryRole = getInventoryRole();
  const canManage = inventoryRole === "ADMIN";
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [defaultMinStock, setDefaultMinStock] = useState(0);
  const [unitName, setUnitName] = useState("");
  const [categoryForm, setCategoryForm] = useState({ name: "", parentId: "root" });
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [unitsRes, settingsRes, categoriesRes] = await Promise.all([getInventoryUnits(), getInventorySettings(), getInventoryCategories()]);
      setUnits(unitsRes.units || []);
      setCategories(categoriesRes.categories || []);
      setDefaultMinStock(settingsRes.setting?.defaultMinStock ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveSettings = async () => {
    try {
      await updateInventorySettings({ defaultMinStock });
      toast.success("Ustawienia zapisane");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Błąd zapisu");
    }
  };

  const addUnit = async () => {
    if (!unitName.trim()) {
      toast.error("Podaj nazwę jednostki");
      return;
    }
    try {
      await createInventoryUnit({ name: unitName.trim() });
      setUnitName("");
      await loadData();
      toast.success("Jednostka dodana");
    } catch (err: any) {
      toast.error(err.message || "Błąd zapisu");
    }
  };

  const removeUnit = async (id: string) => {
    try {
      await deleteInventoryUnit(id);
      await loadData();
      toast.success("Jednostka usunięta");
    } catch (err: any) {
      toast.error(err.message || "Błąd usuwania");
    }
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

  const addCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error("Podaj nazwę kategorii");
      return;
    }
    try {
      if (editingCategoryId) {
        await updateInventoryCategory(editingCategoryId, {
          name: categoryForm.name.trim(),
          parentId: categoryForm.parentId === "root" ? null : categoryForm.parentId,
        });
        toast.success("Kategoria zaktualizowana");
      } else {
        await createInventoryCategory({
          name: categoryForm.name.trim(),
          parentId: categoryForm.parentId === "root" ? null : categoryForm.parentId,
        });
        toast.success("Kategoria dodana");
      }
      setCategoryForm({ name: "", parentId: "root" });
      setEditingCategoryId(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Błąd zapisu kategorii");
    }
  };

  const startEditCategory = (category: any) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name || "",
      parentId: category.parentId || "root",
    });
  };

  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setCategoryForm({ name: "", parentId: "root" });
  };

  const removeCategory = async (id: string) => {
    try {
      await deleteInventoryCategory(id);
      toast.success("Kategoria usunięta");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Błąd usuwania kategorii");
    }
  };

  return (
    <PageTransition className="px-4 pt-4 lg:px-8 lg:pt-6 pb-8">
      <div className="flex items-center gap-2 mb-4">
        <div>
          <h1 className="text-xl font-bold lg:text-2xl">Magazyn</h1>
          <p className="text-sm text-muted-foreground">Ustawienia magazynu</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {navTabs.map((tab) => (
          <Button
            key={tab.path}
            variant={tab.path === "/panel/magazyn/ustawienia" ? "default" : "outline"}
            size="sm"
            className="rounded-xl"
            onClick={() => navigate(tab.path)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-border p-4">
            <h2 className="text-sm font-semibold mb-1">Kategorie produktów</h2>
            <p className="text-xs text-muted-foreground mb-3">Zbuduj drzewko kategorii i wybieraj je w produktach.</p>
            {loading && <p className="text-xs text-muted-foreground">Ładowanie kategorii...</p>}
            {!loading && categories.length === 0 && <p className="text-xs text-muted-foreground">Brak kategorii.</p>}
            {!loading && categories.length > 0 && (
              <div className="max-h-64 overflow-auto border border-border rounded-xl mb-3">
                {categoryOptions.map((cat) => (
                  <div key={cat.id} className="px-3 py-2 text-sm border-b border-border last:border-b-0 flex items-center justify-between gap-2">
                    <span>{cat.name}</span>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" className="rounded-lg h-8" onClick={() => startEditCategory(cat)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-lg h-8 text-destructive" onClick={() => removeCategory(cat.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {canManage && (
              <div className="grid gap-2">
                <div>
                  <label className="text-xs font-medium mb-1 block">Nazwa</label>
                  <Input
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Nadrzędna</label>
                  <Select
                    value={categoryForm.parentId}
                    onValueChange={(value) => setCategoryForm((prev) => ({ ...prev, parentId: value }))}
                  >
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue placeholder="Brak" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="root">Brak (poziom główny)</SelectItem>
                      {categoryOptions.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" className="rounded-xl" onClick={addCategory}>
                    <Plus className="w-4 h-4 mr-2" />
                    {editingCategoryId ? "Zapisz zmiany" : "Dodaj kategorię"}
                  </Button>
                  {editingCategoryId && (
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={cancelEditCategory}>
                      Anuluj
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-card rounded-2xl border border-border p-4">
            <h2 className="text-sm font-semibold mb-1">Jednostki</h2>
            <p className="text-xs text-muted-foreground mb-3">Zdefiniuj jednostki miary używane w produktach.</p>
          {loading && <p className="text-xs text-muted-foreground">Ładowanie jednostek...</p>}
          {!loading && units.length === 0 && <p className="text-xs text-muted-foreground">Brak jednostek.</p>}
          {!loading && units.map((unit) => (
            <div key={unit.id} className="flex items-center justify-between border-b border-border last:border-b-0 py-2 text-sm">
              <span>{unit.name}</span>
              {canManage && (
                <Button variant="outline" size="sm" className="rounded-xl text-destructive" onClick={() => removeUnit(unit.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          {canManage && (
            <div className="flex items-center gap-2 mt-3">
              <Input value={unitName} onChange={(e) => setUnitName(e.target.value)} className="h-10 rounded-xl" placeholder="np. szt / ml / g" />
              <Button size="sm" className="rounded-xl" onClick={addUnit}>
                <Plus className="w-4 h-4 mr-2" />
                Dodaj
              </Button>
            </div>
          )}
        </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4">
          <h2 className="text-sm font-semibold mb-3">Progi minimalne</h2>
          <label className="text-xs font-medium mb-1 block">Domyślny minimalny stan</label>
          <Input
            type="number"
            value={defaultMinStock}
            onChange={(e) => setDefaultMinStock(Number(e.target.value))}
            className="h-10 rounded-xl"
            disabled={!canManage}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Nowe produkty otrzymają ten próg, jeśli nie podasz go ręcznie.
          </p>
          {canManage && (
            <Button size="sm" className="rounded-xl mt-3" onClick={saveSettings}>
              Zapisz ustawienia
            </Button>
          )}
          {!canManage && (
            <p className="text-xs text-muted-foreground mt-3">Tylko administrator może edytować ustawienia magazynu.</p>
          )}
        </div>
      </div>

    </PageTransition>
  );
}
