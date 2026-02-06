# Offline Plant Disease Classification

## Overview

FarmScan now includes a fully offline plant disease classification feature that works completely in the browser using TensorFlow.js. This allows farmers to diagnose crop diseases even without internet connectivity.

## Features

✅ **Completely Offline**: Works without internet after initial load  
✅ **Real-time Classification**: Instant results using device camera  
✅ **11 Disease Classes**: Detects diseases in tomato, potato, and bell pepper plants  
✅ **PWA Support**: Service Worker caches model files for offline use  
✅ **Mobile Optimized**: Designed for use in the field on mobile devices  
✅ **Multi-language**: Supports English, Hindi, and Marathi  

## Supported Plants & Diseases

### Bell Pepper
- Anthracnose
- Bacterial Spot
- Healthy

### Potato
- Early Blight
- Late Blight
- Healthy

### Tomato
- Bacterial Spot
- Early Blight
- Late Blight
- Leaf Mold
- Healthy

## Technical Architecture

### Model
- **Architecture**: MobileNetV2 (optimized for mobile devices)
- **Input Size**: 224x224x3 (RGB images)
- **Output**: 11 classes with confidence scores
- **Size**: ~13MB (split into 3 shards for efficient loading)
- **Framework**: TensorFlow.js

### Components

1. **Offline Classifier** (`src/lib/offline-classifier.ts`)
   - Handles model loading and inference
   - Manages TensorFlow.js backend (WebGL/CPU)
   - Preprocesses images for model input
   - Returns classification results with metadata

2. **Disease Scanner** (`src/components/DiseaseScanner.tsx`)
   - Camera interface for capturing plant images
   - Real-time model status indicators
   - Error handling and user feedback
   - Multi-language support

3. **Service Worker** (`public/sw.js`)
   - Caches model files for offline use
   - Implements cache-first strategy for model assets
   - Network-first strategy for app updates

4. **Service Worker Manager** (`src/lib/service-worker.ts`)
   - Handles SW registration and lifecycle
   - Provides utilities for cache management
   - Checks for updates periodically

## Usage

### For Users

1. **First Time Setup**:
   - Open FarmScan app in a modern browser
   - Allow camera permissions when prompted
   - The AI model will download automatically (~13MB)
   - Service Worker will cache the model for offline use

2. **Scanning Plants**:
   - Click "Scan Leaf" button on the dashboard
   - Position the plant leaf within the camera frame
   - Tap the capture button
   - Wait for AI analysis (2-3 seconds)
   - View results with disease name, confidence, and treatment

3. **Offline Mode**:
   - After initial setup, the app works completely offline
   - Model runs entirely in the browser
   - No data is sent to any server
   - Results are instant

### For Developers

#### Installation

```bash
npm install @tensorflow/tfjs @tensorflow/tfjs-backend-webgl @tensorflow/tfjs-backend-cpu
```

#### Basic Usage

```typescript
import offlineClassifier from '@/lib/offline-classifier';

// Load model (only needed once)
await offlineClassifier.loadModel();

// Classify from video element
const videoElement = document.getElementById('video') as HTMLVideoElement;
const result = await offlineClassifier.classifyFromWebcam(videoElement);

console.log(result.displayName);    // "Tomato Early Blight"
console.log(result.confidence);     // 87.5
console.log(result.severity);       // "high"
console.log(result.treatment);      // "Apply fungicides..."
```

#### Advanced Usage

```typescript
// Classify from image URL
const result = await offlineClassifier.classifyImage('path/to/image.jpg');

// Classify from HTMLImageElement
const img = new Image();
img.src = 'path/to/image.jpg';
await img.decode();
const result = await offlineClassifier.classifyImage(img);

// Get memory usage
const memoryInfo = offlineClassifier.getMemoryInfo();
console.log(`Tensors in memory: ${memoryInfo.numTensors}`);
console.log(`Memory used: ${memoryInfo.numBytes} bytes`);

// Clean up (only when completely done)
offlineClassifier.dispose();
```

## File Structure

