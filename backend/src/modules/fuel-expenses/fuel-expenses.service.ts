import { db, newId } from "../../db/client";
import { getVehicleById } from "../vehicles/vehicles.service";
import { getTripById } from "../trips/trips.service";
import type {
  FuelLog,
  CreateFuelLogInput,
  UpdateFuelLogInput,
  FuelLogFilters,
  Expense,
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseFilters,
} from "./fuel-expenses.types";

// ============================================
// FUEL LOGS
// ============================================

/**
 * Returns all fuel logs, optionally filtered by vehicle_id/trip_id.
 * Used by: per-vehicle fuel history, ROI/efficiency reports.
 */
export function getAllFuelLogs(filters: FuelLogFilters = {}): FuelLog[] {
  let query = "SELECT * FROM fuel_logs WHERE 1=1";
  const params: (string | number)[] = [];

  if (filters.vehicle_id) {
    query += " AND vehicle_id = ?";
    params.push(filters.vehicle_id);
  }
  if (filters.trip_id) {
    query += " AND trip_id = ?";
    params.push(filters.trip_id);
  }

  query += " ORDER BY log_date DESC";

  return db.query(query).all(...params) as FuelLog[];
}

export function getFuelLogById(id: string): FuelLog | null {
  const log = db.query("SELECT * FROM fuel_logs WHERE id = ?").get(id) as FuelLog | null;
  return log ?? null;
}

/**
 * Rule: vehicle_id must reference a real vehicle; trip_id, if given, must
 * reference a real trip (it's optional — a fuel log doesn't have to be
 * tied to a specific trip).
 */
export function createFuelLog(input: CreateFuelLogInput): FuelLog {
  const vehicle = getVehicleById(input.vehicle_id);
  if (!vehicle) throw new Error("Vehicle not found.");

  if (input.trip_id) {
    const trip = getTripById(input.trip_id);
    if (!trip) throw new Error("Trip not found.");
  }

  const id = newId();

  db.query(
    `INSERT INTO fuel_logs (id, vehicle_id, trip_id, liters, cost, log_date, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.vehicle_id,
    input.trip_id ?? null,
    input.liters,
    input.cost,
    input.log_date,
    input.created_by ?? null
  );

  return getFuelLogById(id)!;
}

export function updateFuelLog(id: string, input: UpdateFuelLogInput): FuelLog {
  const existing = getFuelLogById(id);
  if (!existing) throw new Error("Fuel log not found.");

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
  db.query(`UPDATE fuel_logs SET ${fields.join(", ")} WHERE id = ?`).run(...params);

  return getFuelLogById(id)!;
}

// ============================================
// EXPENSES
// ============================================

/**
 * Returns all expenses, optionally filtered by vehicle_id/trip_id/category.
 * Used by: per-vehicle cost history, ROI reports.
 */
export function getAllExpenses(filters: ExpenseFilters = {}): Expense[] {
  let query = "SELECT * FROM expenses WHERE 1=1";
  const params: (string | number)[] = [];

  if (filters.vehicle_id) {
    query += " AND vehicle_id = ?";
    params.push(filters.vehicle_id);
  }
  if (filters.trip_id) {
    query += " AND trip_id = ?";
    params.push(filters.trip_id);
  }
  if (filters.category) {
    query += " AND category = ?";
    params.push(filters.category);
  }

  query += " ORDER BY expense_date DESC";

  return db.query(query).all(...params) as Expense[];
}

export function getExpenseById(id: string): Expense | null {
  const expense = db.query("SELECT * FROM expenses WHERE id = ?").get(id) as Expense | null;
  return expense ?? null;
}

/**
 * Rule: vehicle_id must reference a real vehicle; trip_id, if given, must
 * reference a real trip (optional — e.g. a parking fine may not tie to
 * any specific trip).
 */
export function createExpense(input: CreateExpenseInput): Expense {
  const vehicle = getVehicleById(input.vehicle_id);
  if (!vehicle) throw new Error("Vehicle not found.");

  if (input.trip_id) {
    const trip = getTripById(input.trip_id);
    if (!trip) throw new Error("Trip not found.");
  }

  const id = newId();

  db.query(
    `INSERT INTO expenses (id, vehicle_id, trip_id, category, amount, expense_date, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.vehicle_id,
    input.trip_id ?? null,
    input.category,
    input.amount,
    input.expense_date,
    input.created_by ?? null
  );

  return getExpenseById(id)!;
}

export function updateExpense(id: string, input: UpdateExpenseInput): Expense {
  const existing = getExpenseById(id);
  if (!existing) throw new Error("Expense not found.");

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
  db.query(`UPDATE expenses SET ${fields.join(", ")} WHERE id = ?`).run(...params);

  return getExpenseById(id)!;
}