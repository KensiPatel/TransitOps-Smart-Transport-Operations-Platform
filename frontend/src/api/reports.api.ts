import { http } from "./client";
import type {
  DateRangeFilter,
  VehicleROIReport,
  FuelEfficiencyReport,
  DriverSafetyReport,
  TripCompletionReport,
} from "@/types";

// Role-gated on the backend: fleet_manager OR financial_analyst only.
export const reportsApi = {
  vehicleRoi: (filters: DateRangeFilter = {}) =>
    http.get<VehicleROIReport>("/reports/vehicle-roi", filters),

  fuelEfficiency: (filters: DateRangeFilter = {}) =>
    http.get<FuelEfficiencyReport>("/reports/fuel-efficiency", filters),

  driverSafety: (filters: DateRangeFilter = {}) =>
    http.get<DriverSafetyReport>("/reports/driver-safety", filters),

  tripCompletion: (filters: { start_date?: string; end_date?: string } = {}) =>
    http.get<TripCompletionReport>("/reports/trip-completion", filters),
};
