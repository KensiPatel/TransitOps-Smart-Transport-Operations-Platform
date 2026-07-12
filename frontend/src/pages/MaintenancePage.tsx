import { useEffect, useMemo, useState } from "react";
import { maintenanceApi } from "@/api/maintenance.api";
import { vehiclesApi } from "@/api/vehicles.api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import type {
  CreateMaintenanceInput,
  MaintenanceLog,
  Vehicle,
} from "@/types";
import { money, formatDate } from "@/lib/format";
import { PageHeader, SearchBox } from "@/components/ui/PageHeader";
import { Table, type Column } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { Field, Select } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";

const BLANK: CreateMaintenanceInput = {
  vehicle_id: "",
  type: "Oil Change",
  description: "",
  cost: 0,
};

export function MaintenancePage() {
  const { user } = useAuth();
  const toast = useToast();

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

  // Vehicles you can send to the shop — not already On Trip or Retired.
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

  const columns: Column<MaintenanceLog>[] = [
    {
      header: "Vehicle",
      cell: (l) => {
        const v = vById.get(l.vehicle_id);
        return (
          <div>
            <p className="font-semibold text-zinc-100">
              {v?.registration_number ?? "—"}
            </p>
            <p className="text-xs text-zinc-500">{v?.name_model ?? ""}</p>
          </div>
        );
      },
    },
    {
      header: "Work",
      cell: (l) => (
        <div>
          <p className="text-zinc-200">{l.type}</p>
          {l.description && (
            <p className="text-xs text-zinc-500">{l.description}</p>
          )}
        </div>
      ),
    },
    { header: "Cost", cell: (l) => money(l.cost) },
    { header: "Opened", cell: (l) => formatDate(l.started_at) },
    { header: "Closed", cell: (l) => formatDate(l.closed_at) },
    { header: "Status", cell: (l) => <StatusBadge status={l.status} /> },
    {
      header: "",
      className: "text-right",
      cell: (l) =>
        l.status === "Active" ? (
          <button
            onClick={() => close(l)}
            className="rounded-md bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
          >
            Close
          </button>
        ) : (
          <span className="text-xs text-zinc-600">—</span>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Maintenance"
        subtitle="Opening a log sends the vehicle to the shop; closing frees it."
        actions={
          <button onClick={openCreate} className="btn-primary">
            <Icon name="plus" className="h-4 w-4" /> Open log
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search vehicle, work type…"
        />
        <div className="w-40">
          <Select value={statusFilter} onChange={setStatusFilter}>
            <option value="">All statuses</option>
            <option value="Active">Active</option>
            <option value="Closed">Closed</option>
          </Select>
        </div>
        <span className="ml-auto text-sm text-zinc-500">
          {filtered.length} log{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <Table
        columns={columns}
        rows={filtered}
        keyFn={(l) => l.id}
        loading={loading}
        empty="No maintenance logs match your filters."
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Open maintenance log"
        subtitle="On-trip and retired vehicles can't be serviced."
        footer={
          <>
            <button
              className="btn-ghost"
              type="button"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              form="maint-form"
              disabled={saving || serviceable.length === 0}
            >
              {saving ? "Opening…" : "Open log"}
            </button>
          </>
        }
      >
        {serviceable.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-400">
            No serviceable vehicles right now. Complete active trips first.
          </p>
        ) : (
          <form id="maint-form" onSubmit={save} className="space-y-4">
            <Field label="Vehicle">
              <Select
                value={form.vehicle_id}
                onChange={(v) => setForm({ ...form, vehicle_id: v })}
              >
                {serviceable.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration_number} · {v.name_model} ({v.status})
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Work type">
                <Select
                  value={form.type}
                  onChange={(v) => setForm({ ...form, type: v })}
                >
                  {[
                    "Oil Change",
                    "Tyre Replace",
                    "Engine Repair",
                    "Brake Service",
                    "General Service",
                    "Other",
                  ].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Cost (₹)">
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={form.cost || ""}
                  onChange={(e) =>
                    setForm({ ...form, cost: Number(e.target.value) })
                  }
                  required
                />
              </Field>
            </div>
            <Field label="Description">
              <textarea
                className="input min-h-[80px] resize-y"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="What's being done?"
              />
            </Field>
          </form>
        )}
      </Modal>
    </>
  );
}
