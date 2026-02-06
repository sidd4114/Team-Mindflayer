"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const FieldMap = dynamic(() => import("@/components/FieldMap"), { ssr: false });

export default function NewFieldPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [cropType, setCropType] = useState("");
    const [plantingDate, setPlantingDate] = useState("");
    const [polygon, setPolygon] = useState<[number, number][]>([]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (polygon.length < 3) {
            alert("Please define a polygon with at least 3 points on the map.");
            return;
        }

        setLoading(true);

        try {
            // Close the loop
            const coordinates = [...polygon, polygon[0]].map(p => [p[1], p[0]]); // GeoJSON is [lng, lat]

            const body = {
                name,
                cropType,
                plantingDate,
                geometry: {
                    type: "Polygon",
                    coordinates: [coordinates]
                }
            };

            const res = await fetch("/api/fields", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (!res.ok) throw new Error(await res.text());

            router.push("/fields");
            router.refresh();
        } catch (err: any) {
            alert("Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-10 px-4">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500">Create a new field</p>
                        <h1 className="text-2xl font-bold text-gray-900">Add New Field</h1>
                    </div>
                    <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Step 1 of 1</div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-800 mb-1">Field Name</label>
                            <input
                                required
                                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/30"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g., North Plot"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-800 mb-1">Crop Type</label>
                            <input
                                required
                                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/30"
                                value={cropType}
                                onChange={e => setCropType(e.target.value)}
                                placeholder="e.g., Wheat"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-800 mb-1">Planting Date</label>
                            <input
                                type="date"
                                required
                                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/30"
                                value={plantingDate}
                                onChange={e => setPlantingDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-800">Draw Field Boundaries (click points)</label>
                        <div className="h-72 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <FieldMap
                                polygon={polygon}
                                onPolygonChange={setPolygon}
                            />
                        </div>
                        <p className="text-xs text-gray-500">Click on the map to add points. Needs at least 3 points.</p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? "Saving..." : "Create Field"}
                    </button>
                </form>
            </div>
        </div>
    );
}
