# Comprehensive Feature Implementation Guide

This document outlines the implementation details for the advanced agricultural monitoring features requested, including spectral indices, radar analysis, and precision farming tools.

## 1. Advanced Spectral Indices

### VCI (Vegetation Condition Index)
**Purpose**: Assess vegetation health relative to historical minimums and maximums (drought monitoring).
**Formula**: $VCI = \frac{NDVI_{current} - NDVI_{min}}{NDVI_{max} - NDVI_{min}} \times 100$

**Implementation Strategy**:
1. **Historical Data**: Requires fetching historical NDVI stats (min/max) for the specific pixel/field over the same time period in previous years.
2. **On-the-fly Calculation**: 
   - Fetch current NDVI.
   - Fetch pre-calculated min/max NDVI for the field (stored in DB).
   - Compute VCI in backend or frontend.

**Evalscript (Sentinel-2)**:
*Note: Since VCI requires historical context not present in a single image, the Evalscript returns NDVI, and VCI is calculated in the application layer or using a multi-temporal Evalscript (complex).*

### RVI4S1 (Radar Vegetation Index for Sentinel-1)
**Purpose**: Monitor crop growth structure using SAR (Synthetic Aperture Radar), effective through clouds.
**Formula**: $RVI = \frac{4 \times VH}{VV + VH}$
**Data Source**: Sentinel-1 GRD (IW mode).

**Evalscript (Sentinel-1)**:
```javascript
//VERSION=3
function setup() {
  return {
    input: ["VV", "VH"],
    output: { bands: 1 }
  };
}

function evaluatePixel(sample) {
  // Convert dB to linear power
  const vv = Math.pow(10, sample.VV / 10);
  const vh = Math.pow(10, sample.VH / 10);
  
  const rvi = (4 * vh) / (vv + vh);
  
  // Visualize (scale 0 to 1 usually, but can go higher)
  return [rvi];
}
```

### SSM (Surface Soil Moisture) Estimation
**Purpose**: Estimate soil moisture using radar backscatter.
**Simplified Formula**: $\text{Moisture} \propto \frac{VV - VH_{min}}{VV_{max} - VH_{min}}$ (Empirical) or using Topp's equation with dielectric constant.
**Simple Implementation**: Use the Sentinel-1 "Soil Moisture Index" proxy.

**Evalscript (Sentinel-1)**:
```javascript
//VERSION=3
function setup() {
  return {
    input: ["VV", "VH"],
    output: { bands: 3 }
  };
}

function evaluatePixel(sample) {
  // Simple RGB composition for moisture visualization
  // Red: VV (Sensitive to surface roughness/moisture)
  // Green: VH (Volume scattering - vegetation)
  // Blue: VV/VH ratio
  
  // Normalize values (approximate ranges for Sentinel-1 GRD in dB)
  let val_vv = (sample.VV + 20) / 20; 
  let val_vh = (sample.VH + 25) / 30;
  
  return [val_vv, val_vh, val_vv/val_vh];
}
```

---

## 2. Statistical Anomaly Alerts

**Purpose**: Automatically detect when field health drops significantly below normal.

**Logic**:
1. **Define Baseline**: Calculate moving average (mean) and Standard Deviation (σ) of NDVI for the field over the last 30 days.
2. **Threshold**: Set trigger at `Mean - 2σ`.
3. **Check**: If `Current_NDVI < (Mean - 2σ)`, trigger alert.

**Implementation**:
- **Backend Job**: Run daily/weekly.
- **Sentinel Hub Statistical API**: Use `FIS` request to get mean NDVI for the field polygon.
- **Storage**: Store timeseries in Supabase (`field_stats` table).
- **Alerting**: Create a `notifications` table; insert record when anomaly detected.

```typescript
// Pseudo-code for Alert Logic
const stats = await getRecentStats(fieldId); // Last 30 days
const mean = stats.reduce((a,b) => a+b, 0) / stats.length;
const stdDev = calculateStdDev(stats);
const current = await getCurrentNDVI(fieldId);

if (current < mean - (2 * stdDev)) {
  createAlert(fieldId, "Sudden health drop detected", "high");
}
```

---

## 3. GPS-Guided Navigation

**Purpose**: Guide user to specific problem areas in the field.

**Implementation**:
- **Frontend**: Use `navigator.geolocation.watchPosition()`.
- **Map Integration**: Leaflet `L.marker` for user position, updated in real-time.
- **Guidance**:
  - User taps a "Management Zone" or "Problem Pixel" on map.
  - App calculates bearing and distance using Haversine formula.
  - Display "Walk 50m North-East" overlay.

**Code Snippet (React)**:
```typescript
navigator.geolocation.watchPosition((pos) => {
  const { latitude, longitude } = pos.coords;
  setUserLocation([latitude, longitude]);
  const dist = calculateDistance(latitude, longitude, target.lat, target.lon);
  setGuidance(`Distance: ${Math.round(dist)}m`);
});
```

---

## 4. Management Zone Generation & VRA Maps

**Purpose**: Divide field into zones (High, Medium, Low productivity) for Variable Rate Application (VRA) of fertilizer.

**Algorithm (K-Means Clustering)**:
1. **Input**: NDVI raster of the field (or average of multiple dates).
2. **Process**:
   - Flatten pixel values.
   - Apply K-Means clustering (k=3 for Low/Med/High).
   - Reconstruct raster with cluster IDs.
   - Vectorize raster to Polygons (GeoJSON).
3. **Output**: GeoJSON with properties `{ "zone": "High", "recommendation": "100kg/ha" }`.

**Implementation**:
- **Backend**: Python (`scikit-learn` for clustering, `rasterio`/`shapely` for GIS) or Node.js (`turf.js` or simple thresholding).
- **Simple Thresholding (Node.js)**:
  - Calculate Mean NDVI.
  - Zone 1 (Low): `< Mean - 0.1`
  - Zone 2 (Med): `Mean ± 0.1`
  - Zone 3 (High): `> Mean + 0.1`

---

## 5. Historical Growth Benchmarking

**Purpose**: Compare current crop performance against previous successful seasons.

**Implementation**:
1. **Data Collection**: Fetch NDVI time-series for current season and previous years (e.g., 2024 vs 2023).
2. **Normalization**: Align data by "Days After Sowing" (DAS) rather than calendar date.
3. **Visualization**: Line chart with:
   - Solid Line: Current Season
   - Dotted Line: Last Season
   - Shaded Area: 5-year Average Range.

**API Endpoint**:
`GET /api/fields/{id}/benchmark?years=2023,2024`

---

## 6. Sentinel & Management Zone Monitoring

**Sentinel Zone Monitoring**:
- **Concept**: Instead of averaging the whole field, monitor specific "Sentinel Zones" (small reference areas, e.g., best soil vs worst soil).
- **Implementation**: Allow user to draw sub-polygons within the field. Treat them as separate "fields" in database with a parent_id relationship.

**Variable Rate Application (VRA) Maps**:
- **Format**: Export generated Management Zones as Shapefile (.shp) or standard GeoJSON for tractor integration.
- **Attributes**: Add `rate_n` (Nitrogen rate), `rate_p` (Phosphorus), etc., to the GeoJSON properties.

