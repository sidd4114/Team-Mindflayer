import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generateVRAMap } from "@/lib/management-zones";

/**
 * GET /api/fields/{fieldId}/management-zones/export
 * Returns management zones as GeoJSON for VRA (Variable Rate Application) export.
 * Use ?format=geojson (default) for GeoJSON; same structure as format=vra on main route.
 * Response is downloadable with Content-Disposition.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ fieldId: string }> }
) {
    const { fieldId } = await params;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: field } = await supabase
        .from("fields")
        .select("id")
        .eq("id", fieldId)
        .eq("user_id", user.id)
        .single();

    if (!field) {
        return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }

    try {
        const geojson = await generateVRAMap(fieldId);
        const filename = `management-zones-${fieldId}-${new Date().toISOString().split("T")[0]}.geojson`;

        return new NextResponse(JSON.stringify(geojson, null, 2), {
            status: 200,
            headers: {
                "Content-Type": "application/geo+json",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error: unknown) {
        console.error("Management Zones Export Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to export management zones" },
            { status: 500 }
        );
    }
}
