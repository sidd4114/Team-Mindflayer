/**
 * Market Intelligence: price trends, sell timing, predictions.
 * Uses DB market_prices when available; falls back to realistic mock data.
 */

export interface PricePoint {
  date: string;
  price: number;
  crop_type: string;
  region: string;
}

export interface SellAlert {
  id: string;
  crop_type: string;
  message: string;
  severity: "good" | "neutral" | "urgent";
  reason: string;
  suggestedAction: string;
}

export interface PricePrediction {
  crop_type: string;
  direction: "up" | "down" | "stable";
  confidence: number;
  message: string;
  reason: string;
  horizon: string;
}

const DEFAULT_REGION = "Maharashtra";
const CROPS = ["Tomato", "Potato", "Onion", "Wheat", "Rice", "Cotton"];

/** Generate mock price series for a crop (realistic variance, slight trend) */
function generateMockPriceSeries(
  cropType: string,
  region: string,
  days: number
): PricePoint[] {
  const basePrice: Record<string, number> = {
    Tomato: 28,
    Potato: 22,
    Onion: 30,
    Wheat: 24,
    Rice: 38,
    Cotton: 65,
  };
  const base = basePrice[cropType] ?? 25;
  const points: PricePoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const trend = 0.3 * (days - i) / days;
    const noise = (Math.random() - 0.5) * 4;
    const price = Math.max(10, base + trend * 3 + noise);
    points.push({
      date: dateStr,
      price: Math.round(price * 100) / 100,
      crop_type: cropType,
      region,
    });
  }
  return points;
}

/** Get price trend for chart: from DB or mock */
export async function getPriceTrend(
  cropType: string,
  region: string,
  days: number,
  fromDb: () => Promise<PricePoint[]>
): Promise<PricePoint[]> {
  const fromDatabase = await fromDb();
  if (fromDatabase.length >= days * 0.5) {
    return fromDatabase.slice(-days);
  }
  return generateMockPriceSeries(cropType, region, days);
}

/** Compute 7-day average price */
export function averagePrice(points: PricePoint[]): number {
  if (points.length === 0) return 0;
  const sum = points.reduce((s, p) => s + p.price, 0);
  return sum / points.length;
}

/** Week-over-week change (positive = price up) */
export function weekOverWeekChange(points: PricePoint[]): number {
  if (points.length < 14) return 0;
  const last7 = points.slice(-7);
  const prev7 = points.slice(-14, -7);
  const avgNow = averagePrice(last7);
  const avgPrev = averagePrice(prev7);
  if (avgPrev === 0) return 0;
  return ((avgNow - avgPrev) / avgPrev) * 100;
}

/** Build sell alerts for user: good time to sell when price trend up and crop healthy */
export function buildSellAlerts(
  userCrops: { crop_type: string; latestNdvi: number | null; fieldName: string }[],
  priceTrendByCrop: Record<string, { points: PricePoint[] }>
): SellAlert[] {
  const alerts: SellAlert[] = [];
  for (const c of userCrops) {
    const trend = priceTrendByCrop[c.crop_type];
    if (!trend) continue;
    const change = weekOverWeekChange(trend.points);
    const avg = averagePrice(trend.points);
    const healthy = c.latestNdvi != null && c.latestNdvi >= 0.5;

    if (change >= 8 && healthy) {
      alerts.push({
        id: `sell-${c.crop_type}-${Date.now()}`,
        crop_type: c.crop_type,
        message: `Good time to sell ${c.crop_type}`,
        severity: "good",
        reason: `Prices up ${change.toFixed(1)}% this week. Your crop health is good.`,
        suggestedAction: "Consider selling in the next 3–5 days.",
      });
    } else if (change >= 12) {
      alerts.push({
        id: `sell-urgent-${c.crop_type}-${Date.now()}`,
        crop_type: c.crop_type,
        message: `Strong price rise for ${c.crop_type}`,
        severity: "urgent",
        reason: `Prices up ${change.toFixed(1)}% this week.`,
        suggestedAction: "Sell soon to capture higher prices.",
      });
    } else if (change <= -10) {
      alerts.push({
        id: `hold-${c.crop_type}-${Date.now()}`,
        crop_type: c.crop_type,
        message: `Prices down for ${c.crop_type}`,
        severity: "neutral",
        reason: `Prices down ${Math.abs(change).toFixed(1)}% this week.`,
        suggestedAction: "Consider holding if you can store; prices may recover.",
      });
    }
  }
  const byCrop = new Map<string, SellAlert>();
  for (const a of alerts) {
    if (!byCrop.has(a.crop_type)) byCrop.set(a.crop_type, a);
  }
  return Array.from(byCrop.values()).slice(0, 10);
}

/** Build price predictions from disease/health context (mock logic) */
export function buildPredictions(
  cropType: string,
  regionalAlertCount: number,
  avgHealth: number
): PricePrediction[] {
  const predictions: PricePrediction[] = [];
  if (regionalAlertCount > 2 && avgHealth < 0.5) {
    predictions.push({
      crop_type: cropType,
      direction: "up",
      confidence: 0.7,
      message: `Price may increase for ${cropType}`,
      reason: "Disease reports in region may reduce supply.",
      horizon: "Next 2 weeks",
    });
  } else if (avgHealth >= 0.6) {
    predictions.push({
      crop_type: cropType,
      direction: "stable",
      confidence: 0.65,
      message: `${cropType} prices likely stable`,
      reason: "Good regional crop health; supply expected to be normal.",
      horizon: "Next 1–2 weeks",
    });
  } else {
    predictions.push({
      crop_type: cropType,
      direction: "down",
      confidence: 0.5,
      message: `Possible price dip for ${cropType}`,
      reason: "Supply may increase with harvest; monitor local markets.",
      horizon: "Next 1 week",
    });
  }
  return predictions;
}

export { DEFAULT_REGION, CROPS };
