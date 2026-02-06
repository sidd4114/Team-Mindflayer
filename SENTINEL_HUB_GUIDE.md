# Sentinel Hub Indices Implementation Guide

## Available Indices

### 1. **NDVI** (Normalized Difference Vegetation Index)
- **Formula**: (B08 - B04) / (B08 + B04)
- **Use Case**: Primary vegetation health indicator
- **Interpretation**:
  - < 0.2: Low vegetation (stressed/barren)
  - 0.2 - 0.5: Moderate vegetation
  - 0.5 - 0.8: Healthy vegetation
  - > 0.8: Very healthy/dense vegetation
- **Endpoint**: `/api/fields/{fieldId}/map?date={YYYY-MM-DD}&index=ndvi`

### 2. **NDMI** (Normalized Difference Moisture Index) - NEW
- **Formula**: (B08 - B11) / (B08 + B11)
- **Use Case**: Water stress and soil moisture detection
- **Interpretation**:
  - < 0.2: Severe water stress (red zone)
  - 0.2 - 0.4: Moderate moisture (yellow zone)
  - > 0.4: Good moisture content (blue zone)
- **Endpoint**: `/api/fields/{fieldId}/map?date={YYYY-MM-DD}&index=ndmi`
- **Advantage**: Better for irrigation planning

### 3. **NDRE** (Normalized Difference Red Edge) - NEW
- **Formula**: (B08 - B05) / (B08 + B05)
- **Use Case**: Early detection of crop stress and chlorophyll changes
- **Interpretation**:
  - < 0.2: Low chlorophyll (stressed)
  - 0.2 - 0.5: Moderate chlorophyll
  - 0.5 - 0.8: Healthy chlorophyll
  - > 0.8: Very healthy/vigorous
- **Endpoint**: `/api/fields/{fieldId}/map?date={YYYY-MM-DD}&index=ndre`
- **Advantage**: More sensitive than NDVI to early crop changes

### 4. **NDWI** (Normalized Difference Water Index)
- **Formula**: (B03 - B08) / (B03 + B08)
- **Use Case**: Water and moisture detection
- **Interpretation**:
  - < -0.3: Dry vegetation
  - -0.3 - 0: Moderate moisture
  - > 0: High moisture/water bodies
- **Endpoint**: `/api/fields/{fieldId}/map?date={YYYY-MM-DD}&index=ndwi`

### 5. **EVI** (Enhanced Vegetation Index)
- **Formula**: 2.5 × ((B08 - B04) / (B08 + 6×B04 - 7.5×B02 + 10000))
- **Use Case**: Vegetation index with atmospheric correction
- **Interpretation**: Similar to NDVI but with better atmospheric compensation
- **Endpoint**: `/api/fields/{fieldId}/map?date={YYYY-MM-DD}&index=evi`

---

## Multi-Index Comparison API - NEW

### Endpoint
```
GET /api/fields/{fieldId}/indices?date={YYYY-MM-DD}&indices={index1,index2,index3}
```

### Parameters
- `fieldId`: Field ID (required)
- `date`: Date in YYYY-MM-DD format (required)
- `indices`: Comma-separated list of indices (default: "ndvi")

### Example Requests

**Single Index (NDVI)**
```
GET /api/fields/4eb8760d-4db5-4d73-99ba-1ec95900c075/indices?date=2026-01-24&indices=ndvi
```

**Multiple Indices**
```
GET /api/fields/4eb8760d-4db5-4d73-99ba-1ec95900c075/indices?date=2026-01-24&indices=ndvi,ndmi,ndre
```

**All Available Indices**
```
GET /api/fields/4eb8760d-4db5-4d73-99ba-1ec95900c075/indices?date=2026-01-24&indices=ndvi,ndmi,ndre,ndwi,evi
```

### Response Format
```json
{
  "fieldId": "4eb8760d-4db5-4d73-99ba-1ec95900c075",
  "date": "2026-01-24",
  "timestamp": "2026-01-28T10:30:00.000Z",
  "bounds": {
    "minLng": 73.5,
    "maxLng": 74.5,
    "minLat": 19.5,
    "maxLat": 20.5
  },
  "indices": [
    {
      "index": "ndvi",
      "mapUrl": "https://...",
      "fileName": "fieldId/2026-01-24/ndvi.png",
      "timestamp": "2026-01-28T10:30:00.000Z"
    },
    {
      "index": "ndmi",
      "mapUrl": "https://...",
      "fileName": "fieldId/2026-01-24/ndmi.png",
      "timestamp": "2026-01-28T10:30:00.000Z"
    },
    {
      "index": "ndre",
      "mapUrl": "https://...",
      "fileName": "fieldId/2026-01-24/ndre.png",
      "timestamp": "2026-01-28T10:30:00.000Z"
    }
  ],
  "metadata": {
    "totalIndices": 3,
    "cloudCover": "Data depends on satellite pass",
    "dataQuality": "Based on Sentinel-2 L2A data"
  }
}
```

---

## Scene Classification (SCL) Handling

All evalscripts now include scene classification masking:

### Masked Classes
- **0**: No Data
- **1**: Saturated pixels
- **3**: Cloud shadow
- **8**: Medium cloud
- **9**: High cloud
- **11**: Snow/Ice

### Display Behavior
- Masked pixels appear **gray (0.3, 0.3, 0.3)** instead of black
- Allows distinction between "no data" and "valid data with low values"

---

## Usage Examples

### Frontend Usage (React)
```javascript
// Single index
const response = await fetch(
  `/api/fields/${fieldId}/map?date=2026-01-24&index=ndvi`
);

// Multiple indices
const response = await fetch(
  `/api/fields/${fieldId}/indices?date=2026-01-24&indices=ndvi,ndmi,ndre`
);

const data = await response.json();
// data.indices contains array of maps with URLs
```

### Recommendation Strategy
1. **Start with NDVI** - General vegetation health
2. **Add NDMI** - If irrigation timing is critical
3. **Add NDRE** - For early stress detection
4. **Compare all 5** - For comprehensive analysis

### Best Practices
- Use **NDVI + NDMI** combo for crop health + water stress
- Use **NDRE** for early warning system (detects stress before NDVI)
- Check **NDWI** for water-related issues (excess water, flooding)
- Use **EVI** as alternative to NDVI for very dense vegetation

---

## Data Sources

- **Satellite**: Sentinel-2 (10m resolution)
- **Data Type**: Level 2A (atmospherically corrected)
- **Frequency**: ~5 days (Sentinel-2 revisit time)
- **Coverage**: Global land surface
- **Bands Used**:
  - B02 (Blue) - 10m
  - B03 (Green) - 10m
  - B04 (Red) - 10m
  - B05 (Red Edge) - 20m (resampled to 10m)
  - B08 (NIR) - 10m
  - B11 (SWIR) - 20m (resampled to 10m)
  - SCL (Scene Classification) - 20m (resampled to 10m)

---

## Configuration

From `.env.local`:
```
SENTINEL_MAX_CLOUD_COVER=20        # Only use images with <20% cloud cover
NDVI_DROP_FRACTION=0.15            # Alert if NDVI drops 15% from baseline
MIN_NDVI_THRESHOLD=0.3             # Minimum NDVI for healthy vegetation
```

---

## Testing Checklist

- [ ] NDVI map displays correctly
- [ ] NDMI map shows moisture patterns
- [ ] NDRE map shows early stress
- [ ] Multi-index endpoint returns all requested indices
- [ ] Field boundary overlay is correct
- [ ] Expanded view context is visible
- [ ] Gray masked areas are distinct from low values
- [ ] All indices handle cloud cover properly
