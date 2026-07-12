// ============================================================
// Mirrors backend/src/modules/*/*.types.ts — kept in sync so
// API responses parse directly into these shapes.
// ============================================================

// ---------- Auth ----------
export type UserRole =
  | "fleet_manager"
  | "driver"
  | "safety_officer"
  | "financial_analyst";

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: UserRole;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  fleet_manager: "Fleet Manager",
  driver: "Driver / Dispatcher",
  safety_officer: "Safety Officer",
  financial_analyst: "Financial Analyst",
};

// ---------- Vehicles ----------
export type VehicleStatus = "Available" | "On Trip" | "In Shop" | "Retired";

export interface Vehicle {
  id: string;
  registration_number: string;
  name_model: string;
  type: string;
  max_load_capacity: number;
  odometer: number;
  acquisition_cost: number;
  region: string | null;
  status: VehicleStatus;
  created_at: string;
}

export interface CreateVehicleInput {
  registration_number: string;
  name_model: string;
  type: string;
  max_load_capacity: number;
  odometer?: number;
  acquisition_cost: number;
  region?: string;
}

export type UpdateVehicleInput = Partial<
  Omit<CreateVehicleInput, "registration_number">
>;

// ---------- Drivers ----------
export type DriverStatus = "Available" | "On Trip" | "Off Duty" | "Suspended";

export interface Driver {
  id: string;
  user_id: string | null;
  name: string;
  license_number: string;
  license_category: string;
  license_expiry_date: string;
  contact_number: string;
  safety_score: number;
  status: DriverStatus;
  created_at: string;
}

export interface CreateDriverInput {
  user_id?: string;
  name: string;
  license_number: string;
  license_category: string;
  license_expiry_date: string;
  contact_number: string;
  safety_score?: number;
}

export interface UpdateDriverInput {
  name?: string;
  license_category?: string;
  license_expiry_date?: string;
  contact_number?: string;
  safety_score?: number;
}

// ---------- Trips ----------
export type TripStatus = "Draft" | "Dispatched" | "Completed" | "Cancelled";

