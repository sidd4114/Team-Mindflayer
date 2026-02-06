import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { buildPredictions, DEFAULT_REGION, CROPS } from "@/lib/market-intelligence";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const crop = url.searchParams.get("crop") || "Tomato";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    let regionalAlertCount = 0;
    let avgHealth = 0.5;

    if (user) {
      const { data: userFields } = await supabase
        .from("fields")
        .select("id")
        .eq("user_id", user.id)
        .eq("crop_type", crop);
      const fieldIds = (userFields || []).map((f) => f.id);
      if (fieldIds.length > 0) {
        const { count } = await supabase
          .from("alerts")
          .select("id", { count: "exact", head: true })
          .in("field_id", fieldIds)
          .is("resolved_at", null);
        regionalAlertCount = count ?? 0;
      }
      const { data: readings } = await supabase
        .from("vegetation_readings")
        .select("ndvi_mean");
      if (readings && readings.length > 0) {
        const sum = readings.reduce((s, r) => s + (Number(r.ndvi_mean) || 0), 0);
        avgHealth = sum / readings.length;
      }
    } else {
      regionalAlertCount = Math.floor(Math.random() * 3);
      avgHealth = 0.4 + Math.random() * 0.4;
    }

    const predictions = buildPredictions(crop, regionalAlertCount, avgHealth);
    return NextResponse.json({
      crop,
      region: DEFAULT_REGION,
      predictions,
      crops: CROPS,
    });
  } catch (e) {
    console.error("Predictions error:", e);
    return NextResponse.json({ error: "Failed to load predictions" }, { status: 500 });
  }
}
