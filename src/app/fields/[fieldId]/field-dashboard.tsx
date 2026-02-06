"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import NDVIChart from "@/components/NDVIChart";
import VCIGauge from "@/components/VCIGauge";
import ManagementZones from "@/components/ManagementZones";
import HistoricalBenchmark from "@/components/HistoricalBenchmark";
import EnhancedAlerts from "@/components/EnhancedAlerts";
import AnalyzeButton from "../analyze-button";
import FieldGuidance from "@/components/FieldGuidance";
import { useI18n } from "@/contexts/I18nContext";
import { Calendar, MapPin, TrendingUp, AlertCircle, CheckCircle2, AlertTriangle, XCircle, Mountain, Lightbulb, Droplets, Leaf, Zap, Waves, Sprout, FlaskConical, Activity, Download, RefreshCw, Layers, Navigation, ChevronLeft, ChevronUp, ChevronDown } from "lucide-react";

const DATE_LOCALE = "en-US";

const CHART_HEIGHT = 220;
const CHART_MIN_WIDTH = 400;

const MAIN_INDICES = [
    { id: "ndvi", labelKey: "fieldDetail.cropHealth", descKey: "fieldDetail.cropHealthDesc", Icon: Leaf },
    { id: "arvi", labelKey: "fieldDetail.cropHealth", descKey: "fieldDetail.cropHealthDesc", Icon: Activity },
] as const;

const INDEX_DESCRIPTIONS: Record<string, string> = {
    ndvi: "fieldDetail.cropHealthDesc",
    arvi: "fieldDetail.cropHealthDesc",
    ndwi: "fieldDetail.cropHealthDesc",
    evi: "fieldDetail.cropHealthDesc",
    ndmi: "fieldDetail.cropHealthDesc",
    ndre: "fieldDetail.cropHealthDesc",
};

const MORE_INDICES = [
    { id: "ndwi", label: "NDWI", Icon: Droplets },
    { id: "evi", label: "EVI", Icon: Sprout },
    { id: "ndmi", label: "NDMI", Icon: Waves },
] as const;

interface FieldInfo {
    name: string;
    crop_type: string;
    planting_date: string | null;
}

interface FieldDashboardProps {
    fieldId: string;
    fieldInfo: FieldInfo;
    polygon: [number, number][];
    readings: any[];
    alerts?: any[];
    vciData?: any;
    managementZones?: any[];
    managementZoneDate?: string;
    benchmarkData?: any;
    statisticalData?: any;
}

