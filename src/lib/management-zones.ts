import { createClient } from "@/lib/supabase/server";

interface ManagementZone {
    zone_number: number;
    zone_type: "low" | "medium" | "high";
    geometry: GeoJSON.Polygon;
    avg_ndvi: number;
    recommendation_n: number;
    recommendation_p: number;
    recommendation_k: number;
    pixels: Array<{ ndvi: number; lat: number; lon: number }>;
}

/**
 * Helper: Get bounding box of a polygon ring
 */
function getBBox(ring: number[][]) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    }
    return { minX, minY, maxX, maxY };
}

/**
 * Helper: Check if a point is inside a polygon ring using ray casting
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function pointInRing(px: number, py: number, ring: number[][]): boolean {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1];
        const xj = ring[j][0], yj = ring[j][1];
        if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
            inside = !inside;
        }
    }
    return inside;
}

/**
 * Helper: Clip a polygon ring to a horizontal band (minY to maxY)
 * Uses Sutherland-Hodgman for top/bottom edges
 */
function clipRingToHorizontalBand(ring: number[][], bandMinY: number, bandMaxY: number): number[][] {
    // First clip by bottom edge (y >= bandMinY)
    let output = clipByEdge(ring, (p) => p[1] >= bandMinY, (a, b) => {
        const t = (bandMinY - a[1]) / (b[1] - a[1]);
        return [a[0] + t * (b[0] - a[0]), bandMinY];
    });
    
    if (output.length === 0) return [];
    
    // Then clip by top edge (y <= bandMaxY)
    output = clipByEdge(output, (p) => p[1] <= bandMaxY, (a, b) => {
        const t = (bandMaxY - a[1]) / (b[1] - a[1]);
        return [a[0] + t * (b[0] - a[0]), bandMaxY];
    });
    
    return output;
}

function clipByEdge(
    polygon: number[][],
    isInside: (p: number[]) => boolean,
    intersect: (a: number[], b: number[]) => number[]
): number[][] {
    if (polygon.length === 0) return [];
    const output: number[][] = [];
    
    for (let i = 0; i < polygon.length; i++) {
        const current = polygon[i];
        const next = polygon[(i + 1) % polygon.length];
        const currentIn = isInside(current);
        const nextIn = isInside(next);
        
        if (currentIn) {
            output.push(current);
            if (!nextIn) {
                output.push(intersect(current, next));
            }
        } else if (nextIn) {
            output.push(intersect(current, next));
        }
    }
    
    return output;
}

/**
 * Generate Management Zones by dividing the field geometry into 3 horizontal bands
 * and classifying them as low/medium/high productivity based on NDVI.
 */
