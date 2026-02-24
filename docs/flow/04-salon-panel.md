# 04-salon-panel

Glowny router: `src/App.tsx`, layout: `src/components/layout/PanelLayout.tsx`.
Backend: `server/src/routes/salon.ts`.

## Logowanie owner/staff
Ekran: `LoginPage.tsx`.
- `POST /api/auth/login` -> JWT + lista salonow.
- Przy wielu salonach: `/wybierz-salon` -> `POST /api/auth/switch-salon`.

## Dashboard
Ekran: `DashboardPage.tsx`.
- `GET /api/salon/appointments`, `GET /api/salon/clients`, `GET /api/salon/staff`.
- KPI: wizyty dzis, odwolania, oblozenie, aktywni klienci.

## Kalendarz (glowny widok pracy)
Ekran: `CalendarPage.tsx`.
1. Dane startowe:
   - `GET /api/salon/services`, `/staff`, `/clients`, `/appointments`,
     `/hours`, `/hours/exceptions`, `/breaks`.
2. Tworzenie wizyty:
   - klient istniejacy lub nowy (`POST /api/salon/clients`),
   - `POST /api/salon/appointments`.
3. Edycja wizyty:
   - `PUT /api/salon/appointments/:id`,
   - aktualizacja danych klienta `PUT /api/salon/clients/:id`.
4. Blokady:
   - blokada salonu (wyjatek): `POST /api/salon/hours/exceptions`,
   - blokada pracownika: `POST /api/salon/schedule/:staffId/exceptions`.
5. Widoki: dzien/lista, dzien/os czasu, tydzien, miesiac.

## Lista wizyt
Ekran: `AppointmentsPage.tsx`.
- Filtrowanie (status, data, pracownik, wyszukiwanie).
- Szybka zmiana statusu: `PUT /api/salon/appointments/:id`.
- Edycja wizyty i klienta (analogicznie do kalendarza).
- Wysylka SMS manualnego: `POST /api/salon/notifications/send-sms`.

## Klienci
Ekran: `ClientsPage.tsx`.
- Lista klientow: `GET /api/salon/clients`.
- Szczegoly klienta i historia wizyt: `GET /api/salon/clients/:id/appointments`.
- Dodawanie/edycja/archiwizacja:
  - `POST /api/salon/clients`
  - `PUT /api/salon/clients/:id`
  - `DELETE /api/salon/clients/:id` (dezaktywacja)
- Import CSV z wizytami: `POST /api/salon/clients/import`.
- Export CSV generowany po stronie frontu.

## Ustawienia (glowna strona)
Ekran: `SettingsPage.tsx`.
- Profil salonu: `GET /api/salon/profile`, `PUT /api/salon/profile`.
- Link do rezerwacji `/s/:slug`, QR code, personalizacja (logo, kolor).
- Wejscia do modulow: uslugi, pracownicy, godziny, przerwy, salony.

## Uslugi
Ekran: `ServicesSettingsPage.tsx`.
- `GET /api/salon/services`
- `POST /api/salon/services`
- `PUT /api/salon/services/:id`
- `DELETE /api/salon/services/:id` (dezaktywacja)

## Pracownicy i konta
Ekrany: `StaffSettingsPage.tsx`, `StaffEditPage.tsx`.
- Lista i edycja pracownikow:
  - `GET /api/salon/staff`
  - `POST /api/salon/staff`
  - `PUT /api/salon/staff/:id`
  - `DELETE /api/salon/staff/:id` (dezaktywacja)
- Konto pracownika:
  - `POST /api/salon/staff/:id/account`
  - `PUT /api/salon/staff/:id/account`
- Uprawnienia magazynowe pracownika: `inventoryRole`.

## Godziny i wyjatki
Ekran: `HoursSettingsPage.tsx`.
- Godziny pracy:
  - `GET /api/salon/hours`
  - `PUT /api/salon/hours`
- Wyjatki (swieta, zamkniecia):
  - `GET /api/salon/hours/exceptions`
  - `POST /api/salon/hours/exceptions`
  - `DELETE /api/salon/hours/exceptions/:id`

## Przerwy i bufory
Ekran: `BreaksSettingsPage.tsx`.
- `GET /api/salon/breaks`
- `POST /api/salon/breaks`
- `DELETE /api/salon/breaks/:id`
- Typy:
  - `BREAK` (przerwa w grafiku)
  - `BUFFER` (bufor przed/po usludze)

## Grafik pracownikow
Ekrany: `StaffSchedulePage.tsx`, `StaffScheduleEditPage.tsx`.
- Widok grafiku i wyjatkow:
  - `GET /api/salon/schedule/:staffId`
- Zapis grafiku:
  - `POST /api/salon/schedule/:staffId`
- Dodawanie wyjatku dla pracownika:
  - `POST /api/salon/schedule/:staffId/exceptions`

## Salony (multi-salon)
Ekran: `SalonsSettingsPage.tsx`.
- Lista salonow przypisanych do konta:
  - `GET /api/salon/user-salons`
- Dodanie salonu:
  - `POST /api/salon/user-salons`

## Powiadomienia
Ekran: `NotificationsPage.tsx`.
- Ustawienia zdarzen:
  - `GET /api/salon/notifications/settings`
  - `PUT /api/salon/notifications/settings`
- Szablony:
  - `GET /api/salon/notifications/templates`
  - `POST /api/salon/notifications/templates`
  - `PUT /api/salon/notifications/templates/:id`
- Test SMS:
  - `POST /api/salon/notifications/test-sms`
- Reczne SMS z listy wizyt:
  - `POST /api/salon/notifications/send-sms`

