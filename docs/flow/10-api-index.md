# 10-api-index

## Public
- `GET /api/public/salons/:slug`
- `GET /api/public/salons/:slug/availability`
- `POST /api/public/salons/:slug/appointments`
- `GET /api/public/cancel/:token`
- `GET /api/public/cancel/:token/availability`
- `POST /api/public/cancel/:token/reschedule`
- `POST /api/public/cancel/:token`
- `POST /api/public/client/register`

## Auth
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/switch-salon`

## Client
- `POST /api/client/login`
- `POST /api/client/password-reset`
- `POST /api/client/password-reset/confirm`
- `GET /api/client/me`
- `PUT /api/client/me`
- `GET /api/client/appointments`
- `PUT /api/client/password`

## Salon
- `/api/salon/*` (profile, services, staff, appointments, clients, hours, breaks, schedule, notifications)

## Inventory
- `/api/salon/inventory/*`

## Admin
- `/api/admin/owners`

