import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    console.log('Listing available Gemini models...');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const responseText = await response.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse models response:', responseText);
      return NextResponse.json(
        { error: 'Failed to parse models response', details: responseText },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.error('ListModels API error:', data);
      return NextResponse.json(
        { 
          error: 'Failed to list models',
          status: response.status,
          details: data 
        },
        { status: response.status }
      );
    }

    // Extract models that support generateContent
    const models = data.models || [];
    const availableModels = models
      .filter((model: any) => {
        // Check if model supports generateContent method
        const supportedMethods = model.supportedGenerationMethods || [];
        return supportedMethods.includes('generateContent');
      })
      .map((model: any) => ({
        name: model.name,
        displayName: model.displayName,
        description: model.description,
        supportedMethods: model.supportedGenerationMethods || []
      }))
      .sort((a: any, b: any) => {
        // Prefer newer/faster models
        const order = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
        const aIndex = order.findIndex(m => a.name.includes(m));
        const bIndex = order.findIndex(m => b.name.includes(m));
        return aIndex - bIndex;
      });

    console.log('Available models:', availableModels.map(m => m.name));

    return NextResponse.json({
      success: true,
      count: availableModels.length,
      models: availableModels,
      recommendation: availableModels.length > 0 ? availableModels[0].name : null
    });
  } catch (error) {
    console.error('Error listing models:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
