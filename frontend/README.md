# TransitOps — Frontend

React + Vite + TypeScript + Tailwind client for the TransitOps backend.
Dark theme, orange accent, role-aware navigation. **No backend changes required.**

## Run it

```bash
# 1) Start the backend first (from the backend folder)
#    it listens on http://localhost:4000 and seeds demo data
cd backend
bun run src/db/seed.ts     # seeds users, vehicles, drivers, trips…
bun run src/index.ts       # starts the API on :4000

# 2) Start the frontend (this folder)
cd frontend
npm install
npm run dev                # opens on http://localhost:5173
```

The dev server is pinned to **port 5173** because the backend's CORS allows
that origin with credentials. If you change it, update `FRONTEND_URL` on the
backend too.

Point the client at a different API with a `.env` file (see `.env.example`):

```
VITE_API_URL=http://localhost:4000
```

## How auth works

The backend sets an **httpOnly `session` cookie** on login/signup. The browser
sends it automatically, so every request in `src/api/client.ts` uses
`credentials: "include"` — there is no bearer token to attach (an httpOnly
cookie is intentionally unreadable from JS). On load, `AuthContext` calls
`/auth/me` to restore the session.

## Demo accounts

All seeded users share the password `password123`:

| Role              | Email                     |
| ----------------- | ------------------------- |
| Fleet Manager     | meera.s@transitops.in     |
| Safety Officer    | karan.v@transitops.in     |
| Financial Analyst | anjali.t@transitops.in    |
| Driver/Dispatcher | raven.k@transitops.in     |

Self-signup always creates a **Driver** (the backend forces this role); the
login screen has one-tap buttons to fill each demo account.

## Role → screen access

Navigation and route guards mirror the backend's real authorization so the UI
never offers a screen that would 403:

| Screen           | Roles                                             |
| ---------------- | ------------------------------------------------- |
| Dashboard        | all roles                                         |
| Trips            | Fleet Manager, Driver                             |
| Vehicles         | all roles (write: Fleet Manager)                  |
| Drivers          | Fleet Manager, Safety Officer, Driver             |
| Maintenance      | Fleet Manager                                     |
| Fuel & Expenses  | Fleet Manager, Financial Analyst                  |
| Reports          | Fleet Manager, Financial Analyst                  |

`/dashboard` and `/reports` are role-gated on the backend (fleet_manager /
financial_analyst). The Dashboard therefore builds its KPIs from the **open**
`vehicles` / `drivers` / `trips` / `maintenance` endpoints so it works for
every role without a 403 — Fleet Utilization %, alerts (licence expiry, stuck
in-shop, suspended drivers) and the trend chart are computed client-side in
`src/lib/computeDashboard.ts`, matching the backend's own dashboard math.

## Structure

```
src/
├── api/          one file per backend module (fetch wrapper + endpoints)
├── context/      AuthContext (cookie session)
├── config/       nav.ts — single source of truth for role→screen access
├── components/
│   ├── layout/   Sidebar, Topbar, ProtectedLayout, AuthShell
│   └── ui/       Table, Modal, StatusBadge, KpiCard, Charts, Field, Toast…
├── lib/          format.ts (money/date/CSV), computeDashboard.ts
├── pages/        one page per screen
└── types/        mirrors backend *.types.ts exactly
```

## Notes

- Reports export to CSV client-side (mandatory deliverable). PDF export is left
  as a bonus.
- Business rules (unique registration, capacity vs cargo, licence validity,
  status transitions) are enforced by the backend; the UI surfaces the returned
  error messages via toasts rather than duplicating the logic.
