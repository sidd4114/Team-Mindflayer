export const NDVI_EVALSCRIPT = `
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
  // Filter out invalid pixels (clouds, shadows, water, snow, etc.)
  // SCL: 0=No Data, 1=Saturated, 3=Cloud Shadow, 8=Cloud Medium, 9=Cloud High, 11=Snow/Ice
  if ([0, 1, 3, 8, 9, 11].includes(sample.SCL)) {
      return [0.3, 0.3, 0.3]; // Gray for masked areas instead of pure black
  }

  const NDVI = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  
  // Handle invalid NDVI values
  if (isNaN(NDVI) || !isFinite(NDVI)) {
      return [0.3, 0.3, 0.3];
  }
  
  // Smooth Gradient:
  // < 0.2: Red [0.8, 0, 0]
  // 0.2 - 0.5: Red to Yellow
  // 0.5 - 0.8: Yellow to Green
  // > 0.8: Green [0, 0.6, 0]
  
  return colorBlend(NDVI,
    [0.2, 0.5, 0.8],
    [
      [0.8, 0.2, 0.2], // Red
      [0.9, 0.8, 0.1], // Yellow
      [0.1, 0.6, 0.2]  // Green
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

export const NDWI_EVALSCRIPT = `
//VERSION=3
function setup() {
  return {
    input: [{
      bands: ["B03", "B08", "SCL"],
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
    return [0, 0, 0];
  }
  
  const NDWI = (sample.B03 - sample.B08) / (sample.B03 + sample.B08);
  
  // Smooth Blue Gradient
  return colorBlend(NDWI,
    [-0.3, 0, 0.3],
    [
        [0.7, 0.5, 0.3], // Brown
        [0.8, 0.8, 0.8], // White/Tan
        [0.1, 0.3, 0.9]  // Blue
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

export const EVI_EVALSCRIPT = `
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
    return [0, 0, 0];
  }

  const EVI = 2.5 * ((sample.B08 - sample.B04) / (sample.B08 + 6 * sample.B04 - 7.5 * sample.B02 + 10000));
  
  // Smooth Gradient similar to NDVI
  return colorBlend(EVI,
    [0.1, 0.3, 0.6],
    [
      [0.8, 0.2, 0.2], // Red
      [0.9, 0.8, 0.1], // Yellow
      [0.1, 0.6, 0.2]  // Green
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

export const TRUE_COLOR_EVALSCRIPT = `
//VERSION=3
function setup() {
  return {
    input: ["B02", "B03", "B04"],
    output: {
      bands: 3,
      sampleType: "AUTO"
    }
  };
}

function evaluatePixel(sample) {
  return [2.5 * sample.B04 / 10000, 2.5 * sample.B03 / 10000, 2.5 * sample.B02 / 10000];
}
`;

export const FALSE_COLOR_EVALSCRIPT = `
//VERSION=3
function setup() {
  return {
    input: ["B03", "B04", "B08"],
    output: {
      bands: 3,
      sampleType: "AUTO"
    }
  };
}

function evaluatePixel(sample) {
  return [2.5 * sample.B08 / 10000, 2.5 * sample.B04 / 10000, 2.5 * sample.B03 / 10000];
}
`;
export const NDMI_EVALSCRIPT = `
//VERSION=3
function setup() {
  return {
    input: [{
      bands: ["B08", "B11", "SCL"],
      units: "DN"
    }],
    output: {
      bands: 3,
      sampleType: "AUTO"
    }
  };
}

function evaluatePixel(sample) {
  // Filter out invalid pixels
  if ([0, 1, 3, 8, 9, 11].includes(sample.SCL)) {
      return [0.3, 0.3, 0.3]; // Gray for masked areas
  }

  const NDMI = (sample.B08 - sample.B11) / (sample.B08 + sample.B11);
  
  // Handle invalid values
  if (isNaN(NDMI) || !isFinite(NDMI)) {
      return [0.3, 0.3, 0.3];
  }
  
  // NDMI Gradient:
  // < 0.2: Red (severe water stress)
  // 0.2 - 0.4: Yellow (moderate)
  // > 0.4: Blue (healthy moisture)
  
  return colorBlend(NDMI,
    [0.2, 0.4],
    [
      [0.8, 0.2, 0.2], // Red - Severe stress
      [0.9, 0.8, 0.1], // Yellow - Moderate
      [0.1, 0.3, 0.9]  // Blue - Healthy
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

export const NDRE_EVALSCRIPT = `
//VERSION=3
function setup() {
  return {
    input: [{
      bands: ["B05", "B08", "SCL"],
      units: "DN"
    }],
    output: {
      bands: 3,
      sampleType: "AUTO"
    }
  };
}

function evaluatePixel(sample) {
  // Filter out invalid pixels
  if ([0, 1, 3, 8, 9, 11].includes(sample.SCL)) {
      return [0.3, 0.3, 0.3]; // Gray for masked areas
  }

  const NDRE = (sample.B08 - sample.B05) / (sample.B08 + sample.B05);
  
  // Handle invalid values
  if (isNaN(NDRE) || !isFinite(NDRE)) {
      return [0.3, 0.3, 0.3];
  }
  
  // NDRE Gradient (similar to NDVI but more sensitive to chlorophyll):
  // < 0.2: Red
  // 0.2 - 0.5: Red to Yellow
  // 0.5 - 0.8: Yellow to Green
  // > 0.8: Green
  
  return colorBlend(NDRE,
    [0.2, 0.5, 0.8],
    [
      [0.8, 0.2, 0.2], // Red
      [0.9, 0.8, 0.1], // Yellow
      [0.1, 0.6, 0.2]  // Green
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
