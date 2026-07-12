import { db, newId, now } from "../../db/client";
import type {
  Driver,
  CreateDriverInput,
  UpdateDriverInput,
  DriverFilters,
  DriverStatus,
} from "./drivers.types";

/**
 * Returns all drivers, optionally filtered by status/license_category.
 * Used by: Driver Registry screen, Dashboard filters.
 */
export function getAllDrivers(filters: DriverFilters = {}): Driver[] {
  let query = "SELECT * FROM drivers WHERE 1=1";
  const params: (string | number)[] = [];

  if (filters.status) {
    query += " AND status = ?";
    params.push(filters.status);
  }
  if (filters.license_category) {
    query += " AND license_category = ?";
    params.push(filters.license_category);
  }

  query += " ORDER BY created_at DESC";

  return db.query(query).all(...params) as Driver[];
}

/**
 * Rule: "Suspended, Off Duty, or On Trip drivers must never appear in the
 * dispatch selection." Also excludes drivers whose license has expired —
 * an expired license makes a driver non-dispatchable regardless of status.
 * Used by: Trip creation screen — driver picker dropdown.
 */
export function getAvailableDrivers(): Driver[] {
  return db
    .query(
      `SELECT * FROM drivers
       WHERE status = 'Available'
         AND license_expiry_date >= date('now')
       ORDER BY name`
    )
    .all() as Driver[];
}

export function getDriverById(id: string): Driver | null {
  const driver = db.query("SELECT * FROM drivers WHERE id = ?").get(id) as Driver | null;
  return driver ?? null;
}

/**
 * Rule: "The driver's license number must be unique."
 * Enforced at the DB level (UNIQUE constraint) — this catches that
 * failure and turns it into a clean error instead of a raw SQLite exception.
 */
export function createDriver(input: CreateDriverInput): Driver {
  const id = newId();

  try {
    db.query(
      `INSERT INTO drivers
        (id, user_id, name, license_number, license_category, license_expiry_date, contact_number, safety_score, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      input.user_id ?? null,
      input.name,
      input.license_number,
      input.license_category,
      input.license_expiry_date,
      input.contact_number,
      input.safety_score ?? 100,
      "Available",
      now()
    );
  } catch (err: any) {
    if (err.message?.includes("UNIQUE constraint failed")) {
      throw new Error(`License number '${input.license_number}' already exists.`);
    }
    throw err;
  }

  return getDriverById(id)!;
}

export function updateDriver(id: string, input: UpdateDriverInput): Driver {
  const existing = getDriverById(id);
  if (!existing) throw new Error("Driver not found.");

  const fields: string[] = [];
  const params: (string | number)[] = [];

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      params.push(value as string | number);
    }
  }

  if (fields.length === 0) return existing; // nothing to update

  params.push(id);
  db.query(`UPDATE drivers SET ${fields.join(", ")} WHERE id = ?`).run(...params);

  return getDriverById(id)!;
}

/**
 * Direct status change (e.g. Suspend a driver from the registry screen).
 * NOTE: Trip dispatch/complete should call this too, but from its own
 * service — keeping the single source of truth for "how a driver's
 * status changes" here.
 */
export function updateDriverStatus(id: string, status: DriverStatus): Driver {
  const existing = getDriverById(id);
  if (!existing) throw new Error("Driver not found.");

  db.query("UPDATE drivers SET status = ? WHERE id = ?").run(status, id);
  return getDriverById(id)!;
}