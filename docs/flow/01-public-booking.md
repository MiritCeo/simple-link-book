# 01-public-booking

Ekrany frontend: `src/pages/booking/SalonBooking.tsx` oraz `src/pages/booking/CancelBooking.tsx`.

## Strona salonu i lista uslug
1. Klient wchodzi na `/s/:slug`.
2. Front pobiera dane salonu:
   - `GET /api/public/salons/:slug` -> salon, uslugi, pracownicy.
3. Na stronie widoczne sa informacje salonu i lista uslug (landing + krok 1).

## Wybor specjalisty i terminu
1. Klient wybiera usluge, opcjonalnie pracownika (lub "dowolny").
2. Dostepnosc godzin:
   - `GET /api/public/salons/:slug/availability?date=YYYY-MM-DD&serviceId=...&staffId=...`
3. System wylicza sloty na podstawie:
   - godzin salonu, wyjatkow, przerw i buforow,
   - dostepnosci pracownika,
   - istniejacych wizyt (kolizje).

## Dane klienta i potwierdzenie
1. Klient podaje dane kontaktowe.
2. Rezerwacja:
   - `POST /api/public/salons/:slug/appointments`
3. Backend:
   - tworzy/aktualizuje klienta po telefonie,
   - weryfikuje uslugi i pracownika,
   - sprawdza dostepnosc terminu,
   - tworzy wizyte i wysyla powiadomienie (SMS/email),
   - generuje bezpieczny token anulowania/przelozenia (`cancelToken`).
4. Front wyswietla potwierdzenie i link do zarzadzania wizyta `/cancel/:token`.

## Opcjonalna rejestracja konta klienta po rezerwacji
1. Po potwierdzeniu klient moze zalozyc konto.
2. Rejestracja:
   - `POST /api/public/client/register` (token z rezerwacji, email, haslo).
3. Klient otrzymuje JWT i moze wejsc do panelu `/konto`.
