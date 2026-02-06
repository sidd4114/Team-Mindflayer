import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    console.log('Testing Gemini API - Step 1: Listing available models...');

    // Step 1: List available models
    const listResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );

    if (!listResponse.ok) {
      const listError = await listResponse.text();
      console.error('Failed to list models:', listError);
      return NextResponse.json({
        success: false,
        error: 'Failed to list available models',
        status: listResponse.status,
        details: listError
      }, { status: listResponse.status });
    }

    const listData = await listResponse.json();
    const availableModels = (listData.models || [])
      .filter((model: any) => {
        const methods = model.supportedGenerationMethods || [];
        return methods.includes('generateContent');
      })
      .map((model: any) => {
        const modelName = model.name.replace('models/', '');
        return {
          name: modelName,
          displayName: model.displayName,
          supportedMethods: model.supportedGenerationMethods || []
        };
      });

    console.log('Available models:', availableModels.map(m => m.name));

    if (availableModels.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No models with generateContent support found',
        allModels: listData.models?.map((m: any) => ({
          name: m.name,
          methods: m.supportedGenerationMethods
        })),
        suggestion: 'Check your API key and ensure Gemini API is enabled in Google Cloud console'
      }, { status: 503 });
    }

    // Step 2: Test the first available model
    const firstModel = availableModels[0];
    console.log(`Testing Gemini API - Step 2: Testing model ${firstModel.name}...`);

    const testPrompt = "Say 'API is working' briefly.";
    
    const requestBody = {
      system_instruction: {
        parts: {
          text: "You are a helpful assistant. Respond concisely and accurately."
        }
      },
      contents: [
        {
          parts: [
            {
              text: testPrompt,
            },
          ],
        },
      ],
    };

    const testResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${firstModel.name}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    );

    const testResponseText = await testResponse.text();
    
    if (!testResponse.ok) {
      console.error(`Model ${firstModel.name} test failed:`, testResponseText);
      return NextResponse.json({
        success: false,
        error: `Model ${firstModel.name} test failed`,
        status: testResponse.status,
        details: testResponseText,
        availableModels: availableModels.map(m => m.name),
        suggestion: 'Try another model or check your API quota'
      }, { status: testResponse.status });
    }

    const testData = JSON.parse(testResponseText);
    const testAdvice = testData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log(`✓ Gemini API is working! Model: ${firstModel.name}`);
    return NextResponse.json({
      success: true,
      message: `Gemini API is working!`,
      model: firstModel.name,
      displayName: firstModel.displayName,
      testedAt: new Date().toISOString(),
      response: testAdvice,
      availableModels: availableModels.map(m => m.name)
    });
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
