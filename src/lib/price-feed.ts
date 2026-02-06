/**
 * Real price feed integration for Market Intelligence.
 * Supports: 1) data.gov.in (India OGD) API, 2) Custom JSON feed URL.
 */

export interface RawPriceRow {
  date: string;
  crop_type: string;
  region: string;
  price_per_kg: number;
}

/** Map AGMARKNET/data.gov.in commodity names to our crop_type */
const COMMODITY_TO_CROP: Record<string, string> = {
  tomato: "Tomato",
  potato: "Potato",
  onion: "Onion",
  wheat: "Wheat",
  rice: "Rice",
  "rice (common)": "Rice",
  cotton: "Cotton",
  "cotton (raw)": "Cotton",
  "green gram (moong)": "Moong",
  "black gram (urad)": "Urad",
  "chick pea (gram)": "Chana",
  "pigeon pea (arhar)": "Arhar",
};

function normalizeCrop(name: string): string {
  const key = (name || "").toLowerCase().trim();
  return COMMODITY_TO_CROP[key] || name || "Other";
}

function normalizeRegion(state: string): string {
  return (state || "Unknown").trim();
}

/**
 * data.gov.in API response shape (varies by resource).
 * Common fields: state, district, market, commodity, variety, modal_price, min_price, max_price, report_date or date.
 * Field names may be lowercase with underscores or title case with spaces.
 */
interface DataGovRecord {
  state?: string;
  commodity?: string;
  modal_price?: string | number;
  min_price?: string | number;
  max_price?: string | number;
  report_date?: string;
  date?: string;
  [key: string]: unknown;
}

function getNum(r: DataGovRecord, ...keys: string[]): number {
  for (const k of keys) {
    const v = r[k];
    if (v !== undefined && v !== null && v !== "") {
      const n = Number(v);
      if (!isNaN(n)) return n;
    }
  }
  return NaN;
}
function getStr(r: DataGovRecord, ...keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return "";
}

const DATA_GOV_RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070";

/**
 * Fetch prices from data.gov.in (India Open Government Data).
 * Get your API key: https://data.gov.in → Sign in → Profile → API Key.
 * Resource ID: find from the dataset's "API" tab (e.g. Current daily price of various commodities from various markets).
 */
export async function fetchFromDataGovIn(options: {
  apiKey: string;
  resourceId?: string;
  state?: string;
  limit?: number;
}): Promise<RawPriceRow[]> {
  const { apiKey, resourceId = DATA_GOV_RESOURCE_ID, state, limit = 500 } = options;
  const url = new URL(`https://api.data.gov.in/resource/${resourceId}`);
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", "0");
  if (state) url.searchParams.set("filters[state]", state);

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`data.gov.in API error: ${res.status} ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as { records?: DataGovRecord[] };
  const records = data?.records || [];
  const rows: RawPriceRow[] = [];
  const seen = new Set<string>();

  for (const r of records) {
    const dateRaw = getStr(r, "report_date", "date", "Report Date", "Date");
    if (!dateRaw) continue;
    const date = dateRaw.split("T")[0].slice(0, 10);
    const crop = normalizeCrop(getStr(r, "commodity", "Commodity"));
    const region = normalizeRegion(getStr(r, "state", "State"));
    const modal = getNum(r, "modal_price", "Modal Price", "modal price");
    const min = getNum(r, "min_price", "Min Price", "min price");
    const max = getNum(r, "max_price", "Max Price", "max price");
    const price = !isNaN(modal) ? modal : (!isNaN(min) && !isNaN(max) ? (min + max) / 2 : NaN);
    if (isNaN(price) || price <= 0 || crop === "Other") continue;
    const key = `${region}|${crop}|${date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      date,
      crop_type: crop,
      region,
      price_per_kg: Math.round(price * 100) / 100,
    });
  }

  return rows;
}

/**
 * Fetch prices from a custom URL that returns JSON array:
 * [ { "date": "YYYY-MM-DD", "crop_type": "Tomato", "region": "Maharashtra", "price_per_kg": 28.5 } ]
 */
export async function fetchFromCustomUrl(feedUrl: string): Promise<RawPriceRow[]> {
  const res = await fetch(feedUrl, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Custom feed error: ${res.status} ${res.statusText}`);
  const data = (await res.json()) as RawPriceRow[] | { data: RawPriceRow[] };
  const rows = Array.isArray(data) ? data : (data as { data: RawPriceRow[] }).data || [];
  return rows.map((r) => ({
    date: String(r.date).slice(0, 10),
    crop_type: String(r.crop_type || "").trim() || "Other",
    region: String(r.region || "").trim() || "default",
    price_per_kg: Number(r.price_per_kg) || 0,
  })).filter((r) => r.date && r.price_per_kg > 0 && r.crop_type !== "Other");
}

export async function fetchRealPrices(): Promise<RawPriceRow[]> {
  const apiKey = process.env.DATA_GOV_IN_API_KEY;
  const customUrl = process.env.CUSTOM_PRICE_FEED_URL;
  const resourceId = process.env.DATA_GOV_IN_RESOURCE_ID;

  if (customUrl) {
    return fetchFromCustomUrl(customUrl);
  }
  if (apiKey) {
    return fetchFromDataGovIn({
      apiKey,
      resourceId: resourceId || undefined,
      state: process.env.PRICE_FEED_STATE || "Maharashtra",
      limit: 1000,
    });
  }
  return [];
}
