import { SENTINEL_CONFIG } from "@/config/sentinel";

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

export async function getSentinelToken(): Promise<string> {
    const now = Date.now();

    // Return cached token if valid (with 60s buffer)
    if (cachedToken && tokenExpiry && now < tokenExpiry - 60000) {
        return cachedToken;
    }

    const clientId = process.env.SH_CLIENT_ID;
    const clientSecret = process.env.SH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error("Missing Sentinel Hub credentials (SH_CLIENT_ID, SH_CLIENT_SECRET)");
    }

    try {
        const response = await fetch(SENTINEL_CONFIG.AUTH_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "client_credentials",
                client_id: clientId,
                client_secret: clientSecret,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Sentinel Hub Auth Failed: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        cachedToken = data.access_token;
        // expires_in is in seconds
        tokenExpiry = now + data.expires_in * 1000;

        return cachedToken as string;
    } catch (error) {
        console.error("Error fetching Sentinel token:", error);
        throw error;
    }
}