export interface Trip {
  id: string;
  trip_code: string;
  source: string;
  destination: string;
  vehicle_id: string | null;
  driver_id: string | null;
  cargo_weight: number;
  planned_distance: number;
  actual_distance: number | null;
  fuel_consumed: number | null;
  revenue: number;
  status: TripStatus;
  dispatched_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CreateTripInput {
  source: string;
  destination: string;
  cargo_weight: number;
  planned_distance: number;
  vehicle_id?: string;
  driver_id?: string;
  created_by?: string;
}

export interface UpdateTripInput {
  source?: string;
  destination?: string;
  cargo_weight?: number;
  planned_distance?: number;
  vehicle_id?: string;
  driver_id?: string;
}

export interface CompleteTripInput {
  actual_distance: number;
  fuel_consumed: number;
  revenue?: number;
}

// ---------- Maintenance ----------
export type MaintenanceStatus = "Active" | "Closed";

export interface MaintenanceLog {
  id: string;
  vehicle_id: string;
  type: string;
  description: string | null;
  cost: number;
  status: MaintenanceStatus;
  started_at: string;
  closed_at: string | null;
  created_by: string | null;
}

export interface CreateMaintenanceInput {
  vehicle_id: string;
  type: string;
  description?: string;
  cost: number;
  created_by?: string;
}

export interface UpdateMaintenanceInput {
  type?: string;
  description?: string;
  cost?: number;
}

// ---------- Fuel & Expenses ----------
export interface FuelLog {
  id: string;
  vehicle_id: string;
  trip_id: string | null;
  liters: number;
  cost: number;
  log_date: string;
  created_by: string | null;
}

export interface CreateFuelLogInput {
  vehicle_id: string;
  trip_id?: string;
  liters: number;
  cost: number;
  log_date: string;
  created_by?: string;
}

export interface Expense {
  id: string;
  vehicle_id: string;
  trip_id: string | null;
  category: string;
  amount: number;
  expense_date: string;
  created_by: string | null;
}

export interface CreateExpenseInput {
  vehicle_id: string;
  trip_id?: string;
  category: string;
  amount: number;
  expense_date: string;
  created_by?: string;
}

// ---------- Dashboard ----------
export interface VehicleStatusCounts {
  Available: number;
  "On Trip": number;
  "In Shop": number;
  Retired: number;
  total: number;
}
export interface DriverStatusCounts {
  Available: number;
  "On Trip": number;
  "Off Duty": number;
  Suspended: number;
  total: number;
}
export interface TripStatusCounts {
  Draft: number;
  Dispatched: number;
  Completed: number;
  Cancelled: number;
  total: number;
}
export interface FleetStatusSummary {
  vehicles: VehicleStatusCounts;
  drivers: DriverStatusCounts;
  trips: TripStatusCounts;
}
export interface MaintenanceSummary {
  active_count: number;
  cost_this_month: number;
  active_cost_outstanding: number;
}
export interface RecentTrip {
  id: string;
  trip_code: string;
  source: string;
  destination: string;
  status: TripStatus;
  vehicle_registration: string | null;
  driver_name: string | null;
  created_at: string;
}
export type AlertSeverity = "info" | "warning" | "critical";
export interface Alert {
  type:
    | "license_expiring"
    | "license_expired"
    | "vehicle_in_shop_too_long"
    | "driver_suspended";
  severity: AlertSeverity;
  message: string;
  entity_id: string;
  entity_label: string;
}
export interface DashboardSummary {
  fleet: FleetStatusSummary;
  maintenance: MaintenanceSummary;
  recent_trips: RecentTrip[];
  alerts: Alert[];
  generated_at: string;
}

// ---------- Reports ----------
export interface DateRangeFilter {
  start_date?: string;
  end_date?: string;
  search?: string;
}

export interface VehicleROIRow {
  vehicle_id: string;
  registration_number: string;
  name_model: string;
  region: string | null;
  revenue: number;
  fuel_cost: number;
  maintenance_cost: number;
  expense_cost: number;
  acquisition_cost: number;
  running_cost: number;
  total_cost: number;
  net_profit: number;
  roi_percent: number | null;
}
export interface VehicleROIReport {
  rows: VehicleROIRow[];
  totals: {
    revenue: number;
    running_cost: number;
    acquisition_cost: number;
    total_cost: number;
    net_profit: number;
  };
  generated_at: string;
}

export interface FuelEfficiencyVehicleRow {
  vehicle_id: string;
  registration_number: string;
  name_model: string;
  total_liters: number;
  total_fuel_cost: number;
  total_distance: number;
  km_per_liter: number | null;
  cost_per_km: number | null;
}
export interface FuelEfficiencyTripRow {
  trip_id: string;
  trip_code: string;
  vehicle_registration: string | null;
  actual_distance: number | null;
  fuel_consumed: number | null;
  km_per_liter: number | null;
}
export interface FuelEfficiencyReport {
  by_vehicle: FuelEfficiencyVehicleRow[];
  by_trip: FuelEfficiencyTripRow[];
  generated_at: string;
}

export interface DriverSafetyRow {
  driver_id: string;
  name: string;
  license_number: string;
  status: string;
  safety_score: number;
  completed_trips: number;
  total_distance: number;
}
export interface DriverSafetyReport {
  rows: DriverSafetyRow[];
  fleet_average_safety_score: number | null;
  generated_at: string;
}

export interface TripCompletionReport {
  range: { start_date: string | null; end_date: string | null };
  total_trips: number;
  by_status: {
    Draft: number;
    Dispatched: number;
    Completed: number;
    Cancelled: number;
  };
  completion_rate_percent: number | null;
  total_revenue: number;
  total_distance: number;
  generated_at: string;
}