export default function FieldDashboard({ 
    fieldId, 
    fieldInfo,
    polygon, 
    readings,
    alerts = [],
    vciData,
    managementZones = [],
    managementZoneDate,
    benchmarkData,
    statisticalData
}: FieldDashboardProps) {
    const router = useRouter();
    const { t } = useI18n();
    const [mapUrl, setMapUrl] = useState<string | null>(null);
    const [mapLoading, setMapLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [mapBounds, setMapBounds] = useState<{ minLat: number; maxLat: number; minLng: number; maxLng: number } | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<string>("ndvi");
    const [terrainData, setTerrainData] = useState<{
        elevation: { min: number; max: number };
        slope: { mean: number };
        risks: { waterlogging: string; runoff: string; erosion: string };
        recommendations: string[];
    } | null>(null);
    const [sarData, setSarData] = useState<{ moistureLevel: string; message: string; advantages: string[] } | null>(null);
    const [terrainLoading, setTerrainLoading] = useState(true);
    const [terrainError, setTerrainError] = useState<string | null>(null);
    const [generatingZones, setGeneratingZones] = useState(false);
    const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);

    // Async data states
    const [vciDataState, setVciDataState] = useState<any>(vciData);
    const [vciLoading, setVciLoading] = useState(!vciData);
    const [benchmarkDataState, setBenchmarkDataState] = useState<any>(benchmarkData);
    const [benchmarkLoading, setBenchmarkLoading] = useState(!benchmarkData);

    // Fetch VCI data client-side if not provided
    useEffect(() => {
        if (!vciData) {
            setVciLoading(true);
            fetch(`/api/fields/${fieldId}/vci`)
                .then(res => {
                    if (res.ok) return res.json();
                    throw new Error("Failed to fetch VCI");
                })
                .then(data => {
                    if (data && !data.error) {
                        setVciDataState({
                            vci: data.vci || data.vci_mean, // handle structure variations
                            ndvi_current: data.ndvi_current,
                            severity: data.severity,
                            interpretation: data.interpretation,
                            recommendations: data.recommendations || []
                        });
                    }
                })
                .catch(e => console.log("VCI fetch skipped/failed:", e))
                .finally(() => setVciLoading(false));
        } else {
            setVciDataState(vciData);
            setVciLoading(false);
        }
    }, [fieldId, vciData]);

    // Fetch Benchmark data client-side if not provided
    useEffect(() => {
        if (!benchmarkData) {
            setBenchmarkLoading(true);
            fetch(`/api/fields/${fieldId}/benchmark`)
                .then(res => {
                    if (res.ok) return res.json();
                    throw new Error("Failed to fetch benchmark");
                })
                .then(data => {
                    if (data && !data.error && data.comparison_years) {
                        setBenchmarkDataState(data);
                    }
                })
                .catch(e => console.log("Benchmark fetch skipped/failed:", e))
                .finally(() => setBenchmarkLoading(false));
        } else {
            setBenchmarkDataState(benchmarkData);
            setBenchmarkLoading(false);
        }
    }, [fieldId, benchmarkData]);

    useEffect(() => {
        if (readings.length > 0) {
            const latest = readings[readings.length - 1];
            setSelectedDate(latest.date);
        }
    }, [readings]);

    const uniqueDates = Array.from(new Set(readings.map((r) => r.date)));

    useEffect(() => {
        async function fetchTerrain() {
            setTerrainLoading(true);
            setTerrainError(null);
            try {
                const res = await fetch(`/api/fields/${fieldId}/terrain`);
                if (res.ok) {
                    const data = await res.json();
                    setTerrainData(data);
                } else {
                    const err = await res.json();
                    setTerrainError(err.error || `HTTP ${res.status}`);
                }
            } catch (e) {
                setTerrainError(e instanceof Error ? e.message : "Network error");
            } finally {
                setTerrainLoading(false);
            }
        }
        fetchTerrain();
    }, [fieldId]);

    useEffect(() => {
        if (!selectedDate) return;
        async function fetchSAR() {
            try {
                const res = await fetch(`/api/fields/${fieldId}/sar-moisture?date=${selectedDate}`);
                if (res.ok) {
                    const data = await res.json();
                    setSarData(data);
                }
            } catch {
                // ignore
            }
        }
        fetchSAR();
    }, [fieldId, selectedDate]);

    useEffect(() => {
        if (!selectedDate) return;
        async function fetchMap() {
            setMapLoading(true);
            try {
                const res = await fetch(`/api/fields/${fieldId}/map?date=${selectedDate}&index=${selectedIndex}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.url) {
                        setMapUrl(`${data.url}&t=${Date.now()}`);
                        setMapBounds(data.bounds);
                    } else setMapUrl(null);
                } else setMapUrl(null);
            } catch {
                setMapUrl(null);
            } finally {
                setMapLoading(false);
            }
        }
        fetchMap();
    }, [fieldId, selectedDate, selectedIndex]);

    const chartData = readings.map((r) => ({ date: r.date, mean: r.ndvi_mean ?? 0 }));
    const latestReading = readings[readings.length - 1];

    // Handle Generate Zones
    const handleGenerateZones = async () => {
        setGeneratingZones(true);
        try {
            const res = await fetch(`/api/fields/${fieldId}/management-zones`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: new Date().toISOString(), threshold: 0.1 })
            });
            if (res.ok) {
                router.refresh();
            }
        } catch (e) {
            console.error('Generate zones error:', e);
        } finally {
            setGeneratingZones(false);
        }
    };

    // Handle Export VRA (JSON)
    const handleExportVRA = async () => {
        try {
            const res = await fetch(`/api/fields/${fieldId}/management-zones?format=vra`);
            if (res.ok) {
                const vraMap = await res.json();
                const blob = new Blob([JSON.stringify(vraMap, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `vra-map-${fieldId}-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (e) {
            console.error('Export VRA error:', e);
        }
    };

    // Handle Export GeoJSON (for tractor/GIS; uses export route for correct filename)
    const handleExportGeojson = async () => {
        try {
            const res = await fetch(`/api/fields/${fieldId}/management-zones/export`, { credentials: 'include' });
            if (res.ok) {
                const disposition = res.headers.get('Content-Disposition');
                const match = disposition?.match(/filename="(.+?)"/);
                const filename = match?.[1] ?? `management-zones-${fieldId}.geojson`;
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (e) {
            console.error('Export GeoJSON error:', e);
        }
    };
    const healthScore = latestReading?.ndvi_mean || 0;
    const healthStatus = healthScore >= 0.7 ? 'Healthy' : healthScore >= 0.4 ? 'Moderate' : 'High Stress';
    const healthColor = healthScore >= 0.7 ? 'bg-green-100 text-green-700 border-green-300' :
        healthScore >= 0.4 ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
            'bg-red-100 text-red-700 border-red-300';
    const HealthIcon = healthScore >= 0.7 ? CheckCircle2 : healthScore >= 0.4 ? AlertTriangle : XCircle;
    const healthIconColor = healthScore >= 0.7 ? 'text-green-600' : healthScore >= 0.4 ? 'text-yellow-600' : 'text-red-600';
    const statusColor = healthScore >= 0.7 ? "green" : healthScore >= 0.4 ? "amber" : "red";
    const StatusIcon = HealthIcon;

    const centerLat = polygon.length ? polygon.reduce((s, p) => s + p[0], 0) / polygon.length : 0;
    const centerLng = polygon.length ? polygon.reduce((s, p) => s + p[1], 0) / polygon.length : 0;

    return (
        <div className="max-w-2xl mx-auto px-4 space-y-5">
            {/* Compact app-style header row: chevron + title, same bg as page */}
            <header className="flex items-center gap-3 py-2 -mx-1">
                <Link
                    href="/fields"
                    className="flex items-center justify-center min-w-[44px] min-h-[44px] text-slate-700 active:opacity-70"
                    aria-label={t("fields.backToFields", "Back to Fields")}
                >
                    <ChevronLeft className="w-6 h-6 shrink-0" strokeWidth={2} />
                </Link>
                <span className="text-sm font-medium text-slate-600">
                    {t("fieldDetail.pageTitle", "Field Details")}
                </span>
            </header>

            {/* Field name, crop, planting date */}
            <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                    {fieldInfo.name}
                </h1>
                <p className="text-slate-600 text-sm mt-1">
                    {t("fieldDetail.crop", "Crop")}: {fieldInfo.crop_type}
                    {fieldInfo.planting_date && (
                        <> • {t("fieldDetail.planted", "Planted")}: {fieldInfo.planting_date}</>
                    )}
                </p>
            </section>

            {/* Active alerts (compact) */}
            {alerts.length > 0 && (
                <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-900">
                        {alerts[0].message}
                    </p>
                    {alerts.length > 1 && (
                        <p className="text-xs text-amber-700 mt-1">+{alerts.length - 1} more</p>
                    )}
                </div>
            )}

            {/* Date & location */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#6B7B3F]" strokeWidth={2.5} />
                    <select
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-900 text-base cursor-pointer focus:border-[#6B7B3F] focus:outline-none min-h-[44px]"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    >
                        {uniqueDates.slice().reverse().map((date) => (
                            <option key={date} value={date}>
                                {new Date(date).toLocaleDateString(DATE_LOCALE, {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                })}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-2 text-slate-600 text-sm">
                    <MapPin className="w-4 h-4 shrink-0" strokeWidth={2} />
                    <span>{centerLat.toFixed(4)}° N, {centerLng.toFixed(4)}° E</span>
                </div>
            </div>

            {/* GPS-guided navigation to field center */}
            <section className="bg-white rounded-2xl border border-slate-200/80 p-4">
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-[#6B7B3F]" strokeWidth={2} />
                    {t("fieldDetail.guideToField", "Guide me to field")}
                </h2>
                <div className="mt-3">
                    <FieldGuidance
                        target={{ lat: centerLat, lng: centerLng }}
                        targetLabel={t("fieldDetail.fieldCenter", "Field center")}
                    />
                </div>
            </section>

            {/* Health: Is my crop okay? – one status prominent */}
            <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <h2 className="text-base font-semibold text-slate-900 px-5 pt-5 pb-2">
                    {t("fieldDetail.isMyCropOk", "Is my crop okay?")}
                </h2>
                <div className="p-5 pt-2 flex flex-col sm:flex-row gap-4">
                    {/* Current status – prominent */}
                    <div
                        className={`flex-1 flex items-center gap-4 p-4 rounded-xl border-2 ${
                            statusColor === "green"
                                ? "bg-emerald-50 border-emerald-300"
                                : statusColor === "amber"
                                  ? "bg-amber-50 border-amber-300"
                                  : "bg-red-50 border-red-300"
                        }`}
                    >
                        <div
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                                statusColor === "green"
                                    ? "bg-emerald-500"
                                    : statusColor === "amber"
                                      ? "bg-amber-500"
                                      : "bg-red-500"
                            }`}
                        >
                            <StatusIcon className="w-8 h-8 text-white" strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col items-center gap-2 p-2.5 bg-amber-50 rounded-lg border-2 border-amber-200">
                            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-white" strokeWidth={2.5} />
                            </div>
                            <span className="text-xs font-bold text-amber-700">Moderate</span>
                        </div>
                        <div className="flex flex-col items-center gap-2 p-2.5 bg-green-50 rounded-lg border-2 border-green-200">
                            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={2.5} />
                            </div>
                            <span className="text-xs font-bold text-green-700">Healthy</span>
                        </div>
                    </div>
                </div>

                {/* Satellite Map */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="aspect-square bg-gray-900 relative">
                        {mapLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center text-white">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-3"></div>
                                    <span className="text-sm">Loading satellite image...</span>
                                </div>
                            </div>
                        ) : mapUrl ? (
                            <>
                                <div className="absolute inset-0 overflow-hidden">
                                    <img 
                                        src={mapUrl} 
                                        alt="Field Sentinel Map" 
                                        className="w-full h-full object-cover"
                                        style={{
                                            transform: 'scale(3)',
                                            transformOrigin: 'center center'
                                        }}
                                    />
                                </div>
                                {/* Field Boundary & Zone Overlays */}
                                {mapBounds && (
                                    <svg 
                                        className="absolute inset-0 w-full h-full pointer-events-none" 
                                        viewBox="0 0 100 100" 
                                        preserveAspectRatio="none"
                                        style={{
                                            transform: 'scale(3)',
                                            transformOrigin: 'center center'
                                        }}
                                    >
                                        {/* Field Boundary - dashed outline */}
                                        <polygon 
                                            points={polygon.map((p) => {
                                                const x = ((p[1] - mapBounds.minLng) / (mapBounds.maxLng - mapBounds.minLng)) * 100;
                                                const y = ((mapBounds.maxLat - p[0]) / (mapBounds.maxLat - mapBounds.minLat)) * 100;
                                                return `${x},${y}`;
                                            }).join(' ')}
                                            fill="none"
                                            stroke="#3b82f6"
                                            strokeWidth="0.6"
                                            strokeDasharray="2,1.5"
                                            opacity="1"
                                        />
                                    </svg>
                                )}
                                
                                {/* Legend */}
                                <div className="absolute top-2 right-2 bg-black bg-opacity-80 text-white text-xs px-3 py-2 rounded-lg space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-0.5 border-t-2 border-dashed border-blue-400"></div>
                                        <span>Field Boundary</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                <span>Select a date to view imagery</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Field Health Status Card - PROMINENT */}
                <div className={`bg-white rounded-xl p-5 border-4 ${healthScore >= 0.7 ? 'border-green-500' : healthScore >= 0.4 ? 'border-amber-500' : 'border-red-500'} shadow-lg`}>
                    <div className="flex items-start gap-4 mb-4">
                        <div className={`p-3 rounded-xl ${healthScore >= 0.7 ? 'bg-green-100' : healthScore >= 0.4 ? 'bg-amber-100' : 'bg-red-100'}`}>
                            <HealthIcon className={`w-9 h-9 ${healthIconColor}`} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="font-bold text-xl text-stone-900">Field Health</h3>
                                <span className={`font-bold text-base px-3 py-1.5 rounded-lg ${healthScore >= 0.7 ? 'bg-green-100 text-green-700 border-2 border-green-400' : healthScore >= 0.4 ? 'bg-amber-100 text-amber-700 border-2 border-amber-400' : 'bg-red-100 text-red-700 border-2 border-red-400'}`}>
                                    {healthStatus}
                                </span>
                            </div>
                            <p className="text-sm text-stone-600 font-medium mb-3">शेत आरोग्य</p>
                            <p className="text-base text-stone-800 leading-relaxed font-medium">
                                {healthScore >= 0.7
                                    ? `Excellent crop health. NDVI: ${healthScore.toFixed(2)}`
                                    : healthScore >= 0.4
                                        ? `Moderate stress detected. Check red zones on map.`
                                        : `High stress. Immediate action needed. NDVI: ${healthScore.toFixed(2)}`
                                }
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-3 border-t-2 border-stone-200">
                        <button 
                            onClick={() => router.push('/coming-soon')}
                            className="flex-1 bg-white border-2 border-emerald-600 text-emerald-700 rounded-xl py-3 font-bold text-base hover:bg-emerald-50 active:scale-[0.98] transition-all"
                        >
                            View Report
                        </button>
                        <button 
                            onClick={() => router.push('/coming-soon')}
                            className="flex-1 bg-amber-600 text-white rounded-xl py-3 font-bold text-base hover:bg-amber-700 active:scale-[0.98] transition-all border-2 border-amber-700"
                        >
                            Get Advice
                        </button>
                    </div>
                </div>

                {/* Enhanced Alerts Section */}
                {(alerts.length > 0 || statisticalData) && (
                    <div className="bg-white rounded-xl p-5 border-2 border-red-200 shadow-md">
                        <h3 className="font-bold text-stone-900 text-lg mb-4 flex items-center gap-2">
                            <AlertCircle className="w-6 h-6 text-red-600" strokeWidth={2.5} />
                            Active Alerts & Anomalies
                        </h3>
                        <EnhancedAlerts alerts={alerts} statistics={statisticalData} />
                    </div>
                )}

                {/* Advanced Features Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    {/* VCI Gauge */}
                    {vciLoading ? (
                         <div className="bg-white rounded-xl p-5 border-2 border-stone-100 shadow-md h-full min-h-[300px] flex flex-col items-center justify-center gap-3 animate-pulse">
                            <div className="w-12 h-12 bg-stone-200 rounded-full"></div>
                            <div className="h-4 w-32 bg-stone-200 rounded"></div>
                            <div className="text-sm text-stone-400">Analyzing drought conditions...</div>
                        </div>
                    ) : vciDataState && (
                        <VCIGauge
                            vci={vciDataState.vci}
                            ndvi_current={vciDataState.ndvi_current}
                            severity={vciDataState.severity}
                            interpretation={vciDataState.interpretation}
                            recommendations={vciDataState.recommendations}
                        />
                    )}

                    {/* Management Zones - Full width when alone */}
                    <div className={(!vciDataState && !vciLoading) ? "xl:col-span-2" : ""}>
                        {managementZones.length > 0 && managementZoneDate ? (
                            <ManagementZones
                                zones={managementZones}
                                analysisDate={managementZoneDate}
                                polygon={polygon}
                                onExportVRA={handleExportVRA}
                                onExportGeojson={handleExportGeojson}
                            />
                        ) : (
                            <div className="bg-white rounded-xl p-5 border-2 border-purple-200 shadow-md">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="bg-purple-100 rounded-lg p-2">
                                        <Activity className="w-6 h-6 text-purple-700" strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-stone-900 text-lg">Management Zones</h3>
                                        <p className="text-sm text-stone-600">Generate productivity zones</p>
                                    </div>
                                </div>
                                <div className="text-center py-6">
                                    <p className="text-stone-600 mb-4">No zones generated yet</p>
                                    <button
                                        onClick={handleGenerateZones}
                                        disabled={generatingZones}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 mx-auto"
                                    >
                                        {generatingZones ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Activity className="w-4 h-4" />
                                                Generate Zones
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Historical Benchmark */}
                {benchmarkLoading ? (
                     <div className="bg-white rounded-xl p-5 border-2 border-stone-100 shadow-md h-64 flex flex-col items-center justify-center gap-3 animate-pulse">
                        <div className="w-16 h-16 bg-stone-200 rounded-md"></div>
                        <div className="h-4 w-48 bg-stone-200 rounded"></div>
                        <div className="text-sm text-stone-400">Comparing with historical seasons...</div>
                    </div>
                ) : benchmarkDataState && (
                    <HistoricalBenchmark data={benchmarkDataState} />
                )}

                {/* Advanced Context Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Terrain Risk Card */}
                    {terrainData ? (
                        <div className="bg-white rounded-xl p-4 border-2 border-purple-200 shadow-md" style={{borderLeftWidth: '4px', borderLeftColor: '#a855f7'}}>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="bg-purple-100 rounded-lg p-2">
                                    <Mountain className="w-5 h-5 text-purple-700" strokeWidth={2.5} />
                                </div>
                                <h3 className="font-bold text-stone-900 text-base">Terrain</h3>
                            </div>
                            <div className="space-y-2.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-stone-700 font-medium text-sm">Elevation</span>
                                    <span className="font-bold text-stone-900 text-sm">{terrainData.elevation.min}m - {terrainData.elevation.max}m</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-stone-700 font-medium text-sm">Slope</span>
                                    <span className="font-bold text-stone-900 text-sm">{terrainData.slope.mean}°</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 mt-3">
                                    <div className={`text-center p-2 rounded-lg font-bold text-xs ${terrainData.risks.waterlogging === 'high' ? 'bg-red-100 text-red-700 border-2 border-red-300' : terrainData.risks.waterlogging === 'medium' ? 'bg-amber-100 text-amber-700 border-2 border-amber-300' : 'bg-green-100 text-green-700 border-2 border-green-300'}`}>
                                        <div className="text-xs mb-0.5">Waterlog</div>
                                        <div className="capitalize">{terrainData.risks.waterlogging}</div>
                                    </div>
                                    <div className={`text-center p-2 rounded-lg font-bold text-xs ${terrainData.risks.runoff === 'high' ? 'bg-red-100 text-red-700 border-2 border-red-300' : terrainData.risks.runoff === 'medium' ? 'bg-amber-100 text-amber-700 border-2 border-amber-300' : 'bg-green-100 text-green-700 border-2 border-green-300'}`}>
                                        <div className="text-xs mb-0.5">Runoff</div>
                                        <div className="capitalize">{terrainData.risks.runoff}</div>
                                    </div>
                                    <div className={`text-center p-2 rounded-lg font-bold text-xs ${terrainData.risks.erosion === 'high' ? 'bg-red-100 text-red-700 border-2 border-red-300' : terrainData.risks.erosion === 'medium' ? 'bg-amber-100 text-amber-700 border-2 border-amber-300' : 'bg-green-100 text-green-700 border-2 border-green-300'}`}>
                                        <div className="text-xs mb-0.5">Erosion</div>
                                        <div className="capitalize">{terrainData.risks.erosion}</div>
                                    </div>
                                </div>
                                {terrainData.recommendations.length > 0 && (
                                    <div className="mt-3 p-2.5 bg-purple-50 rounded-lg text-xs text-stone-700 font-medium border-2 border-purple-200">
                                        <div className="flex items-start gap-2">
                                            <Lightbulb className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" strokeWidth={2.5} />
                                            <span>{terrainData.recommendations[0]}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : terrainLoading ? (
                        <div className="bg-white rounded-xl p-4 border-2 border-stone-200">
                            <div className="flex items-center gap-2 mb-3">
                                <Mountain className="w-5 h-5 text-purple-600" strokeWidth={2.5} />
                                <h3 className="font-bold text-stone-900 text-base">Terrain</h3>
                            </div>
                            <div className="flex items-center justify-center py-6 text-stone-500">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                            </div>
                        </div>
                    ) : terrainError ? (
                        <div className="bg-white rounded-xl p-4 border-2 border-red-300">
                            <div className="flex items-center gap-2 mb-3">
                                <Mountain className="w-5 h-5 text-purple-600" strokeWidth={2.5} />
                                <h3 className="font-bold text-stone-900 text-base">Terrain</h3>
                            </div>
                            <div className="text-sm text-red-700 p-3 bg-red-50 rounded-lg border-2 border-red-200">
                                <div className="font-bold mb-1 flex items-center gap-1.5">
                                    <AlertTriangle className="w-4 h-4" strokeWidth={2.5} />
                                    <span>Data Unavailable</span>
                                </div>
                                <div className="text-xs">{terrainError}</div>
                            </div>
                        </div>
                    ) : null}

                    {/* SAR Moisture Card */}
                    {sarData && (
                        <div className="card p-5" style={{borderLeft: '4px solid #06b6d4'}}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-cyan-100 rounded-xl p-3">
                                    <Waves className="w-6 h-6 text-cyan-700" strokeWidth={2.5} />
                                </div>
                                <h3 className="font-bold text-stone-900 text-lg">Radar Monitoring</h3>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-stone-700 font-medium">Status:</span>
                                    <span className={`font-bold px-3 py-2 rounded-xl text-sm ${sarData.moistureLevel === 'wet' ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' : sarData.moistureLevel === 'dry' ? 'bg-red-100 text-red-700 border-2 border-red-300' : 'bg-amber-100 text-amber-700 border-2 border-amber-300'}`}>
                                        {sarData.moistureLevel.toUpperCase()}
                                    </span>
                                </div>
                                <div className="text-sm text-stone-700 font-medium mt-3 p-3 bg-cyan-50 rounded-xl">
                                    {sarData.message}
                                </div>
                                <div className="mt-3 space-y-2">
                                    {sarData.advantages.map((adv: string, i: number) => (
                                        <div key={i} className="text-sm text-stone-700 flex items-start gap-2">
                                            <div className="w-1.5 h-1.5 bg-cyan-600 rounded-full mt-2 shrink-0"></div>
                                            <span>{adv}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* NDVI Chart */}
                <div className="bg-white rounded-xl border-2 border-stone-200 shadow-md p-5">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-stone-900 text-base">NDVI Trends</h3>
                        <AnalyzeButton fieldId={fieldId} />
                    </div>
                    <div className="h-64">
                        {chartData.length > 0 ? (
                            <NDVIChart data={chartData} />
                        ) : (
                            <div className="h-full flex items-center justify-center text-stone-500">
                                <div className="text-center">
                                    <p className="font-medium mb-2">No data available</p>
                                    <p className="text-sm">Run analysis to see trends</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex gap-2 px-5 pb-5">
                    <button
                        type="button"
                        onClick={() => router.push("/coming-soon")}
                        className="flex-1 bg-[#6B7B3F] text-white rounded-xl py-3 font-semibold text-base active:scale-[0.98] min-h-[48px]"
                    >
                        {t("fieldDetail.viewReport", "View Report")}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push("/coming-soon")}
                        className="flex-1 border-2 border-[#6B7B3F] text-[#6B7B3F] rounded-xl py-3 font-semibold text-base active:scale-[0.98] min-h-[48px]"
                    >
                        {t("fieldDetail.getAdvice", "Get Advice")}
                    </button>
                </div>
            </section>

            {/* Choose what you want to check */}
            <section className="bg-white rounded-2xl border border-slate-200/80 p-5">
                <h2 className="text-base font-semibold text-slate-900 mb-4">
                    {t("fieldDetail.chooseWhatToCheck", "Choose what you want to check")}
                </h2>
                <div className="grid grid-cols-2 gap-2">
                    {MAIN_INDICES.map(({ id, labelKey, descKey, Icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setSelectedIndex(id)}
                            className={`flex items-center gap-2 p-3 rounded-xl border-2 min-h-[48px] text-left transition-all ${
                                selectedIndex === id
                                    ? "bg-[#6B7B3F] text-white border-[#5A6A35]"
                                    : "bg-slate-50 text-slate-800 border-slate-200"
                            }`}
                        >
                            <Icon className="w-5 h-5 shrink-0" strokeWidth={2.5} />
                            <span className="text-sm font-semibold truncate">{t(labelKey)}</span>
                        </button>
                    ))}
                </div>
                <p className="mt-3 text-sm text-slate-600 px-1">
                    {t(INDEX_DESCRIPTIONS[selectedIndex] || "fieldDetail.cropHealthDesc")}
                </p>

                {/* More options – collapsible */}
                <div className="mt-4 border-t border-slate-200 pt-4">
                    <button
                        type="button"
                        onClick={() => setMoreOptionsOpen((o) => !o)}
                        className="flex items-center justify-between w-full py-2 text-slate-700 font-medium min-h-[44px]"
                    >
                        <span>{t("fieldDetail.moreOptions", "More options")}</span>
                        {moreOptionsOpen ? (
                            <ChevronUp className="w-5 h-5" strokeWidth={2} />
                        ) : (
                            <ChevronDown className="w-5 h-5" strokeWidth={2} />
                        )}
                    </button>
                    {moreOptionsOpen && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            {MORE_INDICES.map(({ id, label, Icon }) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setSelectedIndex(id)}
                                    className={`flex items-center gap-2 p-3 rounded-xl border-2 min-h-[48px] text-left ${
                                        selectedIndex === id
                                            ? "bg-[#6B7B3F] text-white border-[#5A6A35]"
                                            : "bg-slate-50 text-slate-700 border-slate-200"
                                    }`}
                                >
                                    <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
                                    <span className="text-sm font-medium">{label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Your Field Map */}
            <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <h2 className="text-base font-semibold text-slate-900 px-5 pt-5 pb-3">
                    {t("fieldDetail.yourFieldMap", "Your Field Map")}
                </h2>
                <div className="aspect-square bg-slate-100 relative">
                    {mapLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                            <span className="text-sm">{t("fieldDetail.loadingMap", "Loading map...")}</span>
                        </div>
                    ) : mapUrl ? (
                        <>
                            <div className="absolute inset-0 overflow-hidden">
                                <img
                                    src={mapUrl}
                                    alt="Field map"
                                    className="w-full h-full object-cover"
                                    style={{ transform: "scale(3)", transformOrigin: "center center" }}
                                />
                            </div>
                            {mapBounds && (
                                <svg
                                    className="absolute inset-0 w-full h-full pointer-events-none"
                                    viewBox="0 0 100 100"
                                    preserveAspectRatio="none"
                                    style={{ transform: "scale(3)", transformOrigin: "center center" }}
                                >
                                    <polygon
                                        points={polygon
                                            .map((p) => {
                                                const x =
                                                    ((p[1] - mapBounds.minLng) / (mapBounds.maxLng - mapBounds.minLng)) * 100;
                                                const y =
                                                    ((mapBounds.maxLat - p[0]) / (mapBounds.maxLat - mapBounds.minLat)) * 100;
                                                return `${x},${y}`;
                                            })
                                            .join(" ")}
                                        fill="none"
                                        stroke="#6B7B3F"
                                        strokeWidth="0.5"
                                        strokeDasharray="2,1.5"
                                    />
                                </svg>
                            )}
                            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                <div className="w-4 h-0.5 border-t-2 border-dashed border-[#6B7B3F]" />
                                <span>{t("fieldDetail.fieldBoundary", "Field boundary")}</span>
                            </div>
                        </>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm px-4 text-center">
                            {t("fieldDetail.selectDateToView", "Select a date to view map")}
                        </div>
                    )}
                </div>
            </section>

            {/* Terrain (optional) */}
            {terrainData && (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Mountain className="w-5 h-5 text-[#6B7B3F]" strokeWidth={2.5} />
                        <h3 className="font-semibold text-slate-900">{t("fieldDetail.terrain", "Terrain")}</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                            <div className="text-slate-500 text-xs">Elevation</div>
                            <div className="font-semibold text-slate-800">
                                {terrainData.elevation.min}m – {terrainData.elevation.max}m
                            </div>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                            <div className="text-slate-500 text-xs">Slope</div>
                            <div className="font-semibold text-slate-800">{terrainData.slope.mean}°</div>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                            <div className="text-slate-500 text-xs">Waterlog</div>
                            <div className="font-semibold text-slate-800 capitalize">{terrainData.risks.waterlogging}</div>
                        </div>
                    </div>
                    {terrainData.recommendations?.[0] && (
                        <div className="mt-3 p-3 bg-[#6B7B3F]/10 rounded-xl flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-[#6B7B3F] mt-0.5 shrink-0" strokeWidth={2.5} />
                            <span className="text-sm text-slate-700">{terrainData.recommendations[0]}</span>
                        </div>
                    )}
                </div>
            )}

            {/* SAR / Soil moisture (optional) */}
            {sarData && (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Waves className="w-5 h-5 text-[#6B7B3F]" strokeWidth={2.5} />
                        <h3 className="font-semibold text-slate-900">{t("fieldDetail.radarMonitoring", "Soil moisture (radar)")}</h3>
                    </div>
                    <p className="text-sm text-slate-700">{sarData.message}</p>
                </div>
            )}

            {/* Crop health over time – scrollable graph, farmer-friendly */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <h3 className="font-semibold text-slate-900">{t("fieldDetail.ndviTrends", "Crop health over time")}</h3>
                    <AnalyzeButton fieldId={fieldId} className="shrink-0 min-h-[44px]" />
                </div>
                <p className="text-sm text-slate-600 mb-4">
                    {t("fieldDetail.chartHelperText", "This shows how your crop health has changed over time.")}
                </p>
                {chartData.length > 0 ? (
                    <>
                        <div className="overflow-x-auto overflow-y-hidden -mx-1 px-1 touch-pan-x scroll-smooth" style={{ minHeight: CHART_HEIGHT + 48 }}>
                            <div style={{ minWidth: CHART_MIN_WIDTH }}>
                                <NDVIChart
                                    data={chartData}
                                    width={CHART_MIN_WIDTH}
                                    height={CHART_HEIGHT}
                                    lineLabel={t("fieldDetail.chartLineLabel", "Crop health")}
                                    dangerLabel={t("fieldDetail.chartDangerLabel", "Danger level")}
                                    thresholdLabel={t("fieldDetail.minimumSafeLevel", "Minimum Safe Level")}
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="py-12 flex items-center justify-center text-slate-500 text-sm text-center px-4">
                        {t("fieldDetail.noDataRunAnalysis", "No data yet. Run analysis to see trends.")}
                    </div>
                )}
            </div>
        </div>
    );
}
