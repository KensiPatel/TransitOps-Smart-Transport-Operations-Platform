import type { UserRole } from "@/types";

export interface NavItem {
  to: string;
  label: string;
  icon: string; // key resolved in Sidebar
  roles: UserRole[];
}

// Which roles can open which screen. This mirrors the backend's real
// authorization so the UI never offers a screen that would 403:
//   - /dashboard + /reports  -> fleet_manager, financial_analyst only
//   - vehicles/drivers/trips/maintenance/fuel are open to any logged-in user
//
// The DashboardPage itself is visible to everyone but adapts its data source
// by role (see DashboardPage): management roles hit /dashboard; driver &
// safety_officer compute KPIs from the open list endpoints.
const ALL: UserRole[] = [
  "fleet_manager",
  "driver",
  "safety_officer",
  "financial_analyst",
];

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: "grid", roles: ALL },
  {
    to: "/trips",
    label: "Trips",
    icon: "route",
    roles: ["fleet_manager", "driver"],
  },
  {
    to: "/vehicles",
    label: "Vehicles",
    icon: "truck",
    roles: ["fleet_manager", "financial_analyst", "safety_officer", "driver"],
  },
  {
    to: "/drivers",
    label: "Drivers",
    icon: "id",
    roles: ["fleet_manager", "safety_officer", "driver"],
  },
  {
    to: "/maintenance",
    label: "Maintenance",
    icon: "wrench",
    roles: ["fleet_manager"],
  },
  {
    to: "/fuel-expenses",
    label: "Fuel & Expenses",
    icon: "fuel",
    roles: ["fleet_manager", "financial_analyst"],
  },
  {
    to: "/reports",
    label: "Reports",
    icon: "chart",
    roles: ["fleet_manager", "financial_analyst"],
  },
];

export function navForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function canAccess(role: UserRole, path: string): boolean {
  const item = NAV_ITEMS.find((n) => path.startsWith(n.to));
  return item ? item.roles.includes(role) : true;
}
