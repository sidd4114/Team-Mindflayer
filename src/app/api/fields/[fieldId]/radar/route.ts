import { createClient } from "@/lib/supabase/server";
import { getSentinel1Raster } from "@/lib/sentinel/process-s1";
import { RVI_EVALSCRIPT, SSM_EVALSCRIPT } from "@/lib/sentinel/evalscripts-radar";
import { NextResponse } from "next/server";

const RADAR_SCRIPTS: Record<string, string> = {
  rvi: RVI_EVALSCRIPT,
  ssm: SSM_EVALSCRIPT,
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fieldId: string }> }
) {
  const { fieldId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

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
  const index = url.searchParams.get("index") || "rvi";
  const date = url.searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "Date is required (YYYY-MM-DD)" }, { status: 400 });
  }

  const evalscript = RADAR_SCRIPTS[index];
  if (!evalscript) {
    return NextResponse.json(
      { error: "Invalid index. Use 'rvi' (Radar Vegetation Index) or 'ssm' (Surface Soil Moisture proxy)." },
      { status: 400 }
    );
  }

  try {
    const coords = (field.geometry as { coordinates: number[][][] }).coordinates[0];
    let minLng = 180, minLat = 90, maxLng = -180, maxLat = -90;
    for (const [lng, lat] of coords) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    const pad = 0.5;
    const lngPad = (maxLng - minLng) * pad;
    const latPad = (maxLat - minLat) * pad;
    const expandedGeometry: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [minLng - lngPad, minLat - latPad],
          [maxLng + lngPad, minLat - latPad],
          [maxLng + lngPad, maxLat + latPad],
          [minLng - lngPad, maxLat + latPad],
          [minLng - lngPad, minLat - latPad],
        ],
      ],
    };

    const imageBuffer = await getSentinel1Raster({
      geometry: expandedGeometry,
      date,
      evalscript,
    });

    const fileName = `radar/${fieldId}/${date}/${index}.png`;
    await supabase.storage.from("field-maps").upload(fileName, Buffer.from(imageBuffer), {
      contentType: "image/png",
      upsert: true,
    });

    const { data: urlData, error: urlError } = await supabase.storage
      .from("field-maps")
      .createSignedUrl(fileName, 3600);

    if (urlError || !urlData?.signedUrl) {
      throw new Error("Failed to generate signed URL");
    }

    return NextResponse.json({
      url: urlData.signedUrl,
      index,
      date,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Radar image failed";
    console.error("Radar route error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
