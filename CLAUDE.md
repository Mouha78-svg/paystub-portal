# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack HR portal (French-language) for employees to consult and download payslips. Two separate Node.js apps: `server/` (Express + PostgreSQL via Supabase) and `client/` (React + Vite + MUI).

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

The Vite dev server proxies `/api/*` to `http://localhost:5000`.

There is no test suite in this project.

## Architecture

### Backend (`server/`)

- **Entry**: `index.js` — Express app, `dotenv-expand` for `.env` variable interpolation (`${VAR}` syntax supported), CORS (`CLIENT_URL` env var or `localhost:5173`), global rate limiter (100 req/15 min), mounts all routes under `/api/`. In production, serves the React build from `../client/dist`. Server only starts after `initDB()` resolves.
- **Database**: `database/db.js` — `pg` Pool connected to Supabase via `DATABASE_URL` (SSL `rejectUnauthorized: false`). `initDB()` runs `CREATE TABLE IF NOT EXISTS` for all tables, uses `ADD COLUMN IF NOT EXISTS` for migrations on live databases, ensures EMP003 is admin, and seeds 3 demo employees on first run. Exports `pool`.
- **Schema**: Four tables — `employees`, `payslips`, `login_attempts`, `registration_requests`. `payslips` has a `UNIQUE(matricule, mois, annee)` constraint and a FK to `employees(matricule)`. `registration_requests` is a temporary staging table for the self-registration flow; rows are deleted after successful verification.
- **Query conventions**: All controllers `async/await` with `next(err)`. Positional params use `$1, $2, …`. `COUNT(*)` returns BigInt string — always wrap in `parseInt()`. `DOUBLE PRECISION` for salary columns (maps to JS `number`; `NUMERIC` would return strings).
- **Auth flow** (two-phase):
  1. First-time users authenticate with matricule + PIN → short-lived 30 min JWT with `first_login: true`.
  2. `POST /api/auth/change-password` verifies PIN again, sets `password_hash`, flips `is_active=1` and `first_login=0`, issues full 8 h JWT.
  3. Subsequent logins use matricule + bcrypt password. Per-matricule rate limit: 5 failed attempts / 15 min tracked in `login_attempts`.
- **JWT payload**: `{ matricule, nom, prenom, service, is_admin }` (full token) or `{ matricule, first_login: true }` (temp token).
- **PIN generation**: `utils/generatePin.js` — 8-char random PIN with at least 2 uppercase, 2 lowercase, 2 digits (uses ambiguous-character-free charset). Used for admin-created accounts, password resets, and self-registration.
- **Self-registration flow**: `POST /api/auth/register` validates the request, stores it in `registration_requests` with a 6-digit code (15 min TTL), and emails the code. `POST /api/auth/verify-registration` checks code, creates the `employees` row with a generated PIN, deletes the staging row, and returns the PIN in the response for display to the user.
- **Forgot-password flow**: `POST /api/auth/forgot-password` accepts `{ matricule, email }`, verifies the email matches the employee record, generates a new PIN, resets the account to first-login state (`password_hash=NULL, is_active=0, first_login=1`), and emails the PIN. Always returns the same generic message regardless of whether the account was found (prevents user enumeration).
- **PDF serving**: `GET /api/payslips/download/:id` — serves `PDF_DIR/<fichier_pdf>` if present; otherwise generates a PDF on-the-fly via Puppeteer.
- **CSV sync**: `POST /api/sync/csv` — multipart upload (multer to `/tmp/csv-uploads/`) or reads `CSV_PATH`. Collects all rows, runs a single `BEGIN/COMMIT` transaction that upserts both `employees` and `payslips`.
- **Middleware**: `middleware/auth.js` verifies JWT, attaches `req.user`. `middleware/admin.js` checks `req.user.is_admin`; applied at router level for all `/api/admin/*` routes and `POST /api/sync/csv`.

### API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | — | Login (PIN or password) |
| POST | `/api/auth/forgot-password` | — | Reset to first-login + email new PIN |
| POST | `/api/auth/change-password` | — | Complete first-login, set password |
| POST | `/api/auth/update-password` | user | Change own password |
| GET | `/api/auth/me` | user | Current employee info |
| POST | `/api/auth/register` | — | Start self-registration (sends email code) |
| POST | `/api/auth/verify-registration` | — | Complete self-registration with code |
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
| GET | `/api/admin/users/:matricule/payslips` | admin | List payslips for a user |
| POST | `/api/admin/users/:matricule/payslips` | admin | Add payslip (with optional PDF upload) |
| PUT | `/api/admin/payslips/:id` | admin | Update payslip |
| DELETE | `/api/admin/payslips/:id` | admin | Delete payslip |

### Frontend (`client/`)

- **Auth context**: `src/contexts/AuthContext.jsx` — JWT + user object in `localStorage`. The `user` object includes `is_admin`.
- **API layer**: `src/services/api.js` — Axios with `baseURL: '/api'`. Response interceptor auto-redirects to `/login` and clears localStorage on 401/403 (except for login and change-password endpoints).
- **Routing** (`App.jsx`):
  - Public: `/login`, `/register`, `/verify-email`, `/forgot-password`, `/first-login`
  - Protected (inside `<Layout>`): `/dashboard`, `/payslips`, `/profile`
  - Admin-only (inside `<AdminRoute>`): `/sync`, `/admin/users`
  - `<PrivateRoute>` redirects unauthenticated users to `/login`; `<AdminRoute>` redirects non-admins to `/dashboard`
- **Theme**: `src/theme.js` — MUI theme, marron/ocre CROUS colors (`#7D3C00` primary, `#C68B2E` secondary).
- **Logo**: `client/public/logo.png` — displayed in sidebar and all auth pages inside a circular white container (`borderRadius: '50%'`, image inset to 86%).

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
DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
PDF_DIR=./pdf
CSV_PATH=./csv/payslips.csv
NODE_ENV=development
CLIENT_URL=http://localhost:5173   # optional

# Email (Nodemailer) — required for self-registration and forgot-password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@ugb-crous.sn
```

`dotenv-expand` is active, so `${VAR}` interpolation works in `.env`.

## CSV Format

```csv
matricule,nom,prenom,mois,annee,salaire_brut,salaire_net,fichier_pdf
EMP001,Seye,Mouhamed,Janvier,2025,500000,420000,EMP001_2025_01.pdf
```

PDF files go in `server/pdf/` named exactly as the `fichier_pdf` column value.
