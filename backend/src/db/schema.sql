-- ============================================
-- TransitOps — SQLite Schema
-- Note: SQLite has no native UUID type, so IDs are stored as TEXT
-- and generated app-side using crypto.randomUUID() before insert.
-- ============================================

PRAGMA foreign_keys = ON;

-- ============================================
-- USERS & AUTH
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  google_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'driver' CHECK (role IN ('fleet_manager','driver','safety_officer','financial_analyst')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- VEHICLES
-- ============================================
CREATE TABLE IF NOT EXISTS vehicles (
  id                   TEXT PRIMARY KEY,
  registration_number  TEXT NOT NULL UNIQUE,
  name_model           TEXT NOT NULL,
  type                 TEXT NOT NULL,                 -- truck, van, bike, etc.
  max_load_capacity    NUMERIC NOT NULL,               -- kg — validated against trip cargo_weight
  odometer             NUMERIC NOT NULL DEFAULT 0,
  acquisition_cost     NUMERIC NOT NULL,               -- required for ROI report
  region               TEXT,                           -- dashboard filter
  status               TEXT NOT NULL DEFAULT 'Available'
                         CHECK (status IN ('Available','On Trip','In Shop','Retired')),
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- DRIVERS
-- ============================================
CREATE TABLE IF NOT EXISTS drivers (
  id                 TEXT PRIMARY KEY,
  user_id            TEXT REFERENCES users(id),        -- nullable, future-proofing only
  name               TEXT NOT NULL,
  license_number     TEXT NOT NULL UNIQUE,
  license_category   TEXT NOT NULL,                    -- LMV / HMV
  license_expiry_date TEXT NOT NULL,
  contact_number     TEXT NOT NULL,
  safety_score       NUMERIC NOT NULL DEFAULT 100,
  status             TEXT NOT NULL DEFAULT 'Available'
                       CHECK (status IN ('Available','On Trip','Off Duty','Suspended')),
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- TRIPS
-- ============================================
CREATE TABLE IF NOT EXISTS trips (
  id               TEXT PRIMARY KEY,
  trip_code        TEXT NOT NULL UNIQUE,               -- e.g. TR001, auto-generated
  source           TEXT NOT NULL,
  destination      TEXT NOT NULL,
  vehicle_id       TEXT REFERENCES vehicles(id),        -- nullable: Draft can await vehicle
  driver_id        TEXT REFERENCES drivers(id),         -- nullable: Draft can await driver
  cargo_weight     NUMERIC NOT NULL,
  planned_distance NUMERIC NOT NULL,
  actual_distance  NUMERIC,                             -- filled on Complete
  fuel_consumed    NUMERIC,                             -- filled on Complete
  revenue          NUMERIC DEFAULT 0,                   -- required for ROI report
  status           TEXT NOT NULL DEFAULT 'Draft'
                     CHECK (status IN ('Draft','Dispatched','Completed','Cancelled')),
  dispatched_at    TEXT,
  completed_at     TEXT,
  created_by       TEXT REFERENCES users(id),
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- MAINTENANCE LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id           TEXT PRIMARY KEY,
  vehicle_id   TEXT NOT NULL REFERENCES vehicles(id),
  type         TEXT NOT NULL,                          -- Oil Change, Tire Replacement, etc.
  description  TEXT,
  cost         NUMERIC NOT NULL,                        -- required for operational cost calc
  status       TEXT NOT NULL DEFAULT 'Active'
                 CHECK (status IN ('Active','Closed')),
  started_at   TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at    TEXT,
  created_by   TEXT REFERENCES users(id)
);

-- ============================================
-- FUEL LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS fuel_logs (
  id          TEXT PRIMARY KEY,
  vehicle_id  TEXT NOT NULL REFERENCES vehicles(id),
  trip_id     TEXT REFERENCES trips(id),
  liters      NUMERIC NOT NULL,
  cost        NUMERIC NOT NULL,
  log_date    TEXT NOT NULL,
  created_by  TEXT REFERENCES users(id)
);

-- ============================================
-- EXPENSES (tolls, fines, parking, misc)
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
  id            TEXT PRIMARY KEY,
  vehicle_id    TEXT NOT NULL REFERENCES vehicles(id),
  trip_id       TEXT REFERENCES trips(id),
  category      TEXT NOT NULL,                         -- toll, fine, parking, etc.
  amount        NUMERIC NOT NULL,
  expense_date  TEXT NOT NULL,
  created_by    TEXT REFERENCES users(id)
);

-- ============================================
-- INDEXES — dispatch validation & dashboard filters run constantly
-- ============================================
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_region ON vehicles(region);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle ON trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON maintenance_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_vehicle ON fuel_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_expenses_vehicle ON expenses(vehicle_id);