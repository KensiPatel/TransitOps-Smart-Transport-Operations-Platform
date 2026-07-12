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

/**
 * Only permitted while the log is still Active — see updateMaintenanceLog.
 */
export interface UpdateMaintenanceInput {
  type?: string;
  description?: string;
  cost?: number;
}

export interface MaintenanceFilters {
  vehicle_id?: string | undefined;
  status?: MaintenanceStatus | undefined;
}