// ARVI (Atmospherically Resistant Vegetation Index) - Better for disease detection
export const ARVI_EVALSCRIPT = `
//VERSION=3
function setup() {
  return {
    input: [{
      bands: ["B02", "B04", "B08", "SCL"],
      units: "DN"
    }],
    output: {
      bands: 3,
      sampleType: "AUTO"
    }
  };
}

function evaluatePixel(sample) {
  if ([0, 1, 3, 8, 9, 11].includes(sample.SCL)) {
      return [0.3, 0.3, 0.3];
  }

  const rb = sample.B04 - (2 * sample.B02);
  const ARVI = (sample.B08 - rb) / (sample.B08 + rb);
  
  if (isNaN(ARVI) || !isFinite(ARVI)) {
      return [0.3, 0.3, 0.3];
  }
  
  return colorBlend(ARVI,
    [0.2, 0.5, 0.8],
    [
      [0.8, 0.2, 0.2],
      [0.9, 0.8, 0.1],
      [0.1, 0.6, 0.2]
    ]
  );
}

function colorBlend(val, stops, colors) {
    if (val <= stops[0]) return colors[0];
    if (val >= stops[stops.length - 1]) return colors[colors.length - 1];
    
    for (let i = 0; i < stops.length - 1; i++) {
        if (val >= stops[i] && val <= stops[i+1]) {
            const t = (val - stops[i]) / (stops[i+1] - stops[i]);
            const r = colors[i][0] + (colors[i+1][0] - colors[i][0]) * t;
            const g = colors[i][1] + (colors[i+1][1] - colors[i][1]) * t;
            const b = colors[i][2] + (colors[i+1][2] - colors[i][2]) * t;
            return [r, g, b];
        }
    }
    return colors[0];
}
`;

// MCARI (Modified Chlorophyll Absorption Ratio Index) - Disease stress detection
export const MCARI_EVALSCRIPT = `
//VERSION=3
function setup() {
  return {
    input: [{
      bands: ["B03", "B04", "B05", "SCL"],
      units: "DN"
    }],
    output: {
      bands: 3,
      sampleType: "AUTO"
    }
  };
}

function evaluatePixel(sample) {
  if ([0, 1, 3, 8, 9, 11].includes(sample.SCL)) {
      return [0.3, 0.3, 0.3];
  }

  const MCARI = ((sample.B05 - sample.B04) - 0.2 * (sample.B05 - sample.B03)) * (sample.B05 / sample.B04);
  
  if (isNaN(MCARI) || !isFinite(MCARI)) {
      return [0.3, 0.3, 0.3];
  }
  
  const normalized = Math.max(0, Math.min(1, MCARI / 2));
  
  return colorBlend(normalized,
    [0.3, 0.6],
    [
      [0.8, 0.2, 0.2],
      [0.9, 0.8, 0.1],
      [0.1, 0.6, 0.2]
    ]
  );
}

function colorBlend(val, stops, colors) {
    if (val <= stops[0]) return colors[0];
    if (val >= stops[stops.length - 1]) return colors[colors.length - 1];
    
    for (let i = 0; i < stops.length - 1; i++) {
        if (val >= stops[i] && val <= stops[i+1]) {
            const t = (val - stops[i]) / (stops[i+1] - stops[i]);
            const r = colors[i][0] + (colors[i+1][0] - colors[i][0]) * t;
            const g = colors[i][1] + (colors[i+1][1] - colors[i][1]) * t;
            const b = colors[i][2] + (colors[i+1][2] - colors[i][2]) * t;
            return [r, g, b];
        }
    }
    return colors[0];
}
`;

