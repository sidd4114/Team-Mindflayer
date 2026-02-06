interface SentinelAuthToken {
  access_token: string;
  expires_in: number;
  expires_at: number;
}

let cachedToken: SentinelAuthToken | null = null;

const CLIENT_ID = process.env.SH_CLIENT_ID;
const CLIENT_SECRET = process.env.SH_CLIENT_SECRET;

export async function getSentinelToken(): Promise<string> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Sentinel Hub credentials not configured');
  }

  // Return cached token if valid (with 5 min buffer)
  if (cachedToken && Date.now() < cachedToken.expires_at - 300000) {
    return cachedToken.access_token;
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);

  const response = await fetch(
    'https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    }
  );

  if (!response.ok) {
    throw new Error('Failed to authenticate with Sentinel Hub');
  }

  const data = await response.json();
  
  cachedToken = {
    access_token: data.access_token,
    expires_in: data.expires_in,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

// NDVI Evalscript for Visualization
const NDVI_EVALSCRIPT = `
//VERSION=3
function setup() {
  return {
    input: ["B04", "B08", "dataMask"],
    output: { bands: 4 }
  };
}

const ramp = [
  [-0.5, 0x0c0c0c], // Water/No Data
  [0.0, 0xeaeaea],  // Barren
  [0.2, 0xccc682],  // Low vegetation
  [0.4, 0x91bf51],
  [0.6, 0x4f892d],
  [0.8, 0x0f540a],
  [1.0, 0x004400]   // Dense vegetation
];

const visualizer = new ColorRampVisualizer(ramp);

function evaluatePixel(sample) {
  let ndvi = index(sample.B08, sample.B04);
  let imgVals = visualizer.process(ndvi);
  return imgVals.concat(sample.dataMask); 
}
`;

// NDVI Evalscript for Statistics
const STATS_EVALSCRIPT = `
//VERSION=3
function setup() {
  return {
    input: ["B04", "B08", "dataMask"],
    output: [
      {
        id: "default",
        bands: 1
      },
      {
        id: "dataMask",
        bands: 1
      }
    ]
  };
}

function evaluatePixel(sample) {
  return {
    default: [index(sample.B08, sample.B04)],
    dataMask: [sample.dataMask]
  };
}
`;

export async function fetchSatelliteData(bbox: number[], dateFrom: string, dateTo: string) {
  const token = await getSentinelToken();

  // 1. Fetch Heatmap Image
  const imageResponse = await fetch('https://services.sentinel-hub.com/api/v1/process', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'image/png',
    },
    body: JSON.stringify({
      input: {
        bounds: {
          bbox: bbox,
          properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" }
        },
        data: [{
          type: "sentinel-2-l2a",
          dataFilter: {
            timeRange: { from: dateFrom, to: dateTo },
            mosaickingOrder: "mostRecent",
            maxCloudCoverage: 20
          },
          processing: {
            upsampling: "BICUBIC",
            downsampling: "BICUBIC"
          }
        }]
      },
      output: {
        width: 1024,
        height: 1024,
        responses: [{
          identifier: "default",
          format: { type: "image/png" }
        }]
      },
      evalscript: NDVI_EVALSCRIPT
    })
  });

  if (!imageResponse.ok) {
    throw new Error('Failed to fetch satellite image');
  }

  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = Buffer.from(imageBuffer).toString('base64');

  // 2. Fetch Statistics
  const statsResponse = await fetch('https://services.sentinel-hub.com/api/v1/statistics', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: {
        bounds: {
          bbox: bbox,
          properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" }
        },
        data: [{
          type: "sentinel-2-l2a",
          dataFilter: {
            timeRange: { from: dateFrom, to: dateTo }
          }
        }]
      },
      aggregation: {
        timeRange: { from: dateFrom, to: dateTo },
        aggregationInterval: { of: "P1D" },
        evalscript: STATS_EVALSCRIPT,
        resx: 0.0001,
        resy: 0.0001
      }
    })
  });

  if (!statsResponse.ok) {
    const errorText = await statsResponse.text();
    console.error('Sentinel Hub Stats Error:', errorText);
    throw new Error(`Failed to fetch statistics: ${errorText}`);
  }

  const statsData = await statsResponse.json();
  
  // Extract the latest valid measurement
  const validStats = statsData.data.reverse().find((d: any) => 
    d.outputs.default && 
    d.outputs.default.bands && 
    d.outputs.default.bands.B0 && 
    d.outputs.default.bands.B0.stats.mean !== null
  );  
  return {
    image: `data:image/png;base64,${base64Image}`,
    ndvi: validStats ? validStats.outputs.default.bands.B0.stats.mean : 0,
    date: validStats ? validStats.interval.from : dateTo
  };
}
