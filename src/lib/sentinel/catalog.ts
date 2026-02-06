import { SENTINEL_CONFIG } from "@/config/sentinel";
import { getSentinelToken } from "./auth";

export interface Scene {
    id: string;
    datetime: string;
    cloudCover: number;
}

export async function searchScenes(args: {
    geometry: GeoJSON.Polygon;
    from: string;
    to: string;
    maxCloud?: number;
}): Promise<Scene[]> {
    const token = await getSentinelToken();

    const body = {
        collections: ["sentinel-2-l2a"],
        datetime: `${args.from}/${args.to}`,
        bbox: null, // Using geometry instead
        intersects: args.geometry,
        limit: 50,
        query: {
            eo: {
                cloud_cover: {
                    lt: args.maxCloud ?? SENTINEL_CONFIG.MAX_CLOUD_COVER
                }
            }
        },
        sort: [
            {
                field: "datetime",
                direction: "desc"
            }
        ]
    };

    const response = await fetch(SENTINEL_CONFIG.CATALOG_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`Catalog API Error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();

    return data.features.map((f: any) => ({
        id: f.id,
        datetime: f.properties.datetime,
        cloudCover: f.properties["eo:cloud_cover"]
    }));
}
