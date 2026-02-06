import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FieldsPageContent } from "./FieldsPageContent";

export default async function FieldsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();

    const { data: fields } = await supabase
        .from("fields")
        .select("*, vegetation_readings(ndvi_mean, date)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    const userName =
        profile?.name?.trim() ||
        (user.email ? user.email.split("@")[0] : null) ||
        "Farmer";

    return <FieldsPageContent fields={fields ?? []} userName={userName} />;
}
