# TransitOps — Smart Transport Operations Platform

A full-stack fleet management and transport operations platform for commercial vehicle fleets. TransitOps enables logistics companies to manage vehicles, drivers, trips, maintenance, fuel, expenses, and financial reporting — all through a role-based interface.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, Zustand, Recharts |
| Backend | Bun, Elysia, TypeScript |
| Database | SQLite (via `bun:sqlite`, WAL mode) |
| Auth | JWT (httpOnly cookies), Google OAuth (JWKS), bcrypt |

---

## Features

### Fleet & Driver Management
- Register, update, filter, and retire vehicles and drivers
- Vehicle status lifecycle: Available → On Trip / In Trip / Retired
- Driver status lifecycle: Available → On Trip / Off Duty / Suspended
- License compliance tracking with expiry alerts
- Driver safety score tracking (0–100)

### Trip Dispatch & Lifecycle
- Draft → Dispatched → Completed / Cancelled
- Server-side dispatch validation: vehicle availability, driver license validity, cargo weight vs. vehicle capacity
- Auto-generated sequential trip codes (TR001, TR002...)
- Automatic vehicle and driver status updates on dispatch/completion

### Maintenance Tracking
- Open/close maintenance logs per vehicle
- Vehicle status automatically flips to "In Shop" / "Available"
- Cost tracking per maintenance log

### Fuel & Expenses
- Log fuel purchases (liters, cost, date) linked to trips/vehicles
- Track operational expenses: tolls, parking, fines, misc.

### Dashboard (Role-Specific)
| Role | Dashboard Focus |
|------|-----------------|
| Fleet Manager | KPIs, vehicle status chart, trip trends, alerts |
| Driver | Earnings, current ride, fuel/expenses, recent trips |
| Dispatcher | Vehicle & driver availability, draft trips, quick dispatch |
| Safety Officer | License compliance, safety scores, suspended drivers |
| Financial Analyst | Revenue vs. costs, fuel cost breakdown, expense trends |

### Reports & Analytics
- **Vehicle ROI Report** — Revenue vs. total cost (fuel + maintenance + expenses + acquisition) per vehicle
- **Fuel Efficiency Report** — km/L and cost/km per vehicle and trip
- **Driver Safety Report** — Safety scores, completed trips, distance per driver
- **Trip Completion Report** — Status breakdown, completion rate, revenue, distance
- Date range filtering and CSV export on all reports

### Authentication & Authorization
- Email/password signup and login
- Google OAuth sign-in
- Forgot/reset password via 6-digit OTP
- httpOnly session cookies (7-day expiry)
- Backend RBAC middleware (`requireAuth` + `requireRole`)
- Frontend route guards and role-based sidebar navigation

---

## Role-Based Access

| Screen | Fleet Manager | Driver | Dispatcher | Safety Officer | Financial Analyst |
|--------|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Fleet Vehicles | ✅ (write) | — | ✅ (read) | — | — |
| Drivers | ✅ (write) | — | ✅ (read) | ✅ (read) | — |
| Trips | ✅ (write) | ✅ (read) | — | — | — |
| Maintenance | ✅ (write) | — | — | — | — |
| Fuel & Expenses | ✅ | ✅ | — | — | ✅ |
| Reports | ✅ | — | — | — | ✅ |

---

## Project Structure

