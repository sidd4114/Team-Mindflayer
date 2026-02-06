import { createClient } from "@/lib/supabase/server";
import { getIndexRaster } from "@/lib/sentinel/process";
import { NDVI_EVALSCRIPT, NDWI_EVALSCRIPT, EVI_EVALSCRIPT, TRUE_COLOR_EVALSCRIPT, FALSE_COLOR_EVALSCRIPT, NDMI_EVALSCRIPT, NDRE_EVALSCRIPT } from "@/lib/sentinel/evalscripts";
import { ARVI_EVALSCRIPT, MCARI_EVALSCRIPT, PSRI_EVALSCRIPT } from "@/lib/sentinel/evalscripts-advanced";
import { NextResponse } from "next/server";

const EVALSCRIPTS: Record<string, string> = {
    ndvi: NDVI_EVALSCRIPT,
    ndwi: NDWI_EVALSCRIPT,
    evi: EVI_EVALSCRIPT,
    true_color: TRUE_COLOR_EVALSCRIPT,
    false_color: FALSE_COLOR_EVALSCRIPT,
    ndmi: NDMI_EVALSCRIPT,
    ndre: NDRE_EVALSCRIPT,
    arvi: ARVI_EVALSCRIPT,
    mcari: MCARI_EVALSCRIPT,
    psri: PSRI_EVALSCRIPT,
};

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
    const index = url.searchParams.get("index") || "ndvi";
    const date = url.searchParams.get("date"); // YYYY-MM-DD

    if (!date) {
        return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const evalscript = EVALSCRIPTS[index];
    if (!evalscript) {
        return NextResponse.json({ error: "Invalid index type" }, { status: 400 });
    }

    const fileName = `${fieldId}/${date}/${index}.png`;

    try {
        // Calculate expanded bounding box (2x zoom out to show context)
        const coords = field.geometry.coordinates[0];
        let minLng = 180, minLat = 90, maxLng = -180, maxLat = -90;
        
        for (const [lng, lat] of coords) {
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
        }
        
        // Expand bounds by 300% (4x zoom out for larger context)
        const lngPadding = (maxLng - minLng) * 3.0;
        const latPadding = (maxLat - minLat) * 3.0;
        
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

        // FETCH IMAGE with expanded view
        const imageBuffer = await getIndexRaster({
            geometry: expandedGeometry,
            date,
            evalscript
        });

        // UPLOAD
        const { error: uploadError } = await supabase
            .storage
            .from("field-maps")
            .upload(fileName, Buffer.from(imageBuffer), {
                contentType: "image/png",
                upsert: true
            });

        if (uploadError) {
            console.error("Upload error detail:", uploadError);
            throw uploadError;
        }

        // GET URL
        const { data: urlData, error: urlError } = await supabase
            .storage
            .from("field-maps")
            .createSignedUrl(fileName, 3600); // 1 hour

        if (urlError || !urlData?.signedUrl) {
            console.error("URL generation error:", urlError);
            throw new Error("Failed to generate signed URL");
        }

        return NextResponse.json({
            url: urlData.signedUrl,
            fileName,
            generatedAt: new Date().toISOString(),
            bounds: {
                minLng: expandedMinLng,
                maxLng: expandedMaxLng,
                minLat: expandedMinLat,
                maxLat: expandedMaxLat
            },
            fieldCoordinates: coords
        });

    } catch (err: any) {
        console.error("Map Generation Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
