import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { Icon } from "@/components/ui/Icon";
import { ROLE_LABELS } from "@/types";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth();
  const toast = useToast();

  async function handleLogout() {
    await logout();
    toast.success("Logged out.");
  }

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-ink-600/70 bg-ink-900/80 px-4 backdrop-blur sm:px-6">
      <button
        onClick={onMenu}
        className="rounded-lg p-2 text-zinc-300 hover:bg-ink-700 lg:hidden"
        aria-label="Open menu"
      >
        <Icon name="grid" className="h-5 w-5" />
      </button>

      <div className="hidden text-sm text-zinc-500 sm:block">
        {new Date().toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-zinc-100">{user.name}</p>
          <p className="text-xs text-zinc-500">{ROLE_LABELS[user.role]}</p>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-accent/20 text-sm font-bold text-accent ring-1 ring-accent/40">
          {initials}
        </div>
        <button
          onClick={handleLogout}
          className="btn-ghost px-3 py-2"
          title="Log out"
        >
          <Icon name="logout" className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
