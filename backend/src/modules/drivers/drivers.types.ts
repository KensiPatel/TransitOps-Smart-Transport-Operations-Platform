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

export interface DriverFilters {
  status?: DriverStatus | undefined;
  license_category?: string | undefined;
}