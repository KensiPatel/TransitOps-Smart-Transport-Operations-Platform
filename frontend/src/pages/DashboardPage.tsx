import { useAuthStore } from "@/stores/authStore";
import { FleetManagerDashboard } from "@/components/dashboard/FleetManagerDashboard";
import { DriverDashboard } from "@/components/dashboard/DriverDashboard";
import { DispatcherDashboard } from "@/components/dashboard/DispatcherDashboard";
import { SafetyOfficerDashboard } from "@/components/dashboard/SafetyOfficerDashboard";
import { FinancialAnalystDashboard } from "@/components/dashboard/FinancialAnalystDashboard";

const DASHBOARDS = {
  fleet_manager: FleetManagerDashboard,
  driver: DriverDashboard,
  dispatcher: DispatcherDashboard,
  safety_officer: SafetyOfficerDashboard,
  financial_analyst: FinancialAnalystDashboard,
} as const;

export function DashboardPage() {
  const { user } = useAuthStore();
  const Component = DASHBOARDS[user?.role ?? "fleet_manager"];
  return <Component />;
}
