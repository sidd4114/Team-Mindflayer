import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  getPriceTrend,
  buildSellAlerts,
  weekOverWeekChange,
  averagePrice,
  DEFAULT_REGION,
} from "@/lib/market-intelligence";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: fields } = await supabase
      .from("fields")
      .select("id, name, crop_type")
      .eq("user_id", user.id);

    if (!fields || fields.length === 0) {
      return NextResponse.json({
        alerts: [],
        message: "Add fields to get personalised sell timing alerts.",
      });
    }

    const userCrops: { crop_type: string; latestNdvi: number | null; fieldName: string }[] = [];
    const priceTrendByCrop: Record<string, { points: Awaited<ReturnType<typeof getPriceTrend>> }> = {};

    for (const f of fields) {
      const cropType = f.crop_type || "Tomato";
      const { data: readings } = await supabase
        .from("vegetation_readings")
        .select("ndvi_mean, date")
        .eq("field_id", f.id)
        .order("date", { ascending: false })
        .limit(1);
      const latest = readings?.[0];
      const latestNdvi = latest?.ndvi_mean != null ? Number(latest.ndvi_mean) : null;
      userCrops.push({
        crop_type: cropType,
        latestNdvi,
        fieldName: f.name,
      });

      if (!priceTrendByCrop[cropType]) {
        const points = await getPriceTrend(
          cropType,
          DEFAULT_REGION,
          30,
          async () => {
            const fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - 30);
            const { data } = await supabase
              .from("market_prices")
              .select("date, price_per_kg, crop_type, region")
              .eq("crop_type", cropType)
              .eq("region", DEFAULT_REGION)
              .gte("date", fromDate.toISOString().split("T")[0])
              .order("date", { ascending: true });
            return (data || []).map((r) => ({
              date: r.date,
              price: Number(r.price_per_kg),
              crop_type: r.crop_type,
              region: r.region,
            }));
          }
        );
        priceTrendByCrop[cropType] = { points };
      }
    }

    const alerts = buildSellAlerts(userCrops, priceTrendByCrop);
    return NextResponse.json({ alerts });
  } catch (e) {
    console.error("Sell alerts error:", e);
    return NextResponse.json({ error: "Failed to load sell alerts" }, { status: 500 });
  }
}
