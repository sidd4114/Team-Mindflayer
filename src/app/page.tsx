'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sun, Droplets, Wind, Camera, Satellite, AlertTriangle, Volume2, Leaf, Sparkles, MapPin, ChevronRight, Search, Cloud, Eye, Gauge, SlidersHorizontal, Loader2, CloudRain, CloudSnow, CloudFog } from "lucide-react";
import { useState, useEffect } from "react";
import { DiseaseScanner } from "@/components/DiseaseScanner";
import { useI18n } from "@/contexts/I18nContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { FieldsBottomNav } from "@/app/fields/FieldsBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ScanResult {
  disease: string;
  confidence: number;
  treatment: string;
  severity: 'low' | 'medium' | 'high';
}

interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  visibility: number;
  pressure: number;
  description: string;
  icon: string;
  sunrise: number;
  sunset: number;
  city: string;
}

export default function Home() {
  const router = useRouter();
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [adviceVisible, setAdviceVisible] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState<boolean | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<string>('');
  const { t, locale } = useI18n();

  // Map app locales to language codes for Speech Synthesis
  const getLanguageCode = (): string => {
    const localeMap: Record<string, string> = {
      en: 'en-US',
      hi: 'hi-IN',
      mr: 'mr-IN',
    };
    return localeMap[locale] || 'en-US';
  };

  // Get translated treatment text
  const getTreatmentText = (): string => {
    if (!scanResult) return '';
    if (scanResult.treatment === 'healthy') {
      return t('results.healthyMsg');
    }
    return t(`treatment.${scanResult.treatment}`, scanResult.treatment);
  };

  // Get the best available voice for the language (prefer natural/premium voices)
  const getBestVoiceForLanguage = (langCode: string): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    const forLang = voices.filter(v => v.lang.startsWith(langCode.split('-')[0]) || v.lang === langCode);
    if (forLang.length === 0) return null;

    const prefer = (v: SpeechSynthesisVoice) => {
      const n = (v.name || '').toLowerCase();
      let score = 0;
      // Prefer local (often higher quality)
      if (v.localService) score += 4;
      // Prefer known premium/enhanced voices
      if (n.includes('google') || n.includes('enhanced') || n.includes('premium') || n.includes('neural')) score += 3;
      if (n.includes('microsoft') || n.includes('samantha') || n.includes('karen') || n.includes('daniel')) score += 2;
      // Prefer exact lang match (e.g. hi-IN over hi)
      if (v.lang === langCode) score += 2;
      if (v.default) score += 1;
      return score;
    };

    const sorted = [...forLang].sort((a, b) => prefer(b) - prefer(a));
    return sorted[0] ?? null;
  };

  const handleScanResult = (result: ScanResult) => {
    setScanResult(result);
    setShowScanner(false);
    setAdviceVisible(false);
  };

  // Helper function to convert disease name to translation key
  const getDiseaseTranslationKey = (diseaseName: string): string => {
    // Convert "Potato Late Blight" -> "potatoLateBlight"
    // Convert "Healthy Tomato" -> "tomatoHealthy"
    const normalized = diseaseName
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace('bellpepper', 'bellpepper')
      .replace('potato', 'potato')
      .replace('tomato', 'tomato');

    // Capitalize first letter after crop name
    const parts = diseaseName.split(' ');
    if (parts.length > 1) {
      const crop = parts[0].toLowerCase();
      const disease = parts.slice(1).join('').replace(/\s+/g, '');
      const diseaseCapitalized = disease.charAt(0).toUpperCase() + disease.slice(1).toLowerCase();
      const diseaseKey = crop + diseaseCapitalized.replace(/\s+/g, '');
      return diseaseKey;
    }

    return normalized;
  };

  // Set current date on client side only to avoid hydration mismatch
  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }));
  }, []);

  // Fetch weather data
  useEffect(() => {
    const setDemoWeatherData = () => {
      const now = new Date();
      const sunriseTime = new Date(now);
      sunriseTime.setHours(6, 30, 0);
      const sunsetTime = new Date(now);
      sunsetTime.setHours(18, 45, 0);

      setWeatherData({
        temp: 28,
        feelsLike: 26,
        humidity: 65,
        windSpeed: 12,
        visibility: 10,
        pressure: 30.2,
        description: 'partly cloudy',
        icon: '02d',
        sunrise: sunriseTime.getTime() / 1000,
        sunset: sunsetTime.getTime() / 1000,
        city: 'Pune',
      });
      setWeatherError(null);
      setWeatherLoading(false);
    };

    const fetchWeather = async () => {
      try {
        // Check if API key is configured
        const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;

        if (!API_KEY || API_KEY === 'demo') {
          console.info('ℹ️ OpenWeatherMap API key not configured. Using demo weather data.');
          setDemoWeatherData();
          return;
        }

        setWeatherLoading(true);
        setWeatherError(null);

        // Get user's location
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported'));
            return;
          }
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            { timeout: 10000 }
          );
        });

        const { latitude, longitude } = position.coords;

        // Fetch weather data from OpenWeatherMap API
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          if (response.status === 401) {
            console.error('❌ OpenWeatherMap API: 401 Unauthorized');
            console.error('→ Your API key might not be activated yet (takes 10-15 min)');
            console.error('→ Or the API key is invalid. Check: https://home.openweathermap.org/api_keys');
            throw new Error('API key unauthorized - check if activated');
          }

          const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
          throw new Error(errorMessage);
        }

        const data = await response.json();

        setWeatherData({
          temp: Math.round(data.main.temp),
          feelsLike: Math.round(data.main.feels_like),
          humidity: data.main.humidity,
          windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
          visibility: Math.round(data.visibility / 1609), // Convert meters to miles
          pressure: Math.round(data.main.pressure / 33.864), // Convert hPa to inHg
          description: data.weather[0].description,
          icon: data.weather[0].icon,
          sunrise: data.sys.sunrise,
          sunset: data.sys.sunset,
          city: data.name,
        });
        setWeatherError(null);
        setWeatherLoading(false);
      } catch (error) {
        console.error('Weather fetch error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch weather';
        console.info('ℹ️ Using demo weather data due to error:', errorMessage);
        setDemoWeatherData();
        setWeatherLoading(false);
      }
    };

    fetchWeather();
  }, []);

  // Get weather icon component based on icon code
  const getWeatherIcon = (iconCode: string) => {
    if (iconCode.includes('01')) return <Sun className="w-7 h-7 text-white" strokeWidth={2} />;
    if (iconCode.includes('02') || iconCode.includes('03') || iconCode.includes('04'))
      return <Cloud className="w-7 h-7 text-white" strokeWidth={2} />;
    if (iconCode.includes('09') || iconCode.includes('10'))
      return <CloudRain className="w-7 h-7 text-white" strokeWidth={2} />;
    if (iconCode.includes('11'))
      return <AlertTriangle className="w-7 h-7 text-white" strokeWidth={2} />;
    if (iconCode.includes('13'))
      return <CloudSnow className="w-7 h-7 text-white" strokeWidth={2} />;
    if (iconCode.includes('50'))
      return <CloudFog className="w-7 h-7 text-white" strokeWidth={2} />;
    return <Cloud className="w-7 h-7 text-white" strokeWidth={2} />;
  };

  // Format time from timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="min-h-screen bg-[#F5F3EE]">
      {/* Clean Olive Green Header */}
      <header className="bg-gradient-to-br from-[#6B7B3F] to-[#5A6A35] px-5 pt-4 pb-24 rounded-b-[36px]">
        <div className="max-w-md mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Leaf className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-white text-base font-semibold">{t("dashboard.greeting", "Hello, Farmers")}</p>
                <p className="text-white/80 text-xs mt-0.5" suppressHydrationWarning>{currentDate || ''}</p>
              </div>
            </div>
            <LanguageSwitcher />
          </div>

          {/* Enhanced Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/70" strokeWidth={2.5} />
            <input
              type="text"
              placeholder="Search here..."
              className="w-full bg-white/15 backdrop-blur-md border border-white/25 rounded-[18px] pl-12 pr-12 py-3.5 text-white placeholder:text-white/50 text-[15px] font-medium focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-white/30 transition-all">
              <SlidersHorizontal className="w-4 h-4 text-white" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Card */}
      <main className="max-w-md mx-auto px-5 -mt-20 pb-24">
        <div className="bg-white rounded-3xl shadow-xl shadow-black/5 p-6 space-y-5">
          {/* Enhanced Weather Card */}
          <div className="bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 rounded-2xl p-5 border border-blue-100/50">
            {weatherLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : weatherData ? (
              <>
                {weatherError && (
                  <div className="mb-3 px-3 py-2 bg-amber-100 border border-amber-200 rounded-xl">
                    <p className="text-[10px] text-amber-800 font-medium">
                      {weatherError.includes('API key')
                        ? '⚠️ Using demo data. Add API key for live weather.'
                        : '⚠️ Showing demo data. Check connection.'}
                    </p>
                  </div>
                )}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-400/30">
                      {getWeatherIcon(weatherData.icon)}
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-slate-900">
                        {weatherData.temp > 0 ? '+' : ''}{weatherData.temp}°
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-600 font-medium mt-0.5">
                        <MapPin className="w-3 h-3" strokeWidth={2} />
                        <span>{weatherData.city}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-900">
                      {weatherData.feelsLike > 0 ? '+' : ''}{weatherData.feelsLike}°
                    </div>
                    <div className="text-xs text-slate-500">Feels like</div>
                  </div>
                </div>

                {/* Weather Stats Grid */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="text-center">
                    <div className="w-10 h-10 bg-white/60 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-1.5">
                      <Wind className="w-5 h-5 text-slate-600" strokeWidth={2} />
                    </div>
                    <div className="text-xs font-bold text-slate-900">{weatherData.windSpeed}</div>
                    <div className="text-[10px] text-slate-500">km/h</div>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 bg-white/60 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-1.5">
                      <Droplets className="w-5 h-5 text-blue-500" strokeWidth={2} />
                    </div>
                    <div className="text-xs font-bold text-slate-900">{weatherData.humidity}%</div>
                    <div className="text-[10px] text-slate-500">{t("dashboard.humidity", "Humidity")}</div>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 bg-white/60 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-1.5">
                      <Eye className="w-5 h-5 text-slate-600" strokeWidth={2} />
                    </div>
                    <div className="text-xs font-bold text-slate-900">{weatherData.visibility} mi</div>
                    <div className="text-[10px] text-slate-500">Visibility</div>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 bg-white/60 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-1.5">
                      <Gauge className="w-5 h-5 text-slate-600" strokeWidth={2} />
                    </div>
                    <div className="text-xs font-bold text-slate-900">{weatherData.pressure.toFixed(1)}</div>
                    <div className="text-[10px] text-slate-500">inHg</div>
                  </div>
                </div>

                {/* Temperature Curve */}
                <div className="relative h-20 mt-4">
                  <div className="absolute inset-0 flex items-end justify-between">
                    <div className="flex-1 text-center">
                      <div className="text-[10px] text-slate-500 mb-1" suppressHydrationWarning>{formatTime(weatherData.sunrise)}</div>
                      <div className="text-xs font-bold text-slate-700">Sunrise</div>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <svg viewBox="0 0 200 60" className="w-full h-16">
                        <path
                          d="M 10 50 Q 60 10, 100 20 T 190 50"
                          fill="none"
                          stroke="#60a5fa"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                        <circle cx="100" cy="20" r="4" fill="#fbbf24" />
                      </svg>
                    </div>
                    <div className="flex-1 text-center">
                      <div className="text-[10px] text-slate-500 mb-1" suppressHydrationWarning>{formatTime(weatherData.sunset)}</div>
                      <div className="text-xs font-bold text-slate-700">Sunset</div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-slate-600">Unable to load weather data</p>
                {weatherError && (
                  <p className="text-xs text-slate-500 mt-1">{weatherError}</p>
                )}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between px-0.5">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Quick Actions</h3>
              <span className="text-xs font-medium text-slate-500">2 actions</span>
            </div>

            {/* Primary Action - Scan Leaf */}
            <button
              onClick={() => setShowScanner(true)}
              className="w-full relative bg-gradient-to-br from-[#6B7B3F] to-[#5A6A35] rounded-[22px] p-5 shadow-lg shadow-[#6B7B3F]/20 hover:shadow-xl hover:shadow-[#6B7B3F]/30 transition-all active:scale-[0.98] overflow-hidden group"
            >
              {/* Subtle shine effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>

              <div className="relative flex items-center gap-4">
                {/* Icon Container */}
                <div className="w-14 h-14 rounded-[18px] bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <Camera className="w-7 h-7 text-white" strokeWidth={2.5} />
                </div>

                {/* Content */}
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-lg font-bold text-white">{t("dashboard.scanLeaf", "Scan Leaf")}</h4>
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400/20 border border-amber-300/30">
                      <Sparkles className="w-3 h-3 text-amber-200" strokeWidth={2.5} />
                      <span className="text-[10px] font-bold text-amber-100">AI</span>
                    </div>
                  </div>
                  <p className="text-white/75 text-sm font-medium">{t("dashboard.scanLeafDesc", "Detect disease instantly")}</p>
                </div>

                {/* Arrow */}
                <ChevronRight className="w-5 h-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" strokeWidth={2.5} />
              </div>
            </button>

            {/* Secondary Action - Scan Field */}
            <Link href="/fields">
              <div className="w-full relative bg-white border-2 border-slate-200 rounded-[22px] p-5 hover:border-[#6B7B3F]/30 hover:shadow-md hover:shadow-[#6B7B3F]/5 transition-all active:scale-[0.98] group">
                <div className="flex items-center gap-4">
                  {/* Icon Container */}
                  <div className="w-14 h-14 rounded-[18px] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover:scale-105 transition-transform">
                    <Satellite className="w-7 h-7 text-white" strokeWidth={2.5} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 text-left">
                    <h4 className="text-lg font-bold text-slate-900 mb-1">{t("dashboard.scanField", "Scan Field")}</h4>
                    <p className="text-slate-600 text-sm font-medium">{t("dashboard.scanFieldDesc", "Satellite monitoring")}</p>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#6B7B3F] group-hover:translate-x-1 transition-all" strokeWidth={2.5} />
                </div>
              </div>
            </Link>
          </div>

          {/* Result Card */}
          {scanResult && (
            <div className="border-2 border-slate-200 bg-white rounded-3xl overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-[#6B7B3F] to-[#5A6A35] p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Leaf className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base">{t('results.disease', 'Disease Detected')}</h3>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Leaf className="w-4 h-4 text-[#6B7B3F]" strokeWidth={2.5} />
                    <h4 className="font-bold text-slate-900 text-sm">
                      {t(`diseases.${getDiseaseTranslationKey(scanResult.disease)}`, scanResult.disease)}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {scanResult.treatment === 'healthy'
                      ? t('results.healthyMsg', 'Continue monitoring for best results')
                      : t(`treatment.${scanResult.treatment}`, scanResult.treatment)}
                  </p>
                </div>

                <div>
                  <button
                    onClick={() => {
                      if (!scanResult) return;
                      setAdviceVisible(true);
                      const treatmentText = getTreatmentText();
                      try {
                        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                          window.speechSynthesis.cancel();
                          const utter = new SpeechSynthesisUtterance(treatmentText);

                          const langCode = getLanguageCode();
                          utter.lang = langCode;

                          // Adjust speech rate for better clarity, especially for Marathi
                          if (locale === 'mr') {
                            utter.rate = 0.7; // Slower for Marathi clarity
                          } else if (locale === 'hi') {
                            utter.rate = 0.85; // Slightly slower for Hindi
                          } else {
                            utter.rate = 1.0; // Normal for English
                          }

                          utter.pitch = 1.0;
                          utter.volume = 1.0;

                          const applyBestVoiceAndSpeak = () => {
                            const voice = getBestVoiceForLanguage(langCode);
                            if (voice) {
                              utter.voice = voice;
                              setVoiceAvailable(true);
                            } else {
                              setVoiceAvailable(false);
                            }
                            window.speechSynthesis.speak(utter);
                          };

                          // Ensure voices are loaded before speaking
                          if (window.speechSynthesis.getVoices().length === 0) {
                            window.speechSynthesis.onvoiceschanged = () => applyBestVoiceAndSpeak();
                          } else {
                            applyBestVoiceAndSpeak();
                          }
                        }
                      } catch (err) {
                        console.error('Failed to play speech:', err);
                      }
                    }}
                    className="w-full bg-amber-500 text-white rounded-2xl p-3 font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-600 transition-all active:scale-[0.98]"
                  >
                    <Volume2 className="w-4 h-4" strokeWidth={2.5} />
                    <span>{t('results.playTreatmentAdvice', 'Play Treatment Advice')}</span>
                  </button>

                  {adviceVisible && scanResult && (
                    <div className="mt-3 space-y-2">
                      {voiceAvailable === false && locale !== 'en' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-800">
                          <p className="font-semibold mb-1">⚠️ Voice not available</p>
                          <p>Your device may not have a {locale === 'mr' ? 'Marathi' : 'Hindi'} voice. Reading in English instead.</p>
                        </div>
                      )}
                      <div className="bg-white border border-slate-200 rounded-2xl p-3 text-sm text-slate-800">
                        <h5 className="font-semibold mb-1">{t('results.treatmentAdvice', 'Treatment Advice')}</h5>
                        <p className="leading-relaxed">{getTreatmentText()}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="w-full">
                  <button
                    onClick={() => setShowScanner(true)}
                    className="w-full bg-[#6B7B3F] text-white rounded-2xl p-3 font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#5A6A35] transition-all active:scale-[0.98]"
                  >
                    <Camera className="w-4 h-4" strokeWidth={2.5} />
                    <span>{t('results.scanAgain', 'Scan Again')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <FieldsBottomNav />

      {/* Disease Scanner Modal */}
      {showScanner && (
        <DiseaseScanner
          onResult={handleScanResult}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
