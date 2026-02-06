"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/contexts/I18nContext";
import { Home, LayoutGrid, Settings } from "lucide-react";

/**
 * Bottom navigation: Home, Fields, Settings.
 * Used on landing, Fields, Settings, and Field Details. Same look everywhere.
 */
export function FieldsBottomNav() {
    const pathname = usePathname();
    const { t } = useI18n();
    const isFields = pathname.startsWith("/fields") && pathname !== "/fields/new";

    const linkBase = "flex flex-col items-center justify-center gap-1 min-w-[72px] min-h-[44px] rounded-xl active:opacity-70 transition-all";
    const linkActive = "text-[#6B7B3F] bg-[#6B7B3F]/10";
    const linkInactive = "text-slate-500 hover:bg-slate-50";

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-md md:max-w-2xl lg:max-w-3xl mx-auto md:left-1/2 md:right-auto md:-translate-x-1/2 bg-white border-t border-slate-200 md:rounded-t-2xl md:shadow-lg md:border md:border-b-0 md:border-slate-200 md:mb-4 safe-area-inset-bottom"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            role="navigation"
            aria-label="Main navigation"
        >
            <div className="flex items-center justify-around px-2 py-2.5 md:px-6">
                <Link
                    href="/"
                    className={`${linkBase} ${pathname === "/" ? linkActive : linkInactive}`}
                    aria-current={pathname === "/" ? "page" : undefined}
                >
                    <Home className="w-5 h-5 shrink-0" strokeWidth={2.5} />
                    <span className="text-[10px] font-medium">{t("navigation.home", "Home")}</span>
                </Link>
                <Link
                    href="/fields"
                    className={`${linkBase} ${isFields ? linkActive : linkInactive}`}
                    aria-current={isFields ? "page" : undefined}
                >
                    <LayoutGrid className="w-5 h-5 shrink-0" strokeWidth={2.5} />
                    <span className="text-[10px] font-medium">{t("fields.myFields", "Fields")}</span>
                </Link>
                <Link
                    href="/settings"
                    className={`${linkBase} ${pathname === "/settings" ? linkActive : linkInactive}`}
                    aria-current={pathname === "/settings" ? "page" : undefined}
                >
                    <Settings className="w-5 h-5 shrink-0" strokeWidth={2.5} />
                    <span className="text-[10px] font-medium">{t("navigation.settings", "Settings")}</span>
                </Link>
            </div>
        </nav>
    );
}
