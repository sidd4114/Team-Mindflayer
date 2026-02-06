/**
 * Offline Plant Disease Classifier using TensorFlow.js
 * Loads and runs the MobileNetV2 model completely offline in the browser
 */

import * as tf from '@tensorflow/tfjs';

// Disease labels mapping
const DISEASE_LABELS = [
  'bellpepper_anthracnose',
  'bellpepper_bacterial_spot',
  'bellpepper_healthy',
  'potato_early_blight',
  'potato_healthy',
  'potato_late_blight',
  'tomato_bacterial_spot',
  'tomato_early_blight',
  'tomato_healthy',
  'tomato_late_blight',
  'tomato_leaf_mold',
];

// Disease information database
const DISEASE_INFO: Record<string, {
  displayName: string;
  severity: 'low' | 'medium' | 'high';
  treatmentKey: string;
  description: string;
}> = {
  bellpepper_anthracnose: {
    displayName: 'Bell Pepper Anthracnose',
    severity: 'high',
    treatmentKey: 'anthracnose',
    description: 'Fungal disease causing dark, sunken lesions on peppers.',
  },
  bellpepper_bacterial_spot: {
    displayName: 'Bell Pepper Bacterial Spot',
    severity: 'high',
    treatmentKey: 'bacterialspot',
    description: 'Bacterial infection causing dark spots on leaves and fruits.',
  },
  bellpepper_healthy: {
    displayName: 'Healthy Bell Pepper',
    severity: 'low',
    treatmentKey: 'healthy',
    description: 'Plant shows no signs of disease. Maintain good practices.',
  },
  potato_early_blight: {
    displayName: 'Potato Early Blight',
    severity: 'high',
    treatmentKey: 'earlyblight',
    description: 'Fungal disease causing brown spots with concentric rings on leaves.',
  },
  potato_healthy: {
    displayName: 'Healthy Potato',
    severity: 'low',
    treatmentKey: 'healthy',
    description: 'Plant shows no signs of disease. Maintain good practices.',
  },
  potato_late_blight: {
    displayName: 'Potato Late Blight',
    severity: 'high',
    treatmentKey: 'lateblight',
    description: 'Severe fungal disease that can destroy entire crops quickly.',
  },
  tomato_bacterial_spot: {
    displayName: 'Tomato Bacterial Spot',
    severity: 'high',
    treatmentKey: 'bacterialspot',
    description: 'Bacterial infection causing dark spots on leaves, stems, and fruits.',
  },
  tomato_early_blight: {
    displayName: 'Tomato Early Blight',
    severity: 'high',
    treatmentKey: 'earlyblight',
    description: 'Fungal disease causing brown spots with target-like patterns.',
  },
  tomato_healthy: {
    displayName: 'Healthy Tomato',
    severity: 'low',
    treatmentKey: 'healthy',
    description: 'Plant shows no signs of disease. Maintain good practices.',
  },
  tomato_late_blight: {
    displayName: 'Tomato Late Blight',
    severity: 'high',
    treatmentKey: 'lateblight',
    description: 'Severe fungal disease that spreads rapidly in humid conditions.',
  },
  tomato_leaf_mold: {
    displayName: 'Tomato Leaf Mold',
    severity: 'medium',
    treatmentKey: 'leafmold',
    description: 'Fungal disease causing yellow spots on upper leaf surfaces.',
  },
};

export interface ClassificationResult {
  disease: string;
  displayName: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
  treatment: string;
  description: string;
  allPredictions: Array<{
    label: string;
    confidence: number;
  }>;
}

class OfflineClassifier {
  private model: tf.GraphModel | null = null;
  private modelLoading: Promise<tf.GraphModel> | null = null;
  private isInitialized = false;

  /**
   * Initialize TensorFlow.js backend
   */
  private async initializeBackend(): Promise<void> {
    try {
      // Try WebGL first for better performance
      await tf.setBackend('webgl');
      await tf.ready();
      console.log('✅ TensorFlow.js WebGL backend initialized');
    } catch (error) {
      console.warn('⚠️ WebGL backend failed, falling back to CPU:', error);
      try {
        await tf.setBackend('cpu');
        await tf.ready();
        console.log('✅ TensorFlow.js CPU backend initialized');
      } catch (cpuError) {
        throw new Error('Failed to initialize TensorFlow.js: ' + (cpuError instanceof Error ? cpuError.message : String(cpuError)));
      }
    }
  }

