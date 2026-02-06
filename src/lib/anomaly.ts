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

        // Calculate standard deviation (σ)
        const variance = validHistory.reduce((sum, p) => {
            return sum + Math.pow(p.mean - rollingMean, 2);
        }, 0) / validHistory.length;
        const stdDev = Math.sqrt(variance);

        // Statistical anomaly: Current NDVI < (Mean - 2σ)
        const anomalyThreshold = rollingMean - (2 * stdDev);

        if (latest.mean < anomalyThreshold) {
            const sigmas = (rollingMean - latest.mean) / stdDev;
            alerts.push({
                type: "ndvi_drop",
                severity: "high",
                message: `Statistical anomaly detected! Current NDVI (${latest.mean.toFixed(2)}) is ${sigmas.toFixed(1)} standard deviations below the 30-day mean. Significant health drop detected.`
            });
        } else {
            // Check for regular drop (backward compatible)
            const dropThreshold = rollingMean * (1 - thresholds.dropFraction);

            if (latest.mean < dropThreshold) {
                const dropPct = ((rollingMean - latest.mean) / rollingMean) * 100;

                let severity: "low" | "medium" | "high" = "low";
                if (dropPct > 25) severity = "high";
                else if (dropPct > 15) severity = "medium";

                alerts.push({
                    type: "ndvi_drop",
                    severity,
                    message: `NDVI dropped by ${dropPct.toFixed(1)}% compared to 30-day average (Mean: ${rollingMean.toFixed(2)}, Current: ${latest.mean.toFixed(2)}).`
                });
            }
        }
    }

    return alerts;
}

/**
 * Enhanced anomaly detection with statistical analysis
 * Triggers alert when current NDVI < (Mean - 2σ)
 */
export function detectStatisticalAnomalies(
    timeseries: TimeSeriesPoint[],
    windowDays: number = 30
): { isAnomaly: boolean; sigma: number; mean: number; stdDev: number; message: string } {
    if (timeseries.length < 3) {
        return {
            isAnomaly: false,
            sigma: 0,
            mean: 0,
            stdDev: 0,
            message: "Insufficient data for statistical analysis"
        };
    }

    const sorted = [...timeseries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const latest = sorted[sorted.length - 1];

    // Get historical window
    const oneDay = 24 * 60 * 60 * 1000;
    const latestDate = new Date(latest.date).getTime();
    const validHistory = sorted.filter(p => {
        const t = new Date(p.date).getTime();
        return t < latestDate && t > latestDate - (windowDays * oneDay);
    });

    if (validHistory.length < 2) {
        return {
            isAnomaly: false,
            sigma: 0,
            mean: 0,
            stdDev: 0,
            message: "Insufficient historical data"
        };
    }

    // Calculate mean and standard deviation
    const mean = validHistory.reduce((sum, p) => sum + p.mean, 0) / validHistory.length;
    const variance = validHistory.reduce((sum, p) => Math.pow(p.mean - mean, 2) + sum, 0) / validHistory.length;
    const stdDev = Math.sqrt(variance);

    // Check if current value is anomalous (< mean - 2σ)
    const threshold = mean - (2 * stdDev);
    const isAnomaly = latest.mean < threshold;

    const sigma = stdDev > 0 ? (mean - latest.mean) / stdDev : 0;

    let message = "";
    if (isAnomaly) {
        message = `⚠️ Anomaly: Current NDVI (${latest.mean.toFixed(2)}) is ${sigma.toFixed(1)}σ below mean (${mean.toFixed(2)} ± ${stdDev.toFixed(2)})`;
    } else {
        message = `✓ Normal: Current NDVI (${latest.mean.toFixed(2)}) within expected range (${mean.toFixed(2)} ± ${(2 * stdDev).toFixed(2)})`;
    }

    return {
        isAnomaly,
        sigma,
        mean,
        stdDev,
        message
    };
}
