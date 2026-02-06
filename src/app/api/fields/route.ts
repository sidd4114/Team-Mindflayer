
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const fieldSchema = z.object({
    name: z.string().min(1),
    cropType: z.string().min(1),
    plantingDate: z.string().date(), // YYYY-MM-DD
    geometry: z.object({
        type: z.literal("Polygon"),
        coordinates: z.array(z.array(z.array(z.number())))
    })
});

export async function GET() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
        .from("fields")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const json = await request.json();
        const body = fieldSchema.parse(json);

        // Insert into Supabase
        // Note: PostGIS columns via PostgREST often accept GeoJSON directly. 
        // If this fails, we might need to use a raw query or ST_GeomFromGeoJSON via RPC.
        // We will attempt direct insert of the GeoJSON object into the geometry column.
        const { data, error } = await supabase
            .from("fields")
            .insert({
                user_id: user.id,
                name: body.name,
                crop_type: body.cropType,
                planting_date: body.plantingDate,
                geometry: body.geometry // Passing GeoJSON object directly
            })
            .select()
            .single();

        if (error) {
            console.error("Supabase Insert Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: err.issues }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
