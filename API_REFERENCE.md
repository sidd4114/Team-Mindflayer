# Sentinel Hub Advanced Features - API Quick Reference

## 🔗 New API Endpoints

### 1. Vegetation Condition Index (VCI)

```http
GET /api/fields/{fieldId}/vci?date={ISO_DATE}&includeMap={boolean}
```

**Description**: Calculate VCI for drought monitoring

**Query Parameters**:
- `date` (optional): ISO date string, defaults to current date
- `includeMap` (optional): Set to `true` to include visualization map

**Response**: VCI value (0-100), severity, interpretation, recommendations

---

### 2. Management Zones

#### Generate Zones
```http
POST /api/fields/{fieldId}/management-zones
Content-Type: application/json

{
  "date": "2024-02-06",
  "threshold": 0.1
}
```

**Description**: Generate productivity zones for Variable Rate Application

**Body Parameters**:
- `date` (optional): Analysis date
- `threshold` (optional): NDVI threshold, default 0.1

**Response**: Array of zones with fertilizer recommendations

---

#### Get Zones
```http
GET /api/fields/{fieldId}/management-zones
```

**Description**: Retrieve latest management zones for field

**Response**: Latest zones with recommendations

---

#### Export VRA Map
```http
GET /api/fields/{fieldId}/management-zones?format=vra
```

**Description**: Export zones as GeoJSON for precision agriculture equipment

**Response**: GeoJSON FeatureCollection with fertilizer rates

---

#### Delete Zones
```http
DELETE /api/fields/{fieldId}/management-zones?date={DATE}
```

**Description**: Delete management zones for specific date

**Query Parameters**:
- `date` (required): Analysis date to delete (YYYY-MM-DD)

---

### 3. Historical Benchmarking

#### Compare Seasons
```http
GET /api/fields/{fieldId}/benchmark?year={YEAR}&years={YEAR_LIST}
```

**Description**: Compare current season with historical performance

**Query Parameters**:
- `year` (optional): Current year, defaults to current year
- `years` (optional): Comma-separated list of years to compare against

**Response**: Current vs historical NDVI data with performance analysis

---

#### Store Benchmark
```http
POST /api/fields/{fieldId}/benchmark
Content-Type: application/json

{
  "year": 2024,
  "ndviData": [
    { "date": "2024-01-15", "ndvi": 0.35 },
    { "date": "2024-02-01", "ndvi": 0.48 }
  ],
  "yieldActual": 5200,
  "notes": "Good season"
}
```

**Description**: Store season data as benchmark for future comparisons

**Body Parameters**:
- `year` (required): Season year
- `ndviData` (required): Array of { date, ndvi } objects
- `yieldActual` (optional): Actual yield in kg/ha
- `notes` (optional): Season notes

---

### 4. Enhanced Alerts

```http
GET /api/fields/{fieldId}/alerts?refresh={boolean}&includeStatistics={boolean}
```

**Description**: Get field alerts with enhanced statistical anomaly detection

**Query Parameters**:
- `refresh` (optional): Set to `true` to fetch fresh data and detect new anomalies
- `includeStatistics` (optional): Set to `true` to include statistical analysis

**Response**: Active alerts plus optional statistical analysis

---

## 📊 Existing Enhanced Endpoints

### 5. Multi-Index Retrieval
```http
GET /api/fields/{fieldId}/indices?date={DATE}&indices={INDICES_LIST}
```

**Supported Indices**: `ndvi,ndmi,ndre,ndwi,evi,arvi,mcari,psri`

**New Indices Available**:
- `arvi`: Atmospherically Resistant Vegetation Index
- `mcari`: Modified Chlorophyll Absorption Ratio Index
- `psri`: Plant Senescence Reflectance Index

---

### 6. SAR Soil Moisture
```http
GET /api/fields/{fieldId}/sar-moisture?date={DATE}
```

**Description**: Sentinel-1 SAR-based soil moisture estimation

**Features**: Works through clouds, provides moisture level classification

---

