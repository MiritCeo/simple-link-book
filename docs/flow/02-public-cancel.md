# 02-public-cancel

Ekran: `src/pages/booking/CancelBooking.tsx`.

1. Wejscie na `/cancel/:token`.
2. Pobranie danych wizyty:
   - `GET /api/public/cancel/:token`
3. Dostepne akcje:
   - Zmiana terminu:
     - `GET /api/public/cancel/:token/availability?date=YYYY-MM-DD`
     - `POST /api/public/cancel/:token/reschedule`
   - Odwolanie:
     - `POST /api/public/cancel/:token`
4. Token jest jednorazowy, ma czas wygasniecia i moze byc uzyty tylko raz.
