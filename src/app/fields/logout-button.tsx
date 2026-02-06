"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/I18nContext";

export default function LogoutButton() {
    const router = useRouter();
    const supabase = createClient();
    const { t } = useI18n();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    };

    return (
        <Button
            variant="outline"
            size="default"
            onClick={handleLogout}
            className="gap-2 min-h-[44px] border-slate-300 text-slate-700 rounded-xl font-medium"
        >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>{t("fields.logout", "Logout")}</span>
        </Button>
    );
}
