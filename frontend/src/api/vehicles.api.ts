import { http } from "./client";
import type {
  Vehicle,
  VehicleStatus,
  CreateVehicleInput,
  UpdateVehicleInput,
} from "@/types";

interface VehicleFilters {
  status?: VehicleStatus;
  type?: string;
  region?: string;
}

export const vehiclesApi = {
  list: (filters: VehicleFilters = {}) =>
    http.get<Vehicle[]>("/vehicles", filters),

  available: () => http.get<Vehicle[]>("/vehicles/available"),

  get: (id: string) => http.get<Vehicle>(`/vehicles/${id}`),

  create: (input: CreateVehicleInput) => http.post<Vehicle>("/vehicles", input),

  update: (id: string, input: UpdateVehicleInput) =>
    http.put<Vehicle>(`/vehicles/${id}`, input),

  setStatus: (id: string, status: VehicleStatus) =>
    http.patch<Vehicle>(`/vehicles/${id}/status`, { status }),
};
