import { createClient } from "@/lib/supabase/server";
import { getNDVITimeSeries } from "./sentinel/statistics";

export interface BenchmarkComparison {
    current_year: number;
    comparison_years: number[];
    das_range: { start: number; end: number };
    current_data: Array<{ das: number; ndvi: number; date: string }>;
    historical_data: Record<number, Array<{ das: number; ndvi: number; date: string }>>;
    statistics: {
        current_avg: number;
        historical_avg: number;
        five_year_min: number;
        five_year_max: number;
        performance_vs_average: number; // Percentage difference
    };
    interpretation: string;
}

/**
 * Calculate Days After Sowing (DAS) for a given date
 */
function calculateDAS(plantingDate: Date, currentDate: Date): number {
    const diff = currentDate.getTime() - plantingDate.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return days;
}

/**
 * Compare current season performance against historical benchmarks
 */
export async function compareWithHistoricalBenchmarks(
    fieldId: string,
    currentYear: number,
    compareYears: number[] = []
): Promise<BenchmarkComparison> {
    const supabase = await createClient();

    // Get field info
    const { data: field, error: fieldError } = await supabase
        .from("fields")
        .select("geometry, planting_date")
        .eq("id", fieldId)
        .single();

    if (fieldError || !field || !field.planting_date) {
        throw new Error("Field not found or planting date not specified");
    }

    const plantingDate = new Date(field.planting_date);
    const currentDate = new Date();
    const currentDAS = calculateDAS(plantingDate, currentDate);

    // Fetch current season data (ensure from <= to for Statistics API)
    let currentSeasonStart = new Date(plantingDate);
    const currentSeasonEnd = new Date();
    if (currentSeasonStart.getTime() > currentSeasonEnd.getTime()) {
        // Planting date is in the future: use last 90 days instead
        currentSeasonStart = new Date(currentSeasonEnd);
        currentSeasonStart.setDate(currentSeasonStart.getDate() - 90);
    }

    const currentTimeSeries = await getNDVITimeSeries({
        geometry: field.geometry,
        from: currentSeasonStart.toISOString(),
        to: currentSeasonEnd.toISOString(),
        intervalDays: 7
    });

    // Convert to DAS
    const current_data = currentTimeSeries.map(point => ({
        das: calculateDAS(plantingDate, new Date(point.date)),
        ndvi: point.mean,
        date: point.date
    }));

    // Fetch historical benchmarks from database
    const { data: historicalBenchmarks } = await supabase
        .from("season_benchmarks")
        .select("*")
        .eq("field_id", fieldId)
        .in("year", compareYears.length > 0 ? compareYears : [currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4, currentYear - 5])
        .order("year", { ascending: true });

    const historical_data: Record<number, Array<{ das: number; ndvi: number; date: string }>> = {};

    if (historicalBenchmarks && historicalBenchmarks.length > 0) {
        // Use stored benchmarks
        for (const benchmark of historicalBenchmarks) {
            if (!historical_data[benchmark.year]) {
                historical_data[benchmark.year] = [];
            }
            historical_data[benchmark.year].push({
                das: benchmark.das_start,
                ndvi: benchmark.ndvi_mean,
                date: "" // Not stored in benchmark
            });
        }
    } else {
        // Fallback: Try to fetch Sentinel data for previous years (if planting dates similar)
        // This is complex and requires stored planting dates for previous years
        // For now, return empty historical data
        console.warn("No historical benchmarks found. Consider storing season data.");
    }

    // Calculate statistics
    const currentAvg = current_data.reduce((sum, d) => sum + d.ndvi, 0) / current_data.length;
    
    const allHistoricalNDVI: number[] = [];
    Object.values(historical_data).forEach(yearData => {
        yearData.forEach(d => allHistoricalNDVI.push(d.ndvi));
    });

    const historicalAvg = allHistoricalNDVI.length > 0
        ? allHistoricalNDVI.reduce((sum, v) => sum + v, 0) / allHistoricalNDVI.length
        : currentAvg;

    const fiveYearMin = allHistoricalNDVI.length > 0 ? Math.min(...allHistoricalNDVI) : currentAvg;
    const fiveYearMax = allHistoricalNDVI.length > 0 ? Math.max(...allHistoricalNDVI) : currentAvg;

    const performanceVsAverage = ((currentAvg - historicalAvg) / historicalAvg) * 100;

    // Interpretation
    let interpretation: string;
    if (performanceVsAverage > 15) {
        interpretation = "🌟 Excellent! Current season is performing significantly better than historical average.";
    } else if (performanceVsAverage > 5) {
        interpretation = "✅ Good! Slightly above historical performance.";
    } else if (performanceVsAverage > -5) {
        interpretation = "➡️ On track. Performance is similar to historical average.";
    } else if (performanceVsAverage > -15) {
        interpretation = "⚠️ Below average. Monitor closely and consider interventions.";
    } else {
        interpretation = "🚨 Significant underperformance compared to historical data. Immediate action recommended.";
    }

    return {
        current_year: currentYear,
        comparison_years: Object.keys(historical_data).map(Number),
        das_range: { start: 0, end: currentDAS },
        current_data,
        historical_data,
        statistics: {
            current_avg: currentAvg,
            historical_avg: historicalAvg,
            five_year_min: fiveYearMin,
            five_year_max: fiveYearMax,
            performance_vs_average: performanceVsAverage
        },
        interpretation
    };
}

/**
 * Store current season as a benchmark for future comparisons
 */
export async function storeBenchmark(
    fieldId: string,
    year: number,
    plantingDate: Date,
    ndviData: Array<{ date: string; ndvi: number }>,
    yieldActual?: number,
    notes?: string
): Promise<void> {
    const supabase = await createClient();

    // Group by DAS ranges (e.g., every 14 days)
    const dasInterval = 14;
    const benchmarks: Array<{
        field_id: string;
        year: number;
        das_start: number;
        das_end: number;
        ndvi_mean: number;
        ndvi_min: number;
        ndvi_max: number;
        yield_actual?: number;
        notes?: string;
    }> = [];

    const dataByDAS = ndviData.map(d => ({
        das: calculateDAS(plantingDate, new Date(d.date)),
        ndvi: d.ndvi
    }));

    const maxDAS = Math.max(...dataByDAS.map(d => d.das));
    
    for (let dasStart = 0; dasStart < maxDAS; dasStart += dasInterval) {
        const dasEnd = dasStart + dasInterval;
        const relevantData = dataByDAS.filter(d => d.das >= dasStart && d.das < dasEnd);

        if (relevantData.length > 0) {
            const ndviValues = relevantData.map(d => d.ndvi);
            benchmarks.push({
                field_id: fieldId,
                year,
                das_start: dasStart,
                das_end: dasEnd,
                ndvi_mean: ndviValues.reduce((sum, v) => sum + v, 0) / ndviValues.length,
                ndvi_min: Math.min(...ndviValues),
                ndvi_max: Math.max(...ndviValues),
                yield_actual: yieldActual,
                notes
            });
        }
    }

    // Upsert benchmarks
    const { error } = await supabase
        .from("season_benchmarks")
        .upsert(benchmarks, { onConflict: "field_id,year,das_start,das_end" });

    if (error) {
        throw new Error(`Failed to store benchmark: ${error.message}`);
    }
}
