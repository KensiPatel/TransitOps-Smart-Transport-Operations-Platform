import {
  Area,
  AreaChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PALETTE = ["#f97316", "#38bdf8", "#34d399", "#a78bfa", "#f43f5e", "#94a3b8"];

const tooltipStyle = {
  background: "#141416",
  border: "1px solid #33333a",
  borderRadius: 10,
  color: "#e4e4e7",
  fontSize: 12,
};

export function DonutChart({
  data,
  centerLabel,
  centerValue,
}: {
  data: { name: string; value: number }[];
  centerLabel?: string;
  centerValue?: string | number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="relative h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={total === 0 ? [{ name: "None", value: 1 }] : data}
            dataKey="value"
            nameKey="name"
            innerRadius={58}
            outerRadius={82}
            paddingAngle={total === 0 ? 0 : 2}
            stroke="none"
          >
            {(total === 0 ? [0] : data).map((_, i) => (
              <Cell key={i} fill={total === 0 ? "#26262b" : PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          {total > 0 && (
            <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "#e4e4e7" }} />
          )}
          {total > 0 && (
            <Legend
              iconType="circle"
              wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 top-[42%] -translate-y-1/2 text-center">
        <p className="font-display text-2xl font-bold text-zinc-100">
          {centerValue ?? total}
        </p>
        {centerLabel && (
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
            {centerLabel}
          </p>
        )}
      </div>
    </div>
  );
}

export function TrendArea({
  data,
  dataKey,
  xKey,
}: {
  data: Record<string, unknown>[];
  dataKey: string;
  xKey: string;
}) {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="trend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey={xKey}
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={{ stroke: "#26262b" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "#e4e4e7" }} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke="#f97316"
            strokeWidth={2}
            fill="url(#trend)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
