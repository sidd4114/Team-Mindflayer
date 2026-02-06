# 🚀 Quick Start Guide - Offline Plant Disease Classifier

## For Users (Farmers)

### First Time Setup
1. Open FarmScan app in your mobile browser
2. Click **"Install App"** button (if prompted)
3. Allow **Camera permission** when asked
4. Wait for AI model to download (one time, ~13MB)
5. You're ready to scan offline! 🎉

### How to Scan a Leaf
1. Tap **"Scan Leaf"** button on home screen
2. Point camera at diseased plant leaf
3. Keep leaf within the green frame
4. Tap the **white capture button**
5. Wait 2-3 seconds for AI analysis
6. View disease name, confidence, and treatment advice

### Tips for Best Results
- ✅ Good lighting (natural sunlight is best)
- ✅ Clear view of leaf (no blur)
- ✅ Fill frame with leaf (zoom in)
- ✅ Focus on diseased area
- ✅ Hold phone steady

### Offline Mode
- After first download, works without internet
- No data charges
- Instant results
- Complete privacy

---

## For Developers

### Quick Setup
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open browser
# http://localhost:3000
```

### Test the Scanner
```typescript
import offlineClassifier from '@/lib/offline-classifier';

// Load model
await offlineClassifier.loadModel();

// Classify from webcam
const video = document.getElementById('webcam');
const result = await offlineClassifier.classifyFromWebcam(video);

console.log(result);
// {
//   disease: "tomato_early_blight",
//   displayName: "Tomato Early Blight",
//   confidence: 87.5,
//   severity: "high",
//   treatment: "Apply fungicides...",
//   description: "Fungal disease..."
// }
```

### Enable Offline Mode
1. Open DevTools
2. Application → Service Workers
3. Check "Offline"
4. Test scanner - should still work!

### Check Model Cache
```typescript
import { getCacheStatus } from '@/lib/service-worker';

const status = await getCacheStatus();
console.log(status);
// [
//   { file: '/models/image-classifier/model.json', cached: true },
//   { file: '/models/image-classifier/group1-shard1of3.bin', cached: true },
//   ...
// ]
```

### Debug Model Loading
```typescript
import offlineClassifier from '@/lib/offline-classifier';

// Check memory usage
const memory = offlineClassifier.getMemoryInfo();
console.log(`Tensors: ${memory.numTensors}`);
console.log(`Memory: ${memory.numBytes / 1024 / 1024}MB`);

// Force CPU backend (for testing)
import * as tf from '@tensorflow/tfjs';
await tf.setBackend('cpu');
await offlineClassifier.loadModel();
```

### Production Build
```bash
# Build for production
npm run build

# Test production build
npm start

# Deploy to hosting (Vercel, Netlify, etc.)
```

---

## Troubleshooting

### Problem: Model not loading
```bash
# Check if files exist
ls public/models/image-classifier/

# Should see:
# model.json
# labels.json
# group1-shard1of3.bin
# group1-shard2of3.bin
# group1-shard3of3.bin
```

### Problem: Camera not working
- Check HTTPS (camera requires secure context)
- Grant camera permission in browser settings
- Check if camera is being used by another app
- Try different browser

### Problem: Slow performance
- Check if WebGL is enabled: chrome://gpu
- Close other tabs to free memory
- Use newer device if possible
- Check browser console for errors

### Problem: Service Worker not caching
```javascript
// Check registration in console
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW registered:', !!reg);
  console.log('SW active:', !!reg?.active);
});

// Force update
navigator.serviceWorker.getRegistration().then(reg => {
  reg?.update();
});
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/offline-classifier.ts` | Main ML inference logic |
| `src/components/DiseaseScanner.tsx` | Camera UI component |
| `public/sw.js` | Service Worker for offline |
| `src/lib/service-worker.ts` | SW registration |
| `public/models/image-classifier/` | Model files |

---

## Resources

- 📖 Full Documentation: [OFFLINE_CLASSIFIER.md](OFFLINE_CLASSIFIER.md)
- 🎯 Integration Guide: [INTEGRATION_COMPLETE.md](INTEGRATION_COMPLETE.md)
- 🌐 TensorFlow.js Docs: https://www.tensorflow.org/js
- 💬 Issues: (Your GitHub repo)

---

## Quick Commands

```bash
# Development
npm run dev         # Start dev server
npm run build       # Build for production
npm run lint        # Check code quality

# Testing
npm run build       # Test build
npm run start       # Test production build

# Deployment
vercel deploy       # Deploy to Vercel
netlify deploy      # Deploy to Netlify
```

---

## Support

Need help? Check:
1. Browser console for errors
2. Network tab for failed requests
3. Application tab for service worker status
4. Console logs for model loading progress

---

**Happy scanning! 🌾📱**
