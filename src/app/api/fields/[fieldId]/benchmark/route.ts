import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { compareWithHistoricalBenchmarks, storeBenchmark } from "@/lib/historical-benchmark";

/**
 * GET /api/fields/{fieldId}/benchmark
 * Compare current season with historical benchmarks
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ fieldId: string }> }
) {
    const { fieldId } = await params;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify field ownership
    const { data: field } = await supabase
        .from("fields")
        .select("id, planting_date")
        .eq("id", fieldId)
        .eq("user_id", user.id)
        .single();

    if (!field) {
        return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }

    if (!field.planting_date) {
        return NextResponse.json(
            { error: "Planting date not set for this field. Please update field information." },
            { status: 400 }
        );
    }

    const url = new URL(request.url);
    const currentYear = parseInt(url.searchParams.get("year") || new Date().getFullYear().toString());
    const yearsParam = url.searchParams.get("years"); // e.g., "2023,2024"
    const compareYears = yearsParam ? yearsParam.split(",").map(Number) : [];

    try {
        const comparison = await compareWithHistoricalBenchmarks(fieldId, currentYear, compareYears);

        return NextResponse.json({
            fieldId,
            currentYear: comparison.current_year,
            comparisonYears: comparison.comparison_years,
            dasRange: comparison.das_range,
            currentSeason: {
                data: comparison.current_data,
                avgNdvi: comparison.statistics.current_avg
            },
            historicalSeasons: comparison.historical_data,
            statistics: comparison.statistics,
            interpretation: comparison.interpretation,
            recommendations: getRecommendationsFromComparison(comparison.statistics.performance_vs_average)
        });

    } catch (error: unknown) {
        console.error("Benchmark Comparison Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to compare with historical benchmarks" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/fields/{fieldId}/benchmark
 * Store current season data as a benchmark for future comparisons
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ fieldId: string }> }
) {
    const { fieldId } = await params;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify field ownership
    const { data: field } = await supabase
        .from("fields")
        .select("id, planting_date")
        .eq("id", fieldId)
        .eq("user_id", user.id)
        .single();

    if (!field) {
        return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }

    if (!field.planting_date) {
        return NextResponse.json(
            { error: "Planting date not set for this field" },
            { status: 400 }
        );
    }

    try {
        const body = await request.json();
        const { year, ndviData, yieldActual, notes } = body;

        if (!year || !ndviData || !Array.isArray(ndviData)) {
            return NextResponse.json(
                { error: "Invalid request body. Required: year, ndviData (array)" },
                { status: 400 }
            );
        }

        await storeBenchmark(
            fieldId,
            year,
            new Date(field.planting_date),
            ndviData,
            yieldActual,
            notes
        );

        return NextResponse.json({
            message: "Benchmark stored successfully",
            fieldId,
            year,
            dataPoints: ndviData.length
        });

    } catch (error: unknown) {
        console.error("Store Benchmark Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to store benchmark" },
            { status: 500 }
        );
    }
}

function getRecommendationsFromComparison(performanceVsAverage: number): string[] {
    const recommendations: string[] = [];

    if (performanceVsAverage > 15) {
        recommendations.push("🌟 Excellent performance! Document current practices for future seasons.");
        recommendations.push("📊 Consider saving seeds from high-performing plants.");
        recommendations.push("✅ Current management strategy is highly effective.");
    } else if (performanceVsAverage > 5) {
        recommendations.push("✅ Performing well. Continue current management practices.");
        recommendations.push("📈 Consider minor optimizations for even better results.");
    } else if (performanceVsAverage > -5) {
        recommendations.push("➡️ On track. Monitor weather conditions and adjust irrigation as needed.");
        recommendations.push("🔍 Review nutrient management and pest control measures.");
    } else if (performanceVsAverage > -15) {
        recommendations.push("⚠️ Below average performance. Review the following:");
        recommendations.push("💧 Check irrigation system and water availability");
        recommendations.push("🌱 Assess nutrient levels and consider soil testing");
        recommendations.push("🐛 Inspect for pest or disease issues");
    } else {
        recommendations.push("🚨 Significant underperformance detected:");
        recommendations.push("💧 Immediate irrigation assessment required");
        recommendations.push("🔬 Conduct soil and plant tissue analysis");
        recommendations.push("🐛 Comprehensive pest and disease survey needed");
        recommendations.push("📞 Consider consulting with agricultural extension services");
    }

    return recommendations;
}
