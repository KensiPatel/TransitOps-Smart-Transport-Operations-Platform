import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { navForRole } from "@/config/nav";
import { ROLE_LABELS } from "@/types";
import { Icon } from "@/components/ui/Icon";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  if (!user) return null;
  const items = navForRole(user.role);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-ink-800 border-r border-ink-600/70">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-ink-900">
          <Icon name="truck" className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="font-display text-lg font-bold text-zinc-100">
            TransitOps
          </p>
          <p className="text-[11px] uppercase tracking-widest text-zinc-500">
            Fleet Control
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition",
                isActive
                  ? "bg-accent-soft text-ink-900"
                  : "bg-accent text-ink-900 hover:bg-accent-hover",
              ].join(" ")
            }
          >
            <Icon name={item.icon} className="h-4.5 w-4.5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-ink-600/70 px-5 py-4">
        <p className="text-xs text-zinc-500">welcome back</p>
        <p className="truncate font-semibold text-zinc-100">{user.name}</p>
        <p className="mt-0.5 text-xs text-accent">{ROLE_LABELS[user.role]}</p>
      </div>
    </aside>
  );
}
