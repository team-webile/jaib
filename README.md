# Jaib — Personal & Business Finance Ledger

Multi-tenant double-entry ledger for personal and business finance.

## Stack

- **Backend:** Laravel 11 + PostgreSQL
- **Frontend:** Next.js 15 + TypeScript + Tailwind CSS
- **Auth:** Laravel Sanctum
- **Multi-tenancy:** Organization-scoped data

## Structure

```
jaib/
├── backend/       Laravel API
├── frontend/     Next.js app
└── .github/      Deployment workflows
```

## Local Development

```bash
# Backend
cd backend
cp .env.example .env
php artisan key:generate
php artisan migrate

# Frontend
cd frontend
npm install
npm run dev
```

## Deployment

Push to `main` → GitHub Actions deploys to VPS via SSH.
