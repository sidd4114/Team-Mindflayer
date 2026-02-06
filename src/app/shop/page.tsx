"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { FieldsBottomNav } from "@/app/fields/FieldsBottomNav";
import { TrendingUp, Bell, BarChart3, Loader2, ChevronDown } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PricePoint {
  date: string;
  price: number;
  crop_type: string;
  region: string;
}

interface SellAlert {
  id: string;
  crop_type: string;
  message: string;
  severity: "good" | "neutral" | "urgent";
  reason: string;
  suggestedAction: string;
}

interface PricePrediction {
  crop_type: string;
  direction: "up" | "down" | "stable";
  confidence: number;
  message: string;
  reason: string;
  horizon: string;
}

const CROPS = ["Tomato", "Potato", "Onion", "Wheat", "Rice", "Cotton"];

export default function ShopPage() {
  const { t } = useI18n();
  const [crop, setCrop] = useState("Tomato");
  const [trends, setTrends] = useState<PricePoint[]>([]);
  const [alerts, setAlerts] = useState<SellAlert[]>([]);
  const [predictions, setPredictions] = useState<PricePrediction[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [predictionsLoading, setPredictionsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setTrendsLoading(true);
    fetch(`/api/shop/price-trends?crop=${encodeURIComponent(crop)}&days=30`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.points) setTrends(data.points);
      })
      .catch(() => {
        if (!cancelled) setTrends([]);
      })
      .finally(() => {
        if (!cancelled) setTrendsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [crop]);

  useEffect(() => {
    let cancelled = false;
    setAlertsLoading(true);
    fetch("/api/shop/sell-alerts", { credentials: "include" })
      .then((res) => {
        if (res.status === 401) return { alerts: [] };
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data.alerts) setAlerts(data.alerts);
        else if (!cancelled) setAlerts([]);
      })
      .catch(() => {
        if (!cancelled) setAlerts([]);
      })
      .finally(() => {
        if (!cancelled) setAlertsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPredictionsLoading(true);
    fetch(`/api/shop/predictions?crop=${encodeURIComponent(crop)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.predictions) setPredictions(data.predictions);
        else if (!cancelled) setPredictions([]);
      })
      .catch(() => {
        if (!cancelled) setPredictions([]);
      })
      .finally(() => {
        if (!cancelled) setPredictionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [crop]);

  return (
    <div
      className="min-h-screen bg-[#F5F3EE] pb-24"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="max-w-md md:max-w-lg mx-auto px-4 md:px-6 pt-6">
        <h1 className="text-xl md:text-2xl font-semibold text-slate-900 tracking-tight mb-2">
          {t("shop.title", "Market Intelligence")}
        </h1>
        <p className="text-slate-600 text-sm mb-6">
          {t("shop.subtitle", "Smart selling insights for farmers")}
        </p>

        {/* Crop selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {t("shop.selectCrop", "Select crop")}
          </label>
          <div className="relative">
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="w-full appearance-none bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6B7B3F]/30 focus:border-[#6B7B3F]"
            >
              {CROPS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* 1. Real-time price trends */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#6B7B3F]/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-[#6B7B3F]" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">
                {t("shop.priceTrends", "Real-time price trends")}
              </h2>
              <p className="text-slate-600 text-xs">
                {t("shop.priceTrendsDesc", "Based on regional crop health. See how prices move in your area.")}
              </p>
            </div>
          </div>
          {trendsLoading ? (
            <div className="h-56 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#6B7B3F] animate-spin" />
            </div>
          ) : trends.length > 0 ? (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickFormatter={(v) => {
                      try {
                        return new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                      } catch {
                        return v;
                      }
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickFormatter={(v) => `₹${v}`}
                    width={40}
                  />
                  <Tooltip
                    formatter={(value: number) => [`₹${value.toFixed(2)}/kg`, t("shop.price", "Price")]}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#6B7B3F"
                    strokeWidth={2}
                    dot={false}
                    name={t("shop.price", "Price")}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-slate-500 text-sm py-8 text-center">
              {t("shop.noData", "No price data for this crop yet.")}
            </p>
          )}
        </section>

        {/* 2. Sell timing alerts */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-amber-600" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">
                {t("shop.sellTiming", "Sell timing alerts")}
              </h2>
              <p className="text-slate-600 text-xs">
                {t("shop.sellTimingDesc", "Get alerted when it's a good time to sell.")}
              </p>
            </div>
          </div>
          {alertsLoading ? (
            <div className="py-6 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
            </div>
          ) : alerts.length > 0 ? (
            <ul className="space-y-3">
              {alerts.map((a) => (
                <li
                  key={a.id}
                  className={`rounded-xl border p-3 ${
                    a.severity === "good"
                      ? "bg-emerald-50 border-emerald-200"
                      : a.severity === "urgent"
                        ? "bg-amber-50 border-amber-200"
                        : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <p className="font-semibold text-slate-900 text-sm">{a.message}</p>
                  <p className="text-slate-600 text-xs mt-1">{a.reason}</p>
                  <p className="text-[#6B7B3F] text-xs font-medium mt-2">{a.suggestedAction}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 text-sm py-4 text-center">
              {t("shop.noAlerts", "No sell timing alerts right now. Add fields and run analysis to get personalised alerts.")}
            </p>
          )}
        </section>

        {/* 3. Price predictions */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5 text-sky-600" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">
                {t("shop.pricePrediction", "Price predictions")}
              </h2>
              <p className="text-slate-600 text-xs">
                {t("shop.pricePredictionDesc", "Predict price changes using disease and crop health data.")}
              </p>
            </div>
          </div>
          {predictionsLoading ? (
            <div className="py-6 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
            </div>
          ) : predictions.length > 0 ? (
            <ul className="space-y-3">
              {predictions.map((p, i) => (
                <li
                  key={`${p.crop_type}-${i}`}
                  className={`rounded-xl border p-3 ${
                    p.direction === "up"
                      ? "bg-emerald-50 border-emerald-200"
                      : p.direction === "down"
                        ? "bg-amber-50 border-amber-200"
                        : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <p className="font-semibold text-slate-900 text-sm">{p.message}</p>
                  <p className="text-slate-600 text-xs mt-1">{p.reason}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-500">{p.horizon}</span>
                    <span className="text-xs font-medium text-slate-600">
                      {Math.round(p.confidence * 100)}% {t("shop.confidence", "confidence")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 text-sm py-4 text-center">
              {t("shop.noPredictions", "No predictions for this crop yet.")}
            </p>
          )}
        </section>
      </div>
      <FieldsBottomNav />
    </div>
  );
}
