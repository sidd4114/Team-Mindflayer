import { createClient } from "@/lib/supabase/server";
import { getNDVITimeSeries } from "@/lib/sentinel/statistics";
import { detectNDVIAnomalies } from "@/lib/anomaly";
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

    const url = new URL(request.url);
    const refresh = url.searchParams.get("refresh") === "true";

    try {
        if (refresh) {
            // 1. Fetch Field
            const { data: field } = await supabase.from("fields").select("geometry, planting_date").eq("id", fieldId).single();
            if (!field) throw new Error("Field not found");

            // 2. Fetch Time Series (Fresh)
            const from = field.planting_date ? new Date(field.planting_date).toISOString() : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
            const timeSeries = await getNDVITimeSeries({
                geometry: field.geometry,
                from,
                to: new Date().toISOString(),
                intervalDays: 3
            });

            // 3. Detect Anomalies
            const detectedAlerts = detectNDVIAnomalies(timeSeries);

            // 4. Upsert Alerts
            if (detectedAlerts.length > 0) {
                // We need to avoid duplicates. 
                // For this demo, we'll insert new alerts. In prod, we might check if same alert exists for same day.
                // We'll insert and let user resolve them.
                const alertRows = detectedAlerts.map(a => ({
                    field_id: fieldId,
                    type: a.type,
                    severity: a.severity,
                    message: a.message,
                    detected_at: new Date().toISOString()
                }));

                await supabase.from("alerts").insert(alertRows);
            }

            // Upsert readings too to keep in sync? Yes, theoretically. The timeseries fetch call just returns data, doesn't save.
            // But `timeseries` route saves. Here we just analyze. 
            // Good practice: save the readings too.
            const readings = timeSeries.map(pt => ({
                field_id: fieldId,
                date: pt.date.split("T")[0],
                ndvi_mean: pt.mean,
                ndvi_std: pt.stdDev,
                valid_pixel_ratio: pt.validRatio
            }));
            await supabase.from("vegetation_readings").upsert(readings, { onConflict: "field_id, date" });
        }

        // 5. Fetch Active Alerts
        const { data: alerts } = await supabase
            .from("alerts")
            .select("*")
            .eq("field_id", fieldId)
            .is("resolved_at", null) // Only active
            .order("detected_at", { ascending: false });

        return NextResponse.json(alerts);

    } catch (err: any) {
        console.error("Alerts Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
