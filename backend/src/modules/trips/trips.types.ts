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

/**
 * Only permitted while the trip is still Draft — see updateTrip in the service.
 */
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

export interface TripFilters {
  status?: TripStatus | undefined;
  vehicle_id?: string | undefined;
  driver_id?: string | undefined;
}