```
public/
  models/
    image-classifier/
      model.json              # Model architecture
      labels.json             # Class labels
      group1-shard1of3.bin   # Model weights (part 1)
      group1-shard2of3.bin   # Model weights (part 2)
      group1-shard3of3.bin   # Model weights (part 3)
  sw.js                       # Service Worker

src/
  lib/
    offline-classifier.ts     # Main classifier logic
    service-worker.ts         # SW registration utility
  components/
    DiseaseScanner.tsx       # Camera interface
    ServiceWorkerRegistration.tsx
    ErrorBoundary.tsx        # Error handling
```

## Performance

### Model Loading
- **First Load**: 3-5 seconds (downloading 13MB)
- **Cached Load**: 500-1000ms (from cache)
- **WebGL Backend**: Preferred for performance
- **CPU Fallback**: Used if WebGL unavailable

### Inference Time
- **WebGL**: 50-200ms per image
- **CPU**: 300-800ms per image
- **Mobile (WebGL)**: 100-300ms
- **Mobile (CPU)**: 500-1500ms

### Memory Usage
- **Model**: ~13MB
- **Runtime (WebGL)**: ~50-100MB
- **Runtime (CPU)**: ~30-50MB

## Browser Compatibility

### Supported Browsers
✅ Chrome/Edge 88+ (WebGL + WebAssembly)  
✅ Safari 14+ (WebGL + WebAssembly)  
✅ Firefox 85+ (WebGL + WebAssembly)  
✅ Samsung Internet 13+ (WebGL)  

### Mobile Support
✅ iOS 14+ (Safari, Chrome)  
✅ Android 7+ (Chrome, Samsung Internet, Firefox)  

### Required Features
- WebGL 2.0 or WebGL 1.0
- WebAssembly
- Service Worker (for offline mode)
- Camera API (for live scanning)

## Edge Cases & Error Handling

### Model Loading Failures
- **Network Error**: Shows user-friendly error, retry button
- **Corrupted Model**: Falls back to error state, suggests reload
- **Backend Init Failed**: Tries WebGL → CPU fallback

### Camera Issues
- **Permission Denied**: Shows permission instructions
- **Camera Not Available**: Provides alternative upload option
- **Video Not Ready**: Waits for video to load before capture

### Classification Errors
- **Low Confidence**: Still shows result with warning
- **Processing Error**: Allows retry with same or new image
- **Out of Memory**: Disposes tensors and retries

### Offline Scenarios
- **First Visit Offline**: Shows message to connect once
- **Cached but Outdated**: Uses cached model, checks for updates
- **Partial Cache**: Re-downloads missing files

## Optimization Tips

### For Performance
1. Use WebGL backend when available
2. Warm up model with dummy inference
3. Reuse video element for multiple scans
4. Dispose tensors after each inference
5. Limit concurrent inferences to 1

### For Mobile
1. Use environment camera (back camera)
2. Limit video resolution to reduce memory
3. Show loading states for better UX
4. Cache model files aggressively
5. Test on low-end devices

### For Offline Use
1. Pre-cache all model files on first load
2. Use service worker with cache-first strategy
3. Show offline indicator clearly
4. Allow users to verify cache status
5. Implement background sync for results

## Troubleshooting

### Model Won't Load
```
Issue: "Failed to load model"
Solutions:
- Check browser console for errors
- Verify model files exist in /public/models/
- Check network tab for 404 errors
- Clear cache and reload
- Try incognito mode
```

### Slow Inference
```
Issue: Classification takes >2 seconds
Solutions:
- Check if WebGL is working (console logs)
- Close other tabs to free memory
- Restart browser
- Check CPU usage
- Use desktop for testing
```

### Memory Leaks
```
Issue: Memory keeps increasing
Solutions:
- Ensure tensors are disposed after use
- Check for tf.tidy() usage
- Monitor with getMemoryInfo()
- Dispose model when done
- Reload page periodically
```

## Future Enhancements

- [ ] Add more plant species
- [ ] Implement batch processing
- [ ] Add confidence thresholding
- [ ] Support for multiple diseases per image
- [ ] Crop image automatically to leaf region
- [ ] Export classification history
- [ ] Model quantization for smaller size
- [ ] Progressive model loading

## License

The model and code are provided for educational and non-commercial use.

## Credits

- Model: MobileNetV2 architecture
- Framework: TensorFlow.js
- Dataset: PlantVillage (preprocessed)
