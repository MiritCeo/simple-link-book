# 05-inventory

Ekrany: `InventoryItemsPage.tsx`, `InventoryMovementsPage.tsx`, `InventorySettingsPage.tsx`.

## Asortyment
- `GET /api/salon/inventory/items`
- `POST /api/salon/inventory/items`
- `PUT /api/salon/inventory/items/:id`
- `DELETE /api/salon/inventory/items/:id` (dezaktywacja)
- Rola `ADMIN` lub `MANAGER` moze edytowac, `ADMIN` usuwa.

## Ruchy magazynowe
- `GET /api/salon/inventory/movements`
- `POST /api/salon/inventory/movements`
- Typy: `IN`, `OUT`, `ADJUST`.

## Ustawienia magazynu
- Jednostki:
  - `GET /api/salon/inventory/units`
  - `POST /api/salon/inventory/units`
  - `DELETE /api/salon/inventory/units/:id`
- Progi minimalne:
  - `GET /api/salon/inventory/settings`
  - `PUT /api/salon/inventory/settings`
- Tylko `ADMIN` moze zmieniac ustawienia.

