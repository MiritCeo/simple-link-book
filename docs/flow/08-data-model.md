# 08-data-model

Na podstawie `server/prisma/schema.prisma`:
- `Salon` -> ma `Service`, `Staff`, `Client`, `Appointment`, `SalonHour`, `SalonException`, `SalonBreak`, `Notification*`, `Inventory*`.
- `User` -> `role` (SUPER_ADMIN/OWNER/STAFF), moze byc przypisany do wielu salonow przez `UserSalon`.
- `Client` -> klient salonu, opcjonalnie powiazane `ClientAccount`.
- `Appointment` -> status, czas, uslugi (M:N przez `AppointmentService`), pracownik, klient.
- `AppointmentToken` -> token do anulowania/przelozenia.
- `StaffAvailability` i `StaffException` -> grafiki i wyjatki.
- `InventoryItem` + `InventoryMovement` + `InventoryUnit` + `InventorySetting`.
- `NotificationSetting` + `NotificationTemplate` + `NotificationLog`.

