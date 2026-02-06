import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getPriceTrend, DEFAULT_REGION, CROPS } from "@/lib/market-intelligence";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const crop = url.searchParams.get("crop") || "Tomato";
  const region = url.searchParams.get("region") || DEFAULT_REGION;
  const days = Math.min(90, Math.max(7, parseInt(url.searchParams.get("days") || "30", 10)));

  async function fromDb(): Promise<{ date: string; price: number; crop_type: string; region: string }[]> {
    const supabase = await createClient();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const { data } = await supabase
      .from("market_prices")
      .select("date, price_per_kg, crop_type, region")
      .eq("crop_type", crop)
      .eq("region", region)
      .gte("date", fromDate.toISOString().split("T")[0])
      .order("date", { ascending: true });
    return (data || []).map((r) => ({
      date: r.date,
      price: Number(r.price_per_kg),
      crop_type: r.crop_type,
      region: r.region,
    }));
  }

  try {
    const points = await getPriceTrend(crop, region, days, fromDb);
    return NextResponse.json({
      crop,
      region,
      points,
      crops: CROPS,
    });
  } catch (e) {
    console.error("Price trends error:", e);
    return NextResponse.json({ error: "Failed to load price trends" }, { status: 500 });
  }
}
