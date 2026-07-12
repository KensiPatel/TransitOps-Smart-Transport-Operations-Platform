import { useEffect, useMemo, useState } from "react";
import { fuelApi, expensesApi } from "@/api/fuelExpenses.api";
import { vehiclesApi } from "@/api/vehicles.api";
import { maintenanceApi } from "@/api/maintenance.api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import type {
  CreateExpenseInput,
  CreateFuelLogInput,
  Expense,
  FuelLog,
  MaintenanceLog,
  Vehicle,
} from "@/types";
import { money, num, formatDate, todayISO } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiCard } from "@/components/ui/KpiCard";
import { Table, type Column } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { Field, Select } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";

type Tab = "fuel" | "expenses";

export function FuelExpensesPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [tab, setTab] = useState<Tab>("fuel");
  const [fuel, setFuel] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [fuelModal, setFuelModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);
  const [fuelForm, setFuelForm] = useState<CreateFuelLogInput>({
    vehicle_id: "",
    liters: 0,
    cost: 0,
    log_date: todayISO(),
  });
  const [expenseForm, setExpenseForm] = useState<CreateExpenseInput>({
    vehicle_id: "",
    category: "toll",
    amount: 0,
    expense_date: todayISO(),
  });
  const [saving, setSaving] = useState(false);

  const vById = useMemo(
    () => new Map(vehicles.map((v) => [v.id, v])),
    [vehicles]
  );

  async function load() {
    setLoading(true);
    try {
      const [f, e, v, m] = await Promise.all([
        fuelApi.list(),
        expensesApi.list(),
        vehiclesApi.list(),
        maintenanceApi.list(),
      ]);
      setFuel(f);
      setExpenses(e);
      setVehicles(v);
      setMaintenance(m);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalFuel = useMemo(() => fuel.reduce((s, f) => s + f.cost, 0), [fuel]);
  const totalExpense = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0),
    [expenses]
  );
  const totalMaint = useMemo(
    () => maintenance.reduce((s, m) => s + m.cost, 0),
    [maintenance]
  );

  async function saveFuel(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fuelApi.create({ ...fuelForm, created_by: user?.id });
      toast.success("Fuel log recorded.");
      setFuelModal(false);
      setFuelForm({ vehicle_id: "", liters: 0, cost: 0, log_date: todayISO() });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveExpense(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await expensesApi.create({ ...expenseForm, created_by: user?.id });
      toast.success("Expense recorded.");
      setExpenseModal(false);
      setExpenseForm({
        vehicle_id: "",
        category: "toll",
        amount: 0,
        expense_date: todayISO(),
      });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const fuelCols: Column<FuelLog>[] = [
    {
      header: "Vehicle",
      cell: (f) => vById.get(f.vehicle_id)?.registration_number ?? "—",
    },
    { header: "Liters", cell: (f) => num(f.liters, "L") },
    { header: "Cost", cell: (f) => money(f.cost) },
    {
      header: "₹ / L",
      cell: (f) => (f.liters > 0 ? money(f.cost / f.liters) : "—"),
    },
    { header: "Date", cell: (f) => formatDate(f.log_date) },
  ];

  const expenseCols: Column<Expense>[] = [
    {
      header: "Vehicle",
      cell: (e) => vById.get(e.vehicle_id)?.registration_number ?? "—",
    },
    {
      header: "Category",
      cell: (e) => <span className="capitalize">{e.category}</span>,
    },
    { header: "Amount", cell: (e) => money(e.amount) },
    { header: "Date", cell: (e) => formatDate(e.expense_date) },
  ];

  const openVehicle = vehicles.filter((v) => v.status !== "Retired");

  return (
    <>
      <PageHeader
        title="Fuel & Expenses"
        subtitle="Fuel logs, tolls, fines and the running operational cost."
        actions={
          <button
            className="btn-primary"
            onClick={() =>
              tab === "fuel" ? setFuelModal(true) : setExpenseModal(true)
            }
          >
            <Icon name="plus" className="h-4 w-4" />
            {tab === "fuel" ? "Log fuel" : "Add expense"}
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total Fuel Cost" value={money(totalFuel)} accent />
        <KpiCard label="Total Maintenance" value={money(totalMaint)} />
        <KpiCard label="Other Expenses" value={money(totalExpense)} />
        <KpiCard
          label="Operational Cost"
          value={money(totalFuel + totalMaint + totalExpense)}
          hint="fuel + maintenance + expenses"
        />
      </div>

      <div className="mb-4 inline-flex rounded-lg border border-ink-600 bg-ink-800 p-1">
        {(["fuel", "expenses"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition ${
              tab === t
                ? "bg-accent text-ink-900"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t === "fuel" ? "Fuel logs" : "Expenses"}
          </button>
        ))}
      </div>

      {tab === "fuel" ? (
        <Table
          columns={fuelCols}
          rows={fuel}
          keyFn={(f) => f.id}
          loading={loading}
          empty="No fuel logs yet."
        />
      ) : (
        <Table
          columns={expenseCols}
          rows={expenses}
          keyFn={(e) => e.id}
          loading={loading}
          empty="No expenses yet."
        />
      )}

      {/* Fuel modal */}
      <Modal
        open={fuelModal}
        onClose={() => setFuelModal(false)}
        title="Log fuel"
        footer={
          <>
            <button
              className="btn-ghost"
              type="button"
              onClick={() => setFuelModal(false)}
            >
              Cancel
            </button>
            <button className="btn-primary" form="fuel-form" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        <form id="fuel-form" onSubmit={saveFuel} className="space-y-4">
          <Field label="Vehicle">
            <Select
              value={fuelForm.vehicle_id}
              onChange={(v) => setFuelForm({ ...fuelForm, vehicle_id: v })}
            >
              <option value="">Select vehicle…</option>
              {openVehicle.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registration_number} · {v.name_model}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Liters">
              <input
                type="number"
                min={0}
                step="0.1"
                className="input"
                value={fuelForm.liters || ""}
                onChange={(e) =>
                  setFuelForm({ ...fuelForm, liters: Number(e.target.value) })
                }
                required
              />
            </Field>
            <Field label="Cost (₹)">
              <input
                type="number"
                min={0}
                className="input"
                value={fuelForm.cost || ""}
                onChange={(e) =>
                  setFuelForm({ ...fuelForm, cost: Number(e.target.value) })
                }
                required
              />
            </Field>
            <Field label="Date">
              <input
                type="date"
                className="input"
                value={fuelForm.log_date}
                onChange={(e) =>
                  setFuelForm({ ...fuelForm, log_date: e.target.value })
                }
                required
              />
            </Field>
          </div>
        </form>
      </Modal>

      {/* Expense modal */}
      <Modal
        open={expenseModal}
        onClose={() => setExpenseModal(false)}
        title="Add expense"
        footer={
          <>
            <button
              className="btn-ghost"
              type="button"
              onClick={() => setExpenseModal(false)}
            >
              Cancel
            </button>
            <button className="btn-primary" form="expense-form" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        <form id="expense-form" onSubmit={saveExpense} className="space-y-4">
          <Field label="Vehicle">
            <Select
              value={expenseForm.vehicle_id}
              onChange={(v) =>
                setExpenseForm({ ...expenseForm, vehicle_id: v })
              }
            >
              <option value="">Select vehicle…</option>
              {openVehicle.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registration_number} · {v.name_model}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Category">
              <Select
                value={expenseForm.category}
                onChange={(v) =>
                  setExpenseForm({ ...expenseForm, category: v })
                }
              >
                {["toll", "fine", "parking", "misc"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Amount (₹)">
              <input
                type="number"
                min={0}
                className="input"
                value={expenseForm.amount || ""}
                onChange={(e) =>
                  setExpenseForm({
                    ...expenseForm,
                    amount: Number(e.target.value),
                  })
                }
                required
              />
            </Field>
            <Field label="Date">
              <input
                type="date"
                className="input"
                value={expenseForm.expense_date}
                onChange={(e) =>
                  setExpenseForm({
                    ...expenseForm,
                    expense_date: e.target.value,
                  })
                }
                required
              />
            </Field>
          </div>
        </form>
      </Modal>
    </>
  );
}
