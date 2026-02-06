import { getSentinelToken } from "./auth";
import { SENTINEL_CONFIG } from "@/config/sentinel";

/**
 * Fetch a raster from Sentinel-1 GRD (SAR). Use for RVI, SSM, etc.
 * Data type: sentinel-1-grd (IW mode). Bands: VV, VH (linear or dB).
 */
export async function getSentinel1Raster(args: {
  geometry: GeoJSON.Polygon;
  date: string;
  evalscript: string;
  width?: number;
  height?: number;
}): Promise<ArrayBuffer> {
  const token = await getSentinelToken();
  const targetDate = new Date(args.date);
  const fromDate = new Date(targetDate);
  fromDate.setDate(fromDate.getDate() - 5);
  const toDate = new Date(targetDate);
  toDate.setDate(toDate.getDate() + 5);

  const coords = args.geometry.coordinates[0];
  let minLng = 180, minLat = 90, maxLng = -180, maxLat = -90;
  for (const p of coords) {
    const [lng, lat] = p;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  const centerLatRad = ((minLat + maxLat) / 2) * (Math.PI / 180);
  const aspect = (Math.abs(maxLng - minLng) * Math.cos(centerLatRad)) / (Math.abs(maxLat - minLat) || 0.00001);
  const width = args.width ?? 512;
  const height = args.height ?? Math.max(64, Math.round(width / aspect));

  const body = {
    input: {
      bounds: {
        geometry: args.geometry,
        properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" },
      },
      data: [
        {
          type: "sentinel-1-grd",
          dataFilter: {
            timeRange: {
              from: fromDate.toISOString().split(".")[0] + "Z",
              to: toDate.toISOString().split(".")[0] + "Z",
            },
            resolution: "HIGH",
            orbitDirection: "ASCENDING",
          },
        },
      ],
    },
    output: {
      width,
      height,
      responses: [{ identifier: "default", format: { type: "image/png" } }],
    },
    evalscript: args.evalscript,
  };

  const response = await fetch(SENTINEL_CONFIG.PROCESS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "image/png",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Sentinel-1 Process API Error: ${response.status} ${text}`);
  }
  return response.arrayBuffer();
}
