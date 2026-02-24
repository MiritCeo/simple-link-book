# 03-client-panel

Ekrany: `src/pages/client/*`, logowanie w `src/pages/auth/ClientLoginPage.tsx`.

## Logowanie klienta
- `POST /api/client/login` -> JWT klienta.
- Token trafia do `localStorage` (`client_token`).

## Dashboard klienta
Ekran: `ClientDashboard.tsx`.
1. `GET /api/client/me` + `GET /api/client/appointments`.
2. Widok najblizszej wizyty, szybkie re-bookingi, link do /cancel/:token.

## Lista wizyt
Ekran: `ClientAppointments.tsx`.
1. Nadchodzace i historyczne wizyty.
2. Akcje: przelozenie/odwolanie przez `/cancel/:token`.

## Profil klienta i haslo
Ekran: `ClientProfile.tsx`.
- `PUT /api/client/me` (aktualizacja profilu).
- `PUT /api/client/password` (zmiana hasla).

## Reset hasla klienta
Ekran: `ClientResetPasswordPage.tsx`.
- `POST /api/client/password-reset` (wysylka linku).
- `POST /api/client/password-reset/confirm` (ustawienie nowego hasla).
