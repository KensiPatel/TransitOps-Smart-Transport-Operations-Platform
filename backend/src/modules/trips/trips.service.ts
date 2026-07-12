import { db, newId, now } from "../../db/client";
import { getVehicleById, updateVehicleStatus } from "../vehicles/vehicles.service";
import { getDriverById, updateDriverStatus } from "../drivers/drivers.service";
import type {
  Trip,
  CreateTripInput,
  UpdateTripInput,
  CompleteTripInput,
  TripFilters,
} from "./trips.types";

/**
 * Generates the next sequential trip_code (TR001, TR002, ...).
 * Looks at the highest existing numeric suffix rather than a row count,
 * so it stays correct even if trips are ever deleted out of order.
 */
function generateTripCode(): string {
  const row = db
    .query(
      `SELECT trip_code FROM trips
       WHERE trip_code LIKE 'TR%'
       ORDER BY CAST(SUBSTR(trip_code, 3) AS INTEGER) DESC
       LIMIT 1`
    )
    .get() as { trip_code: string } | null;

  const nextNum = row ? parseInt(row.trip_code.slice(2), 10) + 1 : 1;
  return `TR${String(nextNum).padStart(3, "0")}`;
}

/**
 * Returns all trips, optionally filtered by status/vehicle_id/driver_id.
 * Used by: Trips screen, Dashboard, per-vehicle/per-driver history views.
 */
export function getAllTrips(filters: TripFilters = {}): Trip[] {
  let query = "SELECT * FROM trips WHERE 1=1";
  const params: (string | number)[] = [];

  if (filters.status) {
    query += " AND status = ?";
    params.push(filters.status);
  }
  if (filters.vehicle_id) {
    query += " AND vehicle_id = ?";
    params.push(filters.vehicle_id);
  }
  if (filters.driver_id) {
    query += " AND driver_id = ?";
    params.push(filters.driver_id);
  }

  query += " ORDER BY created_at DESC";

  return db.query(query).all(...params) as Trip[];
}

export function getTripById(id: string): Trip | null {
  const trip = db.query("SELECT * FROM trips WHERE id = ?").get(id) as Trip | null;
  return trip ?? null;
}

/**
 * Creates a trip in Draft status. vehicle_id/driver_id are optional at
 * this stage — a Draft trip can await assignment before being dispatched.
 */
export function createTrip(input: CreateTripInput): Trip {
  const id = newId();
  const trip_code = generateTripCode();

  db.query(
    `INSERT INTO trips
      (id, trip_code, source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, actual_distance, fuel_consumed, revenue, status, dispatched_at, completed_at, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    trip_code,
    input.source,
    input.destination,
    input.vehicle_id ?? null,
    input.driver_id ?? null,
    input.cargo_weight,
    input.planned_distance,
    null,
    null,
    0,
    "Draft",
    null,
    null,
    input.created_by ?? null,
    now()
  );

  return getTripById(id)!;
}

/**
 * Rule: trip details (route, cargo, vehicle/driver assignment) can only be
 * edited while the trip is still Draft — once Dispatched, the vehicle and
 * driver are already committed and status changes must go through
 * dispatchTrip/completeTrip instead.
 */
export function updateTrip(id: string, input: UpdateTripInput): Trip {
  const existing = getTripById(id);
  if (!existing) throw new Error("Trip not found.");

  if (existing.status !== "Draft") {
    throw new Error(`Cannot edit a trip that is already ${existing.status}.`);
  }

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
  db.query(`UPDATE trips SET ${fields.join(", ")} WHERE id = ?`).run(...params);

  return getTripById(id)!;
}

/**
 * Dispatch validation rules (all hard failures — no partial/forced dispatch):
 *  - Trip must currently be Draft.
 *  - Both a vehicle and a driver must be assigned.
 *  - The vehicle must exist and be Available.
 *  - The driver must exist, be Available, and hold an unexpired license.
 *  - cargo_weight must not exceed the vehicle's max_load_capacity.
 * On success: trip -> Dispatched (dispatched_at set), vehicle -> On Trip,
 * driver -> On Trip.
 */
export function dispatchTrip(id: string): Trip {
  const trip = getTripById(id);
  if (!trip) throw new Error("Trip not found.");

  if (trip.status !== "Draft") {
    throw new Error(`Cannot dispatch a trip that is already ${trip.status}.`);
  }

  if (!trip.vehicle_id || !trip.driver_id) {
    throw new Error("Trip must have both a vehicle and a driver assigned before dispatch.");
  }

  const vehicle = getVehicleById(trip.vehicle_id);
  if (!vehicle) throw new Error("Assigned vehicle not found.");
  if (vehicle.status !== "Available") {
    throw new Error(`Vehicle is not Available (current status: ${vehicle.status}).`);
  }

  const driver = getDriverById(trip.driver_id);
  if (!driver) throw new Error("Assigned driver not found.");
  if (driver.status !== "Available") {
    throw new Error(`Driver is not Available (current status: ${driver.status}).`);
  }
  const today = now().slice(0, 10);
  if (driver.license_expiry_date < today) {
    throw new Error("Driver's license has expired.");
  }

  if (trip.cargo_weight > vehicle.max_load_capacity) {
    throw new Error(
      `Cargo weight (${trip.cargo_weight}) exceeds vehicle max load capacity (${vehicle.max_load_capacity}).`
    );
  }

  db.query("UPDATE trips SET status = 'Dispatched', dispatched_at = ? WHERE id = ?").run(now(), id);
  updateVehicleStatus(trip.vehicle_id, "On Trip");
  updateDriverStatus(trip.driver_id, "On Trip");

  return getTripById(id)!;
}

/**
 * Completion requires the trip to currently be Dispatched, and requires
 * actual_distance + fuel_consumed to be reported (revenue optional,
 * defaults to keeping whatever was already on the trip).
 * On success: trip -> Completed (completed_at set), vehicle -> Available,
 * driver -> Available.
 */
export function completeTrip(id: string, input: CompleteTripInput): Trip {
  const trip = getTripById(id);
  if (!trip) throw new Error("Trip not found.");

  if (trip.status !== "Dispatched") {
    throw new Error(`Cannot complete a trip that is ${trip.status} (must be Dispatched).`);
  }

  db.query(
    `UPDATE trips
     SET status = 'Completed', completed_at = ?, actual_distance = ?, fuel_consumed = ?, revenue = ?
     WHERE id = ?`
  ).run(now(), input.actual_distance, input.fuel_consumed, input.revenue ?? trip.revenue, id);

  // vehicle_id/driver_id are guaranteed non-null here — a trip can only
  // reach Dispatched after dispatchTrip() confirmed both were assigned.
  updateVehicleStatus(trip.vehicle_id!, "Available");
  updateDriverStatus(trip.driver_id!, "Available");

  return getTripById(id)!;
}

/**
 * Rule: only a Draft trip can be cancelled. A Dispatched trip has already
 * committed a vehicle and driver to the road — cancellation isn't offered
 * mid-trip; it must be run through completeTrip instead.
 */
export function cancelTrip(id: string): Trip {
  const trip = getTripById(id);
  if (!trip) throw new Error("Trip not found.");

  if (trip.status !== "Draft") {
    throw new Error(`Cannot cancel a trip that is ${trip.status} (only Draft trips can be cancelled).`);
  }

  db.query("UPDATE trips SET status = 'Cancelled' WHERE id = ?").run(id);

  return getTripById(id)!;
}