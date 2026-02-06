"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Polygon, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { CheckCircle2, TrendingUp, Minus, Sparkles, TrendingDown, AlertCircle } from "lucide-react";

// Fix Leaflet marker icons
// @ts-ignore
if (typeof window !== 'undefined') {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });
}

// Zone interface
export interface Zone {
    zoneNumber: number;
    zoneType: "low" | "medium" | "high";
    avgNdvi: number;
    geometry?: { type: string; coordinates: number[][][] | number[][][][] };
    recommendations: {
        nitrogen: number;
        phosphorus: number;
        potassium: number;
    };
}

interface ZoneMapProps {
    leafletBounds: L.LatLngBoundsExpression;
    polygon: [number, number][];
    zones: Zone[];
}

// Helper to auto-fit map bounds
function MapBoundsFitter({ bounds }: { bounds: L.LatLngBoundsExpression }) {
    const map = useMap();
    useEffect(() => {
        if (bounds) {
            map.fitBounds(bounds, { padding: [20, 20] });
        }
    }, [bounds, map]);
    return null;
}

const getZoneStyles = (type: string) => {
    switch (type) {
        case "high":
            return {
                mapFill: "#86efac",
                mapStroke: "#16a34a"
            };
        case "medium":
            return {
                mapFill: "#fcd34d",
                mapStroke: "#f59e0b"
            };
        case "low":
            return {
                mapFill: "#fecaca",
                mapStroke: "#dc2626"
            };
        default:
            return {
                mapFill: "#e7e5e4",
                mapStroke: "#78716c"
            };
    }
};

export default function ZoneMap({ leafletBounds, polygon, zones }: ZoneMapProps) {
    return (
        <div className="bg-stone-900 rounded-xl overflow-hidden shadow-inner border border-stone-800 relative z-0 h-[400px]">
            <MapContainer center={[0, 0]} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
                <MapBoundsFitter bounds={leafletBounds} />
                <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
                />

                {/* Field Boundary */}
                {polygon && (
                    <Polygon
                        positions={polygon}
                        pathOptions={{ color: 'white', fill: false, weight: 2, dashArray: '5, 5' }}
                    />
                )}

                {/* Zones */}
                {zones.map((zone, idx) => {
                    if (!zone.geometry) return null;
                    let geometry = zone.geometry;
                    if (typeof geometry === 'string') {
                        try { geometry = JSON.parse(geometry); }
                        catch (e) { return null; }
                    }
                    const geo = geometry as { type: string; coordinates: any[] };
                    const type = geo.type.toLowerCase();

                    const polygonsToRender: any[] = [];

                    if (type === 'polygon') {
                        // GeoJSON is [lng, lat], Leaflet needs [lat, lng]
                        const ring = geo.coordinates[0]; // Outer ring
                        if (ring && Array.isArray(ring)) {
                            polygonsToRender.push(ring.map((p: any) => [p[1], p[0]]));
                        }
                    } else if (type === 'multipolygon') {
                        geo.coordinates.forEach((poly: any[]) => {
                            const ring = poly?.[0];
                            if (ring && Array.isArray(ring)) {
                                polygonsToRender.push(ring.map((p: any) => [p[1], p[0]]));
                            }
                        });
                    }

                    const style = getZoneStyles(zone.zoneType);

                    return polygonsToRender.map((positions, ringIdx) => (
                        <Polygon
                            key={`zone-${idx}-${ringIdx}`}
                            positions={positions}
                            pathOptions={{
                                fillColor: style.mapFill,
                                fillOpacity: 0.6,
                                color: style.mapStroke,
                                weight: 1
                            }}
                        >
                            <Tooltip sticky>
                                <div className="text-xs font-bold">
                                    {`Zone ${zone.zoneNumber}: ${zone.zoneType.toUpperCase()}`}
                                </div>
                            </Tooltip>
                        </Polygon>
                    ));
                }).flat()}
            </MapContainer>

            {/* Legend Overlay */}
            <div className="absolute bottom-3 left-3 z-[1000] bg-black/70 backdrop-blur-md rounded-lg p-3 border border-white/10">
                <div className="text-[10px] text-stone-300 font-bold uppercase mb-2">Zone Productivity</div>
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-[#86efac] border border-[#16a34a]"></div>
                        <span className="text-xs text-stone-200">High</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-[#fcd34d] border border-[#f59e0b]"></div>
                        <span className="text-xs text-stone-200">Medium</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-[#fecaca] border border-[#dc2626]"></div>
                        <span className="text-xs text-stone-200">Low</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
