"use client";

import { Droplets, AlertTriangle, CheckCircle, XCircle, TrendingDown, Lightbulb } from "lucide-react";
import { Badge } from "./ui/badge";

interface VCIGaugeProps {
    vci: number;
    ndvi_current: number;
    severity: string;
    interpretation: string;
    recommendations?: string[];
}

export default function VCIGauge({ vci, ndvi_current, severity, interpretation, recommendations }: VCIGaugeProps) {
    // Safety check for invalid data
    if (vci === undefined || vci === null) {
        return null;
    }

    // Color and icon based on severity
    const getSeverityStyles = () => {
        switch (severity) {
            case "excellent":
                return {
                    color: "text-emerald-700",
                    bg: "bg-emerald-50",
                    border: "border-emerald-300",
                    badge: "success",
                    icon: CheckCircle,
                    iconColor: "text-emerald-600",
                    gaugeColor: "#10b981"
                };
            case "good":
                return {
                    color: "text-green-700",
                    bg: "bg-green-50",
                    border: "border-green-300",
                    badge: "success",
                    icon: CheckCircle,
                    iconColor: "text-green-600",
                    gaugeColor: "#22c55e"
                };
            case "moderate":
                return {
                    color: "text-amber-700",
                    bg: "bg-amber-50",
                    border: "border-amber-300",
                    badge: "warning",
                    icon: AlertTriangle,
                    iconColor: "text-amber-600",
                    gaugeColor: "#f59e0b"
                };
            case "poor":
                return {
                    color: "text-orange-700",
                    bg: "bg-orange-50",
                    border: "border-orange-300",
                    badge: "destructive",
                    icon: TrendingDown,
                    iconColor: "text-orange-600",
                    gaugeColor: "#f97316"
                };
            case "severe_drought":
                return {
                    color: "text-red-700",
                    bg: "bg-red-50",
                    border: "border-red-300",
                    badge: "destructive",
                    icon: XCircle,
                    iconColor: "text-red-600",
                    gaugeColor: "#ef4444"
                };
            default:
                return {
                    color: "text-stone-700",
                    bg: "bg-stone-50",
                    border: "border-stone-300",
                    badge: "default",
                    icon: AlertTriangle,
                    iconColor: "text-stone-600",
                    gaugeColor: "#78716c"
                };
        }
    };

    const styles = getSeverityStyles();
    const Icon = styles.icon;

    // Calculate gauge rotation (-90 to 90 degrees, VCI 0-100)
    const rotation = (vci / 100) * 180 - 90;

    return (
        <div className="bg-white rounded-xl p-5 border-2 border-blue-200 shadow-md">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`${styles.bg} rounded-lg p-2`}>
                        <Droplets className={`w-6 h-6 ${styles.iconColor}`} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="font-bold text-stone-900 text-lg">Drought Monitor</h3>
                        <p className="text-sm text-stone-600">VCI Index</p>
                    </div>
                </div>
                <Badge variant={styles.badge as "success" | "warning" | "destructive" | "default"} className="text-sm font-bold px-3 py-1.5">
                    {severity.replace(/_/g, " ").toUpperCase()}
                </Badge>
            </div>

            {/* Circular Gauge */}
            <div className="relative flex justify-center items-center my-6">
                <svg width="200" height="120" viewBox="0 0 200 120">
                    {/* Background arc */}
                    <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="12"
                        strokeLinecap="round"
                    />
                    {/* Colored segments */}
                    <path
                        d="M 20 100 A 80 80 0 0 1 52 48"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="12"
                        strokeLinecap="round"
                    />
                    <path
                        d="M 52 48 A 80 80 0 0 1 100 20"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="12"
                        strokeLinecap="round"
                    />
                    <path
                        d="M 100 20 A 80 80 0 0 1 148 48"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="12"
                        strokeLinecap="round"
                    />
                    <path
                        d="M 148 48 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="12"
                        strokeLinecap="round"
                    />
                    {/* Needle */}
                    <g transform={`rotate(${rotation} 100 100)`}>
                        <line
                            x1="100"
                            y1="100"
                            x2="100"
                            y2="35"
                            stroke={styles.gaugeColor}
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                        <circle cx="100" cy="100" r="6" fill={styles.gaugeColor} />
                    </g>
                </svg>
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
                    <div className="text-center">
                        <div className={`text-4xl font-bold ${styles.color}`}>{vci.toFixed(0)}</div>
                        <div className="text-xs text-stone-600 font-medium">VCI Score</div>
                    </div>
                </div>
            </div>

            {/* Labels */}
            <div className="flex justify-between text-xs font-medium text-stone-600 mb-4">
                <span>Severe</span>
                <span>Moderate</span>
                <span>Good</span>
                <span>Excellent</span>
            </div>

            {/* Current NDVI */}
            <div className={`p-3 ${styles.bg} rounded-lg border-2 ${styles.border} mb-4`}>
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-700">Current NDVI</span>
                    <span className={`text-lg font-bold ${styles.color}`}>{ndvi_current.toFixed(2)}</span>
                </div>
            </div>

            {/* Interpretation */}
            <div className={`p-3 ${styles.bg} rounded-lg border-2 ${styles.border} mb-4`}>
                <div className="flex items-start gap-2">
                    <Icon className={`w-5 h-5 ${styles.iconColor} shrink-0 mt-0.5`} strokeWidth={2.5} />
                    <p className="text-sm font-medium text-stone-800">{interpretation}</p>
                </div>
            </div>

            {/* Recommendations */}
            {recommendations && recommendations.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-stone-900">
                        <Lightbulb className="w-4 h-4 text-amber-600" strokeWidth={2.5} />
                        <span>Recommendations</span>
                    </div>
                    <div className="space-y-2">
                        {recommendations.map((rec, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm text-stone-700 bg-stone-50 p-2 rounded-lg">
                                <div className="w-1.5 h-1.5 bg-amber-600 rounded-full mt-2 shrink-0"></div>
                                <span>{rec}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
