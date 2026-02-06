# FarmScan – Features & Offline Scope

This document gives an all-round view of what the app does, what works offline, what doesn’t, and how things are wired.

---

## 1. Current features (by area)

### Authentication & account
- **Sign in / Sign up** (Supabase Auth, email + password).
- **Name** on signup stored in `profiles.name`.
- **Redirect after login**: supports `?redirect=` so Fields/Settings/Field Details send users back to the intended page.
- **Protected routes**: `/fields`, `/fields/*`, `/settings` require login; unauthenticated users are redirected to `/login`.
- **Logout** (Settings page).

### Landing (Home) – `/`
- **Hero** with app name and short description.
- **Weather card**: temperature, feels-like, humidity, wind, visibility, pressure, description, sunrise/sunset, city.
  - Uses **OpenWeatherMap** if `NEXT_PUBLIC_OPENWEATHER_API_KEY` is set; otherwise **demo data** (Pune, fixed values).
  - Needs **geolocation** when using real API.
- **Quick actions**: Scan crop (opens Disease Scanner), View fields (→ `/fields`), Settings (→ `/settings`).
- **Disease Scanner** (modal): camera or file upload → **offline** TensorFlow.js model (MobileNet-based) for disease classification.
- **Bottom nav**: Home, Fields, Settings (shared with rest of app).

### Disease Scanner (modal, from Home)
- **Camera capture** or **file upload**.
- **Offline classification** via `@/lib/offline-classifier.ts` (TensorFlow.js, model under `/public/models/image-classifier/`).
- **Supported labels**: Bell Pepper (anthracnose, bacterial spot, healthy), Potato (early blight, healthy, late blight), Tomato (bacterial spot, early blight, healthy, late blight, leaf mold).
- **Output**: disease name, confidence, severity (low/medium/high), treatment text, description.
- **No server call** for the actual classification; runs fully in the browser.

### My Fields – `/fields`
- **List of fields** for the logged-in user (from Supabase `fields`).
- **Header**: “Hello, {username}” (from `profiles.name` or fallback).
- **Field cards**: name, crop type, last scanned date, risk badge (Low/Medium/High from alerts), **Analyze Crop** button, **View Details** link.
- **Add Field** (→ `/fields/new`).
- **Bottom nav**: Home, Fields, Settings.

### Add field – `/fields/new`
- Form: **name**, **crop type**, **planting date**, **boundary** (map polygon via `FieldMap`).
- **POST /api/fields** to create field (Supabase); requires network and auth.

### Field details – `/fields/[fieldId]`
- **Server-loaded data**: field metadata, vegetation readings, alerts (Supabase).
- **Header**: Back, “Field Details”; field name, crop, planted date.
- **“Is my crop okay?”**: single status (Healthy / Needs Attention / High Risk) from alerts.
- **Choose what to check**: 4 main indices (Crop Health / NDVI, Water Stress, Crop Growth, Disease Risk) + “More options” (ARVI, MCARI, NDRE, NDWI).
- **Your Field Map**: raster image for selected date & index via **GET /api/fields/[fieldId]/map** (Sentinel Hub Process API).
- **Crop health over time**: scrollable NDVI chart (from `vegetation_readings`), “Minimum Safe Level” threshold, legend, helper text; **Analyze** button runs analysis (see below).
- **Terrain**: elevation, slope, risks (waterlogging, runoff, erosion), recommendations – **GET /api/fields/[fieldId]/terrain** (currently **simulated** from geometry, no external DEM).
- **SAR / moisture** (optional): **GET /api/fields/[fieldId]/sar-moisture** (uses Sentinel Hub Process API).
- **Analyze** button: **POST /api/fields/[fieldId]/analyze** → fetches NDVI time series (Sentinel Hub Statistics API), saves readings & anomalies to Supabase, revalidates; then navigates to same field page.

### Settings – `/settings`
- **Language**: English, Hindi, Marathi (persisted in `localStorage`).
- **Logout**.
- **Bottom nav**: Home, Fields, Settings.

### API routes (summary)
| Route | Method | Purpose | Depends on |
|-------|--------|---------|------------|
| `/api/fields` | GET | List user’s fields | Supabase (auth + DB) |
| `/api/fields` | POST | Create field | Supabase |
| `/api/fields/[id]/analyze` | POST | Run analysis (NDVI + alerts) | Supabase + **Sentinel Hub** (auth + Statistics) |
| `/api/fields/[id]/terrain` | GET | Terrain analysis | Supabase (geometry only; logic is simulated) |
| `/api/fields/[id]/map` | GET | Raster image (NDVI, NDWI, etc.) | Supabase + **Sentinel Hub** (Process) |
| `/api/fields/[id]/sar-moisture` | GET | SAR moisture | Supabase + **Sentinel Hub** (Process) |
| `/api/fields/[id]/timeseries` | GET | NDVI time series | Supabase + **Sentinel Hub** (Statistics) |
| `/api/fields/[id]/alerts` | GET | Alerts (can trigger NDVI fetch) | Supabase + optionally Sentinel |
| `/api/fields/[id]/scenes` | GET | Scenes | Supabase |
| `/api/fields/[id]/indices` | GET | Indices | Supabase + Sentinel (likely) |
| `/api/satellite` | (used elsewhere) | Satellite-related | Sentinel / external |

### Internationalization (i18n)
- **Locales**: English (`en`), Hindi (`hi`), Marathi (`mr`).
- **Storage**: `localStorage` key `farmScan_locale`.
- **Usage**: Landing, Fields, Field detail, Settings, Scanner, nav labels; many strings use `t("key", "default")`.

