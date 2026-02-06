import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { calculateVCI, getVCIMap } from "@/lib/vci-service";

/**
 * GET /api/fields/{fieldId}/vci
 * Calculate Vegetation Condition Index for drought monitoring
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
        .select("id")
        .eq("id", fieldId)
        .eq("user_id", user.id)
        .single();

    if (!field) {
        return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const date = url.searchParams.get("date") || new Date().toISOString();
    const includeMap = url.searchParams.get("includeMap") === "true";

    try {
        const vciResult = await calculateVCI(fieldId, date);
        
        let mapUrl: string | undefined;
        if (includeMap) {
            mapUrl = await getVCIMap(
                fieldId,
                date,
                vciResult.ndvi_min,
                vciResult.ndvi_max
            );
        }

        return NextResponse.json({
            fieldId,
            date,
            vci: vciResult.vci,
            ndvi_current: vciResult.ndvi_current,
            ndvi_min: vciResult.ndvi_min,
            ndvi_max: vciResult.ndvi_max,
            severity: vciResult.severity,
            interpretation: vciResult.interpretation,
            mapUrl,
            recommendations: getVCIRecommendations(vciResult.vci, vciResult.severity)
        });

    } catch (error: unknown) {
        console.error("VCI Calculation Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to calculate VCI" },
            { status: 500 }
        );
    }
}

function getVCIRecommendations(vci: number, severity: string): string[] {
    const recommendations: string[] = [];

    if (severity === "severe_drought" || severity === "poor") {
        recommendations.push("🚨 Immediate irrigation recommended if water availability permits");
        recommendations.push("💧 Reduce plant stress through mulching and water conservation");
        recommendations.push("🌾 Consider early harvest if conditions continue to deteriorate");
        recommendations.push("📊 Monitor soil moisture levels daily");
    } else if (severity === "moderate") {
        recommendations.push("⚠️ Increase irrigation frequency");
        recommendations.push("🔍 Monitor crop status closely over next 7 days");
        recommendations.push("💦 Ensure efficient water delivery systems are functioning");
    } else if (severity === "good") {
        recommendations.push("✅ Maintain current irrigation schedule");
        recommendations.push("🌱 Good conditions for applying fertilizers if needed");
    } else if (severity === "excellent") {
        recommendations.push("🌟 Optimal growing conditions");
        recommendations.push("📈 Good time for growth-promoting activities");
    }

    return recommendations;
}
