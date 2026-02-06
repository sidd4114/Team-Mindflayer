"use client";

import { Layers, RefreshCw, TrendingUp, TrendingDown, Minus, Package, Sparkles, CheckCircle2, AlertCircle, Map as MapIcon, Info } from "lucide-react";
import { Badge } from "./ui/badge";
import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
// Removed import L from "leaflet" to avoid SSR window error

// Dynamically import map component with no SSR
const ZoneMap = dynamic(() => import("./ZoneMap"), { 
    ssr: false,
    loading: () => (
        <div className="bg-stone-900 rounded-xl overflow-hidden shadow-inner border border-stone-800 relative z-0 h-[400px] flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-stone-600 border-t-stone-400 rounded-full"></div>
        </div>
    )
});

interface Zone {
    zoneNumber: number;
    zoneType: "low" | "medium" | "high";
    avgNdvi: number;
    geometry?: { type: string; coordinates: number[][][] | number[][][][] }; // Better typing for GeoJSON
    recommendations: {
        nitrogen: number;
        phosphorus: number;
        potassium: number;
    };
}

interface ManagementZonesProps {
    zones: Zone[];
    analysisDate: string;
    polygon?: [number, number][];
    onRegenerate?: () => void;
    isRegenerating?: boolean;
}

// Helper to auto-fit map bounds - REMOVED (moved to ZoneMap.tsx)

