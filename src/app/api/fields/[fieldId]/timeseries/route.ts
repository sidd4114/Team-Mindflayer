import { createClient } from "@/lib/supabase/server";
import { getNDVITimeSeries } from "@/lib/sentinel/statistics";
import { NextResponse } from "next/server";

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

    // Fetch field
    const { data: field, error: fieldError } = await supabase
        .from("fields")
        .select("geometry, planting_date")
        .eq("id", fieldId)
        .single();

    if (fieldError || !field) {
        return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const defaultFrom = field.planting_date ? new Date(field.planting_date).toISOString() : new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
    const from = url.searchParams.get("from") || defaultFrom;
    const to = url.searchParams.get("to") || new Date().toISOString();

    try {
        // 1. Fetch from Sentinel
        const timeSeries = await getNDVITimeSeries({
            geometry: field.geometry,
            from,
            to,
            intervalDays: 5 // 5-day aggregation
        });

        // 2. Upsert into database
        // Batch upsert
        if (timeSeries.length > 0) {
            const rows = timeSeries.map(pt => ({
                field_id: fieldId,
                date: pt.date.split("T")[0], // YYYY-MM-DD
                ndvi_mean: pt.mean,
                ndvi_std: pt.stdDev,
                valid_pixel_ratio: pt.validRatio,
                cloud_cover: 0, // Not explicitly returned by my simplified Stat API logic, placeholder or inferred
                // Other indices are null unless we calculate them too. 
                // The prompt asked for NDVI timeseries specifically here.
            }));

            const { error: upsertError } = await supabase
                .from("vegetation_readings")
                .upsert(rows, { onConflict: "field_id, date" });

            if (upsertError) {
                console.error("Supabase Upsert Error:", upsertError);
                // Continue anyway to return data to user? Or fail? 
                // Let's log but return data.
            }
        }

        // 3. Return combined data (or just what we fetched)
        // Optionally fetch ALL readings from DB to ensure completeness?
        // For now, return what we just fetched as requested.
        return NextResponse.json(timeSeries);

    } catch (err: any) {
        console.error("Time-series Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
