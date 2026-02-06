"use client";

import { AlertTriangle, AlertCircle, Activity, CheckCircle, Smartphone, Calendar, ChevronRight } from "lucide-react";
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
    const getSeverityDetails = (severity: string) => {
        switch (severity.toLowerCase()) {
            case "high":
                return {
                    dot: "bg-stone-800",
                    ring: "ring-rose-200",
                    badge: "bg-rose-100 text-rose-700 hover:bg-rose-200 border-rose-200",
                    iconColor: "text-rose-600",
                    icon: AlertCircle
                };
            case "medium":
                return {
                    dot: "bg-stone-600",
                    ring: "ring-amber-200",
                    badge: "bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200",
                    iconColor: "text-amber-600",
                    icon: AlertTriangle
                };
            case "low":
                return {
                    dot: "bg-stone-400",
                    ring: "ring-emerald-200",
                    badge: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200",
                    iconColor: "text-emerald-600",
                    icon: AlertTriangle
                };
            default:
                return {
                    dot: "bg-stone-300",
                    ring: "ring-stone-200",
                    badge: "bg-stone-100 text-stone-700 hover:bg-stone-200 border-stone-200",
                    iconColor: "text-stone-500",
                    icon: AlertCircle
                };
        }
    };

    return (
        <div className="space-y-6">
            {/* Statistical Analysis Panel - Cleaner Look */}
            {statistics && (
                <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-sm relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1 h-full ${statistics.isAnomaly ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                    <div className="flex items-center gap-3 mb-5">
                        <div className={`p-2 rounded-lg ${statistics.isAnomaly ? 'bg-stone-100' : 'bg-stone-100'}`}>
                            <Activity className={`w-5 h-5 ${statistics.isAnomaly ? 'text-rose-600' : 'text-emerald-600'}`} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-stone-900 text-sm">Statistical Overview</h3>
                            <p className="text-xs text-stone-500 font-medium">
                                {statistics.isAnomaly 
                                    ? `Anomaly Detected · ${statistics.sigma.toFixed(1)}σ Deviation` 
                                    : "Normal Pattern Detected"}
                            </p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-6 px-1">
                        <div>
                            <div className="text-[10px] uppercase font-bold text-stone-400 tracking-wider mb-1">Mean</div>
                            <div className="text-xl font-bold text-stone-900">{statistics.mean.toFixed(2)}</div>
                        </div>
                        <div>
                            <div className="text-[10px] uppercase font-bold text-stone-400 tracking-wider mb-1">Std Dev</div>
                            <div className="text-xl font-bold text-stone-900">{statistics.stdDev.toFixed(2)}</div>
                        </div>
                        <div>
                            <div className="text-[10px] uppercase font-bold text-stone-400 tracking-wider mb-1">Status</div>
                            <div className={`text-xl font-bold ${statistics.isAnomaly ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {statistics.sigma.toFixed(1)}σ
                            </div>
                        </div>
                    </div>
                    
                    {statistics.message && (
                        <div className="mt-5 pt-4 border-t border-stone-100">
                             <p className="text-sm text-stone-600 leading-relaxed italic border-l-2 border-stone-300 pl-3">{statistics.message}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Timeline Alerts */}
            {alerts.length === 0 ? (
                <div className="py-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200">
                    <CheckCircle className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                    <p className="text-stone-500 font-medium text-sm">No active alerts</p>
                </div>
            ) : (
                <div className="relative pl-4 space-y-0">
                    {/* Vertical Timeline Line */}
                    <div className="absolute left-[19px] top-2 bottom-4 w-0.5 bg-stone-200"></div>

                    {alerts.map((alert, idx) => {
                        const styles = getSeverityDetails(alert.severity);
                        const date = new Date(alert.detected_at);
                        
                        return (
                            <div key={alert.id} className="relative pl-10 pb-8 last:pb-0 group">
                                {/* Timeline Dot */}
                                <div className={`absolute left-[14px] top-1.5 w-3 h-3 rounded-full ${styles.dot} ring-4 ${styles.ring} z-10 transition-transform group-hover:scale-110`}></div>
                                
                                {/* Content Card */}
                                <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                        <div>
                                            <span className="flex items-center gap-2 text-xs font-bold text-stone-400 mb-2">
                                                <Calendar className="w-3 h-3" />
                                                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge className={`border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles.badge}`}>
                                                    {alert.severity}
                                                </Badge>
                                                <h4 className="font-bold text-sm text-stone-800">
                                                    Alert
                                                </h4>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <p className="text-stone-600 text-sm leading-relaxed">
                                        {alert.message}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
