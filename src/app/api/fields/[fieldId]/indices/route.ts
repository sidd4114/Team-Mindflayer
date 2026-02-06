import { createClient } from "@/lib/supabase/server";
import { getIndexRaster } from "@/lib/sentinel/process";
import { NDVI_EVALSCRIPT, NDWI_EVALSCRIPT, EVI_EVALSCRIPT, NDMI_EVALSCRIPT, NDRE_EVALSCRIPT } from "@/lib/sentinel/evalscripts";
import { NextResponse } from "next/server";

const INDICES_CONFIG = {
    ndvi: {
        name: "NDVI",
        description: "Normalized Difference Vegetation Index",
        evalscript: NDVI_EVALSCRIPT,
        thresholds: { low: 0.3, medium: 0.5, high: 0.7 },
        unit: "ratio"
    },
    ndmi: {
        name: "NDMI",
        description: "Normalized Difference Moisture Index",
        evalscript: NDMI_EVALSCRIPT,
        thresholds: { stress: 0.2, moderate: 0.4 },
        unit: "ratio"
    },
    ndre: {
        name: "NDRE",
        description: "Normalized Difference Red Edge",
        evalscript: NDRE_EVALSCRIPT,
        thresholds: { low: 0.3, medium: 0.5, high: 0.7 },
        unit: "ratio"
    },
    ndwi: {
        name: "NDWI",
        description: "Normalized Difference Water Index",
        evalscript: NDWI_EVALSCRIPT,
        thresholds: { dry: -0.3, moderate: 0, wet: 0.3 },
        unit: "ratio"
    },
    evi: {
        name: "EVI",
        description: "Enhanced Vegetation Index",
        evalscript: EVI_EVALSCRIPT,
        thresholds: { low: 0.1, medium: 0.3, high: 0.6 },
        unit: "ratio"
    }
};

interface IndexResponse {
    index: string;
    mapUrl: string;
    fileName: string;
    timestamp: string;
}

interface MultiIndexResponse {
    fieldId: string;
    date: string;
    timestamp: string;
    bounds: {
        minLng: number;
        maxLng: number;
        minLat: number;
        maxLat: number;
    };
    indices: IndexResponse[];
    metadata: {
        totalIndices: number;
        cloudCover: string;
        dataQuality: string;
    };
}

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

    const { data: field } = await supabase
        .from("fields")
        .select("geometry")
        .eq("id", fieldId)
        .single();

    if (!field) {
        return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const date = url.searchParams.get("date");
    const indicesParam = url.searchParams.get("indices"); // comma-separated: "ndvi,ndmi,ndre"

    if (!date) {
        return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    // Determine which indices to fetch
    let indicesToFetch = ["ndvi"]; // Default to NDVI
    if (indicesParam) {
        indicesToFetch = indicesParam
            .split(",")
            .map(i => i.trim().toLowerCase())
            .filter(i => i in INDICES_CONFIG);
    }

    if (indicesToFetch.length === 0) {
        return NextResponse.json({ error: "No valid indices specified" }, { status: 400 });
    }

    try {
        // Calculate expanded bounding box
        const coords = field.geometry.coordinates[0];
        let minLng = 180, minLat = 90, maxLng = -180, maxLat = -90;
        
        for (const [lng, lat] of coords) {
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
        }
        
        // Expand bounds by 100%
        const lngPadding = (maxLng - minLng) * 1.0;
        const latPadding = (maxLat - minLat) * 1.0;
        
        const expandedMinLng = minLng - lngPadding;
        const expandedMaxLng = maxLng + lngPadding;
        const expandedMinLat = minLat - latPadding;
        const expandedMaxLat = maxLat + latPadding;
        
        // Create expanded bounding box polygon
        const expandedGeometry: GeoJSON.Polygon = {
            type: "Polygon",
            coordinates: [[
                [expandedMinLng, expandedMinLat],
                [expandedMaxLng, expandedMinLat],
                [expandedMaxLng, expandedMaxLat],
                [expandedMinLng, expandedMaxLat],
                [expandedMinLng, expandedMinLat]
            ]]
        };

        // Fetch all requested indices
        const indexResponses: IndexResponse[] = [];

        for (const indexType of indicesToFetch) {
            const config = INDICES_CONFIG[indexType as keyof typeof INDICES_CONFIG];
            const fileName = `${fieldId}/${date}/${indexType}.png`;

            try {
                // Fetch raster
                const imageBuffer = await getIndexRaster({
                    geometry: expandedGeometry,
                    date,
                    evalscript: config.evalscript
                });

                // Upload to storage
                const { error: uploadError } = await supabase
                    .storage
                    .from("field-maps")
                    .upload(fileName, Buffer.from(imageBuffer), {
                        contentType: "image/png",
                        upsert: true
                    });

                if (uploadError) {
                    console.error(`Upload error for ${indexType}:`, uploadError);
                    continue;
                }

                // Get signed URL
                const { data: urlData, error: urlError } = await supabase
                    .storage
                    .from("field-maps")
                    .createSignedUrl(fileName, 3600);

                if (urlError || !urlData?.signedUrl) {
                    console.error(`URL generation error for ${indexType}:`, urlError);
                    continue;
                }

                indexResponses.push({
                    index: indexType,
                    mapUrl: `${urlData.signedUrl}&t=${new Date().getTime()}`,
                    fileName,
                    timestamp: new Date().toISOString()
                });

            } catch (err: any) {
                console.error(`Error processing ${indexType}:`, err.message);
                // Continue with next index instead of failing completely
            }
        }

        if (indexResponses.length === 0) {
            return NextResponse.json({ 
                error: "Failed to generate any indices for this date" 
            }, { status: 500 });
        }

        const response: MultiIndexResponse = {
            fieldId,
            date,
            timestamp: new Date().toISOString(),
            bounds: {
                minLng: expandedMinLng,
                maxLng: expandedMaxLng,
                minLat: expandedMinLat,
                maxLat: expandedMaxLat
            },
            indices: indexResponses,
            metadata: {
                totalIndices: indexResponses.length,
                cloudCover: "Data depends on satellite pass",
                dataQuality: "Based on Sentinel-2 L2A data"
            }
        };

        return NextResponse.json(response);

    } catch (err: any) {
        console.error("Multi-Index Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