  /**
   * Load the model from the public directory (TensorFlow.js GraphModel)
   */
  async loadModel(): Promise<tf.GraphModel> {
    // Return existing model if already loaded
    if (this.model) {
      return this.model;
    }

    // Return ongoing loading promise if already loading
    if (this.modelLoading) {
      return this.modelLoading;
    }

    // Start loading
    this.modelLoading = (async () => {
      try {
        console.log('🔄 Loading plant disease classification model...');

        // Initialize backend first
        if (!this.isInitialized) {
          await this.initializeBackend();
          this.isInitialized = true;
        }

        // Load model from public directory as a GraphModel
        const modelPath = '/models/image-classifier/model.json';
        console.log('📡 Loading TF.js GraphModel from:', modelPath);
        const model = await tf.loadGraphModel(modelPath);

        console.log('✅ GraphModel loaded successfully');
        if (model.inputs?.length && model.outputs?.length) {
          console.log('📊 Model input:', model.inputs[0].name, model.inputs[0].shape);
          console.log('📊 Model output:', model.outputs[0].name, model.outputs[0].shape);
        }

        this.model = model;
        return model;
      } catch (error) {
        console.error('❌ Failed to load model:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });

        this.modelLoading = null;

        // Provide more helpful error message
        if (error instanceof Error) {
          if (error.message.includes('not found') || error.message.includes('404')) {
            throw new Error('Model files not found. Please ensure the model files are in the public/models/image-classifier directory.');
          } else if (error.message.includes('CORS') || error.message.includes('network')) {
            throw new Error('Network error loading model. Please check your connection and try again.');
          } else {
            throw new Error(`Failed to load model: ${error.message}`);
          }
        }

        throw new Error('Failed to load classification model. Please try again later.');
      }
    })();

    return this.modelLoading;
  }

  /**
   * Preprocess image for model input (GraphModel expects float images)
   */
  private preprocessImage(imageElement: HTMLImageElement | HTMLVideoElement): tf.Tensor4D {
    return tf.tidy(() => {
      // Convert image to tensor
      const tensor = tf.browser.fromPixels(imageElement);

      // Resize to 224x224
      const resized = tf.image.resizeBilinear(tensor, [224, 224]);

      // Normalize to [0, 1]
      const normalized = tf.div(resized, 255);

      // Add batch dimension
      const batched = normalized.expandDims(0) as tf.Tensor4D;

      return batched;
    });
  }

  /**
   * Classify an image
   */
  async classifyImage(imageSource: string | HTMLImageElement | HTMLVideoElement): Promise<ClassificationResult> {
    try {
      // Ensure model is loaded
      const model = await this.loadModel();

      let imageElement: HTMLImageElement | HTMLVideoElement;

      // Handle different input types
      if (typeof imageSource === 'string') {
        // Load image from data URL or URL
        imageElement = await this.loadImageFromUrl(imageSource);
      } else {
        imageElement = imageSource;
      }

      // Preprocess image
      const preprocessed = this.preprocessImage(imageElement);

      // Run inference using GraphModel
      console.log('🔍 Running inference...');
      const graphModel = model;

      const inputName = graphModel.inputs[0].name;
      const outputName = graphModel.outputs[0].name;

      const predictions = graphModel.execute(
        { [inputName]: preprocessed },
        outputName
      ) as tf.Tensor;

      const probabilities = await predictions.data();

      // Clean up tensors
      preprocessed.dispose();
      predictions.dispose();

      // Get all predictions sorted by confidence
      const allPredictions = Array.from(probabilities)
        .map((confidence, index) => ({
          label: DISEASE_LABELS[index],
          confidence: confidence * 100,
        }))
        .sort((a, b) => b.confidence - a.confidence);

      // Get top prediction
      const topPrediction = allPredictions[0];
      const diseaseKey = topPrediction.label;
      const diseaseInfo = DISEASE_INFO[diseaseKey];

      if (!diseaseInfo) {
        throw new Error(`Unknown disease key: ${diseaseKey}`);
      }

      console.log('✅ Classification complete:', topPrediction);
      console.log('📊 Top 3 predictions:', allPredictions.slice(0, 3));

      return {
        disease: diseaseKey,
        displayName: diseaseInfo.displayName,
        confidence: topPrediction.confidence,
        severity: diseaseInfo.severity,
        treatment: diseaseInfo.treatmentKey,
        description: diseaseInfo.description,
        allPredictions,
      };
    } catch (error) {
      console.error('❌ Classification error:', error);
      throw new Error('Failed to classify image: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Load image from URL
   */
  private loadImageFromUrl(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));

      img.src = url;
    });
  }

  /**
   * Classify from webcam stream
   */
  async classifyFromWebcam(videoElement: HTMLVideoElement): Promise<ClassificationResult> {
    // Check if video is ready
    if (videoElement.readyState < 2) {
      throw new Error('Video element is not ready');
    }

    return this.classifyImage(videoElement);
  }

  /**
   * Get memory usage
   */
  getMemoryInfo(): { numTensors: number; numBytes: number } {
    return {
      numTensors: tf.memory().numTensors,
      numBytes: tf.memory().numBytes,
    };
  }

  /**
   * Get disease information by key
   */
  async getDiseaseInfo(diseaseKey: string): Promise<{
    displayName: string;
    severity: 'low' | 'medium' | 'high';
    treatment: string;
    description: string;
  }> {
    const info = DISEASE_INFO[diseaseKey];
    if (!info) {
      throw new Error(`Unknown disease: ${diseaseKey}`);
    }
    return {
      displayName: info.displayName,
      severity: info.severity,
      treatment: info.treatmentKey,
      description: info.description,
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.modelLoading = null;
  }
}

// Singleton instance
const classifierInstance = new OfflineClassifier();

export default classifierInstance;

// Export utility functions
export const loadModel = () => classifierInstance.loadModel();
export const classifyImage = (imageSource: string | HTMLImageElement | HTMLVideoElement) =>
  classifierInstance.classifyImage(imageSource);
export const classifyFromWebcam = (videoElement: HTMLVideoElement) =>
  classifierInstance.classifyFromWebcam(videoElement);
export const getDiseaseInfo = (diseaseKey: string) => classifierInstance.getDiseaseInfo(diseaseKey);
export const getMemoryInfo = () => classifierInstance.getMemoryInfo();
export const disposeModel = () => classifierInstance.dispose();
