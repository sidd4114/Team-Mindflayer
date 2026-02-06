"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface DataPoint {
    date: string;
    mean: number;
}

interface NDVIChartProps {
    data: DataPoint[];
}

export default function NDVIChart({ data }: NDVIChartProps) {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 1]} />
                <Tooltip />
                <ReferenceLine y={0.3} label="Min Threshold" stroke="red" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="mean" stroke="#82ca9d" name="NDVI Mean" />
            </LineChart>
        </ResponsiveContainer>
    );
}
