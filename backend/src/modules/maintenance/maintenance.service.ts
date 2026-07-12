import { db, newId, now } from "../../db/client";
import { getVehicleById, updateVehicleStatus } from "../vehicles/vehicles.service";
import type {
  MaintenanceLog,
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
  MaintenanceFilters,
} from "./maintenance.types";

/**
 * Returns all maintenance logs, optionally filtered by vehicle_id/status.
 * Used by: Maintenance screen, per-vehicle history/cost views.
 */
export function getAllMaintenanceLogs(filters: MaintenanceFilters = {}): MaintenanceLog[] {
  let query = "SELECT * FROM maintenance_logs WHERE 1=1";
  const params: (string | number)[] = [];

  if (filters.vehicle_id) {
    query += " AND vehicle_id = ?";
    params.push(filters.vehicle_id);
  }
  if (filters.status) {
    query += " AND status = ?";
    params.push(filters.status);
  }

  query += " ORDER BY started_at DESC";

  return db.query(query).all(...params) as MaintenanceLog[];
}

export function getMaintenanceLogById(id: string): MaintenanceLog | null {
  const log = db.query("SELECT * FROM maintenance_logs WHERE id = ?").get(id) as MaintenanceLog | null;
  return log ?? null;
}

/**
 * Rule: opening a maintenance log ("send vehicle to shop") is blocked if the
 * vehicle is currently On Trip (can't pull it off an active trip) or
 * Retired (no more servicing). On success: log created Active, vehicle
 * status flips to In Shop.
 */
export function createMaintenanceLog(input: CreateMaintenanceInput): MaintenanceLog {
  const vehicle = getVehicleById(input.vehicle_id);
  if (!vehicle) throw new Error("Vehicle not found.");

  if (vehicle.status === "On Trip") {
    throw new Error("Cannot open a maintenance log for a vehicle that is currently On Trip.");
  }
  if (vehicle.status === "Retired") {
    throw new Error("Cannot open a maintenance log for a Retired vehicle.");
  }

  const id = newId();
  const startedAt = now();

  db.query(
    `INSERT INTO maintenance_logs
      (id, vehicle_id, type, description, cost, status, started_at, closed_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.vehicle_id,
    input.type,
    input.description ?? null,
    input.cost,
    "Active",
    startedAt,
    null,
    input.created_by ?? null
  );

  updateVehicleStatus(input.vehicle_id, "In Shop");

  return getMaintenanceLogById(id)!;
}

/**
 * Rule: type/description/cost can only be edited while the log is Active —
 * once Closed, it's a historical record and should go through no further
 * changes.
 */
export function updateMaintenanceLog(id: string, input: UpdateMaintenanceInput): MaintenanceLog {
  const existing = getMaintenanceLogById(id);
  if (!existing) throw new Error("Maintenance log not found.");

  if (existing.status !== "Active") {
    throw new Error(`Cannot edit a maintenance log that is already ${existing.status}.`);
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
  db.query(`UPDATE maintenance_logs SET ${fields.join(", ")} WHERE id = ?`).run(...params);

  return getMaintenanceLogById(id)!;
}

/**
 * Rule: closing a log requires it to currently be Active. On success:
 * log -> Closed (closed_at set). The vehicle only returns to Available if
 * no OTHER Active maintenance log remains on it — a vehicle can conceivably
 * have more than one open log, and closing one shouldn't prematurely
 * release the vehicle while another is still in progress.
 */
export function closeMaintenanceLog(id: string): MaintenanceLog {
  const log = getMaintenanceLogById(id);
  if (!log) throw new Error("Maintenance log not found.");

  if (log.status !== "Active") {
    throw new Error(`Cannot close a maintenance log that is already ${log.status}.`);
  }

  db.query("UPDATE maintenance_logs SET status = 'Closed', closed_at = ? WHERE id = ?").run(now(), id);

  const otherActive = db
    .query("SELECT id FROM maintenance_logs WHERE vehicle_id = ? AND status = 'Active'")
    .get(log.vehicle_id);

  if (!otherActive) {
    updateVehicleStatus(log.vehicle_id, "Available");
  }

  return getMaintenanceLogById(id)!;
}