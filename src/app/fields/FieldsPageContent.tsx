"use client";

import Link from "next/link";
import { useI18n } from "@/contexts/I18nContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Wheat, Plus, Tractor, ChevronRight } from "lucide-react";
import AnalyzeButton from "./analyze-button";
import LogoutButton from "./logout-button";
import { FieldsBottomNav } from "./FieldsBottomNav";

export type FieldWithReadings = {
    id: string;
    name: string;
    crop_type: string;
    user_id: string;
    created_at: string;
    vegetation_readings?: { ndvi_mean: number; date: string }[] | null;
};

function getRiskLevel(ndvi: number | undefined): "low" | "medium" | "high" {
    if (ndvi == null) return "medium";
    if (ndvi >= 0.7) return "low";
    if (ndvi >= 0.4) return "medium";
    return "high";
}

// Use fixed locale so server and client render the same (avoids hydration mismatch).
const DATE_LOCALE = "en-US";

function formatLastScanned(dateStr: string | undefined): string {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    const datePart = d.toLocaleDateString(DATE_LOCALE, { day: "numeric", month: "short" });
    if (diffDays === 0) return `${datePart} (today)`;
    if (diffDays === 1) return `${datePart} (yesterday)`;
    if (diffDays < 7) return `${datePart} (${diffDays} days ago)`;
    return d.toLocaleDateString(DATE_LOCALE, { day: "numeric", month: "short", year: "numeric" });
}