// PSRI (Plant Senescence Reflectance Index) - Nutrient stress & aging
export const PSRI_EVALSCRIPT = `
//VERSION=3
function setup() {
  return {
    input: [{
      bands: ["B02", "B04", "B06", "SCL"],
      units: "DN"
    }],
    output: {
      bands: 3,
      sampleType: "AUTO"
    }
  };
}

function evaluatePixel(sample) {
  if ([0, 1, 3, 8, 9, 11].includes(sample.SCL)) {
      return [0.3, 0.3, 0.3];
  }

  const PSRI = (sample.B04 - sample.B02) / sample.B06;
  
  if (isNaN(PSRI) || !isFinite(PSRI)) {
      return [0.3, 0.3, 0.3];
  }
  
  const normalized = Math.max(-0.2, Math.min(0.8, PSRI));
  
  return colorBlend(normalized,
    [-0.1, 0.2, 0.5],
    [
      [0.1, 0.6, 0.2],
      [0.9, 0.8, 0.1],
      [0.8, 0.2, 0.2]
    ]
  );
}

function colorBlend(val, stops, colors) {
    if (val <= stops[0]) return colors[0];
    if (val >= stops[stops.length - 1]) return colors[colors.length - 1];
    
    for (let i = 0; i < stops.length - 1; i++) {
        if (val >= stops[i] && val <= stops[i+1]) {
            const t = (val - stops[i]) / (stops[i+1] - stops[i]);
            const r = colors[i][0] + (colors[i+1][0] - colors[i][0]) * t;
            const g = colors[i][1] + (colors[i+1][1] - colors[i][1]) * t;
            const b = colors[i][2] + (colors[i+1][2] - colors[i][2]) * t;
            return [r, g, b];
        }
    }
    return colors[0];
}
`;

// VCI (Vegetation Condition Index) - Requires historical context
// Note: VCI = ((NDVI_current - NDVI_min) / (NDVI_max - NDVI_min)) * 100
// This evalscript only returns NDVI - VCI is calculated in the application layer
export const VCI_BASE_EVALSCRIPT = `
//VERSION=3
function setup() {
  return {
    input: [{
      bands: ["B04", "B08", "SCL"],
      units: "DN"
    }],
    output: [
      {
        id: "ndvi",
        bands: 1,
        sampleType: "FLOAT32"
      },
      {
        id: "dataMask",
        bands: 1
      }
    ]
  };
}

function evaluatePixel(sample) {
  let isCloudOrBad = [0, 1, 3, 8, 9, 11].includes(sample.SCL);
  
  if (isCloudOrBad) {
    return {
      ndvi: [NaN],
      dataMask: [0]
    };
  }

  const ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  return {
    ndvi: [ndvi],
    dataMask: [1]
  };
}
`;

// VCI Visualization Evalscript (when min/max are known)
// This is a custom evalscript that would need to be generated dynamically
export const createVCIVisualizationEvalscript = (ndviMin: number, ndviMax: number) => `
//VERSION=3
function setup() {
  return {
    input: [{
      bands: ["B04", "B08", "SCL"],
      units: "DN"
    }],
    output: {
      bands: 3,
      sampleType: "AUTO"
    }
  };
}

function evaluatePixel(sample) {
  if ([0, 1, 3, 8, 9, 11].includes(sample.SCL)) {
      return [0.3, 0.3, 0.3];
  }

  const ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  
  if (isNaN(ndvi) || !isFinite(ndvi)) {
      return [0.3, 0.3, 0.3];
  }

  // Calculate VCI
  const ndvi_min = ${ndviMin};
  const ndvi_max = ${ndviMax};
  const vci = ((ndvi - ndvi_min) / (ndvi_max - ndvi_min)) * 100;
  
  // Normalize VCI for color mapping (0-100 scale)
  const normalized = Math.max(0, Math.min(100, vci)) / 100;
  
  // Color gradient: Red (drought) -> Yellow -> Green (good conditions)
  return colorBlend(normalized,
    [0.2, 0.5, 0.8],
    [
      [0.9, 0.1, 0.1], // Red - Severe drought/stress
      [0.9, 0.8, 0.1], // Yellow - Moderate stress
      [0.1, 0.7, 0.2]  // Green - Good conditions
    ]
  );
}

function colorBlend(val, stops, colors) {
    if (val <= stops[0]) return colors[0];
    if (val >= stops[stops.length - 1]) return colors[colors.length - 1];
    
    for (let i = 0; i < stops.length - 1; i++) {
        if (val >= stops[i] && val <= stops[i+1]) {
            const t = (val - stops[i]) / (stops[i+1] - stops[i]);
            const r = colors[i][0] + (colors[i+1][0] - colors[i][0]) * t;
            const g = colors[i][1] + (colors[i+1][1] - colors[i][1]) * t;
            const b = colors[i][2] + (colors[i+1][2] - colors[i][2]) * t;
            return [r, g, b];
        }
    }
    return colors[0];
}
`;
