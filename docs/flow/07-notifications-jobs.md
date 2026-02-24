# 07-notifications-jobs

Logika w `server/src/index.ts` i `server/src/notificationService.ts`.

1. Co minute uruchamiany jest job przypominajacy.
2. Sprawdza ustawienia powiadomien (SMS/Email) i okna czasowe.
3. Wysyla:
   - `BOOKING_CONFIRMATION`
   - `REMINDER_24H`
   - `REMINDER_2H`
   - `CANCELLATION`
   - `FOLLOWUP`
4. Loguje wysylki w `NotificationLog`.
5. Generuje link anulowania (`/cancel/:token`) i wstawia do tresci.

