import { db, now } from "../../db/client";
import type {
  DateRangeFilter,
  VehicleROIRow,
  VehicleROIReport,
  FuelEfficiencyReport,
  FuelEfficiencyVehicleRow,
  FuelEfficiencyTripRow,
  DriverSafetyReport,
  DriverSafetyRow,
  TripCompletionReport,
} from "./reports.types";

/**
 * Builds a reusable `date(col) BETWEEN` fragment. Both bounds optional.
 * Returns the SQL snippet plus the params to bind, so each report can splice
 * it into whichever date column is relevant.
 */
function dateRangeClause(
  column: string,
  start?: string,
  end?: string
): { sql: string; params: string[] } {
  const parts: string[] = [];
  const params: string[] = [];
  if (start) {
    parts.push(`date(${column}) >= date(?)`);
    params.push(start);
  }
  if (end) {
    parts.push(`date(${column}) <= date(?)`);
    params.push(end);
  }
  return { sql: parts.length ? " AND " + parts.join(" AND ") : "", params };
}

/**
 * VEHICLE ROI — revenue vs cost per vehicle, including capital cost.
 *
 * Per requirement, total_cost = fuel + maintenance + expenses + acquisition_cost.
 * Revenue is summed from Completed trips on the vehicle. Each cost bucket is
 * summed independently (a vehicle may have fuel/maintenance/expense rows with
 * no trip attached), then combined.
 *
 * `search` filters vehicles by registration_number / name_model.
 * Date range (if given) applies to the revenue + cost source rows so the
 * report can be scoped to a period.
 */
export function getVehicleROIReport(filters: DateRangeFilter = {}): VehicleROIReport {
  const { start_date, end_date, search } = filters;

  const vehRange = dateRangeClause("tr.created_at", start_date, end_date);
  const fuelRange = dateRangeClause("fl.log_date", start_date, end_date);
  const maintRange = dateRangeClause("ml.started_at", start_date, end_date);
  const expRange = dateRangeClause("ex.expense_date", start_date, end_date);

  let query = `
    SELECT
      v.id                 AS vehicle_id,
      v.registration_number,
      v.name_model,
      v.region,
      v.acquisition_cost,
      COALESCE((
        SELECT SUM(tr.revenue) FROM trips tr
        WHERE tr.vehicle_id = v.id AND tr.status = 'Completed'${vehRange.sql}
      ), 0) AS revenue,
      COALESCE((
        SELECT SUM(fl.cost) FROM fuel_logs fl
        WHERE fl.vehicle_id = v.id${fuelRange.sql}
      ), 0) AS fuel_cost,
      COALESCE((
        SELECT SUM(ml.cost) FROM maintenance_logs ml
        WHERE ml.vehicle_id = v.id${maintRange.sql}
      ), 0) AS maintenance_cost,
      COALESCE((
        SELECT SUM(ex.amount) FROM expenses ex
        WHERE ex.vehicle_id = v.id${expRange.sql}
      ), 0) AS expense_cost
    FROM vehicles v
    WHERE 1=1
  `;

  // params must be pushed in the same order the subqueries appear above.
  const params: (string | number)[] = [
    ...vehRange.params,
    ...fuelRange.params,
    ...maintRange.params,
    ...expRange.params,
  ];

  if (search && search.trim() !== "") {
    const term = `%${search.trim().toLowerCase()}%`;
    query += ` AND (LOWER(v.registration_number) LIKE ? OR LOWER(v.name_model) LIKE ?)`;
    params.push(term, term);
  }

  query += " ORDER BY v.name_model";

  const raw = db.query(query).all(...params) as {
    vehicle_id: string;
    registration_number: string;
    name_model: string;
    region: string | null;
    acquisition_cost: number;
    revenue: number;
    fuel_cost: number;
    maintenance_cost: number;
    expense_cost: number;
  }[];

  const rows: VehicleROIRow[] = raw.map((r) => {
    const running_cost = r.fuel_cost + r.maintenance_cost + r.expense_cost;
    const total_cost = running_cost + r.acquisition_cost;
    const net_profit = r.revenue - total_cost;
    const roi_percent = total_cost > 0 ? (net_profit / total_cost) * 100 : null;
    return {
      vehicle_id: r.vehicle_id,
      registration_number: r.registration_number,
      name_model: r.name_model,
      region: r.region,
      revenue: r.revenue,
      fuel_cost: r.fuel_cost,
      maintenance_cost: r.maintenance_cost,
      expense_cost: r.expense_cost,
      acquisition_cost: r.acquisition_cost,
      running_cost,
      total_cost,
      net_profit,
      roi_percent: roi_percent === null ? null : Number(roi_percent.toFixed(2)),
    };
  });

  const totals = rows.reduce(
    (acc, r) => {
      acc.revenue += r.revenue;
      acc.running_cost += r.running_cost;
      acc.acquisition_cost += r.acquisition_cost;
      acc.total_cost += r.total_cost;
      acc.net_profit += r.net_profit;
      return acc;
    },
    { revenue: 0, running_cost: 0, acquisition_cost: 0, total_cost: 0, net_profit: 0 }
  );

  return { rows, totals, generated_at: now() };
}

