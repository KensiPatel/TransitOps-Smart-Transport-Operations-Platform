import { useEffect, useMemo, useState } from "react";
import { vehiclesApi } from "@/api/vehicles.api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import type {
  CreateVehicleInput,
  Vehicle,
  VehicleStatus,
} from "@/types";
import { money, num } from "@/lib/format";
import { PageHeader, SearchBox } from "@/components/ui/PageHeader";
import { Table, type Column } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { Field, Select } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";

const STATUSES: VehicleStatus[] = ["Available", "On Trip", "In Shop", "Retired"];

const BLANK: CreateVehicleInput = {
  registration_number: "",
  name_model: "",
  type: "Truck",
  max_load_capacity: 0,
  odometer: 0,
  acquisition_cost: 0,
  region: "",
};

export function VehiclesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const canManage = user?.role === "fleet_manager";

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<CreateVehicleInput>(BLANK);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setVehicles(await vehiclesApi.list());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load vehicles");
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
    return vehicles.filter((v) => {
      if (statusFilter && v.status !== statusFilter) return false;
      if (!q) return true;
      return (
        v.registration_number.toLowerCase().includes(q) ||
        v.name_model.toLowerCase().includes(q) ||
        v.type.toLowerCase().includes(q) ||
        (v.region ?? "").toLowerCase().includes(q)
      );
    });
  }, [vehicles, search, statusFilter]);

  function openCreate() {
    setEditing(null);
    setForm(BLANK);
    setModalOpen(true);
  }
  function openEdit(v: Vehicle) {
    setEditing(v);
    setForm({
      registration_number: v.registration_number,
      name_model: v.name_model,
      type: v.type,
      max_load_capacity: v.max_load_capacity,
      odometer: v.odometer,
      acquisition_cost: v.acquisition_cost,
      region: v.region ?? "",
    });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await vehiclesApi.update(editing.id, {
          name_model: form.name_model,
          type: form.type,
          max_load_capacity: form.max_load_capacity,
          odometer: form.odometer,
          acquisition_cost: form.acquisition_cost,
          region: form.region || undefined,
        });
        toast.success("Vehicle updated.");
      } else {
        await vehiclesApi.create({ ...form, region: form.region || undefined });
        toast.success("Vehicle registered.");
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(v: Vehicle, status: VehicleStatus) {
    try {
      await vehiclesApi.setStatus(v.id, status);
      toast.success(`${v.registration_number} → ${status}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status change failed");
    }
  }

  const columns: Column<Vehicle>[] = [
    {
      header: "Vehicle",
      cell: (v) => (
        <div>
          <p className="font-semibold text-zinc-100">{v.name_model}</p>
          <p className="font-mono text-xs text-zinc-500">
            {v.registration_number}
          </p>
        </div>
      ),
    },
    { header: "Type", cell: (v) => v.type },
    {
      header: "Capacity",
      cell: (v) => num(v.max_load_capacity, "kg"),
    },
    { header: "Odometer", cell: (v) => num(v.odometer, "km") },
    { header: "Region", cell: (v) => v.region ?? "—" },
    { header: "Acq. Cost", cell: (v) => money(v.acquisition_cost) },
    { header: "Status", cell: (v) => <StatusBadge status={v.status} /> },
    {
      header: "",
      className: "text-right",
      cell: (v) =>
        canManage ? (
          <div className="flex justify-end gap-1.5">
            <button
              onClick={() => openEdit(v)}
              className="rounded-md px-2 py-1 text-xs font-semibold text-zinc-300 hover:bg-ink-600"
            >
              Edit
            </button>
            {v.status !== "Retired" ? (
              <button
                onClick={() => changeStatus(v, "Retired")}
                className="rounded-md px-2 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/10"
              >
                Retire
              </button>
            ) : (
              <button
                onClick={() => changeStatus(v, "Available")}
                className="rounded-md px-2 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10"
              >
                Reinstate
              </button>
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
        title="Vehicle Registry"
        subtitle="Master list of every asset in the fleet."
        actions={
          canManage && (
            <button onClick={openCreate} className="btn-primary">
              <Icon name="plus" className="h-4 w-4" /> Add vehicle
            </button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search registration, model, region…"
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
          {filtered.length} vehicle{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <Table
        columns={columns}
        rows={filtered}
        keyFn={(v) => v.id}
        loading={loading}
        empty="No vehicles match your filters."
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit vehicle" : "Register vehicle"}
        subtitle={
          editing
            ? editing.registration_number
            : "Registration number must be unique."
        }
        footer={
          <>
            <button
              className="btn-ghost"
              onClick={() => setModalOpen(false)}
              type="button"
            >
              Cancel
            </button>
            <button className="btn-primary" form="vehicle-form" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Register"}
            </button>
          </>
        }
      >
        <form id="vehicle-form" onSubmit={save} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Registration number">
              <input
                className="input disabled:opacity-60"
                value={form.registration_number}
                disabled={!!editing}
                onChange={(e) =>
                  setForm({ ...form, registration_number: e.target.value })
                }
                placeholder="GJ01AB0000"
                required
              />
            </Field>
          </div>
          <Field label="Name / model">
            <input
              className="input"
              value={form.name_model}
              onChange={(e) => setForm({ ...form, name_model: e.target.value })}
              placeholder="TRUCK-12"
              required
            />
          </Field>
          <Field label="Type">
            <Select
              value={form.type}
              onChange={(v) => setForm({ ...form, type: v })}
            >
              {["Truck", "Van", "Mini", "Bike", "Other"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Max load capacity (kg)">
            <input
              type="number"
              min={0}
              className="input"
              value={form.max_load_capacity || ""}
              onChange={(e) =>
                setForm({ ...form, max_load_capacity: Number(e.target.value) })
              }
              required
            />
          </Field>
          <Field label="Odometer (km)">
            <input
              type="number"
              min={0}
              className="input"
              value={form.odometer || ""}
              onChange={(e) =>
                setForm({ ...form, odometer: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Acquisition cost (₹)">
            <input
              type="number"
              min={0}
              className="input"
              value={form.acquisition_cost || ""}
              onChange={(e) =>
                setForm({ ...form, acquisition_cost: Number(e.target.value) })
              }
              required
            />
          </Field>
          <Field label="Region">
            <input
              className="input"
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              placeholder="Ahmedabad"
            />
          </Field>
        </form>
      </Modal>
    </>
  );
}
