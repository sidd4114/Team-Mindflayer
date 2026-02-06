import { createClient } from "@/lib/supabase/server";
import { getNDVITimeSeries } from "@/lib/sentinel/statistics";
import { detectNDVIAnomalies, detectStatisticalAnomalies } from "@/lib/anomaly";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

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

    try {
        // 1. Fetch Field
        const { data: field, error: fieldError } = await supabase.from("fields").select("geometry, planting_date").eq("id", fieldId).single();
        if (fieldError || !field) {
            return NextResponse.json({ error: "Field not found" }, { status: 404 });
        }
        if (!field.geometry) {
            return NextResponse.json({ error: "Field has no boundary. Add a field boundary to run analysis." }, { status: 400 });
        }

        // 2. Fetch Time Series
        const from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
        const to = new Date().toISOString();

        const timeSeries = await getNDVITimeSeries({
            geometry: field.geometry,
            from,
            to,
            intervalDays: 3
        });

        // 3. Save Readings
        if (timeSeries.length > 0) {
            const readings = timeSeries.map(pt => ({
                field_id: fieldId,
                date: pt.date.split("T")[0],
                ndvi_mean: pt.mean,
                ndvi_std: pt.stdDev,
                valid_pixel_ratio: pt.validRatio
            }));

            const { error: upsertError } = await supabase
                .from("vegetation_readings")
                .upsert(readings, { onConflict: "field_id, date" });

            if (upsertError) {
                console.error("Upsert Error:", upsertError);
                // If upsert fails due to missing constraint, try insert
                // (Note: This might cause duplicates if unique constraint is missing)
                await supabase.from("vegetation_readings").insert(readings);
            }
        }

        // 4. Detect Anomalies
        const newAlerts = detectNDVIAnomalies(timeSeries);

        // 5. Save Alerts
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

        // 5b. Statistical anomaly notification (2σ rule)
        if (timeSeries.length >= 3) {
            const stats = detectStatisticalAnomalies(timeSeries, 30);
            if (stats.isAnomaly) {
                await supabase.from("notifications").insert({
                    user_id: user.id,
                    field_id: fieldId,
                    type: "statistical_anomaly",
                    title: "Sudden health drop detected",
                    body: stats.message,
                    severity: "high",
                });
            }
        }

        // 6. Revalidate pages
        revalidatePath(`/fields/${fieldId}`);
        revalidatePath("/fields");

        return NextResponse.json({
            success: true,
            data: {
                readingsCount: timeSeries.length,
                alertsCount: newAlerts.length,
                latestNDVI: timeSeries.length > 0 ? timeSeries[timeSeries.length - 1].mean : null
            }
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Analysis failed";
        console.error("Analysis Error:", err);
        // User-friendly messages for known failures
        const userMessage =
            message.includes("Missing Sentinel Hub credentials")
                ? "Satellite data is not configured. Add SH_CLIENT_ID and SH_CLIENT_SECRET to enable analysis."
                : message.includes("Sentinel Hub Auth Failed")
                    ? "Satellite service authentication failed. Check your Sentinel Hub credentials."
                    : message.includes("Statistics API Error")
                        ? "Satellite data request failed. The service may be busy or the area has no data."
                        : message;
        return NextResponse.json({ error: userMessage }, { status: 500 });
    }
}
