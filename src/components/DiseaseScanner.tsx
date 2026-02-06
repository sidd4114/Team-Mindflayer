'use client';

import React, { useRef, useState, useCallback, useEffect, ChangeEvent } from 'react';
import Webcam from 'react-webcam';
import { Camera, X, AlertCircle, Loader2, Zap, Search, Check, Sparkles } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import offlineClassifier, { type ClassificationResult } from '@/lib/offline-classifier';

interface ScanResult {
  disease: string;
  confidence: number;
  treatment: string;
  severity: 'low' | 'medium' | 'high';
}

interface DiseaseScannerProps {
  onResult: (result: ScanResult) => void;
  onClose: () => void;
}

export function DiseaseScanner({ onResult, onClose }: DiseaseScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<string>('');
  const [showDiseaseList, setShowDiseaseList] = useState(true);
  const { t } = useI18n();

  // Load model on mount
  useEffect(() => {
    const initModel = async () => {
      try {
        setIsModelLoading(true);
        setScanProgress(t('scanner.loadingModel', 'Loading AI model...'));
        await offlineClassifier.loadModel();
        setScanProgress(t('scanner.modelReady', 'Model ready'));
        setIsModelLoading(false);
        // Auto-hide disease list after model loads (with small delay)
        setTimeout(() => setShowDiseaseList(false), 2000);
      } catch (err) {
        console.error('Failed to load model:', err);
        setError(err instanceof Error ? err.message : 'Failed to load AI model');
        setIsModelLoading(false);
        setShowDiseaseList(false);
      }
    };

    initModel();

    // Cleanup on unmount
    return () => {
      // Don't dispose model as it might be used again
      // offlineClassifier.disposeModel();
    };
  }, []);

  const handleCapture = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setScanProgress(t('scanner.capturingImage', 'Capturing image...'));

      // Get video element from webcam
      const video = webcamRef.current?.video;
      if (!video) {
        throw new Error(t('scanner.noCamera', 'Camera not available'));
      }

      // Wait for video to be ready
      if (video.readyState < 2) {
        throw new Error(t('scanner.cameraNotReady', 'Camera is not ready yet'));
      }

      setScanProgress(t('scanner.analyzingPlant', 'Analyzing plant...'));

      // Run classification
      const result: ClassificationResult = await offlineClassifier.classifyFromWebcam(video);

      console.log('Classification result:', result);
      console.log('Top 3 predictions:', result.allPredictions.slice(0, 3).map(p => 
        `${p.label}: ${p.confidence.toFixed(1)}%`
      ).join(', '));
      
      // Show progress with detected disease
      setScanProgress(`Detected: ${result.displayName}`);

      // Wait a moment to show the result
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Return result
      onResult({
        disease: result.displayName,
        confidence: result.confidence,
        treatment: result.treatment,
        severity: result.severity,
      });
    } catch (err) {
      console.error('Classification error:', err);
      setError(
        err instanceof Error
          ? err.message
          : t('scanner.errorClassification', 'Failed to analyze image')
      );
      setScanProgress('');
    } finally {
      setIsLoading(false);
    }
  }, [onResult, t]);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        setIsLoading(true);
        setError(null);
        setScanProgress(t('scanner.loadingImage', 'Loading image...'));

        // Read file as data URL
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read image'));
          reader.readAsDataURL(file);
        });

        setScanProgress(t('scanner.analyzingPlant', 'Analyzing plant...'));

        const result: ClassificationResult = await offlineClassifier.classifyImage(
          dataUrl
        );

        console.log('Classification result:', result);
        console.log('Top 3 predictions:', result.allPredictions.slice(0, 3).map(p => 
          `${p.label}: ${p.confidence.toFixed(1)}%`
        ).join(', '));

        setScanProgress(
          `Detected: ${result.displayName}`
        );

        await new Promise((resolve) => setTimeout(resolve, 500));

        onResult({
          disease: result.displayName,
          confidence: result.confidence,
          treatment: result.treatment,
          severity: result.severity,
        });
      } catch (err) {
        console.error('Classification error:', err);
        setError(
          err instanceof Error
            ? err.message
            : t('scanner.errorClassification', 'Failed to analyze image')
        );
        setScanProgress('');
      } finally {
        setIsLoading(false);
        // reset input so same file can be selected again
        if (event.target) {
          event.target.value = '';
        }
      }
    },
    [onResult, t]
  );

  const videoConstraints = {
    facingMode: 'environment',
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="bg-stone-900 rounded-3xl overflow-hidden max-w-md w-full shadow-2xl">
        {/* Header - Cleaner Status */}
        <div className="bg-stone-900/95 backdrop-blur-sm p-5 flex justify-between items-center absolute top-0 left-0 right-0 z-10">
          <div className={`px-4 py-2.5 rounded-full flex items-center gap-2.5 ${
            isModelLoading ? 'bg-amber-500' : isLoading ? 'bg-emerald-600' : 'bg-sky-600'
          }`}>
            <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></span>
            <span className="text-white text-sm font-bold flex items-center gap-2">
              {isModelLoading ? (
                <>
                  <Zap className="w-4 h-4" strokeWidth={2.5} />
                  <span>{t('scanner.loadingModel', 'Loading AI...')}</span>
                </>
              ) : isLoading ? (
                <>
                  <Search className="w-4 h-4" strokeWidth={2.5} />
                  <span>{t('scanner.scanning', 'Scanning...')}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" strokeWidth={2.5} />
                  <span>{t('scanner.modelReady', 'Ready')}</span>
                </>
              )}
            </span>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-white hover:bg-stone-800 p-3 rounded-xl transition-colors disabled:opacity-50 bg-stone-800/80 touch-target"
            aria-label="Close scanner"
          >
            <X className="w-6 h-6" strokeWidth={2.5} />
          </button>
        </div>

        {/* Camera Feed */}
        <div className="relative bg-black aspect-[3/4] min-h-[500px]">
          {!error ? (
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white gap-4 p-6">
              <AlertCircle className="w-16 h-16 text-red-500" />
              <p className="text-center text-red-400 font-semibold">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setIsModelLoading(false);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
              >
                {t('scanner.retry', 'Try Again')}
              </button>
            </div>
          )}

          {/* Target Frame Overlay - Cleaner Design */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-72 h-72">
              {/* Corner brackets - Thicker and more visible */}
              <div className="absolute top-0 left-0 w-16 h-16 border-t-[5px] border-l-[5px] border-emerald-400 rounded-tl-2xl" style={{boxShadow: '0 0 20px rgba(52, 211, 153, 0.6)'}}></div>
              <div className="absolute top-0 right-0 w-16 h-16 border-t-[5px] border-r-[5px] border-emerald-400 rounded-tr-2xl" style={{boxShadow: '0 0 20px rgba(52, 211, 153, 0.6)'}}></div>
              <div className="absolute bottom-0 left-0 w-16 h-16 border-b-[5px] border-l-[5px] border-emerald-400 rounded-bl-2xl" style={{boxShadow: '0 0 20px rgba(52, 211, 153, 0.6)'}}></div>
              <div className="absolute bottom-0 right-0 w-16 h-16 border-b-[5px] border-r-[5px] border-emerald-400 rounded-br-2xl" style={{boxShadow: '0 0 20px rgba(52, 211, 153, 0.6)'}}></div>
              
              {/* Center crosshair - Simplified */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-10 h-10 border-[3px] border-emerald-400 rounded-full" style={{boxShadow: '0 0 15px rgba(52, 211, 153, 0.5)'}}></div>
              </div>

              {/* Scanning line animation */}
              {isLoading && (
                <div className="absolute inset-0 overflow-hidden rounded-2xl">
                  <div className="w-full h-1.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scan" style={{boxShadow: '0 0 10px rgba(52, 211, 153, 0.8)'}}></div>
                </div>
              )}
            </div>
          </div>

          {/* Scanning Progress - Cleaner Feedback */}
          {(isLoading || isModelLoading) && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col items-center justify-end pb-32">
              <div className="bg-emerald-600 rounded-2xl px-8 py-5 text-center shadow-2xl" style={{border: '3px solid #10b981'}}>
                <div className="flex items-center gap-4 justify-center mb-3">
                  <Loader2 className="w-7 h-7 text-white animate-spin" strokeWidth={3} />
                  <div className="text-white font-bold text-xl">
                    {scanProgress || t('scanner.processing', 'Processing...')}
                  </div>
                </div>
                {!isModelLoading && (
                  <div className="flex items-center gap-2 justify-center">
                    <div className="w-full bg-emerald-800 rounded-full h-2.5 max-w-[240px]">
                      <div className="bg-white h-2.5 rounded-full animate-pulse" style={{ width: '94%' }}></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom instruction text */}
        {!isLoading && !isModelLoading && !error && (
          <div className="absolute bottom-32 left-0 right-0 text-center px-6">
            <p className="text-white text-base font-bold bg-black/70 backdrop-blur-md rounded-xl py-3 px-6 inline-block shadow-lg">
              {t('scanner.subtitle', 'Position leaf within the frame')}
            </p>
          </div>
        )}

        {/* Disease List Info - Shows during model loading */}
        {showDiseaseList && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4 z-20">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-emerald-600" strokeWidth={2.5} />
                </div>
                <h3 className="font-bold text-stone-900 text-lg">
                  {t('scanner.detectableDiseases', 'Detectable Diseases')}
                </h3>
              </div>
              
              <p className="text-sm text-stone-600 mb-4">
                {t('scanner.aiCanDetect', 'Our AI can identify these crop diseases:')}
              </p>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {/* Potato Section */}
                <div className="bg-amber-50 rounded-xl p-3 border-2 border-amber-200">
                  <div className="font-bold text-stone-900 text-sm mb-1.5 flex items-center gap-1.5">
                    <span>🥔</span> Potato
                  </div>
                  <ul className="space-y-1">
                    <li className="text-xs text-stone-700 flex items-start gap-1.5">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>Early Blight</span>
                    </li>
                    <li className="text-xs text-stone-700 flex items-start gap-1.5">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>Late Blight</span>
                    </li>
                    <li className="text-xs text-stone-700 flex items-start gap-1.5">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>Healthy</span>
                    </li>
                  </ul>
                </div>

                {/* Tomato Section */}
                <div className="bg-red-50 rounded-xl p-3 border-2 border-red-200">
                  <div className="font-bold text-stone-900 text-sm mb-1.5 flex items-center gap-1.5">
                    <span>🍅</span> Tomato
                  </div>
                  <ul className="space-y-1">
                    <li className="text-xs text-stone-700 flex items-start gap-1.5">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>Early Blight</span>
                    </li>
                    <li className="text-xs text-stone-700 flex items-start gap-1.5">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>Late Blight</span>
                    </li>
                    <li className="text-xs text-stone-700 flex items-start gap-1.5">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>Bacterial Spot</span>
                    </li>
                    <li className="text-xs text-stone-700 flex items-start gap-1.5">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>Leaf Mold</span>
                    </li>
                    <li className="text-xs text-stone-700 flex items-start gap-1.5">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>Healthy</span>
                    </li>
                  </ul>
                </div>

                {/* Bell Pepper Section */}
                <div className="bg-green-50 rounded-xl p-3 border-2 border-green-200">
                  <div className="font-bold text-stone-900 text-sm mb-1.5 flex items-center gap-1.5">
                    <span>🫑</span> Bell Pepper
                  </div>
                  <ul className="space-y-1">
                    <li className="text-xs text-stone-700 flex items-start gap-1.5">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>Anthracnose</span>
                    </li>
                    <li className="text-xs text-stone-700 flex items-start gap-1.5">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>Bacterial Spot</span>
                    </li>
                    <li className="text-xs text-stone-700 flex items-start gap-1.5">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>Healthy</span>
                    </li>
                  </ul>
                </div>
              </div>

              {isModelLoading && (
                <div className="mt-4 flex items-center justify-center gap-2 text-emerald-600">
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
                  <span className="text-sm font-semibold">{t('scanner.loadingModel', 'Loading AI model...')}</span>
                </div>
              )}

              <button
                onClick={() => setShowDiseaseList(false)}
                className="w-full mt-4 bg-stone-200 text-stone-700 rounded-xl py-2.5 font-semibold text-sm hover:bg-stone-300 transition-colors"
              >
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        )}

        {/* Model Loading Message */}
        {isModelLoading && !error && !showDiseaseList && (
          <div className="absolute bottom-32 left-0 right-0 text-center px-6">
            <div className="text-white bg-sky-600/95 backdrop-blur-md rounded-xl py-4 px-6 inline-block shadow-lg">
              <Loader2 className="w-5 h-5 inline-block mr-3 animate-spin" strokeWidth={2.5} />
              <span className="text-base font-bold">{t('scanner.loadingModel', 'Loading AI model...')}</span>
            </div>
          </div>
        )}

        {/* Capture & Gallery Buttons - Larger Touch Targets */}
        {!isLoading && !isModelLoading && !error && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6 items-end px-6">
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="touch-target-lg px-5 py-3 rounded-2xl bg-white text-stone-900 text-sm font-bold shadow-lg hover:bg-stone-100 active:scale-95 transition-all"
              >
                {t('scanner.gallery', 'Gallery')}
              </button>
              <p className="text-xs text-stone-300 font-medium text-center max-w-[100px]">
                {t('scanner.galleryHint', 'Use saved photo')}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <button
              onClick={handleCapture}
              disabled={isLoading || isModelLoading}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-transform active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Capture image"
              style={{border: '4px solid white'}}
            >
              <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center">
                <Camera className="w-9 h-9 text-white" strokeWidth={2.5} />
              </div>
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes scan {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(256px);
          }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
