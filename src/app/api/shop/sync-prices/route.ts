import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { fetchRealPrices } from "@/lib/price-feed";

/**
 * Sync real market prices into market_prices table.
 * Call with cron (e.g. daily) or manually.
 *
 * Security: use header x-cron-secret = PRICE_SYNC_CRON_SECRET, or run server-side only.
 */
export async function GET(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  const expected = process.env.PRICE_SYNC_CRON_SECRET;
  if (expected && secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.DATA_GOV_IN_API_KEY;
  const customUrl = process.env.CUSTOM_PRICE_FEED_URL;
  if (!apiKey && !customUrl) {
    return NextResponse.json(
      {
        error: "No price feed configured",
        hint: "Set DATA_GOV_IN_API_KEY or CUSTOM_PRICE_FEED_URL in environment",
      },
      { status: 400 }
    );
  }

  try {
    const rows = await fetchRealPrices();
    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No rows to sync (feed returned empty or invalid)",
        inserted: 0,
      });
    }

    const supabase = createServiceRoleClient();
    const toInsert = rows.map((r) => ({
      region: r.region,
      crop_type: r.crop_type,
      date: r.date,
      price_per_kg: r.price_per_kg,
      source: customUrl ? "custom_feed" : "data.gov.in",
    }));

    const { data, error } = await supabase
      .from("market_prices")
      .upsert(toInsert, { onConflict: "region,crop_type,date" });

    if (error) {
      console.error("Sync prices error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      inserted: toInsert.length,
      sample: toInsert.slice(0, 3),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    console.error("Sync prices error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
