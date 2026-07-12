import { useEffect, useMemo, useState } from "react";
import { tripsApi } from "@/api/trips.api";
import { vehiclesApi } from "@/api/vehicles.api";
import { driversApi } from "@/api/drivers.api";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import type {
  CreateTripInput,
  Driver,
  Trip,
  TripStatus,
  Vehicle,
} from "@/types";
import { money, num, formatDate } from "@/lib/format";
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

const STATUSES: TripStatus[] = ["Draft", "Dispatched", "Completed", "Cancelled"];

const BLANK: CreateTripInput = {
  source: "",
  destination: "",
  cargo_weight: 0,
  planned_distance: 0,
  vehicle_id: "",
  driver_id: "",
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
};

export function TripsPage() {
  const { user } = useAuthStore();
  const canManage = user?.role === "fleet_manager" || user?.role === "driver";

  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [availVehicles, setAvailVehicles] = useState<Vehicle[]>([]);
  const [availDrivers, setAvailDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [tripModal, setTripModal] = useState(false);
  const [editing, setEditing] = useState<Trip | null>(null);
  const [form, setForm] = useState<CreateTripInput>(BLANK);
  const [saving, setSaving] = useState(false);

  const [completeFor, setCompleteFor] = useState<Trip | null>(null);
  const [completeForm, setCompleteForm] = useState({
    actual_distance: 0,
    fuel_consumed: 0,
    revenue: 0,
  });

  const vName = useMemo(
    () => new Map(vehicles.map((v) => [v.id, v.registration_number])),
    [vehicles]
  );
  const dName = useMemo(
    () => new Map(drivers.map((d) => [d.id, d.name])),
    [drivers]
  );

  async function load() {
    setLoading(true);
    try {
      const [t, v, d, av, ad] = await Promise.all([
        tripsApi.list(),
        vehiclesApi.list(),
        driversApi.list(),
        vehiclesApi.available(),
        driversApi.available(),
      ]);
      setTrips(t);
      setVehicles(v);
      setDrivers(d);
      setAvailVehicles(av);
      setAvailDrivers(ad);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load trips");
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
    return trips.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (!q) return true;
      return (
        t.trip_code.toLowerCase().includes(q) ||
        t.source.toLowerCase().includes(q) ||
        t.destination.toLowerCase().includes(q)
      );
    });
  }, [trips, search, statusFilter]);

  function openCreate() {
    setEditing(null);
    setForm(BLANK);
    setTripModal(true);
  }
  function openEdit(t: Trip) {
    setEditing(t);
    setForm({
      source: t.source,
      destination: t.destination,
      cargo_weight: t.cargo_weight,
      planned_distance: t.planned_distance,
      vehicle_id: t.vehicle_id ?? "",
      driver_id: t.driver_id ?? "",
    });
    setTripModal(true);
  }

  const vehicleOptions = useMemo(() => {
    const opts = [...availVehicles];
    if (editing?.vehicle_id && !opts.some((v) => v.id === editing.vehicle_id)) {
      const v = vehicles.find((x) => x.id === editing.vehicle_id);
      if (v) opts.unshift(v);
    }
    return opts;
  }, [availVehicles, editing, vehicles]);

  const driverOptions = useMemo(() => {
    const opts = [...availDrivers];
    if (editing?.driver_id && !opts.some((d) => d.id === editing.driver_id)) {
      const d = drivers.find((x) => x.id === editing.driver_id);
      if (d) opts.unshift(d);
    }
    return opts;
  }, [availDrivers, editing, drivers]);

  async function saveTrip(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        vehicle_id: form.vehicle_id || undefined,
        driver_id: form.driver_id || undefined,
      };
      if (editing) {
        await tripsApi.update(editing.id, payload);
        toast.success("Trip updated.");
      } else {
        await tripsApi.create({ ...payload, created_by: user?.id });
        toast.success("Draft trip created.");
      }
      setTripModal(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function dispatch(t: Trip) {
    try {
      await tripsApi.dispatch(t.id);
      toast.success(`${t.trip_code} dispatched.`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Dispatch failed");
    }
  }

  async function cancel(t: Trip) {
    try {
      await tripsApi.cancel(t.id);
      toast.success(`${t.trip_code} cancelled.`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed");
    }
  }

  function openComplete(t: Trip) {
    setCompleteFor(t);
    setCompleteForm({
      actual_distance: t.planned_distance,
      fuel_consumed: 0,
      revenue: t.revenue,
    });
  }
  async function submitComplete(e: React.FormEvent) {
    e.preventDefault();
    if (!completeFor) return;
    try {
      await tripsApi.complete(completeFor.id, completeForm);
      toast.success(`${completeFor.trip_code} completed.`);
      setCompleteFor(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Completion failed");
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
            Trip Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dispatch with capacity and licence checks enforced.
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> New trip
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, source, destination…"
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
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </ShadcnSelect>
        </div>
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} trip{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="rounded-md border">
        <ShadcnTable>
          <TableHeader>
            <TableRow>
              <TableHead>Trip</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Distance</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No trips match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div>
                      <p className="font-mono text-sm font-semibold text-foreground">
                        {t.trip_code}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.source} → {t.destination}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <p className="text-foreground">
                        {t.vehicle_id ? vName.get(t.vehicle_id) ?? "—" : "No vehicle"}
                      </p>
                      <p className="text-muted-foreground">
                        {t.driver_id ? dName.get(t.driver_id) ?? "—" : "No driver"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{num(t.cargo_weight, "kg")}</TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <p>plan {num(t.planned_distance, "km")}</p>
                      {t.actual_distance != null && (
                        <p className="text-muted-foreground">
                          act {num(t.actual_distance, "km")}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{money(t.revenue)}</TableCell>
                  <TableCell>{renderStatusBadge(t.status)}</TableCell>
                  <TableCell>{formatDate(t.created_at)}</TableCell>
                  <TableCell className="text-right">
                    {canManage ? (
                      <div className="flex justify-end gap-1.5">
                        {t.status === "Draft" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEdit(t)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => dispatch(t)}
                            >
                              Dispatch
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => cancel(t)}
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                        {t.status === "Dispatched" && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openComplete(t)}
                          >
                            Complete
                          </Button>
                        )}
                        {(t.status === "Completed" || t.status === "Cancelled") && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </ShadcnTable>
      </div>

      <Dialog open={tripModal} onOpenChange={setTripModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit ${editing.trip_code}` : "New trip"}
            </DialogTitle>
            <DialogDescription>
              A trip is created as a Draft. Assign a vehicle and driver, then dispatch.
            </DialogDescription>
          </DialogHeader>
          <form id="trip-form" onSubmit={saveTrip} className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Source</Label>
              <Input
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Destination</Label>
              <Input
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Cargo weight (kg)</Label>
              <Input
                type="number"
                min={0}
                value={form.cargo_weight || ""}
                onChange={(e) =>
                  setForm({ ...form, cargo_weight: Number(e.target.value) })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Planned distance (km)</Label>
              <Input
                type="number"
                min={0}
                value={form.planned_distance || ""}
                onChange={(e) =>
                  setForm({ ...form, planned_distance: Number(e.target.value) })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <p className="text-xs text-muted-foreground">Only Available vehicles are listed.</p>
              <ShadcnSelect
                value={form.vehicle_id ?? ""}
                onValueChange={(v) => setForm({ ...form, vehicle_id: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="— Assign later —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Assign later —</SelectItem>
                  {vehicleOptions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.registration_number} · {v.name_model} (
                      {num(v.max_load_capacity, "kg")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </ShadcnSelect>
            </div>
            <div className="space-y-2">
              <Label>Driver</Label>
              <p className="text-xs text-muted-foreground">Only Available, valid-licence drivers.</p>
              <ShadcnSelect
                value={form.driver_id ?? ""}
                onValueChange={(v) => setForm({ ...form, driver_id: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="— Assign later —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Assign later —</SelectItem>
                  {driverOptions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} · {d.license_category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </ShadcnSelect>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTripModal(false)} type="button">
              Cancel
            </Button>
            <Button type="submit" form="trip-form" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save draft" : "Create draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!completeFor} onOpenChange={(open) => { if (!open) setCompleteFor(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete {completeFor?.trip_code ?? ""}</DialogTitle>
            <DialogDescription>
              Record the actuals. Vehicle and driver return to Available.
            </DialogDescription>
          </DialogHeader>
          <form
            id="complete-form"
            onSubmit={submitComplete}
            className="grid grid-cols-2 gap-4"
          >
            <div className="space-y-2">
              <Label>Actual distance (km)</Label>
              <Input
                type="number"
                min={0}
                value={completeForm.actual_distance || ""}
                onChange={(e) =>
                  setCompleteForm({
                    ...completeForm,
                    actual_distance: Number(e.target.value),
                  })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Fuel consumed (L)</Label>
              <Input
                type="number"
                min={0}
                step="0.1"
                value={completeForm.fuel_consumed || ""}
                onChange={(e) =>
                  setCompleteForm({
                    ...completeForm,
                    fuel_consumed: Number(e.target.value),
                  })
                }
                required
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Revenue (₹)</Label>
              <Input
                type="number"
                min={0}
                value={completeForm.revenue || ""}
                onChange={(e) =>
                  setCompleteForm({
                    ...completeForm,
                    revenue: Number(e.target.value),
                  })
                }
              />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteFor(null)} type="button">
              Cancel
            </Button>
            <Button type="submit" form="complete-form">
              Complete trip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
