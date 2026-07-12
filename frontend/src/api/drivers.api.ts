import { http } from "./client";
import type {
  Driver,
  DriverStatus,
  CreateDriverInput,
  UpdateDriverInput,
} from "@/types";

interface DriverFilters {
  status?: DriverStatus;
  license_category?: string;
}

export const driversApi = {
  list: (filters: DriverFilters = {}) =>
    http.get<Driver[]>("/drivers", filters),

  available: () => http.get<Driver[]>("/drivers/available"),

  get: (id: string) => http.get<Driver>(`/drivers/${id}`),

  create: (input: CreateDriverInput) => http.post<Driver>("/drivers", input),

  update: (id: string, input: UpdateDriverInput) =>
    http.put<Driver>(`/drivers/${id}`, input),

  setStatus: (id: string, status: DriverStatus) =>
    http.patch<Driver>(`/drivers/${id}/status`, { status }),
};
