import { createClient } from "@/lib/supabase/server";
import { getNDVITimeSeries } from "./sentinel/statistics";
import { getSentinelToken } from "./sentinel/auth";
import { createVCIVisualizationEvalscript } from "./sentinel/evalscripts-advanced";

interface VCIResult {
    vci: number;
    ndvi_current: number;
    ndvi_min: number;
    ndvi_max: number;
    interpretation: string;
    severity: "excellent" | "good" | "moderate" | "poor" | "severe_drought";
}

/**
 * Calculate Vegetation Condition Index (VCI) for drought monitoring
 * VCI = ((NDVI_current - NDVI_min) / (NDVI_max - NDVI_min)) * 100
 */
export async function calculateVCI(
    fieldId: string,
    currentDate: string
): Promise<VCIResult> {
    const supabase = await createClient();

    // Get field geometry
    const { data: field } = await supabase
        .from("fields")
        .select("geometry, planting_date")
        .eq("id", fieldId)
        .single();

    if (!field) {
        throw new Error("Field not found");
    }

    // Get current NDVI
    const toDate = new Date(currentDate);
    const fromDate = new Date(toDate);
    fromDate.setDate(fromDate.getDate() - 3);

    const currentTimeSeries = await getNDVITimeSeries({
        geometry: field.geometry,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        intervalDays: 1
    });

    if (currentTimeSeries.length === 0) {
        throw new Error("No NDVI data available for current date");
    }

    const ndvi_current = currentTimeSeries[currentTimeSeries.length - 1].mean;

    // Get historical min/max for the same time period (DOY - Day of Year)
    const doy = getDayOfYear(toDate);
    const doyStart = doy - 7; // ±7 days window
    const doyEnd = doy + 7;

    const { data: historicalStats } = await supabase
        .from("ndvi_statistics")
        .select("*")
        .eq("field_id", fieldId)
        .lte("doy_start", doy)
        .gte("doy_end", doy)
        .order("year", { ascending: false })
        .limit(5);

    let ndvi_min: number, ndvi_max: number;

    if (historicalStats && historicalStats.length > 0) {
        // Use historical statistics
        ndvi_min = Math.min(...historicalStats.map(s => s.ndvi_min));
        ndvi_max = Math.max(...historicalStats.map(s => s.ndvi_max));
    } else {
        // Calculate from available time series if no historical data
        const historicalStart = new Date(toDate);
        historicalStart.setFullYear(historicalStart.getFullYear() - 2);

        const historicalTimeSeries = await getNDVITimeSeries({
            geometry: field.geometry,
            from: historicalStart.toISOString(),
            to: toDate.toISOString(),
            intervalDays: 7
        });

        if (historicalTimeSeries.length === 0) {
            throw new Error("Insufficient historical data for VCI calculation");
        }

        const ndviValues = historicalTimeSeries.map(t => t.mean);
        ndvi_min = Math.min(...ndviValues);
        ndvi_max = Math.max(...ndviValues);

        // Store for future use
        const currentYear = toDate.getFullYear();
        await supabase.from("ndvi_statistics").upsert({
            field_id: fieldId,
            year: currentYear,
            doy_start: doyStart,
            doy_end: doyEnd,
            ndvi_min,
            ndvi_max,
            ndvi_mean: ndvi_current,
            sample_count: historicalTimeSeries.length
        });
    }

    // Calculate VCI
    const vci = ((ndvi_current - ndvi_min) / (ndvi_max - ndvi_min)) * 100;

    // Interpret VCI
    let interpretation: string;
    let severity: VCIResult["severity"];

    if (vci >= 80) {
        interpretation = "Excellent vegetation conditions. No drought stress detected.";
        severity = "excellent";
    } else if (vci >= 60) {
        interpretation = "Good vegetation conditions with minor stress.";
        severity = "good";
    } else if (vci >= 40) {
        interpretation = "Moderate drought conditions. Monitor closely.";
        severity = "moderate";
    } else if (vci >= 20) {
        interpretation = "Poor vegetation health. Significant drought stress.";
        severity = "poor";
    } else {
        interpretation = "Severe drought conditions. Immediate intervention recommended.";
        severity = "severe_drought";
    }

    return {
        vci,
        ndvi_current,
        ndvi_min,
        ndvi_max,
        interpretation,
        severity
    };
}

/**
 * Generate VCI visualization map
 */
export async function getVCIMap(
    fieldId: string,
    date: string,
    ndvi_min: number,
    ndvi_max: number
): Promise<string> {
    const supabase = await createClient();
    const token = await getSentinelToken();

    const { data: field } = await supabase
        .from("fields")
        .select("geometry")
        .eq("id", fieldId)
        .single();

    if (!field) {
        throw new Error("Field not found");
    }

    // Calculate bbox from geometry
    const coords = field.geometry.coordinates[0];
    let minLng = 180, minLat = 90, maxLng = -180, maxLat = -90;
    
    for (const [lng, lat] of coords) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
    }

    const targetDate = new Date(date);
    const fromDate = new Date(targetDate);
    fromDate.setDate(fromDate.getDate() - 3);
    const toDate = new Date(targetDate);
    toDate.setDate(toDate.getDate() + 1);

    const evalscript = createVCIVisualizationEvalscript(ndvi_min, ndvi_max);

    const response = await fetch('https://services.sentinel-hub.com/api/v1/process', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'image/png',
        },
        body: JSON.stringify({
            input: {
                bounds: {
                    bbox: [minLng, minLat, maxLng, maxLat],
                    properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" }
                },
                data: [{
                    type: "sentinel-2-l2a",
                    dataFilter: {
                        timeRange: { from: fromDate.toISOString(), to: toDate.toISOString() },
                        mosaickingOrder: "leastCC",
                        maxCloudCoverage: 30
                    }
                }]
            },
            output: {
                width: 1024,
                height: 1024,
                responses: [{
                    identifier: "default",
                    format: { type: "image/png" }
                }]
            },
            evalscript
        })
    });

    if (!response.ok) {
        throw new Error("Failed to generate VCI map");
    }

    const imageBuffer = await response.arrayBuffer();
    return `data:image/png;base64,${Buffer.from(imageBuffer).toString('base64')}`;
}

/**
 * Helper: Get Day of Year (1-365/366)
 */
function getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}