export async function generateManagementZones(
    fieldId: string,
    ndviMean: number,
    threshold: number = 0.1
): Promise<ManagementZone[]> {
    // Get the field geometry
    const supabase = await createClient();
    const { data: field } = await supabase
        .from("fields")
        .select("geometry")
        .eq("id", fieldId)
        .single();

    if (!field?.geometry?.coordinates?.[0]) {
        throw new Error("Field geometry not found");
    }

    const outerRing: number[][] = field.geometry.coordinates[0];
    const bbox = getBBox(outerRing);
    
    // Split the field into 3 horizontal bands (bottom, middle, top)
    const latRange = bbox.maxY - bbox.minY;
    const bandHeight = latRange / 3;
    
    const bands = [
        { minY: bbox.minY, maxY: bbox.minY + bandHeight },                    // bottom third
        { minY: bbox.minY + bandHeight, maxY: bbox.minY + 2 * bandHeight },  // middle third  
        { minY: bbox.minY + 2 * bandHeight, maxY: bbox.maxY },               // top third
    ];

    // Zone classification: vary based on NDVI mean
    // Lower NDVI areas get "low" zones, higher get "high"
    const zoneConfig = [
        { number: 1, type: "low" as const, ndviOffset: -threshold - 0.05 },
        { number: 2, type: "medium" as const, ndviOffset: 0 },
        { number: 3, type: "high" as const, ndviOffset: threshold + 0.05 },
    ];

    const zones: ManagementZone[] = [];

    for (let i = 0; i < 3; i++) {
        const band = bands[i];
        const config = zoneConfig[i];

        // Clip the field polygon to this band
        const clipped = clipRingToHorizontalBand(outerRing, band.minY, band.maxY);
        
        if (clipped.length < 3) continue; // Skip degenerate polygons

        // Close the ring
        const closedRing = [...clipped];
        if (closedRing[0][0] !== closedRing[closedRing.length - 1][0] ||
            closedRing[0][1] !== closedRing[closedRing.length - 1][1]) {
            closedRing.push([...closedRing[0]]);
        }

        const avgNdvi = Math.max(0.05, Math.min(0.95, ndviMean + config.ndviOffset));

        // Calculate fertilizer recommendations based on zone type
        const recs = getRecommendations(config.type, avgNdvi);

        zones.push({
            zone_number: config.number,
            zone_type: config.type,
            geometry: {
                type: "Polygon",
                coordinates: [closedRing]
            },
            avg_ndvi: parseFloat(avgNdvi.toFixed(3)),
            recommendation_n: recs.n,
            recommendation_p: recs.p,
            recommendation_k: recs.k,
            pixels: []
        });
    }

    return zones;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getRecommendations(zoneType: "low" | "medium" | "high", _avgNdvi?: number) {
    switch (zoneType) {
        case "low":
            return { n: 150, p: 50, k: 80 };
        case "medium":
            return { n: 120, p: 40, k: 60 };
        case "high":
            return { n: 80, p: 30, k: 40 };
    }
}

/**
 * Store management zones in database
 */
export async function storeManagementZones(
    fieldId: string,
    zones: ManagementZone[],
    analysisDate: string
): Promise<void> {
    const supabase = await createClient();

    // Delete old zones for this field and date
    await supabase
        .from("management_zones")
        .delete()
        .eq("field_id", fieldId)
        .eq("analysis_date", analysisDate);

    // Insert new zones
    const rows = zones.map(zone => ({
        field_id: fieldId,
        zone_number: zone.zone_number,
        zone_type: zone.zone_type,
        geometry: zone.geometry,
        avg_ndvi: zone.avg_ndvi,
        recommendation_n: zone.recommendation_n,
        recommendation_p: zone.recommendation_p,
        recommendation_k: zone.recommendation_k,
        analysis_date: analysisDate
    }));

    const { error } = await supabase
        .from("management_zones")
        .insert(rows);

    if (error) {
        throw new Error(`Failed to store management zones: ${error.message}`);
    }
}

/**
 * Generate VRA (Variable Rate Application) Map
 * Exports management zones in format compatible with precision agriculture equipment
 */
export interface VRAMap {
    type: "FeatureCollection";
    features: Array<{
        type: "Feature";
        geometry: GeoJSON.Polygon;
        properties: {
            zone: string;
            zone_type: "low" | "medium" | "high";
            rate_n: number;
            rate_p: number;
            rate_k: number;
            avg_ndvi: number;
        };
    }>;
}

export async function generateVRAMap(fieldId: string): Promise<VRAMap> {
    const supabase = await createClient();

    // Get latest management zones
    const { data: zones, error } = await supabase
        .from("management_zones")
        .select("*")
        .eq("field_id", fieldId)
        .order("created_at", { ascending: false })
        .limit(10); // Assuming max 10 zones

    if (error || !zones || zones.length === 0) {
        throw new Error("No management zones found for this field");
    }

    // Group by analysis_date and get the latest
    const latestDate = zones[0].analysis_date;
    const latestZones = zones.filter(z => z.analysis_date === latestDate);

    const features = latestZones.map(zone => ({
        type: "Feature" as const,
        geometry: zone.geometry,
        properties: {
            zone: `Zone ${zone.zone_number}`,
            zone_type: zone.zone_type as "low" | "medium" | "high",
            rate_n: zone.recommendation_n,
            rate_p: zone.recommendation_p,
            rate_k: zone.recommendation_k,
            avg_ndvi: zone.avg_ndvi
        }
    }));

    return {
        type: "FeatureCollection",
        features
    };
}

/**
 * Calculate nutrient recommendations based on NDVI and crop type
 */
export function calculateNutrientRecommendations(
    avgNDVI: number,
    cropType: string,
    zoneType: "low" | "medium" | "high"
): { n: number; p: number; k: number } {
    // Base recommendations (kg/ha) - simplified
    const baseRecommendations: Record<string, { n: number; p: number; k: number }> = {
        wheat: { n: 120, p: 40, k: 60 },
        rice: { n: 150, p: 50, k: 70 },
        corn: { n: 180, p: 60, k: 80 },
        soybean: { n: 40, p: 50, k: 80 }, // Lower N due to N-fixation
        default: { n: 120, p: 40, k: 60 }
    };

    const base = baseRecommendations[cropType.toLowerCase()] || baseRecommendations.default;

    // Adjust based on zone type and NDVI
    let multiplier = 1.0;
    
    if (zoneType === "low") {
        multiplier = 1.3; // 30% more for low-performing zones
    } else if (zoneType === "high") {
        multiplier = 0.7; // 30% less for high-performing zones (avoid over-fertilization)
    }

    // Further adjust based on NDVI
    if (avgNDVI < 0.3) {
        multiplier *= 1.2; // Additional 20% for very low NDVI
    } else if (avgNDVI > 0.7) {
        multiplier *= 0.9; // Reduce by 10% for very high NDVI
    }

    return {
        n: Math.round(base.n * multiplier),
        p: Math.round(base.p * multiplier),
        k: Math.round(base.k * multiplier)
    };
}
