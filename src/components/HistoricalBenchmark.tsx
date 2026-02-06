"use client";

import { Calendar, BarChart3, Award } from "lucide-react";
import { Badge } from "./ui/badge";

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

interface HistoricalBenchmarkProps {
    data: BenchmarkData;
}

export default function HistoricalBenchmark({ data }: HistoricalBenchmarkProps) {
    // Safety checks for empty/invalid data
    if (!data || !data.statistics || !data.comparisonYears) {
        return null;
    }

    const { statistics, interpretation, recommendations, currentYear, comparisonYears } = data;
    const performance = statistics.performance_vs_average || 0;
    
    // Determine performance level
    const getPerformanceStyles = () => {
        if (performance > 15) {
            return {
                bg: "bg-emerald-50",
                border: "border-emerald-300",
                text: "text-emerald-700",
                badge: "success",
                icon: "🌟",
                barColor: "bg-emerald-500"
            };
        } else if (performance > 5) {
            return {
                bg: "bg-green-50",
                border: "border-green-300",
                text: "text-green-700",
                badge: "success",
                icon: "✅",
                barColor: "bg-green-500"
            };
        } else if (performance > -5) {
            return {
                bg: "bg-blue-50",
                border: "border-blue-300",
                text: "text-blue-700",
                badge: "info",
                icon: "➡️",
                barColor: "bg-blue-500"
            };
        } else if (performance > -15) {
            return {
                bg: "bg-amber-50",
                border: "border-amber-300",
                text: "text-amber-700",
                badge: "warning",
                icon: "⚠️",
                barColor: "bg-amber-500"
            };
        } else {
            return {
                bg: "bg-red-50",
                border: "border-red-300",
                text: "text-red-700",
                badge: "destructive",
                icon: "🚨",
                barColor: "bg-red-500"
            };
        }
    };

    const styles = getPerformanceStyles();

    return (
        <div className="bg-white rounded-xl p-5 border-2 border-green-200 shadow-md">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-green-100 rounded-lg p-2">
                        <BarChart3 className="w-6 h-6 text-green-700" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="font-bold text-stone-900 text-lg">Historical Benchmark</h3>
                        <p className="text-sm text-stone-600">Season Comparison</p>
                    </div>
                </div>
                <Badge variant={styles.badge as "success" | "warning" | "destructive" | "info" | "default"} className="text-sm font-bold px-3 py-1.5">
                    {performance > 0 ? "+" : ""}{performance.toFixed(1)}%
                </Badge>
            </div>

            {/* Comparison Years */}
            <div className="flex items-center gap-2 mb-4 text-sm">
                <Calendar className="w-4 h-4 text-stone-600" strokeWidth={2.5} />
                <span className="text-stone-600">Comparing:</span>
                <span className="font-bold text-green-700">{currentYear}</span>
                <span className="text-stone-400">vs</span>
                <span className="font-medium text-stone-700">
                    {comparisonYears.length > 0 ? comparisonYears.join(", ") : "Previous 5 years"}
                </span>
            </div>

            {/* Performance Bar */}
            <div className={`${styles.bg} rounded-lg p-4 border-2 ${styles.border} mb-4`}>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-stone-700">Performance</span>
                    <span className="text-2xl">{styles.icon}</span>
                </div>
                <div className="h-3 bg-stone-200 rounded-full overflow-hidden mb-2">
                    <div
                        className={`h-full ${styles.barColor} transition-all duration-500`}
                        style={{ width: `${Math.min(100, Math.abs(performance) * 5)}%` }}
                    />
                </div>
                <p className={`text-sm font-bold ${styles.text}`}>{interpretation}</p>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-blue-50 rounded-lg p-3 border-2 border-blue-200">
                    <div className="text-xs text-blue-600 font-medium mb-1">Current Avg NDVI</div>
                    <div className="text-2xl font-bold text-blue-700">{statistics.current_avg.toFixed(2)}</div>
                </div>
                <div className="bg-stone-50 rounded-lg p-3 border-2 border-stone-200">
                    <div className="text-xs text-stone-600 font-medium mb-1">Historical Avg</div>
                    <div className="text-2xl font-bold text-stone-700">{statistics.historical_avg.toFixed(2)}</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 border-2 border-red-200">
                    <div className="text-xs text-red-600 font-medium mb-1">5-Year Min</div>
                    <div className="text-2xl font-bold text-red-700">{statistics.five_year_min.toFixed(2)}</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 border-2 border-emerald-200">
                    <div className="text-xs text-emerald-600 font-medium mb-1">5-Year Max</div>
                    <div className="text-2xl font-bold text-emerald-700">{statistics.five_year_max.toFixed(2)}</div>
                </div>
            </div>

            {/* Recommendations */}
            {recommendations && recommendations.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-stone-900">
                        <Award className="w-4 h-4 text-green-600" strokeWidth={2.5} />
                        <span>Insights</span>
                    </div>
                    <div className="space-y-2">
                        {recommendations.slice(0, 3).map((rec, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm text-stone-700 bg-stone-50 p-2 rounded-lg">
                                <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 shrink-0"></div>
                                <span>{rec}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
