import { SENTINEL_CONFIG } from "@/config/sentinel";
import { TimeSeriesPoint } from "./sentinel/statistics";

export interface Alert {
    type: "ndvi_drop" | "low_ndvi";
    severity: "low" | "medium" | "high";
    message: string;
}

export function detectNDVIAnomalies(
    timeseries: TimeSeriesPoint[],
    thresholds: { dropFraction: number; minNdvi: number } = {
        dropFraction: SENTINEL_CONFIG.NDVI_DROP_FRACTION,
        minNdvi: SENTINEL_CONFIG.MIN_NDVI_THRESHOLD
    }
): Alert[] {
    if (timeseries.length < 2) return [];

    // Sort by date ascending
    const sorted = [...timeseries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const latest = sorted[sorted.length - 1];
    const alerts: Alert[] = [];

    // 1. Check absolute threshold
    if (latest.mean < thresholds.minNdvi) {
        alerts.push({
            type: "low_ndvi",
            severity: "high",
            message: `Current NDVI (${latest.mean.toFixed(2)}) is below critical threshold (${thresholds.minNdvi}).`
        });
    }

    // 2. Check rolling mean drop (approx 4 weeks)
    // Get data from previous 28 days excluding the latest reading (to compare against history)
    const oneDay = 24 * 60 * 60 * 1000;
    const latestDate = new Date(latest.date).getTime();
    const validHistory = sorted.filter(p => {
        const t = new Date(p.date).getTime();
        return t < latestDate && t > latestDate - (30 * oneDay); // Last 30 days history
    });

    if (validHistory.length > 0) {
        const rollingSum = validHistory.reduce((sum, p) => sum + p.mean, 0);
        const rollingMean = rollingSum / validHistory.length;

        // Check for drop
        const dropThreshold = rollingMean * (1 - thresholds.dropFraction);

        if (latest.mean < dropThreshold) {
            const dropPct = ((rollingMean - latest.mean) / rollingMean) * 100;

            let severity: "low" | "medium" | "high" = "low";
            if (dropPct > 25) severity = "high";
            else if (dropPct > 15) severity = "medium";

            alerts.push({
                type: "ndvi_drop",
                severity,
                message: `NDVI dropped by ${dropPct.toFixed(1)}% compared to 30-day average.`
            });
        }
    }

    return alerts;
}
