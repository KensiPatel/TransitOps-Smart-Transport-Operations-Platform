import { useEffect, useMemo, useState } from "react";
import { driversApi } from "@/api/drivers.api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import type { CreateDriverInput, Driver, DriverStatus } from "@/types";
import { formatDate, daysUntil } from "@/lib/format";
import { PageHeader, SearchBox } from "@/components/ui/PageHeader";
import { Table, type Column } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { Field, Select } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";

const STATUSES: DriverStatus[] = ["Available", "On Trip", "Off Duty", "Suspended"];

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
    days < 0 ? "text-red-300" : days <= 30 ? "text-accent" : "text-zinc-200";
  return (
    <div>
      <p className={tone}>{formatDate(date)}</p>
      <p className="text-[11px] text-zinc-500">
        {days < 0 ? `expired ${-days}d ago` : `${days}d left`}
      </p>
    </div>
  );
}

export function DriversPage() {
  const { user } = useAuth();
  const toast = useToast();
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

  const columns: Column<Driver>[] = [
    {
      header: "Driver",
      cell: (d) => (
        <div>
          <p className="font-semibold text-zinc-100">{d.name}</p>
          <p className="font-mono text-xs text-zinc-500">{d.license_number}</p>
        </div>
      ),
    },
    { header: "Category", cell: (d) => d.license_category },
    { header: "License expiry", cell: (d) => <LicenseCell date={d.license_expiry_date} /> },
    { header: "Contact", cell: (d) => d.contact_number },
    {
      header: "Safety",
      cell: (d) => (
        <span
          className={
            d.safety_score >= 90
              ? "text-emerald-300"
              : d.safety_score >= 75
                ? "text-accent"
                : "text-red-300"
          }
        >
          {d.safety_score}
        </span>
      ),
    },
    { header: "Status", cell: (d) => <StatusBadge status={d.status} /> },
    {
      header: "",
      className: "text-right",
      cell: (d) => (
        <div className="flex justify-end gap-1.5">
          {canManage && (
            <button
              onClick={() => openEdit(d)}
              className="rounded-md px-2 py-1 text-xs font-semibold text-zinc-300 hover:bg-ink-600"
            >
              Edit
            </button>
          )}
          {canSuspend &&
            (d.status === "Suspended" ? (
              <button
                onClick={() => changeStatus(d, "Available")}
                className="rounded-md px-2 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10"
              >
                Reinstate
              </button>
            ) : (
              d.status !== "On Trip" && (
                <button
                  onClick={() => changeStatus(d, "Suspended")}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/10"
                >
                  Suspend
                </button>
              )
            ))}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Driver Management"
        subtitle="Profiles, licence validity and safety scores."
        actions={
          canManage && (
            <button onClick={openCreate} className="btn-primary">
              <Icon name="plus" className="h-4 w-4" /> Add driver
            </button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search name, licence, contact…"
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
          {filtered.length} driver{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <Table
        columns={columns}
        rows={filtered}
        keyFn={(d) => d.id}
        loading={loading}
        empty="No drivers match your filters."
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit driver" : "Add driver"}
        subtitle={editing ? editing.name : "Licence number must be unique."}
        footer={
          <>
            <button
              className="btn-ghost"
              onClick={() => setModalOpen(false)}
              type="button"
            >
              Cancel
            </button>
            <button className="btn-primary" form="driver-form" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add driver"}
            </button>
          </>
        }
      >
        <form id="driver-form" onSubmit={save} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Full name">
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Field>
          </div>
          <Field label="License number">
            <input
              className="input disabled:opacity-60"
              value={form.license_number}
              disabled={!!editing}
              onChange={(e) =>
                setForm({ ...form, license_number: e.target.value })
              }
              placeholder="DL-00000"
              required
            />
          </Field>
          <Field label="Category">
            <Select
              value={form.license_category}
              onChange={(v) => setForm({ ...form, license_category: v })}
            >
              {["LMV", "HMV", "MCWG", "Other"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="License expiry">
            <input
              type="date"
              className="input"
              value={form.license_expiry_date}
              onChange={(e) =>
                setForm({ ...form, license_expiry_date: e.target.value })
              }
              required
            />
          </Field>
          <Field label="Contact number">
            <input
              className="input"
              value={form.contact_number}
              onChange={(e) =>
                setForm({ ...form, contact_number: e.target.value })
              }
              required
            />
          </Field>
          <div className="col-span-2">
            <Field label={`Safety score — ${form.safety_score}`}>
              <input
                type="range"
                min={0}
                max={100}
                value={form.safety_score}
                onChange={(e) =>
                  setForm({ ...form, safety_score: Number(e.target.value) })
                }
                className="w-full accent-accent"
              />
            </Field>
          </div>
        </form>
      </Modal>
    </>
  );
}
