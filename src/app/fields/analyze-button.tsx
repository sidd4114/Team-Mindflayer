"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/I18nContext";

type AnalyzeButtonProps = {
    fieldId: string;
    className?: string;
    labelKey?: string;
    defaultLabel?: string;
};

export default function AnalyzeButton({ fieldId, className, labelKey, defaultLabel }: AnalyzeButtonProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { t } = useI18n();

    const handleAnalyze = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/fields/${fieldId}/analyze`, { method: "POST" });
            const body = await res.json().catch(() => ({}));
            const message = (body && typeof body.error === "string" ? body.error : null) || (res.ok ? null : `Request failed (${res.status})`);
            if (!res.ok) {
                throw new Error(message || "Analysis failed");
            }
            router.push(`/fields/${fieldId}`);
            router.refresh();
        } catch (e) {
            const msg = e instanceof Error ? e.message : t("fields.analysisFailed", "Analysis failed");
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    const label = labelKey ? t(labelKey, defaultLabel ?? "Analyze") : "Analyze";

    return (
        <Button
            onClick={handleAnalyze}
            disabled={loading}
            size="default"
            className={className}
        >
            {loading ? (
                <>
                    <Loader2 className="w-5 h-5 animate-spin shrink-0" strokeWidth={2.5} />
                    <span>{t("scanner.analyzing", "Analyzing...")}</span>
                </>
            ) : (
                <>
                    <Sparkles className="w-5 h-5 shrink-0" strokeWidth={2.5} />
                    <span>{label}</span>
                </>
            )}
        </Button>
    );
}
