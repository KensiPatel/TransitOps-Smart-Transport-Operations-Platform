import { db, newId, now } from "./client";

// One-off manual insert script.
// Edit the table/values below, run with: bun run src/db/add-data.ts
// Delete or clear this file's contents after use — it's just a scratchpad.

// ---------- Example: add a new vehicle ----------
db.query(
  `INSERT INTO vehicles (id, registration_number, name_model, type, max_load_capacity, odometer, acquisition_cost, region, status, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
).run(
  newId(), "GJ01AB7788", "TRUCK-20", "Truck", 4000, 12000, 2100000, "Ahmedabad", "Available", now()
);

console.log("Row inserted.");

// ---------- Example: add a new driver ----------
// db.query(
//   `INSERT INTO drivers (id, name, license_number, license_category, license_expiry_date, contact_number, safety_score, status, created_at)
//    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
// ).run(
//   newId(), "Rakesh", "DL-99001", "LMV", "2029-01-01", "9812345678", 90, "Available", now()
// );

// ---------- Example: add a new trip ----------
// db.query(
//   `INSERT INTO trips (id, trip_code, source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, actual_distance, fuel_consumed, revenue, status, dispatched_at, completed_at, created_by, created_at)
//    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
// ).run(
//   newId(), "TR004", "Source City", "Dest City", null, null, 200, 15, null, null, 0,
//   "Draft", null, null, null, now()
// );