import { createClient } from "@/lib/supabase/server";
import FieldDashboard from "./field-dashboard";
import { notFound } from "next/navigation";
import { FieldsBottomNav } from "../FieldsBottomNav";

export default async function FieldDetailPage({ params }: { params: Promise<{ fieldId: string }> }) {
    const { fieldId } = await params;
    const supabase = await createClient();

    const { data: field } = await supabase
        .from("fields")
        .select("*")
        .eq("id", fieldId)
        .single();

    if (!field) return notFound();

    // Fetch alerts with statistics
    const { data: alerts } = await supabase
        .from("alerts")
        .select("*")
        .eq("field_id", fieldId)
        .is("resolved_at", null)
        .order("detected_at", { ascending: false });

    const { data: readings } = await supabase
        .from("vegetation_readings")
        .select("*")
        .eq("field_id", fieldId)
        .order("date", { ascending: true });

    // Calculate VCI data -> DEFERRED to client
    const vciData = undefined;

    // Fetch Management Zones
    const { data: managementZones } = await supabase
        .from("management_zones")
        .select("*")
        .eq("field_id", fieldId)
        .order("analysis_date", { ascending: false })
        .limit(10);
    
    // Auto-generation logic removed for performance (can be triggered by client)

    // Historical Benchmark -> DEFERRED to client
    const benchmarkData = undefined;

    // Calculate statistical anomalies (simple version)
    let statisticalData = undefined;
    if (readings && readings.length >= 10) { // Reduced requirement for demo purposes
        try {
            const ndviValues = readings
                .map(r => r.ndvi_mean)
                .filter(v => v !== null && v !== undefined && !isNaN(v));
                
            if (ndviValues.length > 0) {
                const mean = ndviValues.reduce((a, b) => a + b, 0) / ndviValues.length;
                const variance = ndviValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / ndviValues.length;
                const stdDev = Math.sqrt(variance);
                const current = ndviValues[ndviValues.length - 1];
                const deviation = stdDev === 0 ? 0 : (current - mean) / stdDev;
                const isAnomaly = Math.abs(deviation) > 1.5;
                
                statisticalData = {
                    mean,
                    stdDev,
                    sigma: deviation,
                    isAnomaly,
                    message: isAnomaly 
                        ? `Abnormal vegetation pattern detected (${Math.abs(deviation).toFixed(1)}σ ${deviation > 0 ? 'above' : 'below'} avg)` 
                        : "Vegetation development is tracking within normal usage patterns"
                };
                console.log("✅ Statistical data calculated:", statisticalData);
            }
        } catch (e) {
            console.error("❌ Statistics calculation error:", e);
        }
    } else {
        console.log("⚠️ Not enough readings for statistical analysis (need 30+, have " + (readings?.length || 0) + ")");
    }

    // Group alerts by message and keep only the latest for each unique message
    const uniqueAlerts = alerts?.reduce<typeof alerts>((acc, alert) => {
        const existing = acc.find(a => a.message === alert.message);
        if (!existing || new Date(alert.detected_at) > new Date(existing.detected_at)) {
            return [...acc.filter(a => a.message !== alert.message), alert];
        }
        return acc;
    }, []) || [];

    // Process management zones (group by latest analysis date)
    const latestZoneDate = managementZones && managementZones[0]?.analysis_date;
    const latestZones = managementZones?.filter(z => z.analysis_date === latestZoneDate) || [];
    const processedZones = latestZones.map(z => ({
        zoneNumber: z.zone_number,
        zoneType: z.zone_type as "low" | "medium" | "high",
        avgNdvi: z.avg_ndvi,
        geometry: z.geometry, // Include geometry for map visualization
        recommendations: {
            nitrogen: z.recommendation_n,
            phosphorus: z.recommendation_p,
            potassium: z.recommendation_k
        }
    }));

    // Convert Geometry to simple array for Map [lat, lng]
    let polygonCoords: [number, number][] = [];
    if (field.geometry && (field.geometry as { coordinates?: number[][][] }).coordinates?.[0]) {
        const coords = (field.geometry as { coordinates: number[][][] }).coordinates[0];
        polygonCoords = coords.map((p: number[]) => [p[1], p[0]]);
    }

    const fieldInfo = {
        name: field.name,
        crop_type: field.crop_type || "",
        planting_date: field.planting_date ? new Date(field.planting_date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : null,
    };

    return (
        <div className="container mx-auto p-4">
            <FieldDashboard
                fieldId={field.id}
                fieldInfo={fieldInfo}
                polygon={polygonCoords}
                readings={readings || []}
                alerts={uniqueAlerts}
                vciData={vciData}
                managementZones={processedZones}
                managementZoneDate={latestZoneDate}
                benchmarkData={benchmarkData}
                statisticalData={statisticalData}
            />
            <FieldsBottomNav />
        </div>
    );
}