### PWA
- **manifest.json**: name, short_name, icons (192, 512), standalone, theme/background, shortcut “Scan Crop”.
- **Service worker** (`/public/sw.js`): caches core assets (/, manifest, icons), **cache-first** for `/models/*` (ML model files), **network-first** for other same-origin requests; offline fallback for navigation to `/`.
- **Registration**: `ServiceWorkerRegistration` in root layout; on load, registers SW and triggers model pre-cache.
- **Offline indicator**: `OfflineIndicator` component exists but is **commented out** in `layout.tsx`.

---

## 2. What works offline

- **Landing page (/)**: If already visited, the shell can load from cache (network-first then cache fallback). New visits need network once.
- **Disease Scanner**: Fully offline once the app and model are cached.
  - Model: `/models/image-classifier/*` (model.json, labels.json, shards) cached by SW (cache-first).
  - Classification runs in browser via TensorFlow.js; no API call.
- **Static assets**: Icons, manifest, core HTML/JS/CSS after first load (SW caches successful responses).
- **Language preference**: Stored in `localStorage`; works offline.
- **UI navigation**: Bottom nav, client-side routing to cached pages (e.g. Home) work offline; **Fields/Settings/Field Details will load from cache if previously visited**, but **data** (field list, field detail, readings) will not refresh without network.

**Important**: There is **no offline persistence of field list or field details**. No IndexedDB or local DB for syncing. So “works offline” here means: **cached pages + offline disease scan only**.

---

## 3. What does not work offline (or needs network)

- **Login / Sign up**: Supabase Auth; requires network.
- **Any Supabase data**: Fields list, field detail, readings, alerts, profile – all require network.
- **Analyze button**: Calls `/api/fields/[id]/analyze` → Sentinel Hub (auth + Statistics API) + Supabase writes; needs network and **SH_CLIENT_ID** / **SH_CLIENT_SECRET**.
- **Field map image**: `/api/fields/[id]/map` uses Sentinel Hub Process API; needs network and Sentinel credentials.
- **SAR/moisture**: Same as map; Sentinel Hub; needs network.
- **Terrain**: API is simulated from geometry (no external DEM), but the **request** still goes to your server and Supabase (auth + field fetch); needs network.
- **Weather (real)**: OpenWeatherMap + geolocation; needs network (and optional location).
- **Create field**: POST to `/api/fields`; needs network.
- **First load of app**: Initial HTML/JS and any uncached routes need network (then SW can cache for next time).

---

## 4. Data and external services

| Data / feature | Where it lives | External dependency |
|----------------|----------------|----------------------|
| Users, sessions | Supabase Auth | Supabase |
| Profiles (name, language) | Supabase `profiles` | Supabase |
| Fields (name, crop, boundary, planting date) | Supabase `fields` | Supabase |
| Vegetation readings (NDVI, etc.) | Supabase `vegetation_readings` | Written by Analyze; source: **Sentinel Hub Statistics** |
| Alerts | Supabase `alerts` | Written by Analyze; logic in `lib/anomaly.ts` (NDVI-based) |
| NDVI time series / statistics | Fetched at analyze time | **Sentinel Hub Statistics API** |
| Field map rasters | Generated on demand | **Sentinel Hub Process API** |
| SAR / moisture | Generated on demand | **Sentinel Hub Process API** |
| Terrain | Computed in API | **None** (simulated from geometry) |
| Weather | Fetched on Home | **OpenWeatherMap** (or demo) |
| Disease classification | Browser (TensorFlow.js) | **None** (offline model) |
| Locale | `localStorage` | None |

---

## 5. PWA and caching (short)

- **Install**: SW installs and caches core assets + model files.
- **Model**: Cache-first for `/models/*`; if network fails and cache exists, model still loads.
- **App pages**: Network-first; on failure, cached response used; for navigation, fallback to `/` if nothing cached.
- **Cross-origin**: Not cached (SW only same-origin).
- **Background sync**: Listener for `sync-offline-data` exists in SW but **no real implementation** (no offline queue or sync).

---

## 6. Configuration (env)

- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required for auth and all DB features).
- **Sentinel Hub**: `SH_CLIENT_ID`, `SH_CLIENT_SECRET` (required for Analyze, field map, SAR/moisture, timeseries).
- **OpenWeatherMap**: `NEXT_PUBLIC_OPENWEATHER_API_KEY` (optional; missing → demo weather).
- **Sentinel tuning**: `SENTINEL_MAX_CLOUD_COVER`, `NDVI_DROP_FRACTION`, `MIN_NDVI_THRESHOLD` (optional).

---

## 7. Gaps and constraints

- **Offline**: No offline list of fields or field details; no sync or queue for actions (e.g. “analyze when online”). Only cached UI + offline scan.
- **Offline indicator**: Present in code but **disabled** in layout; users are not explicitly told they’re offline.
- **Terrain**: Simulated from bounding box; not real DEM (e.g. Copernicus DEM).
- **New field page**: No i18n on labels (e.g. “Add New Field”).
- **Errors**: Analyze and other API errors are improved (user-facing messages) but not all routes may return a consistent `{ error: string }` shape for the client.

---

## 8. One-line summary

**Features**: Auth, Fields CRUD, Field details with map/NDVI chart/terrain/SAR, Analyze (NDVI + alerts), offline disease scanner (camera/file), weather (API or demo), i18n (en/hi/mr), PWA with SW.  
**Offline**: Cached app shell + **full disease scan** (model cached).  
**Online-only**: Login, all Supabase data, Analyze, field map, SAR, real weather, create field.
