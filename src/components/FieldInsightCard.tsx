import { useState, useEffect, useCallback, useRef } from "react";
import { Sparkles, RefreshCw, AlertCircle } from "lucide-react";

interface TerrainData {
    elevation: { min: number; max: number };
    slope: { mean: number };
    risks: { waterlogging: string; runoff: string; erosion: string };
    recommendations: string[];
}

interface VCIData {
    vci: number;
    ndvi_current: number;
    severity: string;
    interpretation: string;
    recommendations: string[];
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

interface FieldInsightData {
    cropType: string;
    date: string;
    ndvi: number;
    ndviTrend?: string;
    moisture?: { status: string; message: string };
    terrain?: TerrainData | null;
    vci?: VCIData;
    alerts?: Alert[];
    statistics?: Statistics | null;
}

interface FieldInsightCardProps {
    fieldId: string;
    data: FieldInsightData;
}

export default function FieldInsightCard({ fieldId, data }: FieldInsightCardProps) {
    const [insight, setInsight] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const analyzedKeyRef = useRef<string>("");
    const dataRef = useRef(data);
    const hasFetchedRef = useRef(false);

    // Keep dataRef current
    dataRef.current = data;

    const generateInsight = useCallback(async (force: boolean = false) => {
        const currentKey = `${fieldId}-${dataRef.current.date}`;
        // If not forcing, and date/field matched => skip
        if (!force && currentKey === analyzedKeyRef.current) return;

        setLoading(true);
        setError(null);
        try {
            const dataKey = JSON.stringify(dataRef.current);
            const res = await fetch(`/api/fields/${fieldId}/insight`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: dataKey,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Server error: ${res.status}`);
            }

            const result = await res.json();
            if (result.error) throw new Error(result.error);

            setInsight(result.insight);
            analyzedKeyRef.current = currentKey;
        } catch (err) {
            console.error("Insight Error:", err);
            setError(err instanceof Error ? err.message : "Could not analyze field data at this time.");
        } finally {
            setLoading(false);
        }
    }, [fieldId]);

    // Auto-generate on mount or when date changes
    useEffect(() => {
        const currentKey = `${fieldId}-${data.date}`;
        if (currentKey !== analyzedKeyRef.current) {
            generateInsight();
        }
    }, [fieldId, data.date, generateInsight]);

    return (
        <div className="card rounded-2xl p-5 border-2 border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-base">FarmScan AI Insight</h3>
                </div>
                {!loading && (
                    <button
                        onClick={() => generateInsight(true)}
                        className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-full transition-colors"
                        title="Refresh Analysis"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="min-h-[100px]">
                {loading ? (
                    <div className="space-y-3 animate-pulse">
                        <div className="h-4 bg-indigo-100 rounded w-3/4"></div>
                        <div className="h-4 bg-indigo-100 rounded w-full"></div>
                        <div className="h-4 bg-indigo-100 rounded w-5/6"></div>
                        <div className="h-4 bg-indigo-100 rounded w-2/3"></div>
                    </div>
                ) : error ? (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                ) : (
                    <div className="text-slate-700 leading-relaxed text-sm bg-white/60 p-4 rounded-xl border border-indigo-100/50">
                        {insight ? (
                            <div className="prose prose-sm prose-indigo max-w-none space-y-3">
                                {insight.split('\n').filter(line => line.trim() !== '').map((line, i) => {
                                    const isBullet = line.trim().startsWith('-') || line.trim().startsWith('*') || /^\d+\./.test(line.trim());
                                    return (
                                        <p key={i} className={`${isBullet ? 'pl-4 -indent-4' : ''}`}>
                                            {line.replace(/\*\*/g, '')}
                                        </p>
                                    );
                                })}
                            </div>
                        ) : (
                            <span className="text-slate-400 italic">No insight available.</span>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                <span>Powered by Gemini</span>
                <Sparkles className="w-3 h-3" />
            </div>
        </div>
    );
}