/**
 * FUEL EFFICIENCY — per vehicle and per trip.
 *
 * Per-vehicle km/L uses total actual_distance from Completed trips over total
 * liters logged. Per-trip km/L uses the trip's own actual_distance and
 * fuel_consumed (only meaningful for Completed trips that recorded both).
 *
 * `search` filters by vehicle registration_number / name_model.
 */
export function getFuelEfficiencyReport(filters: DateRangeFilter = {}): FuelEfficiencyReport {
  const { start_date, end_date, search } = filters;

  const fuelRange = dateRangeClause("fl.log_date", start_date, end_date);
  const tripRange = dateRangeClause("tr.created_at", start_date, end_date);

  let vehQuery = `
    SELECT
      v.id AS vehicle_id,
      v.registration_number,
      v.name_model,
      COALESCE((
        SELECT SUM(fl.liters) FROM fuel_logs fl
        WHERE fl.vehicle_id = v.id${fuelRange.sql}
      ), 0) AS total_liters,
      COALESCE((
        SELECT SUM(fl.cost) FROM fuel_logs fl
        WHERE fl.vehicle_id = v.id${fuelRange.sql}
      ), 0) AS total_fuel_cost,
      COALESCE((
        SELECT SUM(tr.actual_distance) FROM trips tr
        WHERE tr.vehicle_id = v.id AND tr.status = 'Completed'${tripRange.sql}
      ), 0) AS total_distance
    FROM vehicles v
    WHERE 1=1
  `;

  const vehParams: (string | number)[] = [
    ...fuelRange.params, // liters subquery
    ...fuelRange.params, // cost subquery
    ...tripRange.params, // distance subquery
  ];

  if (search && search.trim() !== "") {
    const term = `%${search.trim().toLowerCase()}%`;
    vehQuery += ` AND (LOWER(v.registration_number) LIKE ? OR LOWER(v.name_model) LIKE ?)`;
    vehParams.push(term, term);
  }

  vehQuery += " ORDER BY v.name_model";

  const vehRaw = db.query(vehQuery).all(...vehParams) as {
    vehicle_id: string;
    registration_number: string;
    name_model: string;
    total_liters: number;
    total_fuel_cost: number;
    total_distance: number;
  }[];

  const by_vehicle: FuelEfficiencyVehicleRow[] = vehRaw.map((r) => ({
    vehicle_id: r.vehicle_id,
    registration_number: r.registration_number,
    name_model: r.name_model,
    total_liters: r.total_liters,
    total_fuel_cost: r.total_fuel_cost,
    total_distance: r.total_distance,
    km_per_liter:
      r.total_liters > 0 ? Number((r.total_distance / r.total_liters).toFixed(2)) : null,
    cost_per_km:
      r.total_distance > 0 ? Number((r.total_fuel_cost / r.total_distance).toFixed(2)) : null,
  }));

  // Per-trip efficiency — Completed trips with both actuals recorded.
  let tripQuery = `
    SELECT
      tr.id AS trip_id,
      tr.trip_code,
      v.registration_number AS vehicle_registration,
      tr.actual_distance,
      tr.fuel_consumed
    FROM trips tr
    LEFT JOIN vehicles v ON v.id = tr.vehicle_id
    WHERE tr.status = 'Completed'
      AND tr.actual_distance IS NOT NULL
      AND tr.fuel_consumed IS NOT NULL
      AND tr.fuel_consumed > 0
  `;
  const tripParams: (string | number)[] = [];
  const tripRange2 = dateRangeClause("tr.created_at", start_date, end_date);
  tripQuery += tripRange2.sql;
  tripParams.push(...tripRange2.params);

  if (search && search.trim() !== "") {
    const term = `%${search.trim().toLowerCase()}%`;
    tripQuery += ` AND (LOWER(COALESCE(v.registration_number,'')) LIKE ? OR LOWER(tr.trip_code) LIKE ?)`;
    tripParams.push(term, term);
  }

  tripQuery += " ORDER BY tr.created_at DESC";

  const tripRaw = db.query(tripQuery).all(...tripParams) as {
    trip_id: string;
    trip_code: string;
    vehicle_registration: string | null;
    actual_distance: number | null;
    fuel_consumed: number | null;
  }[];

  const by_trip: FuelEfficiencyTripRow[] = tripRaw.map((r) => ({
    trip_id: r.trip_id,
    trip_code: r.trip_code,
    vehicle_registration: r.vehicle_registration,
    actual_distance: r.actual_distance,
    fuel_consumed: r.fuel_consumed,
    km_per_liter:
      r.actual_distance && r.fuel_consumed && r.fuel_consumed > 0
        ? Number((r.actual_distance / r.fuel_consumed).toFixed(2))
        : null,
  }));

  return { by_vehicle, by_trip, generated_at: now() };
}