export default function ManagementZones({ zones, analysisDate, polygon, onRegenerate, isRegenerating = false }: ManagementZonesProps) {
    const [activeTab, setActiveTab] = useState<'list' | 'map'>('map');

    // Calculate map bounds for Leaflet
    const leafletBounds = useMemo(() => {
        if (!polygon || polygon.length === 0) return null;
        // polygon is [lat, lng]
        const lats = polygon.map(p => p[0]);
        const lngs = polygon.map(p => p[1]);
        return [
            [Math.min(...lats), Math.min(...lngs)],
            [Math.max(...lats), Math.max(...lngs)]
        ] as any; // Cast as any to avoid L type dependency which requires window
    }, [polygon]);



    const getZoneStyles = (type: string) => {
        switch (type) {
            case "high":
                return {
                    bg: "bg-gradient-to-br from-emerald-50 to-green-50",
                    border: "border-emerald-400",
                    text: "text-emerald-800",
                    headerBg: "bg-emerald-100",
                    icon: TrendingUp,
                    iconColor: "text-emerald-600",
                    badge: "success",
                    strategyIcon: CheckCircle2,
                    strategyBg: "bg-emerald-100",
                    strategyText: "text-emerald-700",
                    mapFill: "#86efac",
                    mapStroke: "#16a34a"
                };
            case "medium":
                return {
                    bg: "bg-gradient-to-br from-amber-50 to-yellow-50",
                    border: "border-amber-400",
                    text: "text-amber-800",
                    headerBg: "bg-amber-100",
                    icon: Minus,
                    iconColor: "text-amber-600",
                    badge: "warning",
                    strategyIcon: Sparkles,
                    strategyBg: "bg-amber-100",
                    strategyText: "text-amber-700",
                    mapFill: "#fcd34d",
                    mapStroke: "#f59e0b"
                };
            case "low":
                return {
                    bg: "bg-gradient-to-br from-red-50 to-rose-50",
                    border: "border-red-400",
                    text: "text-red-800",
                    headerBg: "bg-red-100",
                    icon: TrendingDown,
                    iconColor: "text-red-600",
                    badge: "destructive",
                    strategyIcon: AlertCircle,
                    strategyBg: "bg-red-100",
                    strategyText: "text-red-700",
                    mapFill: "#fecaca",
                    mapStroke: "#dc2626"
                };
            default:
                return {
                    bg: "bg-gradient-to-br from-stone-50 to-gray-50",
                    border: "border-stone-400",
                    text: "text-stone-800",
                    headerBg: "bg-stone-100",
                    icon: Minus,
                    iconColor: "text-stone-600",
                    badge: "default",
                    strategyIcon: Sparkles,
                    strategyBg: "bg-stone-100",
                    strategyText: "text-stone-700",
                    mapFill: "#e7e5e4",
                    mapStroke: "#78716c"
                };
        }
    };

    return (
        <div className="bg-white rounded-xl p-4 sm:p-6 border-2 border-purple-300 shadow-lg w-full">
            {/* Header - Responsive */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                    <div className="bg-linear-to-br from-purple-100 to-purple-200 rounded-xl p-3 shadow-sm shrink-0">
                        <Layers className="w-6 h-6 sm:w-7 sm:h-7 text-purple-700" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="font-bold text-stone-900 text-lg sm:text-xl">Management Zones</h3>
                        <p className="text-xs sm:text-sm text-stone-600 font-medium">Variable Rate Application</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    {onRegenerate && (
                        <button
                            onClick={onRegenerate}
                            disabled={isRegenerating}
                            className={`flex items-center justify-center gap-2 px-4 py-2.5 bg-linear-to-r from-purple-600 to-purple-700 text-white rounded-xl font-bold text-sm hover:from-purple-700 hover:to-purple-800 transition-all shadow-md hover:shadow-lg active:scale-95 ${isRegenerating ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} strokeWidth={2.5} />
                            {isRegenerating ? 'Regenerating...' : 'Reload Zones'}
                        </button>
                    )}
                </div>
            </div>

            {/* View Toggles */}
            <div className="flex gap-2 mb-4 p-1 bg-stone-100 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('map')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'map'
                            ? 'bg-white text-stone-800 shadow-sm'
                            : 'text-stone-500 hover:text-stone-700'
                        }`}
                >
                    <MapIcon className="w-4 h-4" />
                    Map View
                </button>
                <button
                    onClick={() => setActiveTab('list')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'list'
                            ? 'bg-white text-stone-800 shadow-sm'
                            : 'text-stone-500 hover:text-stone-700'
                        }`}
                >
                    <Layers className="w-4 h-4" />
                    Zone Details
                </button>
            </div>

            {/* Analysis Date */}
            <div className="flex items-center gap-2 mb-5 px-3 py-2 bg-stone-100 rounded-lg border border-stone-200">
                <span className="text-xs sm:text-sm font-medium text-stone-600">Analysis Date:</span>
                <span className="text-xs sm:text-sm font-bold text-stone-900">
                    {new Date(analysisDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    })}
                </span>
            </div>

            {zones.length === 0 ? (
                <div className="text-center py-12 text-stone-500">
                    <Layers className="w-16 h-16 mx-auto mb-4 opacity-40" />
                    <p className="font-bold text-lg mb-1">No management zones generated</p>
                    <p className="text-sm">Generate zones to see productivity areas</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Map Visualization */}
                    {activeTab === 'map' && leafletBounds && polygon && (
                        <ZoneMap 
                             leafletBounds={leafletBounds}
                             polygon={polygon}
                             zones={zones}
                        />
                    )}

                    {activeTab === 'list' && zones.map((zone) => {
                        const styles = getZoneStyles(zone.zoneType);
                        const Icon = styles.icon;
                        const StrategyIcon = styles.strategyIcon;

                        return (
                            <div key={zone.zoneNumber} className={`${styles.bg} rounded-xl p-4 sm:p-5 border-2 ${styles.border} shadow-md hover:shadow-lg transition-shadow`}>
                                {/* Zone Header - Responsive */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`${styles.headerBg} rounded-lg p-2 shrink-0`}>
                                            <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${styles.iconColor}`} strokeWidth={2.5} />
                                        </div>
                                        <span className={`font-bold text-base sm:text-lg ${styles.text}`}>
                                            Zone {zone.zoneNumber}: {zone.zoneType.toUpperCase()}
                                        </span>
                                    </div>
                                    <Badge variant={styles.badge as "success" | "warning" | "destructive" | "default"} className="font-bold text-xs sm:text-sm px-3 py-1 w-fit">
                                        NDVI: {zone.avgNdvi.toFixed(2)}
                                    </Badge>
                                </div>

                                {/* Fertilizer Recommendations - Responsive Grid */}
                                <div className="bg-white rounded-xl p-3 sm:p-4 border-2 border-stone-300 shadow-sm mb-3">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Package className="w-4 h-4 sm:w-5 sm:h-5 text-stone-700 shrink-0" strokeWidth={2.5} />
                                        <span className="text-xs sm:text-sm font-bold text-stone-800 uppercase tracking-wide">Fertilizer Application (kg/ha)</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                        {/* Nitrogen */}
                                        <div className="text-center p-2 sm:p-3 bg-linear-to-br from-blue-50 to-blue-100 rounded-lg sm:rounded-xl border-2 border-blue-300 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="text-[10px] sm:text-xs text-blue-700 font-bold mb-1 uppercase tracking-wide">Nitrogen (N)</div>
                                            <div className="text-xl sm:text-2xl md:text-3xl font-black text-blue-800">{zone.recommendations.nitrogen}</div>
                                        </div>

                                        {/* Phosphorus */}
                                        <div className="text-center p-2 sm:p-3 bg-linear-to-br from-orange-50 to-orange-100 rounded-lg sm:rounded-xl border-2 border-orange-300 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="text-[10px] sm:text-xs text-orange-700 font-bold mb-1 uppercase tracking-wide">Phosphorus (P)</div>
                                            <div className="text-xl sm:text-2xl md:text-3xl font-black text-orange-800">{zone.recommendations.phosphorus}</div>
                                        </div>

                                        {/* Potassium */}
                                        <div className="text-center p-2 sm:p-3 bg-linear-to-br from-purple-50 to-purple-100 rounded-lg sm:rounded-xl border-2 border-purple-300 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="text-[10px] sm:text-xs text-purple-700 font-bold mb-1 uppercase tracking-wide">Potassium (K)</div>
                                            <div className="text-xl sm:text-2xl md:text-3xl font-black text-purple-800">{zone.recommendations.potassium}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Strategy Info - Responsive */}
                                <div className={`${styles.strategyBg} rounded-lg px-3 py-2.5 border-2 ${styles.border}`}>
                                    <div className={`flex items-center gap-2 ${styles.strategyText}`}>
                                        <StrategyIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" strokeWidth={2.5} />
                                        <span className="text-xs sm:text-sm font-bold">
                                            {zone.zoneType === "low" && "Higher fertilizer to boost productivity"}
                                            {zone.zoneType === "medium" && "Balanced application for steady growth"}
                                            {zone.zoneType === "high" && "Lower rates to prevent over-fertilization"}
                                        </span>
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
