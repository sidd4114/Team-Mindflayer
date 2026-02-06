import { createClient } from "@/lib/supabase/server";
import FieldDashboard from "./field-dashboard";
import { notFound } from "next/navigation";
import { FieldsBottomNav } from "../FieldsBottomNav";

export default async function FieldDetailPage({ params }: { params: Promise<{ fieldId: string }> }) {
    const { fieldId } = await params;
    const supabase = await createClient();

    const { data: field } = await supabase
        .from("fields")
        .select("*")
        .eq("id", fieldId)
        .single();

    if (!field) return notFound();

    const { data: alerts } = await supabase
        .from("alerts")
        .select("*")
        .eq("field_id", fieldId)
        .is("resolved_at", null)
        .order("detected_at", { ascending: false });

    const { data: readings } = await supabase
        .from("vegetation_readings")
        .select("*")
        .eq("field_id", fieldId)
        .order("date", { ascending: true });

    const uniqueAlerts = alerts?.reduce((acc, alert: { message?: string; detected_at?: string }) => {
        const existing = acc.find((a: { message?: string }) => a.message === alert.message);
        if (!existing || new Date(alert.detected_at!).getTime() > new Date(existing.detected_at!).getTime()) {
            return [...acc.filter((a: { message?: string }) => a.message !== alert.message), alert];
        }
        return acc;
    }, [] as typeof alerts) || [];

    let polygonCoords: [number, number][] = [];
    if (field.geometry && (field.geometry as { coordinates?: number[][][] }).coordinates?.[0]) {
        const coords = (field.geometry as { coordinates: number[][][] }).coordinates[0];
        polygonCoords = coords.map((p: number[]) => [p[1], p[0]]);
    }

    const fieldInfo = {
        name: field.name,
        crop_type: field.crop_type || "",
        planting_date: field.planting_date ? new Date(field.planting_date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : null,
    };

    return (
        <div
            className="min-h-screen bg-[#F5F3EE] pb-24"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
            <FieldDashboard
                fieldId={field.id}
                fieldInfo={fieldInfo}
                polygon={polygonCoords}
                readings={readings || []}
                alerts={uniqueAlerts}
            />
            <FieldsBottomNav />
        </div>
    );
}
