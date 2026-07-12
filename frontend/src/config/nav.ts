import type { UserRole } from "@/types";

export interface NavItem {
  to: string;
  label: string;
  icon: string;
  roles: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard",
    roles: ["fleet_manager", "driver", "safety_officer", "financial_analyst", "dispatcher"],
  },
  {
    to: "/vehicles",
    label: "Fleet Vehicles",
    icon: "Truck",
    roles: ["fleet_manager", "dispatcher"],
  },
  {
    to: "/drivers",
    label: "Drivers",
    icon: "Users",
    roles: ["fleet_manager", "safety_officer", "dispatcher"],
  },
  {
    to: "/trips",
    label: "Trips",
    icon: "Route",
    roles: ["fleet_manager", "driver"],
  },
  {
    to: "/maintenance",
    label: "Maintenance",
    icon: "Wrench",
    roles: ["fleet_manager"],
  },
  {
    to: "/fuel-expenses",
    label: "Fuel & Expenses",
    icon: "Fuel",
    roles: ["fleet_manager", "financial_analyst", "driver"],
  },
  {
    to: "/reports",
    label: "Reports",
    icon: "BarChart3",
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
