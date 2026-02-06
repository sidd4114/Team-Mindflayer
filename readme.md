# FarmScan

FarmScan is a mobile-first PWA that helps small farmers detect crop diseases early using Sentinel Hub satellite imagery.

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Sentinel Hub Credentials
SH_CLIENT_ID=your_client_id
SH_CLIENT_SECRET=your_client_secret

# Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenWeatherMap API (for live weather data)
NEXT_PUBLIC_OPENWEATHER_API_KEY=your_openweather_api_key

# Optional Configuration Overrides
SENTINEL_MAX_CLOUD_COVER=20
NDVI_DROP_FRACTION=0.15
MIN_NDVI_THRESHOLD=0.3
```

**Get OpenWeatherMap API Key:**
1. Sign up at [OpenWeatherMap](https://openweathermap.org/api)
2. Generate a free API key (allows 60 calls/minute)
3. Add it to your `.env.local` file

> **Note:** Without the OpenWeatherMap API key, the app will display demo weather data.

### 2. Supabase Setup

1. Create a new Supabase project.
2. Go to the SQL Editor in your Supabase dashboard.
3. Run the content of `supabase/migrations/20240126000000_init_schema.sql` to set up the database schema and enable PostGIS.
4. Ensure you have the Storage bucket `field-maps` created (public or private depending on your security model, assuming public read for simplicity in this demo, or use signed URLs).

### 3. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Testing

Run the utility tests (once implemented):

```bash
npm test
```

## Tech Stack

- Next.js 14+ (App Router)
- Supabase (Postgres + PostGIS, Auth)
- Sentinel Hub APIs
- TypeScript, Tailwind CSS