/**
 * DRIVER SAFETY SUMMARY — safety_score plus completed-trip activity per driver.
 * `search` filters by driver name / license_number.
 */
export function getDriverSafetyReport(filters: DateRangeFilter = {}): DriverSafetyReport {
  const { start_date, end_date, search } = filters;
  const tripRange = dateRangeClause("tr.created_at", start_date, end_date);

  let query = `
    SELECT
      d.id AS driver_id,
      d.name,
      d.license_number,
      d.status,
      d.safety_score,
      COALESCE((
        SELECT COUNT(*) FROM trips tr
        WHERE tr.driver_id = d.id AND tr.status = 'Completed'${tripRange.sql}
      ), 0) AS completed_trips,
      COALESCE((
        SELECT SUM(tr.actual_distance) FROM trips tr
        WHERE tr.driver_id = d.id AND tr.status = 'Completed'${tripRange.sql}
      ), 0) AS total_distance
    FROM drivers d
    WHERE 1=1
  `;
  const params: (string | number)[] = [...tripRange.params, ...tripRange.params];

  if (search && search.trim() !== "") {
    const term = `%${search.trim().toLowerCase()}%`;
    query += ` AND (LOWER(d.name) LIKE ? OR LOWER(d.license_number) LIKE ?)`;
    params.push(term, term);
  }

  query += " ORDER BY d.safety_score DESC";

  const rows = db.query(query).all(...params) as DriverSafetyRow[];

  const fleet_average_safety_score =
    rows.length > 0
      ? Number(
          (rows.reduce((s, r) => s + r.safety_score, 0) / rows.length).toFixed(2)
        )
      : null;

  return { rows, fleet_average_safety_score, generated_at: now() };
}

/**
 * TRIP COMPLETION STATS over a date range (on created_at).
 * completion_rate = Completed / (Completed + Cancelled).
 */
export function getTripCompletionReport(filters: DateRangeFilter = {}): TripCompletionReport {
  const { start_date, end_date } = filters;
  const range = dateRangeClause("created_at", start_date, end_date);

  const rows = db
    .query(
      `SELECT status, COUNT(*) AS count
       FROM trips
       WHERE 1=1${range.sql}
       GROUP BY status`
    )
    .all(...range.params) as { status: string; count: number }[];

  const by_status = { Draft: 0, Dispatched: 0, Completed: 0, Cancelled: 0 };
  for (const r of rows) {
    if (r.status in by_status) by_status[r.status as keyof typeof by_status] = r.count;
  }

  const total_trips =
    by_status.Draft + by_status.Dispatched + by_status.Completed + by_status.Cancelled;

  const finished = by_status.Completed + by_status.Cancelled;
  const completion_rate_percent =
    finished > 0 ? Number(((by_status.Completed / finished) * 100).toFixed(2)) : null;

  const totalsRow = db
    .query(
      `SELECT
         COALESCE(SUM(revenue), 0) AS revenue,
         COALESCE(SUM(actual_distance), 0) AS distance
       FROM trips
       WHERE status = 'Completed'${range.sql}`
    )
    .get(...range.params) as { revenue: number; distance: number };

  return {
    range: { start_date: start_date ?? null, end_date: end_date ?? null },
    total_trips,
    by_status,
    completion_rate_percent,
    total_revenue: totalsRow.revenue,
    total_distance: totalsRow.distance,
    generated_at: now(),
  };
}