import { NavLink } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { navForRole } from "@/config/nav";
import { ROLE_LABELS } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  LayoutDashboard,
  Users,
  Route,
  Wrench,
  Fuel,
  BarChart3,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Truck,
  Users,
  Route,
  Wrench,
  Fuel,
  BarChart3,
};

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuthStore();
  if (!user) return null;
  const items = navForRole(user.role);

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-border">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-ink-900">
          <Truck className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="font-display text-lg font-bold text-foreground">
            TransitOps
          </p>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Fleet Control
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {items.map((item) => {
          const Icon = ICON_MAP[item.icon] || LayoutDashboard;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent/15 text-accent"
                    : "text-muted-foreground hover:bg-accent/10 hover:text-foreground",
                ].join(" ")
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-accent/20 text-xs font-bold text-accent">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {user.name}
            </p>
            <Badge variant="secondary" className="mt-0.5 text-[10px]">
              {ROLE_LABELS[user.role]}
            </Badge>
          </div>
        </div>
      </div>
    </aside>
  );
}