### 7. NDVI Time Series
```http
GET /api/fields/{fieldId}/timeseries?from={ISO_DATE}&to={ISO_DATE}
```

**Description**: Fetch NDVI time series with automatic database caching

**Response**: Array of time series points with mean, stdDev, validRatio

---

## 🔐 Authentication

All endpoints require authentication via Supabase:

```javascript
// Example with fetch
const response = await fetch('/api/fields/{fieldId}/vci', {
  headers: {
    'Authorization': `Bearer ${supabase.auth.session().access_token}`
  }
});
```

---

## 📝 Complete API Flow Examples

### Drought Monitoring Workflow

```javascript
// 1. Check VCI
const vci = await fetch(`/api/fields/${fieldId}/vci?date=${date}&includeMap=true`)
  .then(r => r.json());

// 2. If drought detected, check alerts
if (vci.severity === 'poor' || vci.severity === 'severe_drought') {
  const alerts = await fetch(`/api/fields/${fieldId}/alerts?refresh=true&includeStatistics=true`)
    .then(r => r.json());
  
  // 3. Display recommendations
  console.log(vci.recommendations);
  console.log('Statistical Analysis:', alerts.statistics);
}
```

---

### Precision Agriculture Workflow

```javascript
// 1. Generate management zones
await fetch(`/api/fields/${fieldId}/management-zones`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ date: new Date().toISOString(), threshold: 0.1 })
});

// 2. Export VRA map for equipment
const vraMap = await fetch(`/api/fields/${fieldId}/management-zones?format=vra`)
  .then(r => r.json());

// 3. Download as file
const blob = new Blob([JSON.stringify(vraMap)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
// ... trigger download
```

---

### Season Comparison Workflow

```javascript
// 1. Get historical benchmark
const comparison = await fetch(
  `/api/fields/${fieldId}/benchmark?year=2025&years=2023,2024`
).then(r => r.json());

// 2. Analyze performance
console.log(`Performance vs Average: ${comparison.statistics.performance_vs_average}%`);
console.log(comparison.interpretation);

// 3. At end of season, store benchmark
await fetch(`/api/fields/${fieldId}/benchmark`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    year: 2025,
    ndviData: timeSeriesData,
    yieldActual: finalYield,
    notes: 'Season notes here'
  })
});
```

---

## 🎯 Response Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | Success | Request completed successfully |
| 400 | Bad Request | Missing required parameters, invalid date format |
| 401 | Unauthorized | Not authenticated or invalid token |
| 404 | Not Found | Field not found or user doesn't own field |
| 500 | Server Error | Sentinel Hub API error, database error |

---

## 🔧 Common Errors & Solutions

### "Insufficient historical data"
- **Cause**: Not enough past NDVI data for VCI calculation
- **Solution**: Collect at least 2 seasons of data, or adjust VCI window

### "No NDVI data available"
- **Cause**: High cloud cover or date outside Sentinel-2 coverage
- **Solution**: Try different date, check cloud cover parameter

### "Field not found"
- **Cause**: Invalid fieldId or user doesn't own field
- **Solution**: Verify fieldId and user authentication

### "Failed to authenticate with Sentinel Hub"
- **Cause**: Invalid or expired Sentinel Hub credentials
- **Solution**: Check SH_CLIENT_ID and SH_CLIENT_SECRET in environment

---

## 📈 Rate Limits

**Sentinel Hub**:
- Free tier: 1,500 Processing Units/month
- Standard tier: Variable based on subscription

**Recommendations**:
- Cache NDVI time series in database (already implemented)
- Batch requests when possible
- Use appropriate date ranges to minimize API calls

---

## 🔗 Related Documentation

- [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md) - Full implementation guide
- [COMPREHENSIVE_FEATURES_IMPLEMENTATION.md](./COMPREHENSIVE_FEATURES_IMPLEMENTATION.md) - Original feature specification
- [SENTINEL_HUB_GUIDE.md](./SENTINEL_HUB_GUIDE.md) - Sentinel Hub integration guide

---

**Last Updated**: February 6, 2025  
**API Version**: 2.0  
**Status**: ✅ Production Ready
