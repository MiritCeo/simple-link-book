# Backend (API)

## Env vars (create locally)

Create a local `.env` (do not commit) with:

- `DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/purebook`
- `JWT_SECRET=replace-with-strong-secret`
- `SENDGRID_API_KEY=replace-with-sendgrid-key`
- `SENDGRID_FROM=hello@yourdomain.com`
- `SMSAPI_API_KEY=replace-with-smsapi-key`
- `SMSAPI_FROM=YourBrand` (optional)
- `APP_BASE_URL=http://localhost:8080`

## Commands

- `npm install`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run dev`
