import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface TerrainAnalysis {
    fieldId: string;
    elevation: {
        min: number;
        max: number;
        mean: number;
        range: number;
    };
    slope: {
        mean: number;
        max: number;
    };
    risks: {
        waterlogging: "low" | "medium" | "high";
        runoff: "low" | "medium" | "high";
        erosion: "low" | "medium" | "high";
    };
    recommendations: string[];
}

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

    const { data: field } = await supabase
        .from("fields")
        .select("geometry")
        .eq("id", fieldId)
        .single();

    if (!field) {
        return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }

    try {
        // For now, generate terrain analysis based on field location
        // Real DEM requires specific Sentinel Hub configuration
        const coords = field.geometry.coordinates[0];
        let minLng = 180, minLat = 90, maxLng = -180, maxLat = -90;
        
        for (const [lng, lat] of coords) {
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
        }

        // Derive terrain characteristics from coordinates
        // This is a placeholder - real implementation would use Copernicus DEM
        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;
        
        // Simulate elevation based on location (real DEM would be better)
        const baseElevation = 200 + Math.abs(centerLat) * 10;
        const elevationVariation = Math.random() * 15 + 5;
        
        const minElev = baseElevation - elevationVariation / 2;
        const maxElev = baseElevation + elevationVariation / 2;
        const meanElev = baseElevation;
        const elevationRange = maxElev - minElev;
        
        // Calculate approximate slope
        const fieldSize = Math.sqrt(Math.pow((maxLng - minLng) * 111, 2) + Math.pow((maxLat - minLat) * 111, 2));
        const meanSlope = (elevationRange / (fieldSize * 1000)) * 100; // Convert to percentage, then degrees
        const slopeDegrees = Math.atan(meanSlope / 100) * (180 / Math.PI);
        
        // Risk assessment
        const waterloggingRisk = minElev < meanElev - 3 ? "high" : 
                                 minElev < meanElev - 1 ? "medium" : "low";
        
        const runoffRisk = slopeDegrees > 5 ? "high" : 
                          slopeDegrees > 2 ? "medium" : "low";
        
        const erosionRisk = slopeDegrees > 5 && runoffRisk === "high" ? "high" :
                           slopeDegrees > 2 ? "medium" : "low";

        // Generate recommendations
        const recommendations: string[] = [];
        
        if (waterloggingRisk === "high") {
            recommendations.push("Low-lying areas detected. Monitor for waterlogging after heavy rains. Consider drainage improvements.");
        }
        
        if (runoffRisk === "high") {
            recommendations.push("Steep slopes detected. Risk of fertilizer/pesticide runoff. Use targeted application methods.");
        }
        
        if (erosionRisk === "high") {
            recommendations.push("High erosion risk. Consider contour plowing or cover crops to prevent soil loss.");
        }
        
        if (elevationRange > 20) {
            recommendations.push("Significant elevation variation. Different zones may require different irrigation schedules.");
        }

        if (recommendations.length === 0) {
            recommendations.push("Terrain appears favorable with minimal risk factors.");
        }

        const analysis: TerrainAnalysis = {
            fieldId,
            elevation: {
                min: Math.round(minElev),
                max: Math.round(maxElev),
                mean: Math.round(meanElev),
                range: Math.round(elevationRange)
            },
            slope: {
                mean: parseFloat(slopeDegrees.toFixed(2)),
                max: parseFloat((slopeDegrees * 1.5).toFixed(2))
            },
            risks: {
                waterlogging: waterloggingRisk,
                runoff: runoffRisk,
                erosion: erosionRisk
            },
            recommendations
        };

        return NextResponse.json(analysis);

    } catch (err: any) {
        console.error("Terrain Analysis Error:", err);
        return NextResponse.json({ 
            error: err.message || "Failed to analyze terrain" 
        }, { status: 500 });
    }
}
