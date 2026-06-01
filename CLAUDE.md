# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack HR portal (French-language) for employees to consult and download payslips. Two separate Node.js apps: `server/` (Express + SQLite) and `client/` (React + Vite + MUI).

## Commands

### Setup
```bash
npm run setup          # install all deps + copy .env.example → server/.env
```

### Development (two terminals)
```bash
# Terminal 1 — backend on http://localhost:5000
npm run dev:server     # uses nodemon

# Terminal 2 — frontend on http://localhost:5173
npm run dev:client
```

### Production
```bash
npm run start:server
cd client && npm run build
```

The Vite dev server proxies `/api/*` to `http://localhost:5000`, so the frontend never needs the backend URL hardcoded.

## Architecture

### Backend (`server/`)
- **Entry**: `index.js` — Express app, CORS (origin: `CLIENT_URL` env var or `localhost:5173`), rate limiter (100 req/15 min globally), then mounts routes.
- **Database**: `database/db.js` — `better-sqlite3` (synchronous), WAL mode. Auto-creates tables and seeds 3 demo employees on first run. Exported as a singleton `db`.
- **Auth flow**: Two-phase login.
  1. First-time users authenticate with matricule + PIN → receive a short-lived 30m JWT with `first_login: true`.
  2. `POST /api/auth/change-password` verifies the PIN again, sets `password_hash`, flips `is_active=1` and `first_login=0`, issues a full 8h JWT.
  3. Subsequent logins use matricule + bcrypt password. Per-matricule rate limit: 5 failed attempts / 15 min tracked in `login_attempts` table.
- **JWT**: Signed with `JWT_SECRET` env var. Payload contains `{ matricule, nom, prenom, service }`.
- **PDF serving**: `GET /api/payslips/download/:id` — serves the file at `PDF_DIR/<fichier_pdf>` if it exists; otherwise generates an HTML payslip response on-the-fly.
- **CSV sync**: `POST /api/sync/csv` — accepts multipart upload or reads `CSV_PATH`. Upserts rows into `payslips` table (unique on `matricule+mois+annee`).

### Frontend (`client/`)
- **Auth context**: `src/contexts/AuthContext.jsx` — stores JWT in `localStorage`, provides `login`, `logout`, and `user` to the whole app.
- **API layer**: `src/services/api.js` — Axios instance; attaches `Authorization: Bearer <token>` from context automatically.
- **Routing**: `App.jsx` — protected routes wrapped in `<PrivateRoute>` render inside `<Layout>` (sidebar + nav). Public routes: `/login`, `/first-login`.
- **Pages**: Dashboard, Payslips (list + download), Profile, Sync (CSV upload).
- **Theme**: `src/theme.js` — MUI custom theme applied at app root.

## Demo Accounts

| Matricule | Credential | State |
|-----------|------------|-------|
| EMP001 | PIN: `1234` | First-login (no password yet) |
| EMP002 | PIN: `5678` | First-login (no password yet) |
| EMP003 | Password: `Admin123!` | Active |

## Environment Variables (`server/.env`)

```
PORT=5000
JWT_SECRET=<change this>
JWT_EXPIRES_IN=8h
DB_PATH=./database/paystub.db
PDF_DIR=./pdf
CSV_PATH=./csv/payslips.csv
NODE_ENV=development
CLIENT_URL=http://localhost:5173   # optional, defaults to localhost:5173
```

## CSV Format

```csv
matricule,nom,prenom,mois,annee,salaire_brut,salaire_net,fichier_pdf
EMP001,Seye,Mouhamed,Janvier,2025,500000,420000,EMP001_2025_01.pdf
```

PDF files go in `server/pdf/` named exactly as the `fichier_pdf` column value.
