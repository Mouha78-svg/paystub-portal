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

There is no test suite in this project.

## Architecture

### Backend (`server/`)
- **Entry**: `index.js` — Express app, CORS (origin: `CLIENT_URL` env var or `localhost:5173`), global rate limiter (100 req/15 min), then mounts routes under `/api/`.
- **Database**: `database/db.js` — `better-sqlite3` (synchronous), WAL mode. `initDB()` auto-creates tables, runs schema migrations (e.g. `ALTER TABLE … ADD COLUMN`), and seeds 3 demo employees on first run. Exported as a singleton `db`. The migration block also resets first-login demo accounts to `DEFAULT_PIN` on every startup.
- **Auth flow** (two-phase):
  1. First-time users authenticate with matricule + PIN → short-lived 30 min JWT with `first_login: true`.
  2. `POST /api/auth/change-password` verifies PIN again, sets `password_hash`, flips `is_active=1` and `first_login=0`, issues full 8 h JWT.
  3. Subsequent logins use matricule + bcrypt password. Per-matricule rate limit: 5 failed attempts / 15 min tracked in `login_attempts` table.
- **JWT payload**: `{ matricule, nom, prenom, service, is_admin }` (full token) or `{ matricule, first_login: true }` (temp token).
- **Default first-login password**: `DEFAULT_PIN = 'Crous2025'` defined in `controllers/adminController.js`. Used when admin creates or resets a user without specifying a custom password. The login page displays this value in its demo section.
- **PDF serving**: `GET /api/payslips/download/:id` — serves the file at `PDF_DIR/<fichier_pdf>` if it exists; otherwise generates a PDF on-the-fly via Puppeteer.
- **CSV sync**: `POST /api/sync/csv` — accepts multipart upload (multer) or reads `CSV_PATH`. Upserts rows into `payslips` table (unique on `matricule+mois+annee`).
- **Middleware**: `middleware/auth.js` verifies JWT and attaches `req.user`. `middleware/admin.js` checks `req.user.is_admin`; applied at the router level for all `/api/admin/*` routes.

### API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | — | Login (PIN or password) |
| POST | `/api/auth/change-password` | — | Complete first-login, set password |
| POST | `/api/auth/update-password` | user | Change own password |
| GET | `/api/auth/me` | user | Current employee info |
| GET | `/api/payslips` | user | All payslips for current user |
| GET | `/api/payslips/years` | user | Distinct years with payslips |
| GET | `/api/payslips/download/:id` | user | Download/generate payslip PDF |
| GET | `/api/payslips/:matricule` | user | Payslips by matricule |
| POST | `/api/sync/csv` | admin | Upload or sync payslips CSV |
| GET | `/api/admin/users` | admin | List all employees |
| POST | `/api/admin/users` | admin | Create employee |
| PUT | `/api/admin/users/:matricule` | admin | Update employee |
| DELETE | `/api/admin/users/:matricule` | admin | Delete employee |
| POST | `/api/admin/users/:matricule/reset-password` | admin | Reset to first-login + new PIN |

### Frontend (`client/`)
- **Auth context**: `src/contexts/AuthContext.jsx` — stores JWT + user object in `localStorage`, provides `login`, `logout`, and `user` to the whole app. The `user` object includes `is_admin`.
- **API layer**: `src/services/api.js` — Axios instance with `baseURL: '/api'`. A response interceptor auto-redirects to `/login` and clears localStorage on any 401/403 that isn't from the login or change-password endpoints.
- **Routing** (`App.jsx`):
  - Public routes: `/login`, `/first-login`
  - Protected routes (inside `<Layout>`): `/dashboard`, `/payslips`, `/profile`
  - Admin-only routes (inside `<AdminRoute>`): `/sync`, `/admin/users`
  - `<PrivateRoute>` redirects unauthenticated users to `/login`; `<AdminRoute>` redirects non-admins to `/dashboard`
- **Pages**: Dashboard, Payslips (list + download), Profile (change password), Sync (CSV upload), AdminUsers (CRUD + search + reset password).
- **Theme**: `src/theme.js` — MUI theme with marron/ocre CROUS color scheme (`#7D3C00` primary, `#C68B2E` secondary). Applied at app root via `<ThemeProvider>`.
- **Logo**: `client/public/logo.png` — displayed in sidebar and login page inside a circular white container with `borderRadius: '50%'` and image inset to 86% to prevent corner clipping.

## Demo Accounts

| Matricule | Credential | State |
|-----------|------------|-------|
| EMP001 | `Crous2025` | First-login (no password yet) |
| EMP002 | `Crous2025` | First-login (no password yet) |
| EMP003 | `Admin123!` | Active admin |

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
