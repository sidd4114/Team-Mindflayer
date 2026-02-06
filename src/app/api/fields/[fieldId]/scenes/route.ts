import { createClient } from "@/lib/supabase/server";
import { searchScenes } from "@/lib/sentinel/catalog";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ fieldId: string }> } // params is now a Promise in Next.js 15/16? Actually in Next 15 yes. The user said Next.js 14+, but the package.json showed 16. I should treat it as awaitable.
) {
    const { fieldId } = await params;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch field geometry
    const { data: field, error: fieldError } = await supabase
        .from("fields")
        .select("geometry")
        .eq("id", fieldId)
        .single();

    if (fieldError || !field) {
        return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }

    // Parse query params
    const url = new URL(request.url);
    const to = url.searchParams.get("to") || new Date().toISOString();
    const from = url.searchParams.get("from") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // Last 30 days default

    try {
        const scenes = await searchScenes({
            geometry: field.geometry,
            from,
            to,
            maxCloud: 50 // slightly looser for browsing, filtered strictly later if needed
        });

        return NextResponse.json(scenes);
    } catch (err: any) {
        console.error("Scenes Search Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
