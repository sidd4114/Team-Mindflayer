import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generateManagementZones, storeManagementZones, generateVRAMap } from "@/lib/management-zones";
import { getNDVITimeSeries } from "@/lib/sentinel/statistics";

/**
 * GET /api/fields/{fieldId}/management-zones
 * Retrieve existing management zones or generate new ones
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
        .select("id, geometry, crop_type")
        .eq("id", fieldId)
        .eq("user_id", user.id)
        .single();

    if (!field) {
        return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const format = url.searchParams.get("format"); // 'json' or 'vra'

    try {
        if (format === "vra") {
            // Generate VRA Map for export
            const vraMap = await generateVRAMap(fieldId);
            return NextResponse.json(vraMap);
        }

        // Get latest management zones
        const { data: zones, error } = await supabase
            .from("management_zones")
            .select("*")
            .eq("field_id", fieldId)
            .order("analysis_date", { ascending: false })
            .limit(10);

        if (error) {
            throw new Error(error.message);
        }

        if (!zones || zones.length === 0) {
            return NextResponse.json({
                message: "No management zones found. Use POST to generate zones.",
                zones: []
            });
        }

        // Group by analysis date
        const latestDate = zones[0].analysis_date;
        const latestZones = zones.filter(z => z.analysis_date === latestDate);

        return NextResponse.json({
            fieldId,
            analysisDate: latestDate,
            totalZones: latestZones.length,
            zones: latestZones.map(z => ({
                zoneNumber: z.zone_number,
                zoneType: z.zone_type,
                geometry: z.geometry,
                avgNdvi: z.avg_ndvi,
                recommendations: {
                    nitrogen: z.recommendation_n,
                    phosphorus: z.recommendation_p,
                    potassium: z.recommendation_k
                }
            }))
        });

    } catch (error: unknown) {
        console.error("Management Zones Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to retrieve management zones" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/fields/{fieldId}/management-zones
 * Generate new management zones based on current NDVI data
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
        .select("id, geometry, crop_type")
        .eq("id", fieldId)
        .eq("user_id", user.id)
        .single();

    if (!field) {
        return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }

    try {
        const body = await request.json();
        const date = body.date || new Date().toISOString();
        const threshold = body.threshold || 0.1; // NDVI threshold for zone separation

        // Get recent NDVI time series
        const toDate = new Date(date);
        const fromDate = new Date(toDate);
        fromDate.setDate(fromDate.getDate() - 14); // Last 2 weeks

        const timeSeries = await getNDVITimeSeries({
            geometry: field.geometry,
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
            intervalDays: 7
        });

        if (timeSeries.length === 0) {
            return NextResponse.json(
                { error: "No NDVI data available for zone generation" },
                { status: 400 }
            );
        }

        // Use latest NDVI mean
        const latestNDVI = timeSeries[timeSeries.length - 1].mean;

        // Clean slate: Delete ALL existing management zones for this field
        await supabase
            .from("management_zones")
            .delete()
            .eq("field_id", fieldId);

        // Generate zones
        const zones = await generateManagementZones(fieldId, latestNDVI, threshold);

        // Store zones in database
        const analysisDate = new Date(date).toISOString().split('T')[0];
        await storeManagementZones(fieldId, zones, analysisDate);

        return NextResponse.json({
            message: "Management zones generated successfully",
            fieldId,
            analysisDate,
            totalZones: zones.length,
            avgNdvi: latestNDVI,
            zones: zones.map(z => ({
                zoneNumber: z.zone_number,
                zoneType: z.zone_type,
                avgNdvi: z.avg_ndvi,
                recommendations: {
                    nitrogen: z.recommendation_n,
                    phosphorus: z.recommendation_p,
                    potassium: z.recommendation_k
                }
            }))
        });

    } catch (error: unknown) {
        console.error("Management Zone Generation Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to generate management zones" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/fields/{fieldId}/management-zones
 * Delete management zones for a specific date
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ fieldId: string }> }
) {
    const { fieldId } = await params;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const date = url.searchParams.get("date");

    if (!date) {
        return NextResponse.json({ error: "Date parameter required" }, { status: 400 });
    }

    try {
        const { error } = await supabase
            .from("management_zones")
            .delete()
            .eq("field_id", fieldId)
            .eq("analysis_date", date);

        if (error) {
            throw new Error(error.message);
        }

        return NextResponse.json({
            message: "Management zones deleted successfully",
            fieldId,
            date
        });

    } catch (error: unknown) {
        console.error("Delete Management Zones Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to delete management zones" },
            { status: 500 }
        );
    }
}