```
├── backend/
│   └── src/
│       ├── index.ts                 # Elysia app entrypoint
│       ├── db/
│       │   ├── client.ts            # SQLite connection
│       │   ├── schema.sql           # DDL (7 tables + indexes)
│       │   ├── migrate.ts           # Schema runner
│       │   └── seed.ts              # Demo data
│       ├── modules/
│       │   ├── auth/                # Signup, login, OAuth, OTP reset
│       │   ├── vehicles/            # Vehicle CRUD + status
│       │   ├── drivers/             # Driver CRUD + status
│       │   ├── trips/               # Trip lifecycle + dispatch validation
│       │   ├── maintenance/         # Maintenance logs
│       │   ├── fuel-expenses/       # Fuel logs + expense tracking
│       │   ├── dashboard/           # KPI aggregation queries
│       │   └── reports/             # ROI, fuel, safety, completion reports
│       └── shared/
│           ├── rbac.ts              # Auth & role middleware
│           └── errors.ts            # Error helpers
├── frontend/
│   └── src/
│       ├── main.tsx                 # React entrypoint
│       ├── App.tsx                  # Route definitions
│       ├── api/                     # API client modules
│       ├── stores/                  # Zustand auth store
│       ├── config/nav.ts            # Role-to-screen navigation mapping
│       ├── types/index.ts           # Shared TypeScript interfaces
│       ├── lib/                     # Utilities (format, computeDashboard)
│       ├── pages/                   # 10 page components
│       └── components/
│           ├── layout/              # Sidebar, Topbar, AuthShell, ProtectedLayout
│           ├── dashboard/           # 5 role-specific dashboards
│           └── ui/                  # 22 shadcn/ui components
└── ABOUT.md
```

Each backend module follows a consistent pattern:
- `*.routes.ts` — Elysia HTTP handlers
- `*.service.ts` — Business logic and database queries
- `*.types.ts` — TypeScript interfaces

---

## Database Schema

7 tables with foreign key relationships and indexes:

| Table | Purpose |
|-------|---------|
| `users` | Auth accounts with role (fleet_manager, driver, dispatcher, safety_officer, financial_analyst) |
| `vehicles` | Registration, type, capacity, region, acquisition cost, status |
| `drivers` | Name, license (number, category LMV/HMV, expiry), contact, safety score, status |
| `trips` | Trip code, cargo details, route, vehicle/driver assignment, status, revenue |
| `maintenance_logs` | Vehicle maintenance with open/close lifecycle and cost |
| `fuel_logs` | Fuel purchases (liters, cost, date) optionally linked to trips |
| `expenses` | Operational costs (type, amount) optionally linked to trips |

---

## Getting Started

### Prerequisites
- [Bun](https://bun.sh) v1.3.14+
- Node.js (for frontend npm)

### Backend

```bash
cd backend
bun install
bun run db:migrate    # create tables
bun run db:seed       # populate demo data
bun run dev           # start API with hot reload (port 8080)
```

### Frontend

```bash
cd frontend
npm install
npm run dev           # start Vite dev server (port 5173)
```

### Environment Variables

**Backend** (`.env`):

| Variable | Description |
|----------|-------------|
| `PORT` | API listen port (default: 8080) |
| `DB_PATH` | SQLite file path |
| `JWT_SECRET` | Secret for signing JWTs |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `FRONTEND_URL` | CORS allowed origin (default: `http://localhost:5173`) |

**Frontend** (`.env`):

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL (default: `http://localhost:8080`) |

### Demo Accounts

All accounts use password: `password123`

| Role | Email |
|------|-------|
| Fleet Manager | meera.s@transitops.in |
| Safety Officer | karan.v@transitops.in |
| Financial Analyst | anjali.t@transitops.in |
| Driver | raven.k@transitops.in |
| Dispatcher | priya.m@transitops.in |

---

## Key Design Decisions

- **SQLite** — Lightweight, zero-config database suitable for hackathon and small-to-medium deployments
- **Modular backend** — Each domain (vehicles, drivers, trips, etc.) is isolated into its own module with routes, services, and types
- **Client-side dashboard computation** — For roles without backend `/dashboard` access (Driver, Dispatcher, Safety Officer), the frontend computes KPIs client-side from open list endpoints to avoid 403 errors
- **Server-side business rules** — Trip dispatch validation (vehicle availability, driver license, cargo weight) is enforced in the backend service layer
- **Dark theme** — UI uses a dark theme with orange (`#f97316`) accent, built with Tailwind CSS v4 and oklch color definitions
- **INR currency** — All monetary values formatted using `Intl.NumberFormat("en-IN")`
