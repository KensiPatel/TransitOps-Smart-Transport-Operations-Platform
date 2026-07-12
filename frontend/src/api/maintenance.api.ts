import { http } from "./client";
import type {
  MaintenanceLog,
  MaintenanceStatus,
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
} from "@/types";

interface MaintenanceFilters {
  vehicle_id?: string;
  status?: MaintenanceStatus;
}

export const maintenanceApi = {
  list: (filters: MaintenanceFilters = {}) =>
    http.get<MaintenanceLog[]>("/maintenance", filters),

  get: (id: string) => http.get<MaintenanceLog>(`/maintenance/${id}`),

  create: (input: CreateMaintenanceInput) =>
    http.post<MaintenanceLog>("/maintenance", input),

  update: (id: string, input: UpdateMaintenanceInput) =>
    http.put<MaintenanceLog>(`/maintenance/${id}`, input),

  close: (id: string) =>
    http.post<MaintenanceLog>(`/maintenance/${id}/close`),
};
