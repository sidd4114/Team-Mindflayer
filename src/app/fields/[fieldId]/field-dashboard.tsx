"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NDVIChart from "@/components/NDVIChart";
import VCIGauge from "@/components/VCIGauge";
import ManagementZones from "@/components/ManagementZones";
import HistoricalBenchmark from "@/components/HistoricalBenchmark";
import EnhancedAlerts from "@/components/EnhancedAlerts";
import AnalyzeButton from "../analyze-button";
import FieldGuidance from "@/components/FieldGuidance";
import { useI18n } from "@/contexts/I18nContext";
import {
  Calendar,
  MapPin,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Mountain,
  Lightbulb,
  Waves,
  Activity,
  RefreshCw,
  Navigation,
  ChevronLeft,
  Leaf,
  Droplets,
  Sprout,
  Sun,
  Eye,
  Thermometer,
  Palette,
  Flower2,
} from "lucide-react";

const DATE_LOCALE = "en-US";

// Available vegetation indices for the map
const VEGETATION_INDICES = [
  {
    id: "ndvi",
    label: "NDVI",
    description: "Crop Health",
    Icon: Leaf,
    color: "emerald",
  },
  {
    id: "ndwi",
    label: "NDWI",
    description: "Water Content",
    Icon: Droplets,
    color: "blue",
  },
  {
    id: "evi",
    label: "EVI",
    description: "Enhanced Vegetation",
    Icon: Sprout,
    color: "green",
  },
  {
    id: "ndmi",
    label: "NDMI",
    description: "Moisture Index",
    Icon: Waves,
    color: "cyan",
  },
  {
    id: "ndre",
    label: "NDRE",
    description: "Chlorophyll",
    Icon: Flower2,
    color: "lime",
  },
  {
    id: "arvi",
    label: "ARVI",
    description: "Atmosphere Resistant",
    Icon: Sun,
    color: "amber",
  },
  {
    id: "true_color",
    label: "True Color",
    description: "Natural View",
    Icon: Eye,
    color: "slate",
  },
  {
    id: "false_color",
    label: "False Color",
    description: "Infrared View",
    Icon: Palette,
    color: "purple",
  },
  {
    id: "psri",
    label: "PSRI",
    description: "Senescence",
    Icon: Thermometer,
    color: "orange",
  },
] as const;

interface FieldInfo {
  name: string;
  crop_type: string;
  planting_date: string | null;
}

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

interface VCIData {
  vci: number;
  ndvi_current: number;
  severity: string;
  interpretation: string;
  recommendations: string[];
  [key: string]: unknown;
}

interface Zone {
  zoneNumber: number;
  zoneType: "low" | "medium" | "high";
  avgNdvi: number;
  geometry?: { type: string; coordinates: number[][][] };
  recommendations: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
  };
}

interface BenchmarkData {
  currentYear: number;
  comparisonYears: number[];
  statistics: {
    current_avg: number;
    historical_avg: number;
    five_year_min: number;
    five_year_max: number;
    performance_vs_average: number;
  };
  interpretation: string;
  recommendations?: string[];
}

