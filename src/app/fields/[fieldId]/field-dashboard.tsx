"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NDVIChart, { CHART_MIN_WIDTH, CHART_HEIGHT } from "@/components/NDVIChart";
import AnalyzeButton from "../analyze-button";
import { useI18n } from "@/contexts/I18nContext";
import {
    Calendar,
    MapPin,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Mountain,
    Lightbulb,
    Droplets,
    Leaf,
    Zap,
    Waves,
    Sprout,
    FlaskConical,
    Activity,
    AlertCircle,
    ChevronLeft,
    ChevronDown,
    ChevronUp,
} from "lucide-react";

const DATE_LOCALE = "en-US";

interface FieldInfo {
    name: string;
    crop_type: string;
    planting_date: string | null;
}

interface FieldDashboardProps {
    fieldId: string;
    fieldInfo: FieldInfo;
    polygon: [number, number][];
    readings: { date: string; ndvi_mean?: number; [key: string]: unknown }[];
    alerts?: { id: string; message?: string; severity?: string; detected_at?: string }[];
}

const MAIN_INDICES = [
    { id: "ndvi", labelKey: "fieldDetail.cropHealth", descKey: "fieldDetail.cropHealthDesc", Icon: Leaf },
    { id: "ndmi", labelKey: "fieldDetail.waterStress", descKey: "fieldDetail.waterStressDesc", Icon: Droplets },
    { id: "evi", labelKey: "fieldDetail.cropGrowth", descKey: "fieldDetail.cropGrowthDesc", Icon: Sprout },
    { id: "psri", labelKey: "fieldDetail.diseaseRisk", descKey: "fieldDetail.diseaseRiskDesc", Icon: AlertCircle },
] as const;

const MORE_INDICES = [
    { id: "arvi", label: "ARVI", Icon: FlaskConical },
    { id: "mcari", label: "MCARI", Icon: Activity },
    { id: "ndre", label: "NDRE", Icon: Zap },
    { id: "ndwi", label: "NDWI", Icon: Waves },
] as const;

const INDEX_DESCRIPTIONS: Record<string, string> = {
    ndvi: "fieldDetail.cropHealthDesc",
    ndmi: "fieldDetail.waterStressDesc",
    evi: "fieldDetail.cropGrowthDesc",
    psri: "fieldDetail.diseaseRiskDesc",
    arvi: "fieldDetail.cropHealthDesc",
    mcari: "fieldDetail.diseaseRiskDesc",
    ndre: "fieldDetail.cropHealthDesc",
    ndwi: "fieldDetail.waterStressDesc",
};

export default function FieldDashboard({ fieldId, fieldInfo, polygon, readings, alerts = [] }: FieldDashboardProps) {
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
    const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);

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
    const healthScore = latestReading?.ndvi_mean ?? 0;
    const isHealthy = healthScore >= 0.7;
    const isModerate = healthScore >= 0.4 && healthScore < 0.7;
    const statusKey = isHealthy ? "fieldDetail.healthy" : isModerate ? "fieldDetail.needsAttention" : "fieldDetail.highRisk";
    const StatusIcon = isHealthy ? CheckCircle2 : isModerate ? AlertTriangle : XCircle;
    const statusColor = isHealthy ? "green" : isModerate ? "amber" : "red";

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
                        <div>
                            <p
                                className={`text-lg font-bold ${
                                    statusColor === "green"
                                        ? "text-emerald-800"
                                        : statusColor === "amber"
                                          ? "text-amber-800"
                                          : "text-red-800"
                                }`}
                            >
                                {t(statusKey)}
                            </p>
                            <p className="text-sm text-slate-600 mt-0.5">
                                {isHealthy
                                    ? t("fieldDetail.cropHealthDesc", "Overall plant health and vigour")
                                    : isModerate
                                      ? t("fieldDetail.waterStressDesc", "Soil and plant moisture")
                                      : t("fieldDetail.diseaseRiskDesc", "Signs of nutrient stress or ageing")}
                            </p>
                        </div>
                    </div>
                    {/* Other statuses – de-emphasized (only show the two that are not current) */}
                    <div className="flex sm:flex-col gap-2 opacity-75">
                        {statusColor !== "green" && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" strokeWidth={2} />
                                <span className="text-xs font-medium text-emerald-800">{t("fieldDetail.healthy")}</span>
                            </div>
                        )}
                        {statusColor !== "amber" && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-200">
                                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" strokeWidth={2} />
                                <span className="text-xs font-medium text-amber-800">{t("fieldDetail.needsAttention")}</span>
                            </div>
                        )}
                        {statusColor !== "red" && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg border border-red-200">
                                <XCircle className="w-5 h-5 text-red-600 shrink-0" strokeWidth={2} />
                                <span className="text-xs font-medium text-red-800">{t("fieldDetail.highRisk")}</span>
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
