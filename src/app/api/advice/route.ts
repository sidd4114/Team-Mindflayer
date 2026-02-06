import { NextRequest, NextResponse } from 'next/server';

// Cache available models to avoid repeated ListModels calls
let cachedModels: string[] | null = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getAvailableModels(apiKey: string): Promise<string[]> {
  const now = Date.now();
  
  // Return cached models if still fresh
  if (cachedModels && (now - cacheTime) < CACHE_DURATION) {
    console.log('Using cached model list');
    return cachedModels;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );

    if (!response.ok) {
      console.warn('Failed to fetch available models, using fallback list');
      return ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    }

    const data = await response.json();
    const models = (data.models || [])
      .filter((model: any) => {
        const methods = model.supportedGenerationMethods || [];
        return methods.includes('generateContent');
      })
      .map((model: any) => {
        // Extract model name (e.g., "models/gemini-2.0-flash" -> "gemini-2.0-flash")
        return model.name.replace('models/', '');
      })
      .filter((name: string) => name.length > 0);

    cachedModels = models;
    cacheTime = now;
    console.log('Fetched available models:', models);
    return models;
  } catch (error) {
    console.warn('Error fetching available models:', error);
    return ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, diseaseName, language } = await request.json();

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('Gemini API key not configured');
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    const languageMap: Record<string, string> = {
      en: 'English',
      hi: 'Hindi',
      mr: 'Marathi'
    };

    const lang = languageMap[language] || 'English';

    // System prompt for farm expert context
    const systemPrompt = `You are an expert agricultural scientist writing for farmers with varying levels of education and experience.
Your advice must be:
- Written in SIMPLE, EASY-TO-UNDERSTAND language (avoid technical jargon)
- Practical and actionable with clear instructions
- Focused on what farmers can do with available resources
- Specific about products, dosages, timings when applicable
- Well-organized with clear sections and bullet points using ## for headers
- DO NOT use asterisks (*) for bold text
When farmers read your advice, they should immediately understand what to do.`;

    const userPrompt =
      type === 'treatment'
        ? `Write treatment advice for "${diseaseName}" in ${lang} for farmers. Keep it under 200 words.

Format with sections using ## header:
- ## IMMEDIATE ACTIONS: First 2-3 steps to take
- ## TREATMENT: Specific medicines/treatments with names and dosages
- ## HOW TO APPLY: Step-by-step process with timing
- ## WHEN TO SEEK HELP: Warning signs

Use simple language. No asterisks for formatting. Be practical and specific.`
        : `Write prevention tips for "${diseaseName}" in ${lang} for farmers. Keep it under 200 words.

Format with sections using ## header:
- ## WHY IT MATTERS: Brief explanation of how disease spreads
- ## PREVENTION STEPS: 4-5 specific things to do regularly
- ## BEST TIMING: When to take preventive action
- ## MONITORING: What to watch for

Use simple language. No asterisks for formatting. Be practical and specific.`;

    const requestBody = {
      system_instruction: {
        parts: {
          text: systemPrompt
        }
      },
      contents: [
        {
          parts: [
            {
              text: userPrompt,
            },
          ],
        },
      ],
    };

    console.log('Calling Gemini API for:', { type, diseaseName, language: lang });

    // Get available models dynamically
    const availableModels = await getAvailableModels(apiKey);
    console.log('Available models to try:', availableModels);
    
    let lastError: any = null;
    
    for (const model of availableModels) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          }
        );

        const responseText = await response.text();
        
        if (!response.ok) {
          lastError = {
            status: response.status,
            statusText: response.statusText,
            body: responseText,
            model
          };
          console.warn(`Model ${model} not available (${response.status}), trying next...`);
          continue; // Try next model
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to parse Gemini response:', responseText);
          return NextResponse.json(
            { error: 'Invalid response from Gemini API', details: responseText },
            { status: 500 }
          );
        }
        
        if (data.error) {
          lastError = { model, error: data.error };
          console.warn(`Model ${model} returned error, trying next...`);
          continue; // Try next model
        }

        const advice = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (!advice) {
          console.warn('No content in Gemini response:', { data, model });
          lastError = { model, error: 'No content returned' };
          continue; // Try next model
        }

        console.log('Gemini API Success:', { type, diseaseName, model, adviceLength: advice.length });
        return NextResponse.json({ advice, model });
      } catch (error) {
        lastError = { model, error: String(error) };
        console.warn(`Error with model ${model}:`, error);
        continue; // Try next model
      }
    }

    // If all models failed, return detailed error
    console.error('All Gemini models failed. Last error:', lastError);
    return NextResponse.json(
      { 
        error: 'No available Gemini models found', 
        details: `Tried models: ${availableModels.join(', ')}. Last error: ${JSON.stringify(lastError)}`,
        availableModels
      },
      { status: 503 }
    );
  } catch (error) {
    console.error('Gemini API handler error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to fetch advice', details: errorMessage },
      { status: 500 }
    );
  }
}
