import { NextResponse } from 'next/server';
import { fetchSatelliteData } from '@/lib/sentinel-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lat, lng } = body;

    if (!lat || !lng) {
      return NextResponse.json({ error: 'Latitude and Longitude are required' }, { status: 400 });
    }

    // Check if API keys are configured, if not, return mock data
    if (!process.env.SH_CLIENT_ID || !process.env.SH_CLIENT_SECRET) {
      console.warn('Sentinel Hub credentials not found, returning mock data');
      
      // Delay to simulate network
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return NextResponse.json({
        isMock: true,
        image: null, // Frontend will show placeholder
        ndvi: 0.65 + (Math.random() * 0.2 - 0.1), // Random-ish happy value
        date: new Date().toISOString(),
        message: 'Demo Mode: Configure SH_CLIENT_ID to see real data'
      });
    }

    // Calculate a bounding box (~10km square) around the point
    // 0.01 degrees is roughly 1.11km
    const offset = 0.045;
    const bbox = [
      lng - offset, // minX
      lat - offset, // minY
      lng + offset, // maxX
      lat + offset  // maxY
    ];

    // Date range: Last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const data = await fetchSatelliteData(
      bbox,
      startDate.toISOString(),
      endDate.toISOString()
    );

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Satellite API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze field' }, 
      { status: 500 }
    );
  }
}
