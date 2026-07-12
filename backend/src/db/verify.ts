import { db } from "./client";

const tables = db.query("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log("Tables:", tables);

const vehicles = db.query("SELECT registration_number, name_model, status FROM vehicles").all();
console.log("\nVehicles:", vehicles);

const trips = db.query("SELECT trip_code, source, destination, status FROM trips").all();
console.log("\nTrips:", trips);

const drivers = db.query("SELECT name, license_number, status FROM drivers").all();
console.log("\nDrivers:", drivers);