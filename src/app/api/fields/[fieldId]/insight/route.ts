import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini lazily inside the handler to ensure env vars are loaded
// and to avoid top-level issues.

interface InsightRequestBody {
    cropType: string;
    date: string;
    ndvi: number;
    ndviTrend?: string;
    moisture?: { status: string; message: string };
    terrain?: Record<string, unknown>;
    vci?: { severity: string };
    alerts?: { message: string }[];
    statistics?: { isAnomaly: boolean; message: string; mean: number; stdDev: number };
}

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ fieldId: string }> }
) {
    try {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
            console.warn("GEMINI_API_KEY is missing in environment variables.");
            return NextResponse.json(
                { error: "AI configuration missing. Please add GEMINI_API_KEY." },
                { status: 500 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        await context.params; // Ensure params are awaited
        const body = await req.json() as InsightRequestBody;

        const {
            cropType,
            date,
            ndvi,
            ndviTrend,
            moisture,
            terrain,
            vci,
            alerts,
            statistics
        } = body;

        // Construct a more elaborative and balanced prompt
        const prompt = `
        Act as an expert agronomist providing a balanced and elaborative field analysis for a farmer. 
        Analyze ALL the provided data points below. Be specific, highlight strengths as well as areas needing attention, and explain the relationships between different indices. Provide answer without any greetings

        **Field Data Summary:**
        - **Crop Context:** ${cropType} monitored on ${date}.
        - **Vegetation Health (NDVI):** Current value is ${ndvi}. ${ndviTrend ? `The trend is ${ndviTrend}.` : ""}
        - **Historical Performance:** ${statistics ? `Statistical Mean: ${statistics.mean}, Std Dev: ${statistics.stdDev}. ${statistics.isAnomaly ? "⚠️ This reading is considered an anomaly." : "Everything is within normal historical ranges."} Message: ${statistics.message}` : "No historical benchmark data provided."}
        - **Water Resources:** Soil Moisture (Radar) status is ${moisture?.status || "Unknown"}. ${moisture?.message ? `Note: ${moisture.message}` : ""}
        - **Environmental Stress:** Drought Index (VCI) severity is ${vci?.severity || "Normal"}.
        - **Land Characteristics:** ${terrain ? `Terrain Risks: ${JSON.stringify(terrain)}` : "No specific terrain risks reported."}
        - **Operational Alerts:** ${alerts && alerts.length > 0 ? `Active Alerts: ${alerts.map((a) => a.message).join(", ")}` : "No urgent field alerts at this time."}

        **Your Analysis Requirements:**
        1. **Holistic View:** Provide an elaborative summary (3-4 sentences) that connects these data points. For example, explain how moisture levels might be affecting NDVI.
        2. **Balanced Perspective:** Mention at least two positive things about the data (strengths) and clearly state any risks (negatives) in a helpful way. Do not just focus on problems.
        3. **Specific Details:** Use the actual numbers (like NDVI or moisture status) in your explanation.
        4. **Actionable Roadmap:** Provide 3 clear, prioritized recommendations.
        5. **Tone:** Encouraging, professional, and practical. 
        6. **Length:** Approximately 120-150 words. Avoid overly technical jargon; keep it accessible for a farmer.
        `;

        // Generate content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ insight: text });

    } catch (error) {
        console.error("Gemini API Error:", error);
        return NextResponse.json(
            { error: "Failed to generate field insight." },
            { status: 500 }
        );
    }
}
