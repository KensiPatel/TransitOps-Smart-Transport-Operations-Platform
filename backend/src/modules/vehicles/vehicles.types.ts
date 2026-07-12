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

export interface UpdateVehicleInput {
  name_model?: string;
  type?: string;
  max_load_capacity?: number;
  odometer?: number;
  acquisition_cost?: number;
  region?: string;
}

export interface VehicleFilters {
  status?: VehicleStatus | undefined;
  type?: string | undefined;
  region?: string | undefined;
}