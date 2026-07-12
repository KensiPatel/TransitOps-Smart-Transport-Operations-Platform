import { useEffect, useMemo, useState } from "react";
import { driversApi } from "@/api/drivers.api";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import type { CreateDriverInput, Driver, DriverStatus } from "@/types";
import { formatDate, daysUntil } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table as ShadcnTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select as ShadcnSelect,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus, Search } from "lucide-react";

const STATUSES: DriverStatus[] = ["Available", "On Trip", "Off Duty", "Suspended"];

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Available: "default",
  "On Trip": "secondary",
  "Off Duty": "outline",
  Suspended: "destructive",
};

const BLANK: CreateDriverInput = {
  name: "",
  license_number: "",
  license_category: "LMV",
  license_expiry_date: "",
  contact_number: "",
  safety_score: 100,
};

function LicenseCell({ date }: { date: string }) {
  const days = daysUntil(date);
  const tone =
    days < 0
      ? "text-red-300"
      : days <= 30
        ? "text-accent"
        : "text-foreground";
  return (
    <div>
      <p className={tone}>{formatDate(date)}</p>
      <p className="text-[11px] text-muted-foreground">
        {days < 0 ? `expired ${-days}d ago` : `${days}d left`}
      </p>
    </div>
  );
}

export function DriversPage() {
  const { user } = useAuthStore();
  const canManage =
    user?.role === "fleet_manager" ||
    user?.role === "driver" ||
    user?.role === "safety_officer";
  const canSuspend =
    user?.role === "fleet_manager" || user?.role === "safety_officer";

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [form, setForm] = useState<CreateDriverInput>(BLANK);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setDrivers(await driversApi.list());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load drivers");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drivers.filter((d) => {
      if (statusFilter && d.status !== statusFilter) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.license_number.toLowerCase().includes(q) ||
        d.contact_number.includes(q)
      );
    });
  }, [drivers, search, statusFilter]);

  function openCreate() {
    setEditing(null);
    setForm(BLANK);
    setModalOpen(true);
  }
  function openEdit(d: Driver) {
    setEditing(d);
    setForm({
      name: d.name,
      license_number: d.license_number,
      license_category: d.license_category,
      license_expiry_date: d.license_expiry_date,
      contact_number: d.contact_number,
      safety_score: d.safety_score,
    });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await driversApi.update(editing.id, {
          name: form.name,
          license_category: form.license_category,
          license_expiry_date: form.license_expiry_date,
          contact_number: form.contact_number,
          safety_score: form.safety_score,
        });
        toast.success("Driver updated.");
      } else {
        await driversApi.create(form);
        toast.success("Driver added.");
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(d: Driver, status: DriverStatus) {
    try {
      await driversApi.setStatus(d.id, status);
      toast.success(`${d.name} → ${status}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status change failed");
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Driver Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Profiles, licence validity and safety scores.
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add driver
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, licence, contact…"
            className="pl-9 w-full sm:w-64"
          />
        </div>
        <div className="w-40">
          <ShadcnSelect
            value={statusFilter || "all"}
            onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </ShadcnSelect>
        </div>
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} driver{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No drivers match your filters.
        </div>
      ) : (
        <ShadcnTable>
          <TableHeader>
            <TableRow>
              <TableHead>Driver</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>License expiry</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Safety</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <p className="font-semibold text-foreground">{d.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {d.license_number}
                  </p>
                </TableCell>
                <TableCell>{d.license_category}</TableCell>
                <TableCell>
                  <LicenseCell date={d.license_expiry_date} />
                </TableCell>
                <TableCell>{d.contact_number}</TableCell>
                <TableCell>
                  <span
                    className={
                      d.safety_score >= 90
                        ? "text-emerald-500"
                        : d.safety_score >= 75
                          ? "text-accent"
                          : "text-red-500"
                    }
                  >
                    {d.safety_score}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[d.status] ?? "outline"}>
                    {d.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1.5">
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(d)}
                      >
                        Edit
                      </Button>
                    )}
                    {canSuspend &&
                      (d.status === "Suspended" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                          onClick={() => changeStatus(d, "Available")}
                        >
                          Reinstate
                        </Button>
                      ) : (
                        d.status !== "On Trip" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => changeStatus(d, "Suspended")}
                          >
                            Suspend
                          </Button>
                        )
                      ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </ShadcnTable>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit driver" : "Add driver"}
            </DialogTitle>
            <DialogDescription>
              {editing ? editing.name : "Licence number must be unique."}
            </DialogDescription>
          </DialogHeader>
          <form
            id="driver-form"
            onSubmit={save}
            className="grid grid-cols-2 gap-4"
          >
            <div className="col-span-2">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>License number</Label>
              <Input
                value={form.license_number}
                disabled={!!editing}
                onChange={(e) =>
                  setForm({ ...form, license_number: e.target.value })
                }
                placeholder="DL-00000"
                required
                className="disabled:opacity-60"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <ShadcnSelect
                value={form.license_category}
                onValueChange={(v) =>
                  setForm({ ...form, license_category: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["LMV", "HMV", "MCWG", "Other"].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </ShadcnSelect>
            </div>
            <div className="space-y-2">
              <Label>License expiry</Label>
              <Input
                type="date"
                value={form.license_expiry_date}
                onChange={(e) =>
                  setForm({
                    ...form,
                    license_expiry_date: e.target.value,
                  })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Contact number</Label>
              <Input
                value={form.contact_number}
                onChange={(e) =>
                  setForm({ ...form, contact_number: e.target.value })
                }
                required
              />
            </div>
            <div className="col-span-2">
              <div className="space-y-2">
                <Label>Safety score — {form.safety_score}</Label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={form.safety_score}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      safety_score: Number(e.target.value),
                    })
                  }
                  className="w-full accent-accent"
                />
              </div>
            </div>
          </form>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button type="submit" form="driver-form" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add driver"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
