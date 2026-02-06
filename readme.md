# FarmScan — Mobile Crop Disease Detection & Advisory

**Team Mindflayer** · Agritech & Sustainability

[![Live Demo](https://img.shields.io/badge/demo-live-green)](https://farm-scan.vercel.app/)

**Live app:** [FarmScan on Vercel](https://farm-scan.vercel.app/)

---

## Problem Statement

Smallholder farmers face three critical issues:

1. **Invisible losses** — Late disease detection causes **20–30% yield loss**; damage is often irreversible by the time symptoms are visible.
2. **Economic barrier** — Traditional consultations cost **up to ₹2,000 per visit**; many farmers cannot afford expert advice.
3. **Chemical overuse** — Inefficient “blanket spraying” wastes **60%+ of pesticides**, harming soil, water, and margins.

## Solution: FarmScan

FarmScan is a **mobile-first PWA** that combines:

- **Early warning (satellite)** — Sentinel-2 at 10 m resolution, every 5 days; NDVI-based stress detection **7–14 days before** visible symptoms.
- **Instant diagnosis (Edge AI)** — **Offline** leaf scanning with TensorFlow.js (MobileNetV2) for disease ID and organic-first treatment advice.
- **Precision treatment** — GPS-mapped zone spraying to cut chemical use by **40–70%** and track recovery.
- **Community intelligence** — Crowdsourced regional outbreak maps to alert neighboring farmers.

## Tech Stack

| Layer      | Technology                                      |
|-----------|--------------------------------------------------|
| Frontend  | Next.js (App Router), Tailwind CSS, TypeScript   |
| Backend   | Next.js API Routes, Supabase (Postgres, PostGIS) |
| Satellite | Sentinel Hub (Process, Catalog, Statistical API) |
| Edge AI   | TensorFlow.js, MobileNetV2 (PlantVillage/PlantDoc) |

## Features

- Satellite health maps and NDVI-based stress alerts  
- Offline disease scanner with on-device AI  
- Management zones and zone export for targeted spraying  
- Multi-language (English, Hindi, Marathi)  
- Installable PWA for low-connectivity use  

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Install and run

```bash
git clone https://github.com/your-org/Team-Mindflayer.git
cd Team-Mindflayer
npm install
```

### Environment variables

Create `.env.local` in the project root:

```bash
# Sentinel Hub
SH_CLIENT_ID=your_client_id
SH_CLIENT_SECRET=your_client_secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenWeatherMap (optional; demo data if missing)
NEXT_PUBLIC_OPENWEATHER_API_KEY=your_openweather_api_key

# Optional
SENTINEL_MAX_CLOUD_COVER=20
NDVI_DROP_FRACTION=0.15
MIN_NDVI_THRESHOLD=0.3
```

### Supabase

1. Create a Supabase project.
2. Run migrations in `supabase/migrations/` via the SQL Editor.
3. Create storage bucket `field-maps` if needed.

### Local dev

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy (Vercel)

```bash
vercel
```

**Live demo:** [https://team-mindflayer.vercel.app](https://team-mindflayer.vercel.app)

## License

See repository license.
