"use client";

import { AlertTriangle, AlertCircle, Activity, CheckCircle } from "lucide-react";
import { Badge } from "./ui/badge";

interface Alert {
    id: string;
    type: string;
    severity: string;
    message: string;
    detected_at: string;
}

interface Statistics {
    isAnomaly: boolean;
    sigma: number;
    mean: number;
    stdDev: number;
    message: string;
}

interface EnhancedAlertsProps {
    alerts: Alert[];
    statistics?: Statistics;
}

export default function EnhancedAlerts({ alerts, statistics }: EnhancedAlertsProps) {
    const getSeverityStyles = (severity: string) => {
        switch (severity.toLowerCase()) {
            case "high":
                return {
                    bg: "bg-red-50",
                    border: "border-red-300",
                    text: "text-red-700",
                    badge: "destructive",
                    icon: AlertCircle
                };
            case "medium":
                return {
                    bg: "bg-amber-50",
                    border: "border-amber-300",
                    text: "text-amber-700",
                    badge: "warning",
                    icon: AlertTriangle
                };
            case "low":
                return {
                    bg: "bg-yellow-50",
                    border: "border-yellow-300",
                    text: "text-yellow-700",
                    badge: "warning",
                    icon: AlertTriangle
                };
            default:
                return {
                    bg: "bg-stone-50",
                    border: "border-stone-300",
                    text: "text-stone-700",
                    badge: "default",
                    icon: AlertCircle
                };
        }
    };

    return (
        <div className="space-y-4">
            {/* Statistical Analysis Panel */}
            {statistics && (
                <div className={`rounded-xl p-4 border-2 ${statistics.isAnomaly ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Activity className={`w-5 h-5 ${statistics.isAnomaly ? 'text-red-600' : 'text-green-600'}`} strokeWidth={2.5} />
                            <span className="font-bold text-stone-900">Statistical Analysis</span>
                        </div>
                        <Badge variant={statistics.isAnomaly ? "destructive" : "success"} className="font-bold">
                            {statistics.isAnomaly ? `${statistics.sigma.toFixed(1)}σ` : "Normal"}
                        </Badge>
                    </div>
                    
                    <p className={`text-sm font-medium mb-3 ${statistics.isAnomaly ? 'text-red-700' : 'text-green-700'}`}>
                        {statistics.message}
                    </p>

                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white rounded-lg p-2 border border-stone-200">
                            <div className="text-xs text-stone-600 font-medium">Mean</div>
                            <div className="text-base font-bold text-stone-900">{statistics.mean.toFixed(2)}</div>
                        </div>
                        <div className="bg-white rounded-lg p-2 border border-stone-200">
                            <div className="text-xs text-stone-600 font-medium">Std Dev (σ)</div>
                            <div className="text-base font-bold text-stone-900">{statistics.stdDev.toFixed(2)}</div>
                        </div>
                        <div className={`rounded-lg p-2 border ${statistics.isAnomaly ? 'bg-red-100 border-red-300' : 'bg-green-100 border-green-300'}`}>
                            <div className={`text-xs font-medium ${statistics.isAnomaly ? 'text-red-600' : 'text-green-600'}`}>Deviation</div>
                            <div className={`text-base font-bold ${statistics.isAnomaly ? 'text-red-700' : 'text-green-700'}`}>
                                {statistics.sigma.toFixed(1)}σ
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Alerts List */}
            {alerts.length === 0 ? (
                <div className="bg-green-50 rounded-xl p-6 border-2 border-green-300 text-center">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" strokeWidth={2} />
                    <p className="font-bold text-green-700 text-lg mb-1">All Clear! ✓</p>
                    <p className="text-sm text-green-600">No active alerts for this field</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {alerts.map((alert) => {
                        const styles = getSeverityStyles(alert.severity);
                        const Icon = styles.icon;
                        
                        return (
                            <div key={alert.id} className={`${styles.bg} rounded-lg p-4 border-2 ${styles.border}`}>
                                <div className="flex items-start gap-3">
                                    <Icon className={`w-5 h-5 ${styles.text} shrink-0 mt-0.5`} strokeWidth={2.5} />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge variant={styles.badge as "success" | "warning" | "destructive" | "default"} className="text-xs font-bold uppercase">
                                                {alert.severity}
                                            </Badge>
                                            <span className="text-xs text-stone-600 font-medium">
                                                {new Date(alert.detected_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                        <p className={`text-sm font-medium ${styles.text}`}>{alert.message}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