interface FieldDashboardProps {
  fieldId: string;
  fieldInfo: FieldInfo;
  polygon: [number, number][];
  readings: { date: string; ndvi_mean?: number }[];
  alerts?: Alert[];
  vciData?: VCIData;
  managementZones?: Zone[];
  managementZoneDate?: string;
  benchmarkData?: BenchmarkData;
  statisticalData?: Statistics;
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
  statisticalData,
}: FieldDashboardProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [mapBounds, setMapBounds] = useState<{
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<string>("ndvi");
  const [terrainData, setTerrainData] = useState<{
    elevation: { min: number; max: number };
    slope: { mean: number };
    risks: { waterlogging: string; runoff: string; erosion: string };
    recommendations: string[];
  } | null>(null);
  const [sarData, setSarData] = useState<{
    moistureLevel: string;
    message: string;
    advantages: string[];
  } | null>(null);
  const [terrainLoading, setTerrainLoading] = useState(true);
  const [terrainError, setTerrainError] = useState<string | null>(null);
  const [isRegeneratingZones, setIsRegeneratingZones] = useState(false);
  const [generatingZones, setGeneratingZones] = useState(false);

  // Async data states
  const [vciDataState, setVciDataState] = useState<VCIData | undefined>(
    vciData,
  );
  const [vciLoading, setVciLoading] = useState(!vciData);
  const [benchmarkDataState, setBenchmarkDataState] = useState<
    BenchmarkData | undefined
  >(benchmarkData);
  const [benchmarkLoading, setBenchmarkLoading] = useState(!benchmarkData);

  // Fetch VCI data client-side if not provided
  useEffect(() => {
    if (!vciData) {
      setVciLoading(true);
      fetch(`/api/fields/${fieldId}/vci`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Failed to fetch VCI");
        })
        .then((data) => {
          if (data && !data.error) {
            setVciDataState({
              vci: data.vci || data.vci_mean, // handle structure variations
              ndvi_current: data.ndvi_current,
              severity: data.severity,
              interpretation: data.interpretation,
              recommendations: data.recommendations || [],
            });
          }
        })
        .catch((e) => console.log("VCI fetch skipped/failed:", e))
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
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Failed to fetch benchmark");
        })
        .then((data) => {
          if (data && !data.error && data.comparison_years) {
            setBenchmarkDataState(data);
          }
        })
        .catch((e) => console.log("Benchmark fetch skipped/failed:", e))
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
        const res = await fetch(
          `/api/fields/${fieldId}/sar-moisture?date=${selectedDate}`,
        );
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
        const res = await fetch(
          `/api/fields/${fieldId}/map?date=${selectedDate}&index=${selectedIndex}`,
        );
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

  const chartData = readings.map((r) => ({
    date: r.date,
    mean: r.ndvi_mean ?? 0,
  }));
  const latestReading = readings[readings.length - 1];

  // Handle Generate Zones
  const handleGenerateZones = async () => {
    setGeneratingZones(true);
    try {
      const res = await fetch(`/api/fields/${fieldId}/management-zones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date().toISOString(),
          threshold: 0.1,
        }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (e) {
      console.error("Generate zones error:", e);
    } finally {
      setGeneratingZones(false);
    }
  };

  // Handle Regenerate Zones
  const handleRegenerateZones = async () => {
    if (
      confirm(
        "This will delete all existing management zones and generate new ones. Continue?",
      )
    ) {
      setIsRegeneratingZones(true);
      try {
        const res = await fetch(`/api/fields/${fieldId}/management-zones`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: new Date().toISOString() }),
        });

        if (!res.ok) {
          throw new Error("Failed to regenerate zones");
        }

        // Refresh the page to fetch new zones
        router.refresh();
      } catch (e) {
        console.error("Regenerate zones error:", e);
        alert("Failed to regenerate zones. Please try again.");
      } finally {
        setIsRegeneratingZones(false);
      }
    }
  };

  const healthScore = latestReading?.ndvi_mean || 0;
  const healthStatus =
    healthScore >= 0.7
      ? "Healthy"
      : healthScore >= 0.4
        ? "Moderate"
        : "High Stress";
  const HealthIcon =
    healthScore >= 0.7
      ? CheckCircle2
      : healthScore >= 0.4
        ? AlertTriangle
        : XCircle;
  const healthIconColor =
    healthScore >= 0.7
      ? "text-emerald-600"
      : healthScore >= 0.4
        ? "text-amber-600"
        : "text-red-600";
  const healthBgColor =
    healthScore >= 0.7
      ? "bg-emerald-50"
      : healthScore >= 0.4
        ? "bg-amber-50"
        : "bg-red-50";
  const healthBorderColor =
    healthScore >= 0.7
      ? "border-emerald-500"
      : healthScore >= 0.4
        ? "border-amber-500"
        : "border-red-500";
  const healthBadgeStyle =
    healthScore >= 0.7
      ? "bg-emerald-100 text-emerald-700 border-emerald-300"
      : healthScore >= 0.4
        ? "bg-amber-100 text-amber-700 border-amber-300"
        : "bg-red-100 text-red-700 border-red-300";

  const centerLat = polygon.length
    ? polygon.reduce((s, p) => s + p[0], 0) / polygon.length
    : 0;
  const centerLng = polygon.length
    ? polygon.reduce((s, p) => s + p[1], 0) / polygon.length
    : 0;

  return (
    <div className="min-h-screen pb-32">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header – clear, with subtle bar */}
        <header className="sticky top-0 z-10 -mx-4 px-4 sm:-mx-6 sm:px-6 py-3 bg-[#faf8f4]/90 backdrop-blur-md border-b border-stone-200/60 shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset]">
          <div className="flex items-center gap-3">
            <Link
              href="/fields"
              className="flex items-center justify-center w-11 h-11 rounded-2xl bg-white/90 border border-stone-200/80 text-stone-700 shadow-sm hover:bg-white hover:shadow hover:border-stone-300 active:scale-95 transition-all"
              aria-label={t("fields.backToFields", "Back to Fields")}
            >
              <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
            </Link>
            <span className="text-lg font-semibold text-stone-800 tracking-tight">
              {t("fieldDetail.pageTitle", "Field Details")}
            </span>
          </div>
        </header>

        <main className="space-y-4 sm:space-y-5 pt-2">
          {/* Date Selector & Location */}
          <div className="card p-4 rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#6B7B3F]/12 flex items-center justify-center shrink-0 border border-[#6B7B3F]/20">
                  <Calendar
                    className="w-5 h-5 text-[#5a6b2d]"
                    strokeWidth={2}
                  />
                </div>
                <select
                  className="flex-1 sm:flex-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-900 text-sm sm:text-base cursor-pointer focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none min-h-11 transition-all"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                >
                  {uniqueDates
                    .slice()
                    .reverse()
                    .map((date) => (
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
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <MapPin className="w-4 h-4 shrink-0" strokeWidth={2} />
                <span className="font-medium">
                  {centerLat.toFixed(4)}°N, {centerLng.toFixed(4)}°E
                </span>
              </div>
            </div>
          </div>

          {/* GPS Navigation Card */}
          <div className="card p-4 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-sky-100/80 flex items-center justify-center shrink-0 border border-sky-200/80">
                <Navigation className="w-5 h-5 text-sky-700" strokeWidth={2} />
              </div>
              <h2 className="text-base font-semibold text-stone-800">
                {t(
                  "fieldDetail.guideToField",
                  "Navigate to Field (To be Implemented)",
                )}
              </h2>
            </div>
            <FieldGuidance
              target={{ lat: centerLat, lng: centerLng }}
              targetLabel={t("fieldDetail.fieldCenter", "Field center")}
            />
          </div>

          {/* Health Status Card – one clear status, strong visual */}
          <div
            className={`card rounded-2xl p-5 border-2 ${healthBorderColor} overflow-hidden relative`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`p-4 rounded-2xl ${healthBgColor} shrink-0 shadow-inner border border-white/50`}
              >
                <HealthIcon
                  className={`w-8 h-8 sm:w-9 sm:h-9 ${healthIconColor}`}
                  strokeWidth={2.5}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h3 className="text-lg sm:text-xl font-bold text-stone-900">
                    {t(
                      "fieldDetail.fieldHealth",
                      "Field Health (To be Implemented)",
                    )}
                  </h3>
                  <span
                    className={`font-bold text-sm px-3 py-1.5 rounded-xl border-2 ${healthBadgeStyle} shadow-sm`}
                  >
                    {healthStatus}
                  </span>
                </div>
                <p className="text-sm sm:text-base text-stone-700 leading-relaxed">
                  {healthScore >= 0.7
                    ? `Excellent crop health detected. NDVI: ${healthScore.toFixed(2)}`
                    : healthScore >= 0.4
                      ? "Moderate stress detected. Review the map for problem areas."
                      : `High stress detected. Immediate action recommended. NDVI: ${healthScore.toFixed(2)}`}
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-4 pt-4 border-t border-stone-200/80">
              <button
                onClick={() => router.push("/coming-soon")}
                className="btn-outline flex-1 text-sm sm:text-base py-2.5 min-h-11"
              >
                {t("fieldDetail.viewReport", "View Report")}
              </button>
              <button
                onClick={() => router.push("/coming-soon")}
                className="btn-secondary flex-1 text-sm sm:text-base py-2.5 min-h-11"
              >
                {t("fieldDetail.getAdvice", "Get Advice")}
              </button>
            </div>
          </div>

          {/* Index Selector */}
          <div className="card rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-stone-800 mb-3">
              {t("fieldDetail.selectIndex", "Select View")}
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
              {VEGETATION_INDICES.map(({ id, label, Icon, color }) => {
                const isSelected = selectedIndex === id;
                const colorClasses: Record<
                  string,
                  {
                    bg: string;
                    text: string;
                    border: string;
                    selectedBg: string;
                  }
                > = {
                  emerald: {
                    bg: "bg-emerald-50",
                    text: "text-emerald-600",
                    border: "border-emerald-200",
                    selectedBg: "bg-emerald-600",
                  },
                  blue: {
                    bg: "bg-blue-50",
                    text: "text-blue-600",
                    border: "border-blue-200",
                    selectedBg: "bg-blue-600",
                  },
                  green: {
                    bg: "bg-green-50",
                    text: "text-green-600",
                    border: "border-green-200",
                    selectedBg: "bg-green-600",
                  },
                  cyan: {
                    bg: "bg-cyan-50",
                    text: "text-cyan-600",
                    border: "border-cyan-200",
                    selectedBg: "bg-cyan-600",
                  },
                  lime: {
                    bg: "bg-lime-50",
                    text: "text-lime-600",
                    border: "border-lime-200",
                    selectedBg: "bg-lime-600",
                  },
                  amber: {
                    bg: "bg-amber-50",
                    text: "text-amber-600",
                    border: "border-amber-200",
                    selectedBg: "bg-amber-600",
                  },
                  slate: {
                    bg: "bg-slate-50",
                    text: "text-slate-600",
                    border: "border-slate-200",
                    selectedBg: "bg-slate-600",
                  },
                  purple: {
                    bg: "bg-purple-50",
                    text: "text-purple-600",
                    border: "border-purple-200",
                    selectedBg: "bg-purple-600",
                  },
                  orange: {
                    bg: "bg-orange-50",
                    text: "text-orange-600",
                    border: "border-orange-200",
                    selectedBg: "bg-orange-600",
                  },
                };
                const colors = colorClasses[color] || colorClasses.emerald;

                return (
                  <button
                    key={id}
                    onClick={() => setSelectedIndex(id)}
                    className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border-2 min-w-18 transition-all shrink-0 ${
                      isSelected
                        ? `${colors.selectedBg} text-white border-transparent shadow-lg`
                        : `${colors.bg} ${colors.text} ${colors.border} hover:shadow-md`
                    }`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={2} />
                    <span className="text-xs font-bold">{label}</span>
                  </button>
                );
              })}
            </div>
            {/* Selected index description */}
            {VEGETATION_INDICES.find((i) => i.id === selectedIndex) && (
              <p className="text-xs text-slate-500 mt-2 pl-1">
                {
                  VEGETATION_INDICES.find((i) => i.id === selectedIndex)
                    ?.description
                }
                {selectedIndex === "ndvi" &&
                  " – measures vegetation greenness and health"}
                {selectedIndex === "ndwi" &&
                  " – detects water stress in plants"}
                {selectedIndex === "evi" && " – better for high biomass areas"}
                {selectedIndex === "ndmi" &&
                  " – monitors leaf moisture content"}
                {selectedIndex === "ndre" &&
                  " – sensitive to chlorophyll variations"}
                {selectedIndex === "arvi" &&
                  " – corrects for atmospheric effects"}
                {selectedIndex === "true_color" &&
                  " – natural RGB satellite view"}
                {selectedIndex === "false_color" &&
                  " – highlights vegetation in red"}
                {selectedIndex === "psri" &&
                  " – indicates plant stress and aging"}
              </p>
            )}
          </div>

          {/* Satellite Map */}
          <div className="card rounded-2xl overflow-hidden border-stone-200/90 shadow-lg">
            <div className="aspect-video sm:aspect-4/3 bg-stone-800 relative ring-1 ring-black/5">
              {mapLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <span className="text-sm text-slate-300">
                      Loading imagery...
                    </span>
                  </div>
                </div>
              ) : mapUrl ? (
                <>
                  <div className="absolute inset-0 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mapUrl}
                      alt="Satellite view of field"
                      className="w-full h-full object-cover"
                      style={{
                        transform: "scale(3)",
                        transformOrigin: "center",
                      }}
                    />
                  </div>
                  {mapBounds && (
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      style={{
                        transform: "scale(3)",
                        transformOrigin: "center",
                      }}
                    >
                      <polygon
                        points={polygon
                          .map((p) => {
                            const x =
                              ((p[1] - mapBounds.minLng) /
                                (mapBounds.maxLng - mapBounds.minLng)) *
                              100;
                            const y =
                              ((mapBounds.maxLat - p[0]) /
                                (mapBounds.maxLat - mapBounds.minLat)) *
                              100;
                            return `${x},${y}`;
                          })
                          .join(" ")}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="0.5"
                        strokeDasharray="2,1.5"
                      />
                    </svg>
                  )}
                  <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-2">
                    <div className="w-3 h-0 border-t border-dashed border-blue-400" />
                    <span>Boundary</span>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                  <span className="text-sm">Select a date to view imagery</span>
                </div>
              )}
            </div>
          </div>

          {/* Alerts & Anomalies */}
          {(alerts.length > 0 || statisticalData) && (
            <div className="card rounded-2xl p-5 border-l-4 border-l-red-500 bg-gradient-to-r from-red-50/50 to-white">
              <h3 className="font-bold text-stone-900 text-base sm:text-lg mb-4 flex items-center gap-2">
                <AlertCircle
                  className="w-5 h-5 text-red-600"
                  strokeWidth={2.5}
                />
                {t("fieldDetail.alerts", "Active Alerts")}
              </h3>
              <EnhancedAlerts alerts={alerts} statistics={statisticalData} />
            </div>
          )}

          {/* VCI & Zones Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {/* VCI Gauge */}
            {vciLoading ? (
              <div className="card rounded-2xl p-5 min-h-64 flex flex-col items-center justify-center gap-3 animate-pulse">
                <div className="w-12 h-12 bg-slate-200 rounded-full" />
                <div className="h-4 w-32 bg-slate-200 rounded" />
                <span className="text-sm text-slate-400">
                  Analyzing drought conditions...
                </span>
              </div>
            ) : (
              vciDataState && (
                <VCIGauge
                  vci={vciDataState.vci}
                  ndvi_current={vciDataState.ndvi_current}
                  severity={vciDataState.severity}
                  interpretation={vciDataState.interpretation}
                  recommendations={vciDataState.recommendations}
                />
              )
            )}

            {/* Management Zones */}
            <div
              className={!vciDataState && !vciLoading ? "lg:col-span-2" : ""}
            >
              {managementZones.length > 0 && managementZoneDate ? (
                <ManagementZones
                  zones={managementZones}
                  analysisDate={managementZoneDate}
                  polygon={polygon}
                  onRegenerate={handleRegenerateZones}
                  isRegenerating={isRegeneratingZones}
                />
              ) : (
                <div className="card rounded-2xl p-5 border-l-4 border-l-purple-500">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                      <Activity
                        className="w-5 h-5 text-purple-600"
                        strokeWidth={2.5}
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">
                        Management Zones
                      </h3>
                      <p className="text-sm text-slate-500">
                        Generate productivity zones
                      </p>
                    </div>
                  </div>
                  <div className="text-center py-4">
                    <p className="text-slate-500 mb-4 text-sm">
                      No zones generated yet
                    </p>
                    <button
                      onClick={handleGenerateZones}
                      disabled={generatingZones}
                      className="btn-primary px-5 py-2.5 mx-auto"
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
            <div className="card rounded-2xl p-5 h-64 flex flex-col items-center justify-center gap-3 animate-pulse">
              <div className="w-16 h-16 bg-slate-200 rounded-lg" />
              <div className="h-4 w-48 bg-slate-200 rounded" />
              <span className="text-sm text-slate-400">
                Comparing with historical data...
              </span>
            </div>
          ) : (
            benchmarkDataState && (
              <HistoricalBenchmark data={benchmarkDataState} />
            )
          )}

          {/* Terrain & SAR Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* Terrain Card */}
            {terrainData ? (
              <div className="card rounded-2xl p-4 sm:p-5 border-l-4 border-l-purple-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                    <Mountain
                      className="w-5 h-5 text-purple-600"
                      strokeWidth={2.5}
                    />
                  </div>
                  <h3 className="font-bold text-slate-900">Terrain Analysis</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Elevation</span>
                    <span className="font-semibold text-slate-900">
                      {terrainData.elevation.min}m – {terrainData.elevation.max}
                      m
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Slope</span>
                    <span className="font-semibold text-slate-900">
                      {terrainData.slope.mean}°
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    {(["waterlogging", "runoff", "erosion"] as const).map(
                      (risk) => {
                        const level = terrainData.risks[risk];
                        const riskStyle =
                          level === "high"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : level === "medium"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200";
                        return (
                          <div
                            key={risk}
                            className={`text-center p-2 rounded-lg border text-xs font-semibold ${riskStyle}`}
                          >
                            <div className="text-[10px] uppercase tracking-wide opacity-70 mb-0.5">
                              {risk.slice(0, 7)}
                            </div>
                            <div className="capitalize">{level}</div>
                          </div>
                        );
                      },
                    )}
                  </div>
                  {terrainData.recommendations[0] && (
                    <div className="mt-3 p-3 bg-purple-50 rounded-xl text-xs text-slate-700 font-medium border border-purple-100 flex items-start gap-2">
                      <Lightbulb
                        className="w-4 h-4 text-purple-600 shrink-0 mt-0.5"
                        strokeWidth={2.5}
                      />
                      <span>{terrainData.recommendations[0]}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : terrainLoading ? (
              <div className="card rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <Mountain
                    className="w-5 h-5 text-purple-600"
                    strokeWidth={2.5}
                  />
                  <h3 className="font-bold text-slate-900">Terrain</h3>
                </div>
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              </div>
            ) : terrainError ? (
              <div className="card rounded-2xl p-5 border-l-4 border-l-red-500">
                <div className="flex items-center gap-3 mb-3">
                  <Mountain
                    className="w-5 h-5 text-purple-600"
                    strokeWidth={2.5}
                  />
                  <h3 className="font-bold text-slate-900">Terrain</h3>
                </div>
                <div className="p-3 bg-red-50 rounded-xl text-sm text-red-700 flex items-start gap-2">
                  <AlertTriangle
                    className="w-4 h-4 shrink-0 mt-0.5"
                    strokeWidth={2.5}
                  />
                  <span>{terrainError}</span>
                </div>
              </div>
            ) : null}

            {/* SAR Moisture Card */}
            {sarData && (
              <div className="card rounded-2xl p-4 sm:p-5 border-l-4 border-l-cyan-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0">
                    <Waves
                      className="w-5 h-5 text-cyan-600"
                      strokeWidth={2.5}
                    />
                  </div>
                  <h3 className="font-bold text-slate-900">
                    Soil Moisture (Radar)
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Status</span>
                    <span
                      className={`font-bold px-3 py-1.5 rounded-lg text-sm border ${
                        sarData.moistureLevel === "wet"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : sarData.moistureLevel === "dry"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {sarData.moistureLevel.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 p-3 bg-cyan-50 rounded-xl border border-cyan-100">
                    {sarData.message}
                  </p>
                  {sarData.advantages.length > 0 && (
                    <ul className="space-y-1.5 pt-1">
                      {sarData.advantages.map((adv, i) => (
                        <li
                          key={i}
                          className="text-sm text-slate-600 flex items-start gap-2"
                        >
                          <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full mt-2 shrink-0" />
                          <span>{adv}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* NDVI Chart */}
          <div className="card rounded-2xl p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                {t("fieldDetail.ndviTrends", "NDVI Trends")}
              </h3>
              <AnalyzeButton fieldId={fieldId} />
            </div>
            <div className="h-56 sm:h-64">
              {chartData.length > 0 ? (
                <NDVIChart data={chartData} />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <p className="font-medium mb-1">No data available</p>
                    <p className="text-sm">Run analysis to see trends</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
