"use client";

import { useI18n } from "@/contexts/I18nContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { FieldsBottomNav } from "@/app/fields/FieldsBottomNav";
import LogoutButton from "@/app/fields/logout-button";

export function SettingsPageContent() {
    const { t } = useI18n();

    return (
        <div
            className="min-h-screen bg-[#F5F3EE] pb-24"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
            <div className="max-w-md md:max-w-lg mx-auto px-4 md:px-6 pt-6">
                <h1 className="text-xl md:text-2xl font-semibold text-slate-900 tracking-tight mb-6">
                    {t("navigation.settings", "Settings")}
                </h1>
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm divide-y divide-slate-100 overflow-hidden">
                    <div className="p-4 flex items-center justify-between gap-3">
                        <span className="text-base font-medium text-slate-800">
                            {t("common.language", "Language")}
                        </span>
                        <LanguageSwitcher variant="light" />
                    </div>
                    <div className="p-4 flex items-center justify-between gap-3">
                        <span className="text-base font-medium text-slate-800">
                            {t("fields.logout", "Logout")}
                        </span>
                        <LogoutButton />
                    </div>
                </div>
            </div>
            <FieldsBottomNav />
        </div>
    );
}