export function FieldsPageContent({ fields, userName }: { fields: FieldWithReadings[]; userName?: string }) {
    const { t, locale } = useI18n();
    const displayName = userName || "Farmer";

    return (
        <div
            className="min-h-screen pb-24"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
            {/* Mobile: warm header with gradient */}
            <header className="md:hidden px-4 pt-4 pb-5 rounded-b-3xl bg-gradient-to-br from-[#5a6b2d] via-[#6b7b3f] to-[#5a6b2d] shadow-lg border-b border-[#4a5a24]/30">
                <div className="max-w-md mx-auto">
                    <p className="text-white/85 text-sm font-medium tracking-wide">FarmScan</p>
                    <h1 className="text-xl font-bold text-white mt-1 drop-shadow-sm">
                        {t("fields.hello", "Hello")}, {displayName}
                    </h1>
                </div>
            </header>

            {/* Desktop: simple header with actions */}
            <header className="hidden md:block bg-[#F5F3EE] px-4 pt-5 pb-4 md:px-6 md:pt-6">
                <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto">
                    <div className="flex flex-row items-start justify-between gap-3">
                        <div>
                            <h1 className="text-xl md:text-2xl font-semibold text-slate-900 tracking-tight">
                                {t("fields.myFields", "My Fields")}
                            </h1>
                            {locale !== "en" && (
                                <p className="text-sm text-slate-600 mt-0.5">
                                    {t("fields.myFieldsInEnglish", "My Fields")}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <LanguageSwitcher variant="light" />
                            <Link href="/fields/new">
                                <Button
                                    size="default"
                                    className="bg-gradient-to-b from-[#6b7b3f] to-[#5a6b2d] hover:from-[#5a6b2d] hover:to-[#4a5a24] text-white font-semibold rounded-2xl px-4 py-2.5 min-h-[44px] shadow-md hover:shadow-lg border border-[#4a5a24]/20"
                                >
                                    <Plus className="w-5 h-5" strokeWidth={2.5} />
                                    <span>{t("fields.addField", "Add Field")}</span>
                                </Button>
                            </Link>
                            <LogoutButton />
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto px-4 md:px-6 pt-4 md:pt-2">
                {/* Section title + Add Field on mobile */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <h2 className="text-lg font-semibold text-slate-900">
                        {t("fields.yourFields", "Your Fields")}
                    </h2>
                    <Link href="/fields/new" className="md:hidden">
                        <Button
                            size="default"
                            className="w-full bg-gradient-to-b from-[#6b7b3f] to-[#5a6b2d] hover:from-[#5a6b2d] hover:to-[#4a5a24] text-white font-semibold rounded-2xl min-h-[44px] shadow-md border border-[#4a5a24]/20"
                        >
                            <Plus className="w-5 h-5" strokeWidth={2.5} />
                            <span>{t("fields.addField", "Add Field")}</span>
                        </Button>
                    </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {fields?.map((field) => {
                        const latestReading = field.vegetation_readings?.length
                            ? [...field.vegetation_readings].sort(
                                  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                              )[0]
                            : null;
                        const ndvi = latestReading?.ndvi_mean;
                        const risk = getRiskLevel(ndvi);
                        const riskLabel =
                            risk === "low"
                                ? t("fields.riskLow", "Low")
                                : risk === "medium"
                                  ? t("fields.riskMedium", "Medium")
                                  : t("fields.riskHigh", "High");
                        const lastScannedStr = latestReading
                            ? formatLastScanned(latestReading.date)
                            : t("fields.noDataYet", "No data yet");

                        return (
                            <article
                                key={field.id}
                                className="card p-5 flex flex-col gap-4 hover:shadow-lg hover:border-stone-300/80 transition-all"
                            >
                                <div>
                                    <h2 className="text-lg font-bold text-stone-900 truncate pr-2">
                                        {field.name}
                                    </h2>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <div className="w-8 h-8 rounded-lg bg-[#6B7B3F]/12 flex items-center justify-center shrink-0">
                                            <Wheat className="w-4 h-4 text-[#5a6b2d]" strokeWidth={2} />
                                        </div>
                                        <span className="text-sm text-stone-600">
                                            {t("fields.cropType", "Crop type")}: {field.crop_type}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <span
                                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                risk === "low"
                                                    ? "bg-emerald-100 text-emerald-800"
                                                    : risk === "medium"
                                                      ? "bg-amber-100 text-amber-800"
                                                      : "bg-red-100 text-red-800"
                                            }`}
                                        >
                                            <span
                                                className={`w-2 h-2 rounded-full shrink-0 ${
                                                    risk === "low"
                                                        ? "bg-emerald-500"
                                                        : risk === "medium"
                                                          ? "bg-amber-500"
                                                          : "bg-red-500"
                                                }`}
                                            />
                                            {riskLabel}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {t("fields.lastScanned", "Last scanned")}: {lastScannedStr}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-2 pt-1">
                                    <AnalyzeButton
                                        fieldId={field.id}
                                        className="w-full min-h-[48px] justify-center rounded-xl font-semibold bg-[#6B7B3F] hover:bg-[#5A6A35] text-white"
                                        labelKey="fields.analyzeCrop"
                                        defaultLabel="Analyze Crop"
                                    />
                                    <Link href={`/fields/${field.id}`} className="block">
                                        <Button
                                            variant="outline"
                                            size="default"
                                            className="w-full min-h-[48px] justify-center rounded-xl font-semibold border-slate-300 text-slate-700"
                                        >
                                            <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                                            <span>{t("fields.viewDetails", "View Details")}</span>
                                        </Button>
                                    </Link>
                                </div>
                            </article>
                        );
                    })}
                </div>

                {(!fields || fields.length === 0) && (
                    <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8 md:p-10 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                                <Tractor className="w-8 h-8 text-slate-500" strokeWidth={2} />
                            </div>
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900 mb-1">
                            {t("fields.noFieldsYet", "No fields yet")}
                        </h2>
                        <p className="text-slate-600 text-sm mb-6">
                            {t("fields.noFieldsMessage", "Add your first field to start monitoring")}
                        </p>
                        <Link href="/fields/new">
                            <Button
                                size="default"
                                className="bg-[#6B7B3F] hover:bg-[#5A6A35] text-white font-semibold rounded-xl px-6 py-3 min-h-[48px]"
                            >
                                <Plus className="w-5 h-5" strokeWidth={2.5} />
                                <span>{t("fields.addFirstField", "Add First Field")}</span>
                            </Button>
                        </Link>
                    </div>
                )}
            </main>
            <FieldsBottomNav />
        </div>
    );
}
