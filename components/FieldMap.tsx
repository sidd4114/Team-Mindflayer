"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Polygon, useMapEvents, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface FieldMapProps {
    polygon?: [number, number][]; // LatLng array
    onPolygonChange?: (coords: [number, number][]) => void;
    readOnly?: boolean;
}

function MapEvents({ onClick }: { onClick: (e: L.LeafletMouseEvent) => void }) {
    useMapEvents({
        click: onClick,
    });
    return null;
}

export default function FieldMap({ polygon, onPolygonChange, readOnly = false }: FieldMapProps) {
    const [points, setPoints] = useState<[number, number][]>(polygon || []);

    useEffect(() => {
        if (polygon) {
            setPoints(polygon);
        }
    }, [polygon]);

    const handleClick = (e: L.LeafletMouseEvent) => {
        if (readOnly) return;
        const newPoint: [number, number] = [e.latlng.lat, e.latlng.lng];
        const newPoints = [...points, newPoint];
        setPoints(newPoints);
        onPolygonChange?.(newPoints);
    };

    const center: [number, number] = points.length > 0 ? points[0] : [20.5937, 78.9629]; // Default to India center or User location

    return (
        <MapContainer center={center} zoom={5} style={{ height: "100%", width: "100%" }}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {!readOnly && <MapEvents onClick={handleClick} />}

            {points.length > 0 && (
                <Polygon positions={points} color="blue" />
            )}

            {points.map((p, idx) => (
                <Marker key={idx} position={p} />
            ))}
        </MapContainer>
    );
}
