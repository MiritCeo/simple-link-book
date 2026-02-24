import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageTransition } from "@/components/motion";
import { toast } from "sonner";
import { createInventoryUnit, deleteInventoryUnit, getInventorySettings, getInventoryUnits, updateInventorySettings } from "@/lib/api";
import { getInventoryRole } from "@/lib/auth";

const navTabs = [
  { label: "Asortyment", path: "/panel/magazyn" },
  { label: "Ruchy", path: "/panel/magazyn/ruchy" },
  { label: "Ustawienia", path: "/panel/magazyn/ustawienia" },
];

export default function InventorySettingsPage() {
  const navigate = useNavigate();
  const inventoryRole = getInventoryRole();
  const canManage = inventoryRole === "ADMIN";
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<any[]>([]);
  const [defaultMinStock, setDefaultMinStock] = useState(0);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [unitName, setUnitName] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [unitsRes, settingsRes] = await Promise.all([getInventoryUnits(), getInventorySettings()]);
      setUnits(unitsRes.units || []);
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
      setUnitDialogOpen(false);
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
        <div className="bg-card rounded-2xl border border-border p-4">
          <h2 className="text-sm font-semibold mb-3">Jednostki</h2>
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
            <Button variant="outline" size="sm" className="rounded-xl mt-3" onClick={() => setUnitDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Dodaj jednostkę
            </Button>
          )}
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

      <Dialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>Dodaj jednostkę</DialogTitle>
          </DialogHeader>
          <div>
            <label className="text-xs font-medium mb-1 block">Nazwa jednostki</label>
            <Input value={unitName} onChange={(e) => setUnitName(e.target.value)} className="h-10 rounded-xl" placeholder="szt / ml / g" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnitDialogOpen(false)}>Anuluj</Button>
            <Button onClick={addUnit}>Zapisz</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
