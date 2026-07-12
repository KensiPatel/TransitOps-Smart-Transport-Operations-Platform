import { useEffect, useMemo, useState } from "react";
import { tripsApi } from "@/api/trips.api";
import { vehiclesApi } from "@/api/vehicles.api";
import { driversApi } from "@/api/drivers.api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import type {
  CreateTripInput,
  Driver,
  Trip,
  TripStatus,
  Vehicle,
} from "@/types";
import { money, num, formatDate } from "@/lib/format";
import { PageHeader, SearchBox } from "@/components/ui/PageHeader";
import { Table, type Column } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { Field, Select } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";

const STATUSES: TripStatus[] = ["Draft", "Dispatched", "Completed", "Cancelled"];

const BLANK: CreateTripInput = {
  source: "",
  destination: "",
  cargo_weight: 0,
  planned_distance: 0,
  vehicle_id: "",
  driver_id: "",
};

export function TripsPage() {
  const { user } = useAuth();
  const toast = useToast();
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

  // When editing, the trip's own vehicle/driver may no longer be in the
  // "available" pool (they're reserved to this draft) — include them so the
  // select doesn't drop the current assignment.
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

  const columns: Column<Trip>[] = [
    {
      header: "Trip",
      cell: (t) => (
        <div>
          <p className="font-mono text-sm font-semibold text-accent">
            {t.trip_code}
          </p>
          <p className="text-xs text-zinc-400">
            {t.source} → {t.destination}
          </p>
        </div>
      ),
    },
    {
      header: "Assigned",
      cell: (t) => (
        <div className="text-xs">
          <p className="text-zinc-200">
            {t.vehicle_id ? vName.get(t.vehicle_id) ?? "—" : "No vehicle"}
          </p>
          <p className="text-zinc-500">
            {t.driver_id ? dName.get(t.driver_id) ?? "—" : "No driver"}
          </p>
        </div>
      ),
    },
    { header: "Cargo", cell: (t) => num(t.cargo_weight, "kg") },
    {
      header: "Distance",
      cell: (t) => (
        <div className="text-xs">
          <p>plan {num(t.planned_distance, "km")}</p>
          {t.actual_distance != null && (
            <p className="text-zinc-500">act {num(t.actual_distance, "km")}</p>
          )}
        </div>
      ),
    },
    { header: "Revenue", cell: (t) => money(t.revenue) },
    { header: "Status", cell: (t) => <StatusBadge status={t.status} /> },
    { header: "Created", cell: (t) => formatDate(t.created_at) },
    {
      header: "",
      className: "text-right",
      cell: (t) =>
        canManage ? (
          <div className="flex justify-end gap-1.5">
            {t.status === "Draft" && (
              <>
                <button
                  onClick={() => openEdit(t)}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-zinc-300 hover:bg-ink-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => dispatch(t)}
                  className="rounded-md bg-accent/15 px-2 py-1 text-xs font-semibold text-accent hover:bg-accent/25"
                >
                  Dispatch
                </button>
                <button
                  onClick={() => cancel(t)}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/10"
                >
                  Cancel
                </button>
              </>
            )}
            {t.status === "Dispatched" && (
              <button
                onClick={() => openComplete(t)}
                className="rounded-md bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
              >
                Complete
              </button>
            )}
            {(t.status === "Completed" || t.status === "Cancelled") && (
              <span className="text-xs text-zinc-600">—</span>
            )}
          </div>
        ) : (
          <span className="text-xs text-zinc-600">—</span>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Trip Management"
        subtitle="Dispatch with capacity and licence checks enforced."
        actions={
          canManage && (
            <button onClick={openCreate} className="btn-primary">
              <Icon name="plus" className="h-4 w-4" /> New trip
            </button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search code, source, destination…"
        />
        <div className="w-40">
          <Select value={statusFilter} onChange={setStatusFilter}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <span className="ml-auto text-sm text-zinc-500">
          {filtered.length} trip{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <Table
        columns={columns}
        rows={filtered}
        keyFn={(t) => t.id}
        loading={loading}
        empty="No trips match your filters."
      />

      {/* Create / edit draft */}
      <Modal
        open={tripModal}
        onClose={() => setTripModal(false)}
        title={editing ? `Edit ${editing.trip_code}` : "New trip"}
        subtitle="A trip is created as a Draft. Assign a vehicle and driver, then dispatch."
        size="lg"
        footer={
          <>
            <button
              className="btn-ghost"
              type="button"
              onClick={() => setTripModal(false)}
            >
              Cancel
            </button>
            <button className="btn-primary" form="trip-form" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save draft" : "Create draft"}
            </button>
          </>
        }
      >
        <form id="trip-form" onSubmit={saveTrip} className="grid grid-cols-2 gap-4">
          <Field label="Source">
            <input
              className="input"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              required
            />
          </Field>
          <Field label="Destination">
            <input
              className="input"
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
              required
            />
          </Field>
          <Field label="Cargo weight (kg)">
            <input
              type="number"
              min={0}
              className="input"
              value={form.cargo_weight || ""}
              onChange={(e) =>
                setForm({ ...form, cargo_weight: Number(e.target.value) })
              }
              required
            />
          </Field>
          <Field label="Planned distance (km)">
            <input
              type="number"
              min={0}
              className="input"
              value={form.planned_distance || ""}
              onChange={(e) =>
                setForm({ ...form, planned_distance: Number(e.target.value) })
              }
              required
            />
          </Field>
          <Field label="Vehicle" hint="Only Available vehicles are listed.">
            <Select
              value={form.vehicle_id ?? ""}
              onChange={(v) => setForm({ ...form, vehicle_id: v })}
            >
              <option value="">— Assign later —</option>
              {vehicleOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registration_number} · {v.name_model} (
                  {num(v.max_load_capacity, "kg")})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Driver" hint="Only Available, valid-licence drivers.">
            <Select
              value={form.driver_id ?? ""}
              onChange={(v) => setForm({ ...form, driver_id: v })}
            >
              <option value="">— Assign later —</option>
              {driverOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · {d.license_category}
                </option>
              ))}
            </Select>
          </Field>
        </form>
      </Modal>

      {/* Complete trip */}
      <Modal
        open={!!completeFor}
        onClose={() => setCompleteFor(null)}
        title={`Complete ${completeFor?.trip_code ?? ""}`}
        subtitle="Record the actuals. Vehicle and driver return to Available."
        footer={
          <>
            <button
              className="btn-ghost"
              type="button"
              onClick={() => setCompleteFor(null)}
            >
              Cancel
            </button>
            <button className="btn-primary" form="complete-form">
              Complete trip
            </button>
          </>
        }
      >
        <form
          id="complete-form"
          onSubmit={submitComplete}
          className="grid grid-cols-2 gap-4"
        >
          <Field label="Actual distance (km)">
            <input
              type="number"
              min={0}
              className="input"
              value={completeForm.actual_distance || ""}
              onChange={(e) =>
                setCompleteForm({
                  ...completeForm,
                  actual_distance: Number(e.target.value),
                })
              }
              required
            />
          </Field>
          <Field label="Fuel consumed (L)">
            <input
              type="number"
              min={0}
              step="0.1"
              className="input"
              value={completeForm.fuel_consumed || ""}
              onChange={(e) =>
                setCompleteForm({
                  ...completeForm,
                  fuel_consumed: Number(e.target.value),
                })
              }
              required
            />
          </Field>
          <div className="col-span-2">
            <Field label="Revenue (₹)">
              <input
                type="number"
                min={0}
                className="input"
                value={completeForm.revenue || ""}
                onChange={(e) =>
                  setCompleteForm({
                    ...completeForm,
                    revenue: Number(e.target.value),
                  })
                }
              />
            </Field>
          </div>
        </form>
      </Modal>
    </>
  );
}
