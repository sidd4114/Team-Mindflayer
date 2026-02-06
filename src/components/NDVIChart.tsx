"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface DataPoint {
    date: string;
    mean: number;
}

interface NDVIChartProps {
    data: DataPoint[];
    /** Fixed width for scrollable container (chart won't shrink below this on mobile) */
    width?: number;
    height?: number;
    lineLabel?: string;
    dangerLabel?: string;
    thresholdLabel?: string;
}

const CHART_MIN_WIDTH = 560;
const CHART_HEIGHT = 260;

export default function NDVIChart({
    data,
    width: fixedWidth,
    height = CHART_HEIGHT,
    lineLabel = "Crop health",
    dangerLabel = "Danger level",
    thresholdLabel = "Minimum Safe Level",
}: NDVIChartProps) {
    const chartWidth = fixedWidth ?? undefined;

    const content = (
        <LineChart
            data={data}
            {...(chartWidth ? { width: chartWidth, height } : {})}
            margin={{ left: 36, right: 24, top: 12, bottom: 24 }}
        >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickFormatter={(value) => {
                    try {
                        const d = new Date(value);
                        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    } catch {
                        return value;
                    }
                }}
                interval="preserveStartEnd"
            />
            <YAxis
                domain={[0, 1]}
                tick={{ fontSize: 12, fill: "#475569" }}
                width={28}
                tickCount={6}
            />
            <Tooltip
                formatter={(value: number) => [value.toFixed(2), lineLabel]}
                labelFormatter={(label) => new Date(label).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            />
            <ReferenceLine
                y={0.3}
                stroke="#dc2626"
                strokeDasharray="4 4"
                strokeOpacity={0.6}
                label={{ value: thresholdLabel, position: "right", fontSize: 10, fill: "#64748b" }}
            />
            <Line
                type="monotone"
                dataKey="mean"
                stroke="#6B7B3F"
                strokeWidth={2}
                dot={{ r: 3, fill: "#6B7B3F" }}
                name={lineLabel}
            />
        </LineChart>
    );

    const legend = (
        <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
                <span className="w-6 h-0.5 bg-[#6B7B3F] rounded" />
                {lineLabel}
            </span>
            <span className="inline-flex items-center gap-1.5">
                <span className="w-6 h-0.5 border-t-2 border-dashed border-red-400 rounded opacity-70" />
                {dangerLabel}
            </span>
        </div>
    );

    if (chartWidth) {
        return (
            <div className="NDVIChart-wrapper">
                {content}
                {legend}
            </div>
        );
    }

    return (
        <div>
            <ResponsiveContainer width="100%" height={height}>
                {content}
            </ResponsiveContainer>
            {legend}
        </div>
    );
}

export { CHART_MIN_WIDTH, CHART_HEIGHT };
