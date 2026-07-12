import { useEffect, useMemo, useState } from "react";
import { maintenanceApi } from "@/api/maintenance.api";
import { vehiclesApi } from "@/api/vehicles.api";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import type {
  CreateMaintenanceInput,
  MaintenanceLog,
  Vehicle,
} from "@/types";
import { money, formatDate } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Plus } from "lucide-react";
import {
  Table as ShadcnTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select as ShadcnSelect,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const BLANK: CreateMaintenanceInput = {
  vehicle_id: "",
  type: "Oil Change",
  description: "",
  cost: 0,
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Available: "default",
  "On Trip": "secondary",
  "In Shop": "outline",
  Retired: "outline",
  "Off Duty": "outline",
  Suspended: "destructive",
  Draft: "outline",
  Dispatched: "secondary",
  Completed: "default",
  Cancelled: "destructive",
  Active: "outline",
  Closed: "default",
};

export function MaintenancePage() {
  const { user } = useAuthStore();

  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateMaintenanceInput>(BLANK);
  const [saving, setSaving] = useState(false);

  const vById = useMemo(
    () => new Map(vehicles.map((v) => [v.id, v])),
    [vehicles]
  );

  async function load() {
    setLoading(true);
    try {
      const [l, v] = await Promise.all([
        maintenanceApi.list(),
        vehiclesApi.list(),
      ]);
      setLogs(l);
      setVehicles(v);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const serviceable = useMemo(
    () => vehicles.filter((v) => v.status !== "On Trip" && v.status !== "Retired"),
    [vehicles]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (statusFilter && l.status !== statusFilter) return false;
      if (!q) return true;
      const reg = vById.get(l.vehicle_id)?.registration_number ?? "";
      return (
        l.type.toLowerCase().includes(q) ||
        (l.description ?? "").toLowerCase().includes(q) ||
        reg.toLowerCase().includes(q)
      );
    });
  }, [logs, search, statusFilter, vById]);

  function openCreate() {
    setForm({ ...BLANK, vehicle_id: serviceable[0]?.id ?? "" });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await maintenanceApi.create({ ...form, created_by: user?.id });
      toast.success("Maintenance opened — vehicle moved to In Shop.");
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open log");
    } finally {
      setSaving(false);
    }
  }

  async function close(l: MaintenanceLog) {
    try {
      await maintenanceApi.close(l.id);
      toast.success("Maintenance closed.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Close failed");
    }
  }

  function renderStatusBadge(status: string) {
    const variant = STATUS_VARIANT[status] ?? "outline";
    return <Badge variant={variant}>{status}</Badge>;
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Maintenance
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Opening a log sends the vehicle to the shop; closing frees it.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> Open log
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vehicle, work type…"
            className="pl-9 w-full sm:w-64"
          />
        </div>
        <div className="w-40">
          <ShadcnSelect value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </ShadcnSelect>
        </div>
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} log{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="rounded-md border">
        <ShadcnTable>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Work</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Opened</TableHead>
              <TableHead>Closed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No maintenance logs match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((l) => {
                const v = vById.get(l.vehicle_id);
                return (
                  <TableRow key={l.id}>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-foreground">
                          {v?.registration_number ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {v?.name_model ?? ""}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-foreground">{l.type}</p>
                        {l.description && (
                          <p className="text-xs text-muted-foreground">
                            {l.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{money(l.cost)}</TableCell>
                    <TableCell>{formatDate(l.started_at)}</TableCell>
                    <TableCell>{formatDate(l.closed_at)}</TableCell>
                    <TableCell>{renderStatusBadge(l.status)}</TableCell>
                    <TableCell className="text-right">
                      {l.status === "Active" ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => close(l)}
                        >
                          Close
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </ShadcnTable>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Open maintenance log</DialogTitle>
            <DialogDescription>
              On-trip and retired vehicles can't be serviced.
            </DialogDescription>
          </DialogHeader>
          {serviceable.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No serviceable vehicles right now. Complete active trips first.
            </p>
          ) : (
            <form id="maint-form" onSubmit={save} className="space-y-4">
              <div className="space-y-2">
                <Label>Vehicle</Label>
                <ShadcnSelect
                  value={form.vehicle_id}
                  onValueChange={(v) => setForm({ ...form, vehicle_id: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceable.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.registration_number} · {v.name_model} ({v.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </ShadcnSelect>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Work type</Label>
                  <ShadcnSelect
                    value={form.type}
                    onValueChange={(v) => setForm({ ...form, type: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Oil Change",
                        "Tyre Replace",
                        "Engine Repair",
                        "Brake Service",
                        "General Service",
                        "Other",
                      ].map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </ShadcnSelect>
                </div>
                <div className="space-y-2">
                  <Label>Cost (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.cost || ""}
                    onChange={(e) =>
                      setForm({ ...form, cost: Number(e.target.value) })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="What's being done?"
                />
              </div>
            </form>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="maint-form"
              disabled={saving || serviceable.length === 0}
            >
              {saving ? "Opening…" : "Open log"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
