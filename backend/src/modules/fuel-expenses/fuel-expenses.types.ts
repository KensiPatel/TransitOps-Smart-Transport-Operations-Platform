// ---------- Fuel Logs ----------

export interface FuelLog {
  id: string;
  vehicle_id: string;
  trip_id: string | null;
  liters: number;
  cost: number;
  log_date: string;
  created_by: string | null;
}

export interface CreateFuelLogInput {
  vehicle_id: string;
  trip_id?: string;
  liters: number;
  cost: number;
  log_date: string;
  created_by?: string;
}

export interface UpdateFuelLogInput {
  liters?: number;
  cost?: number;
  log_date?: string;
}

export interface FuelLogFilters {
  vehicle_id?: string | undefined;
  trip_id?: string | undefined;
}

// ---------- Expenses ----------

export interface Expense {
  id: string;
  vehicle_id: string;
  trip_id: string | null;
  category: string;
  amount: number;
  expense_date: string;
  created_by: string | null;
}

export interface CreateExpenseInput {
  vehicle_id: string;
  trip_id?: string;
  category: string;
  amount: number;
  expense_date: string;
  created_by?: string;
}

export interface UpdateExpenseInput {
  category?: string;
  amount?: number;
  expense_date?: string;
}

export interface ExpenseFilters {
  vehicle_id?: string | undefined;
  trip_id?: string | undefined;
  category?: string | undefined;
}