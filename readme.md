# FarmScan — Mobile Crop Disease Detection & Advisory

**Team Mindflayer** · Domain: Agritech & Sustainability

[![Live Demo](https://img.shields.io/badge/demo-live-green)](https://team-mindflayer.vercel.app)

**Live application:** [FarmScan on Vercel](https://team-mindflayer.vercel.app)

---

## Problem Statement

Smallholder farmers face three critical barriers that reduce yields, increase cost, and harm the environment:

### 1. Invisible losses (late detection)

- Crop diseases are often noticed only after damage is irreversible.
- **20–30% yield loss** is common due to late detection.
- By the time symptoms are visible in the field, treatment is less effective.

### 2. Economic barrier (lack of affordable expertise)

- Traditional agronomic consultations can cost **up to ₹2,000 per visit**.
- Many farmers cannot access or afford expert advice when they need it.
- This limits adoption of better practices and timely interventions.

### 3. Chemical overuse (inefficient spraying)

- **“Blanket spraying”** wastes **60%+ of pesticides**, harming:
  - Soil health  
  - Water quality  
  - Farmer margins  
- Chemicals are applied across entire fields instead of only stressed zones.

---

## Our Solution: FarmScan

FarmScan is a **mobile-first Progressive Web App (PWA)** that combines **satellite early warning** with **on-device AI diagnosis** and **precision treatment** to address these problems.

| Pillar | What it does |
|--------|----------------|
| **Early warning (satellite)** | Uses **Sentinel-2** at 10 m resolution every 5 days. Compares historical multispectral indices (e.g. NDVI) to flag stress **7–14 days before** visible symptoms. |
| **Instant diagnosis (Edge AI)** | **Offline-capable** leaf scanning with TensorFlow.js (MobileNetV2) for fast disease identification and **organic-first treatment** recommendations on the phone. |
| **Precision treatment** | **GPS-mapped “zone spraying”** so only stressed areas are treated, cutting chemical use and cost by **40–70%**, with recovery tracked over time. |
| **Community intelligence** | Crowdsourced data powers **regional outbreak maps**, helping neighboring farmers prepare and reduce local epidemics. |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js (App Router), Tailwind CSS, TypeScript |
| **Backend** | Next.js API Routes, Supabase (Postgres + PostGIS, Auth) |
| **Satellite** | Sentinel Hub (Process API, Catalog API, Statistical API), NDVI & anomaly detection |
| **Edge AI** | TensorFlow.js, MobileNetV2 (PlantVillage + PlantDoc datasets) |
| **Data** | Supabase, IndexedDB + Service Worker (Cache API) for offline |

---

## Features

- **Satellite health maps** — Real-time Sentinel-2 L2A imagery and NDVI-based stress detection.
- **Early stress alerts** — Historical baseline comparison to flag anomalies before symptoms appear.
- **Offline disease scanner** — Camera-based leaf scan with on-device AI and treatment advice.
- **Management zones** — Define and export zones for targeted spraying and record-keeping.
- **Multi-language** — UI support for English, Hindi, Marathi (and extensible).
- **PWA** — Installable on mobile, works with limited connectivity.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### 1. Clone and install

```bash
git clone https://github.com/your-org/Team-Mindflayer.git
cd Team-Mindflayer
npm install
```

### 2. Environment variables

Create `.env.local` in the project root:

```bash
# Sentinel Hub
SH_CLIENT_ID=your_client_id
SH_CLIENT_SECRET=your_client_secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenWeatherMap (optional; demo data used if missing)
NEXT_PUBLIC_OPENWEATHER_API_KEY=your_openweather_api_key

# Optional tuning
SENTINEL_MAX_CLOUD_COVER=20
NDVI_DROP_FRACTION=0.15
MIN_NDVI_THRESHOLD=0.3
```

### 3. Supabase setup

1. Create a Supabase project.
2. In the SQL Editor, run the migrations under `supabase/migrations/`.
3. Ensure PostGIS is enabled and create a storage bucket `field-maps` if your flow uses it.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment (Vercel)

The app is configured for Vercel. Deploy from the repo or CLI:

```bash
vercel
```

**Live demo:** [https://team-mindflayer.vercel.app](https://team-mindflayer.vercel.app)

---

## Impact & alignment

- **SDG 15 (Life on Land)** — Less pesticide runoff through precision application.
- **SDG 13 (Climate Action)** — Lower agrochemical footprint and better resilience to climate-driven outbreaks.
- **SDG 5 (Gender Equality)** — Automating crop surveillance reduces manual drudgery.
- **Farmer ROI** — Potential savings of ₹3.5k–5k (reduced pesticide) and ₹8k–15k (yield protected) per hectare.

---

## License

See repository license file.

---

*FarmScan — from space to field, for every farmer.*
