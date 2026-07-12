import { http } from "./client";
import type {
  Trip,
  TripStatus,
  CreateTripInput,
  UpdateTripInput,
  CompleteTripInput,
} from "@/types";

interface TripFilters {
  status?: TripStatus;
  vehicle_id?: string;
  driver_id?: string;
}

export const tripsApi = {
  list: (filters: TripFilters = {}) => http.get<Trip[]>("/trips", filters),

  get: (id: string) => http.get<Trip>(`/trips/${id}`),

  create: (input: CreateTripInput) => http.post<Trip>("/trips", input),

  update: (id: string, input: UpdateTripInput) =>
    http.put<Trip>(`/trips/${id}`, input),

  dispatch: (id: string) => http.post<Trip>(`/trips/${id}/dispatch`),

  complete: (id: string, input: CompleteTripInput) =>
    http.post<Trip>(`/trips/${id}/complete`, input),

  cancel: (id: string) => http.post<Trip>(`/trips/${id}/cancel`),
};
