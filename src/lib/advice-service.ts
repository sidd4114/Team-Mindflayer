/**
 * Advice Service - Handles treatment and prevention advice
 * Uses offline JSON data when offline, Gemini API when online
 */

import type { ScanResult } from '@/app/page';

interface AdviceData {
  treatments: Record<string, Record<string, string>>;
  prevention: Record<string, Record<string, string>>;
}

let adviceData: AdviceData | null = null;

// Cache-bust so updated advice (e.g. corn diseases) is loaded; bump when advice-data.json changes
const ADVICE_DATA_VERSION = 2;

const EMPTY_ADVICE: AdviceData = { treatments: {}, prevention: {} };

async function loadAdviceData(): Promise<AdviceData> {
  if (adviceData) return adviceData;

  try {
    const response = await fetch(`/advice-data.json?v=${ADVICE_DATA_VERSION}`, {
      cache: 'no-store',
    });
    if (!response.ok) return EMPTY_ADVICE;
    const data = (await response.json()) as AdviceData;
    if (data?.treatments && data?.prevention) {
      adviceData = data;
      return data;
    }
  } catch {
    // Offline or network error: avoid surfacing "Failed to fetch" to the user
  }
  return EMPTY_ADVICE;
}

/**
 * Get treatment advice - uses offline JSON when offline, Gemini when online (with JSON fallback on failure)
 */
export async function getTreatmentAdvice(
  scanResult: ScanResult | null,
  locale: string,
  diseaseName: string
): Promise<string> {
  if (!scanResult) return '';
  if (scanResult.treatment === 'healthy') {
    return 'Your crop appears healthy. Continue regular monitoring and maintenance.';
  }

  const langMap: Record<string, string> = { en: 'en', hi: 'hi', mr: 'mr' };
  const lang = langMap[locale] || 'en';

  // Offline: use only JSON (no Gemini request)
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return await getOfflineAdvice('treatment', scanResult.treatment, lang);
  }

  // Online: try Gemini, then fall back to JSON on failure
  try {
    const geminiAdvice = await getGeminiAdvice('treatment', diseaseName, lang);
    if (geminiAdvice !== null) return geminiAdvice;
  } catch (error) {
    console.warn('Gemini API failed, falling back to offline data:', error);
  }
  return await getOfflineAdvice('treatment', scanResult.treatment, lang);
}

/**
 * Get prevention advice - uses offline JSON when offline, Gemini when online (with JSON fallback on failure)
 */
export async function getPreventionAdvice(
  scanResult: ScanResult | null,
  locale: string,
  diseaseName: string
): Promise<string> {
  if (!scanResult) return '';
  if (scanResult.treatment === 'healthy') {
    return 'Maintain regular monitoring and good farm practices to keep your crop healthy.';
  }

  const langMap: Record<string, string> = { en: 'en', hi: 'hi', mr: 'mr' };
  const lang = langMap[locale] || 'en';

  // Offline: use only JSON (no Gemini request)
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return await getOfflineAdvice('prevention', scanResult.treatment, lang);
  }

  // Online: try Gemini, then fall back to JSON on failure
  try {
    const geminiAdvice = await getGeminiAdvice('prevention', diseaseName, lang);
    if (geminiAdvice !== null) return geminiAdvice;
  } catch (error) {
    console.warn('Gemini API failed, falling back to offline data:', error);
  }
  return await getOfflineAdvice('prevention', scanResult.treatment, lang);
}

/** Locale message file shape: treatment and prevention are Record<key, string> per language */
const localeAdviceCache: Record<string, { treatment: Record<string, string>; prevention: Record<string, string> } | null> = {};

/** When offline: fetch advice from locale-specific message file (en.json, hi.json, mr.json) */
async function loadLocaleAdvice(lang: string): Promise<{ treatment: Record<string, string>; prevention: Record<string, string> } | null> {
  if (localeAdviceCache[lang] !== undefined) return localeAdviceCache[lang];
  try {
    const response = await fetch(`/messages/${lang}.json`, { cache: 'no-store' });
    if (!response.ok) return null;
    const data = (await response.json()) as { treatment?: Record<string, string>; prevention?: Record<string, string> };
    if (data.treatment && data.prevention) {
      localeAdviceCache[lang] = { treatment: data.treatment, prevention: data.prevention };
      return localeAdviceCache[lang];
    }
  } catch {
    // ignore
  }
  localeAdviceCache[lang] = null;
  return null;
}

const FALLBACK_TREATMENT = 'Treatment advice not available. Please consult with a local agricultural expert.';
const FALLBACK_PREVENTION = 'Prevention tips not available. Maintain good farm practices and regular monitoring.';

/**
 * Get offline advice: prefer locale message file (en.json, hi.json, mr.json), fallback to advice-data.json
 */
async function getOfflineAdvice(
  type: 'treatment' | 'prevention',
  diseaseKey: string,
  lang: string
): Promise<string> {
  try {
    const key = (diseaseKey || '').toLowerCase().trim();
    if (!key) {
      return type === 'treatment' ? FALLBACK_TREATMENT : FALLBACK_PREVENTION;
    }

    // Prefer locale-specific message file (en.json, hi.json, mr.json)
    try {
      const localeData = await loadLocaleAdvice(lang);
      if (localeData) {
        const typeData = type === 'treatment' ? localeData.treatment : localeData.prevention;
        const text = typeData?.[key];
        if (text) return text;
      }
    } catch {
      // ignore
    }

    // Fallback: advice-data.json (multi-lang)
    const data = await loadAdviceData();
    const typeData = type === 'treatment' ? data.treatments : data.prevention;
    const entry = typeData?.[key];
    if (entry) {
      if (entry[lang]) return entry[lang];
      if (entry['en']) return entry['en'];
    }

    return type === 'treatment' ? FALLBACK_TREATMENT : FALLBACK_PREVENTION;
  } catch {
    return type === 'treatment' ? FALLBACK_TREATMENT : FALLBACK_PREVENTION;
  }
}

/**
 * Get advice from Gemini API via server route
 */
/** Returns advice string, or null if Gemini is unavailable (e.g. offline or key not configured) so caller can use offline advice. */
async function getGeminiAdvice(
  type: 'treatment' | 'prevention',
  diseaseName: string,
  lang: string
): Promise<string | null> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return null; // Never call API when offline
  }
  try {
    const response = await fetch('/api/advice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        diseaseName,
        language: lang,
      }),
    });

    const responseText = await response.text();
    let data: { error?: string; details?: string; advice?: string } = {};
    try {
      if (responseText) data = JSON.parse(responseText);
    } catch {
      data = {};
    }

    if (!response.ok) {
      const errorMessage = data?.error || response.statusText || `HTTP ${response.status}`;
      const details = data?.details || (responseText && responseText.length < 200 ? responseText : '');
      const isKeyNotConfigured = errorMessage.includes('Gemini API key not configured');
      if (isKeyNotConfigured) {
        return null; // Silent fallback to offline advice
      }
      console.error(
        'Advice API Error:',
        `status=${response.status}`,
        `error=${errorMessage}`,
        details ? `details=${details}` : ''
      );
      throw new Error(`Advice API error: ${errorMessage}${details ? ` - ${details}` : ''}`);
    }

    if (!data.advice) {
      console.warn('No advice in response:', data);
      throw new Error('No advice returned from API');
    }

    return data.advice;
  } catch (error) {
    console.error('Advice API call failed:', error);
    throw error;
  }
}
