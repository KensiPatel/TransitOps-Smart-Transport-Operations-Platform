import { http } from "./client";
import type {
  FuelLog,
  CreateFuelLogInput,
  Expense,
  CreateExpenseInput,
} from "@/types";

interface FuelFilters {
  vehicle_id?: string;
  trip_id?: string;
}
interface ExpenseFilters {
  vehicle_id?: string;
  trip_id?: string;
  category?: string;
}

export const fuelApi = {
  list: (filters: FuelFilters = {}) =>
    http.get<FuelLog[]>("/fuel-logs", filters),

  get: (id: string) => http.get<FuelLog>(`/fuel-logs/${id}`),

  create: (input: CreateFuelLogInput) =>
    http.post<FuelLog>("/fuel-logs", input),

  update: (
    id: string,
    input: { liters?: number; cost?: number; log_date?: string }
  ) => http.put<FuelLog>(`/fuel-logs/${id}`, input),
};

export const expensesApi = {
  list: (filters: ExpenseFilters = {}) =>
    http.get<Expense[]>("/expenses", filters),

  get: (id: string) => http.get<Expense>(`/expenses/${id}`),

  create: (input: CreateExpenseInput) =>
    http.post<Expense>("/expenses", input),

  update: (
    id: string,
    input: { category?: string; amount?: number; expense_date?: string }
  ) => http.put<Expense>(`/expenses/${id}`, input),
};
