"use client";

import { Layers, Download, TrendingUp, TrendingDown, Minus, Package, Sparkles, CheckCircle2, AlertCircle, Map as MapIcon } from "lucide-react";
import { Badge } from "./ui/badge";
import { useState, useMemo } from "react";

interface Zone {
    zoneNumber: number;
    zoneType: "low" | "medium" | "high";
    avgNdvi: number;
    geometry?: { type: string; coordinates: any[] };
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
    onExportVRA?: () => void;
    onExportGeojson?: () => void;
}

export default function ManagementZones({ zones, analysisDate, polygon, onExportVRA, onExportGeojson }: ManagementZonesProps) {
    const [activeTab, setActiveTab] = useState<'list' | 'map'>('map');

    // Calculate map bounds
    const mapBounds = useMemo(() => {
        if (!polygon || polygon.length === 0) return null;
        const lats = polygon.map(p => p[0]);
        const lngs = polygon.map(p => p[1]);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        // Add padding
        const latPadding = (maxLat - minLat) * 0.1;
        const lngPadding = (maxLng - minLng) * 0.1;

        return {
            minLat: minLat - latPadding,
            maxLat: maxLat + latPadding,
            minLng: minLng - lngPadding,
            maxLng: maxLng + lngPadding
        };
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
                    <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl p-3 shadow-sm shrink-0">
                        <Layers className="w-6 h-6 sm:w-7 sm:h-7 text-purple-700" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="font-bold text-stone-900 text-lg sm:text-xl">Management Zones</h3>
                        <p className="text-xs sm:text-sm text-stone-600 font-medium">Variable Rate Application</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    {onExportVRA && (
                        <button
                            onClick={onExportVRA}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-bold text-sm hover:from-purple-700 hover:to-purple-800 transition-all shadow-md hover:shadow-lg active:scale-95"
                        >
                            <Download className="w-4 h-4" strokeWidth={2.5} />
                            Export VRA
                        </button>
                    )}
                    {onExportGeojson && (
                        <button
                            onClick={onExportGeojson}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-md hover:shadow-lg active:scale-95"
                        >
                            <Download className="w-4 h-4" strokeWidth={2.5} />
                            GeoJSON
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
                    {activeTab === 'map' && mapBounds && (
                        <div className="bg-stone-900 rounded-xl overflow-hidden shadow-inner aspect-[4/3] relative mb-4">
                            <div className="absolute inset-0 flex items-center justify-center">
                                <svg
                                    className="w-full h-full"
                                    viewBox="0 0 100 100"
                                    preserveAspectRatio="none"
                                >
                                    {/* Grid background effect */}
                                    <defs>
                                        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                                        </pattern>
                                    </defs>
                                    <rect width="100%" height="100%" fill="url(#grid)" />

                                    {/* Zones */}
                                    {zones.map((zone, idx) => {
                                        if (!zone.geometry) return null;

                                        // Handle stringified geometry (common from Supabase/PostGIS)
                                        let geometry = zone.geometry;
                                        if (typeof geometry === 'string') {
                                            try {
                                                geometry = JSON.parse(geometry);
                                            } catch (e) {
                                                console.error('Failed to parse zone geometry', e);
                                                return null;
                                            }
                                        }

                                        // Handle both Polygon and MultiPolygon
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        const polygonsToRender: number[][][] = [];

                                        if (geometry.type === 'Polygon') {
                                            if (geometry.coordinates?.[0]) {
                                                polygonsToRender.push(geometry.coordinates[0]);
                                            }
                                        } else if (geometry.type === 'MultiPolygon') {
                                            geometry.coordinates?.forEach((poly: any[]) => {
                                                if (poly?.[0]) polygonsToRender.push(poly[0]);
                                            });
                                        }

                                        if (polygonsToRender.length === 0) return null;

                                        const style = getZoneStyles(zone.zoneType);

                                        return polygonsToRender.map((ring, ringIdx) => {
                                            const points = ring.map((coord: number[]) => {
                                                // GeoJSON is [lng, lat]
                                                // mapBounds is based on field polygon which was convert to [lat, lng]
                                                // So mapBounds minLng/maxLng match coord[0]
                                                const x = ((coord[0] - mapBounds.minLng) / (mapBounds.maxLng - mapBounds.minLng)) * 100;
                                                const y = ((mapBounds.maxLat - coord[1]) / (mapBounds.maxLat - mapBounds.minLat)) * 100;
                                                return `${x},${y}`;
                                            }).join(' ');

                                            return (
                                                <polygon
                                                    key={`map-zone-${idx}-${ringIdx}`}
                                                    points={points}
                                                    fill={style.mapFill}
                                                    stroke={style.mapStroke}
                                                    strokeWidth="0.5"
                                                    opacity="0.8"
                                                    className="hover:opacity-100 transition-opacity cursor-pointer"
                                                >
                                                    <title>Zone {zone.zoneNumber}: {zone.zoneType.toUpperCase()}</title>
                                                </polygon>
                                            );
                                        });
                                    })}

                                    {/* Field Boundary */}
                                    {polygon && (
                                        <polygon
                                            points={polygon.map((p) => {
                                                const x = ((p[1] - mapBounds.minLng) / (mapBounds.maxLng - mapBounds.minLng)) * 100;
                                                const y = ((mapBounds.maxLat - p[0]) / (mapBounds.maxLat - mapBounds.minLat)) * 100;
                                                return `${x},${y}`;
                                            }).join(' ')}
                                            fill="none"
                                            stroke="white"
                                            strokeWidth="0.8"
                                            strokeDasharray="2,2"
                                            opacity="0.6"
                                        />
                                    )}
                                </svg>

                                {/* Legend Overlay */}
                                <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md rounded-lg p-3 border border-white/10">
                                    <div className="text-[10px] text-stone-300 font-bold uppercase mb-2">Zone Productivity</div>
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-sm bg-[#86efac] border border-[#16a34a]"></div>
                                            <span className="text-xs text-stone-200">High</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-sm bg-[#fcd34d] border border-[#f59e0b]"></div>
                                            <span className="text-xs text-stone-200">Medium</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-sm bg-[#fecaca] border border-[#dc2626]"></div>
                                            <span className="text-xs text-stone-200">Low</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
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
                                        <div className="text-center p-2 sm:p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg sm:rounded-xl border-2 border-blue-300 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="text-[10px] sm:text-xs text-blue-700 font-bold mb-1 uppercase tracking-wide">Nitrogen (N)</div>
                                            <div className="text-xl sm:text-2xl md:text-3xl font-black text-blue-800">{zone.recommendations.nitrogen}</div>
                                        </div>

                                        {/* Phosphorus */}
                                        <div className="text-center p-2 sm:p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg sm:rounded-xl border-2 border-orange-300 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="text-[10px] sm:text-xs text-orange-700 font-bold mb-1 uppercase tracking-wide">Phosphorus (P)</div>
                                            <div className="text-xl sm:text-2xl md:text-3xl font-black text-orange-800">{zone.recommendations.phosphorus}</div>
                                        </div>

                                        {/* Potassium */}
                                        <div className="text-center p-2 sm:p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg sm:rounded-xl border-2 border-purple-300 shadow-sm hover:shadow-md transition-shadow">
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
