export const SENTINEL_CONFIG = {
    // Max cloud cover percentage (0-100)
    MAX_CLOUD_COVER: Number(process.env.SENTINEL_MAX_CLOUD_COVER) || 20,

    // Anomaly detection thresholds
    NDVI_DROP_FRACTION: Number(process.env.NDVI_DROP_FRACTION) || 0.15, // 15% drop triggers alert
    MIN_NDVI_THRESHOLD: Number(process.env.MIN_NDVI_THRESHOLD) || 0.3,  // Absolute minimum NDVI for healthy vegetation

    // Sentinel Hub API endpoints
    AUTH_URL: "https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token",
    CATALOG_URL: "https://services.sentinel-hub.com/api/v1/catalog/search",
    PROCESS_URL: "https://services.sentinel-hub.com/api/v1/process",
    STATISTICS_URL: "https://services.sentinel-hub.com/api/v1/statistics",
};
