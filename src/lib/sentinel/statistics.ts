import { SENTINEL_CONFIG } from "@/config/sentinel";
import { getSentinelToken } from "./auth";

export interface TimeSeriesPoint {
    date: string;
    mean: number;
    min: number;
    max: number;
    stdDev: number;
    validRatio: number;
}

// Evalscript specifically for statistics (returns NDVI and DataMask)
const STATS_EVALSCRIPT = `
//VERSION=3
function setup() {
  return {
    input: [{
      bands: ["B04", "B08", "SCL"],
      units: "DN"
    }],
    output: [
      {
        id: "default",
        bands: 1,
        sampleType: "FLOAT32"
      },
      {
        id: "dataMask",
        bands: 1
      }
    ]
  };
}

function evaluatePixel(sample) {
  // SCL: 0 (No Data), 1 (Saturated), 3 (Cloud Shadows), 8 (Cloud medium prob), 9 (Cloud high prob), 11 (Snow)
  let isCloudOrBad = [0, 1, 3, 8, 9, 11].includes(sample.SCL);
  
  if (isCloudOrBad) {
    return {
      default: [NaN],
      dataMask: [0]
    };
  }

  const ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  return {
    default: [ndvi],
    dataMask: [1]
  };
}
`;

export async function getNDVITimeSeries(args: {
    geometry: GeoJSON.Polygon;
    from: string;
    to: string;
    intervalDays?: number; // e.g. 1, 5, 7. Default usually to native acquisition or aggregation
}): Promise<TimeSeriesPoint[]> {
    const token = await getSentinelToken();
    const aggregationPeriod = args.intervalDays ? `P${args.intervalDays}D` : "P1D";

    const body = {
        input: {
            bounds: {
                geometry: args.geometry,
                properties: {
                    crs: "http://www.opengis.net/def/crs/EPSG/0/4326"
                }
            },
            data: [{
                type: "sentinel-2-l2a",
                dataFilter: {
                    maxCloudCoverage: SENTINEL_CONFIG.MAX_CLOUD_COVER // Pre-filter scenes
                }
            }]
        },
        aggregation: {
            timeRange: {
                from: args.from,
                to: args.to
            },
            aggregationInterval: {
                of: aggregationPeriod,
                lastIntervalBehavior: "SHORTEN"
            },
            evalscript: STATS_EVALSCRIPT
        },
        calculations: { // Request statistics
            default: {
                statistics: {
                    default: {
                        percentiles: {
                            k: [50]
                        },
                    }
                }
            }
        }
    };

    const response = await fetch(SENTINEL_CONFIG.STATISTICS_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`Statistics API Error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const results: TimeSeriesPoint[] = [];

    // Parse response
    if (data.data) {
        for (const item of data.data) {
            // item: { interval: { from, to }, outputs: { default: { bands: { B0: { stats: ... } } } } }
            // Note: Sentinel Hub defaults single band output name to "B0"
            const stats = item.outputs?.default?.bands?.B0?.stats;

            if (stats && stats.sampleCount > 0 && stats.mean !== undefined) {
                // Simpler approach: If mean is NaN, skip.
                if (!isNaN(stats.mean)) {
                    results.push({
                        date: item.interval.from,
                        mean: stats.mean,
                        min: stats.min,
                        max: stats.max,
                        stdDev: stats.stDev,
                        validRatio: 1 // Simplified
                    });
                }
            }
        }
    }

    return results;
}
