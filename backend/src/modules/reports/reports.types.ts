// ---------- Shared ----------

export interface DateRangeFilter {
  start_date?: string; // 'YYYY-MM-DD' inclusive
  end_date?: string;   // 'YYYY-MM-DD' inclusive
  search?: string;     // filter by vehicle registration / name or driver name
}

// ---------- Vehicle ROI ----------
// Full ROI including capital cost (acquisition_cost), per the requirement.

export interface VehicleROIRow {
  vehicle_id: string;
  registration_number: string;
  name_model: string;
  region: string | null;

  revenue: number;            // sum of revenue from Completed trips
  fuel_cost: number;          // sum of fuel_logs.cost
  maintenance_cost: number;   // sum of maintenance_logs.cost
  expense_cost: number;       // sum of expenses.amount
  acquisition_cost: number;   // capital cost

  running_cost: number;       // fuel + maintenance + expenses
  total_cost: number;         // running_cost + acquisition_cost
  net_profit: number;         // revenue - total_cost
  roi_percent: number | null; // net_profit / total_cost * 100 (null if total_cost = 0)
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

// ---------- Fuel efficiency ----------

export interface FuelEfficiencyVehicleRow {
  vehicle_id: string;
  registration_number: string;
  name_model: string;
  total_liters: number;
  total_fuel_cost: number;
  total_distance: number;      // sum of actual_distance over Completed trips
  km_per_liter: number | null; // total_distance / total_liters (null if no fuel)
  cost_per_km: number | null;  // total_fuel_cost / total_distance (null if no distance)
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

// ---------- Driver safety summary ----------

export interface DriverSafetyRow {
  driver_id: string;
  name: string;
  license_number: string;
  status: string;
  safety_score: number;
  completed_trips: number;
  total_distance: number; // across Completed trips
}

export interface DriverSafetyReport {
  rows: DriverSafetyRow[];
  fleet_average_safety_score: number | null;
  generated_at: string;
}

// ---------- Trip completion stats ----------

export interface TripCompletionReport {
  range: { start_date: string | null; end_date: string | null };
  total_trips: number;
  by_status: {
    Draft: number;
    Dispatched: number;
    Completed: number;
    Cancelled: number;
  };
  completion_rate_percent: number | null; // Completed / (Completed + Cancelled) * 100
  total_revenue: number;                    // from Completed trips
  total_distance: number;                   // actual_distance from Completed trips
  generated_at: string;
}