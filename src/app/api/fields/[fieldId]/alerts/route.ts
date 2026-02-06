import { createClient } from "@/lib/supabase/server";
import { getNDVITimeSeries } from "@/lib/sentinel/statistics";
import { detectNDVIAnomalies, detectStatisticalAnomalies } from "@/lib/anomaly";
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
    const includeStatistics = url.searchParams.get("includeStatistics") === "true";

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

            // 3. Detect Anomalies (Standard)
            const detectedAlerts = detectNDVIAnomalies(timeSeries);

            // 4. Enhanced Statistical Anomaly Detection
            const statisticalResult = detectStatisticalAnomalies(timeSeries, 30);

            if (statisticalResult.isAnomaly) {
                // Add statistical anomaly as alert
                detectedAlerts.push({
                    type: "ndvi_drop",
                    severity: "high",
                    message: statisticalResult.message
                });
            }

            // 5. Upsert Alerts
            if (detectedAlerts.length > 0) {
                // Check for existing unresolved alerts of the same type today
                const today = new Date().toISOString().split('T')[0];
                const { data: existingAlerts } = await supabase
                    .from("alerts")
                    .select("id, type")
                    .eq("field_id", fieldId)
                    .is("resolved_at", null)
                    .gte("detected_at", today);

                // Only insert new alert types
                const existingTypes = new Set(existingAlerts?.map(a => a.type) || []);
                const newAlerts = detectedAlerts.filter(a => !existingTypes.has(a.type));

                if (newAlerts.length > 0) {
                    const alertRows = newAlerts.map(a => ({
                        field_id: fieldId,
                        type: a.type,
                        severity: a.severity,
                        message: a.message,
                        detected_at: new Date().toISOString()
                    }));

                    await supabase.from("alerts").insert(alertRows);
                }
            }

            // 6. Save readings to database
            const readings = timeSeries.map(pt => ({
                field_id: fieldId,
                date: pt.date.split("T")[0],
                ndvi_mean: pt.mean,
                ndvi_std: pt.stdDev,
                valid_pixel_ratio: pt.validRatio
            }));
            await supabase.from("vegetation_readings").upsert(readings, { onConflict: "field_id, date" });
        }

        // 7. Fetch Active Alerts
        const { data: alerts } = await supabase
            .from("alerts")
            .select("*")
            .eq("field_id", fieldId)
            .is("resolved_at", null) // Only active
            .order("detected_at", { ascending: false });

        // 8. Include statistical analysis if requested
        let statistics = null;
        if (includeStatistics) {
            const { data: field } = await supabase.from("fields").select("geometry, planting_date").eq("id", fieldId).single();
            if (field) {
                const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
                const timeSeries = await getNDVITimeSeries({
                    geometry: field.geometry,
                    from,
                    to: new Date().toISOString(),
                    intervalDays: 3
                });
                statistics = detectStatisticalAnomalies(timeSeries, 30);
            }
        }

        return NextResponse.json({
            alerts,
            statistics: includeStatistics ? statistics : undefined,
            lastUpdated: new Date().toISOString()
        });

    } catch (err: any) {
        console.error("Alerts Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
