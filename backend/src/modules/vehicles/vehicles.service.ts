import { db, newId, now } from "../../db/client";
import type {
  Vehicle,
  CreateVehicleInput,
  UpdateVehicleInput,
  VehicleFilters,
  VehicleStatus,
} from "./vehicles.types";

/**
 * Returns all vehicles, optionally filtered by status/type/region.
 * Used by: Vehicle Registry screen, Dashboard filters.
 */
export function getAllVehicles(filters: VehicleFilters = {}): Vehicle[] {
  let query = "SELECT * FROM vehicles WHERE 1=1";
  const params: (string | number)[] = [];

  if (filters.status) {
    query += " AND status = ?";
    params.push(filters.status);
  }
  if (filters.type) {
    query += " AND type = ?";
    params.push(filters.type);
  }
  if (filters.region) {
    query += " AND region = ?";
    params.push(filters.region);
  }

  query += " ORDER BY created_at DESC";

  return db.query(query).all(...params) as Vehicle[];
}

/**
 * Rule: "Retired or In Shop vehicles must never appear in the dispatch selection."
 * Used by: Trip creation screen — vehicle picker dropdown.
 */
export function getAvailableVehicles(): Vehicle[] {
  return db
    .query("SELECT * FROM vehicles WHERE status = 'Available' ORDER BY name_model")
    .all() as Vehicle[];
}

export function getVehicleById(id: string): Vehicle | null {
  const vehicle = db.query("SELECT * FROM vehicles WHERE id = ?").get(id) as Vehicle | null;
  return vehicle ?? null;
}

/**
 * Rule: "The vehicle registration number must be unique."
 * Enforced at the DB level (UNIQUE constraint) — this catches that
 * failure and turns it into a clean error instead of a raw SQLite exception.
 */
export function createVehicle(input: CreateVehicleInput): Vehicle {
  const id = newId();

  try {
    db.query(
      `INSERT INTO vehicles
        (id, registration_number, name_model, type, max_load_capacity, odometer, acquisition_cost, region, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      input.registration_number,
      input.name_model,
      input.type,
      input.max_load_capacity,
      input.odometer ?? 0,
      input.acquisition_cost,
      input.region ?? null,
      "Available",
      now()
    );
  } catch (err: any) {
    if (err.message?.includes("UNIQUE constraint failed")) {
      throw new Error(`Registration number '${input.registration_number}' already exists.`);
    }
    throw err;
  }

  return getVehicleById(id)!;
}

export function updateVehicle(id: string, input: UpdateVehicleInput): Vehicle {
  const existing = getVehicleById(id);
  if (!existing) throw new Error("Vehicle not found.");

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
  db.query(`UPDATE vehicles SET ${fields.join(", ")} WHERE id = ?`).run(...params);

  return getVehicleById(id)!;
}

/**
 * Direct status change (e.g. Retire a vehicle from the registry screen).
 * NOTE: Trip dispatch/complete and Maintenance open/close should call this
 * too, but from their own services — keeping the single source of truth
 * for "how a vehicle's status changes" here.
 */
export function updateVehicleStatus(id: string, status: VehicleStatus): Vehicle {
  const existing = getVehicleById(id);
  if (!existing) throw new Error("Vehicle not found.");

  db.query("UPDATE vehicles SET status = ? WHERE id = ?").run(status, id);
  return getVehicleById(id)!;
}