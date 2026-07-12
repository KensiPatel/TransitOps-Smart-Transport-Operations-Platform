import { db, newId, now } from "./client";
import { runMigrations } from "./migrate";


function clearAll() {
  const tables = [
    "expenses",
    "fuel_logs",
    "maintenance_logs",
    "trips",
    "drivers",
    "vehicles",
    "users",
  ];
  for (const t of tables) db.exec(`DELETE FROM ${t}`);
}

async function seed() {
  await runMigrations();
  clearAll();

  // ---------- USERS ----------
  const dispatcherId = newId();
  const fleetManagerId = newId();
  const safetyOfficerId = newId();
  const financialAnalystId = newId();

  const insertUser = db.query(
    `INSERT INTO users (id, name, email, password_hash, role, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  // NOTE: password_hash is a placeholder here — replace with real
  // Bun.password.hash() output once auth.service.ts exists.
  const placeholderHash = await Bun.password.hash("password123");

  insertUser.run(dispatcherId, "Raven K.", "raven.k@transitops.in", placeholderHash, "dispatcher", now());
  insertUser.run(fleetManagerId, "Meera S.", "meera.s@transitops.in", placeholderHash, "fleet_manager", now());
  insertUser.run(safetyOfficerId, "Karan V.", "karan.v@transitops.in", placeholderHash, "safety_officer", now());
  insertUser.run(financialAnalystId, "Anjali T.", "anjali.t@transitops.in", placeholderHash, "financial_analyst", now());

  // ---------- VEHICLES ----------
  const insertVehicle = db.query(
    `INSERT INTO vehicles (id, registration_number, name_model, type, max_load_capacity, odometer, acquisition_cost, region, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const van05 = newId();
  const truck11 = newId();
  const mini03 = newId();
  const van09 = newId();

  insertVehicle.run(van05, "GJ01AB4521", "VAN-05", "Van", 500, 74000, 620000, "Gandhinagar", "Available", now());
  insertVehicle.run(truck11, "GJ01AB9981", "TRUCK-11", "Truck", 5000, 182000, 2450000, "Ahmedabad", "On Trip", now());
  insertVehicle.run(mini03, "GJ01AB1120", "MINI-03", "Mini", 1000, 66000, 410000, "Ahmedabad", "In Shop", now());
  insertVehicle.run(van09, "GJ01AB0087", "VAN-09", "Van", 750, 241900, 590000, "Sanand", "Retired", now());

  // ---------- DRIVERS ----------
  const insertDriver = db.query(
    `INSERT INTO drivers (id, name, license_number, license_category, license_expiry_date, contact_number, safety_score, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const alex = newId();
  const john = newId();
  const priya = newId();
  const suresh = newId();

  insertDriver.run(alex, "Alex", "DL-88213", "LMV", "2028-12-31", "9876500000", 96, "Available", now());
  insertDriver.run(john, "John", "DL-44120", "HMV", "2025-03-31", "9822000000", 81, "Suspended", now());
  insertDriver.run(priya, "Priya", "DL-77031", "LMV", "2027-08-31", "9911000000", 99, "On Trip", now());
  insertDriver.run(suresh, "Suresh", "DL-90045", "HMV", "2027-01-31", "9744000000", 88, "Off Duty", now());

  // ---------- TRIPS ----------
  const insertTrip = db.query(
    `INSERT INTO trips (id, trip_code, source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, actual_distance, fuel_consumed, revenue, status, dispatched_at, completed_at, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  // TR001 — Dispatched, in progress
  insertTrip.run(
    newId(), "TR001", "Gandhinagar Depot", "Ahmedabad Hub",
    van05, alex, 450, 38, null, null, 0,
    "Dispatched", now(), null, dispatcherId, now()
  );

  // TR002 — Completed (has actuals + revenue for ROI/efficiency calcs)
  insertTrip.run(
    newId(), "TR002", "Vatva Industrial Area", "Sanand Warehouse",
    truck11, john, 3200, 42, 44, 12, 9500,
    "Completed", now(), now(), dispatcherId, now()
  );

  // TR003 — Draft, awaiting vehicle
  insertTrip.run(
    newId(), "TR003", "Mansa", "Kalol Depot",
    null, null, 300, 22, null, null, 0,
    "Draft", null, null, dispatcherId, now()
  );

  // ---------- MAINTENANCE ----------
  const insertMaintenance = db.query(
    `INSERT INTO maintenance_logs (id, vehicle_id, type, description, cost, status, started_at, closed_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  insertMaintenance.run(newId(), mini03, "Tyre Replace", "Front tyre worn out", 6200, "Active", now(), null, fleetManagerId);
  insertMaintenance.run(newId(), truck11, "Engine Repair", "Routine engine service", 18000, "Closed", now(), now(), fleetManagerId);

  // ---------- FUEL LOGS ----------
  const insertFuel = db.query(
    `INSERT INTO fuel_logs (id, vehicle_id, trip_id, liters, cost, log_date, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  insertFuel.run(newId(), van05, null, 42, 3150, "2026-07-05", dispatcherId);
  insertFuel.run(newId(), truck11, null, 110, 8400, "2026-07-06", dispatcherId);

  // ---------- EXPENSES ----------
  const insertExpense = db.query(
    `INSERT INTO expenses (id, vehicle_id, trip_id, category, amount, expense_date, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  insertExpense.run(newId(), van05, null, "toll", 120, "2026-07-05", dispatcherId);
  insertExpense.run(newId(), truck11, null, "toll", 340, "2026-07-06", financialAnalystId);
  insertExpense.run(newId(), truck11, null, "parking", 150, "2026-07-06", financialAnalystId);

  console.log("✅ Seed data inserted — 4 users, 4 vehicles, 4 drivers, 3 trips, 2 maintenance logs, 2 fuel logs, 3 expenses.");
}

seed();