# 00-overview

## Architektura i uruchamianie

- Frontend: Vite + React + TypeScript, pliki w `src/`.
- Backend: Express + Prisma (MySQL), pliki w `server/src/`.
- Dokumentacja API (Swagger): `GET /api/docs` (czyta `server/openapi.yaml`).
- Zmienne srodowiskowe backendu: `server/README.md` (m.in. `DATABASE_URL`, `JWT_SECRET`, `SENDGRID_*`, `SMSAPI_*`, `APP_BASE_URL`).

## Role i autoryzacja

### Role uzytkownikow
- `SUPER_ADMIN`: zarzadzanie ownerami i salonami (panel admin).
- `OWNER`: wlasciciel salonu (pelne uprawnienia).
- `STAFF`: pracownik salonu (ograniczone uprawnienia).
- `CLIENT`: klient salonu (panel klienta).

### Role magazynowe
- `ADMIN`, `MANAGER`, `STAFF` (odczyt) - steruja dostepem do magazynu.

### Tokeny i kontekst salonu
- Token JWT zapisywany po logowaniu w `localStorage` (`auth_token` lub `client_token`).
- Dla kont z wieloma salonami wybierany jest aktywny salon (`/wybierz-salon`) i ustawiany przez `POST /api/auth/switch-salon`.
- Uprawnienia magazynowe sa trzymane lokalnie jako `inventory_role`.
