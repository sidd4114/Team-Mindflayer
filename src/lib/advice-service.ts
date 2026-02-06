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

// Load advice data from JSON file
async function loadAdviceData(): Promise<AdviceData> {
  if (adviceData) return adviceData;
  
  try {
    const response = await fetch('/advice-data.json');
    adviceData = await response.json();
    return adviceData;
  } catch (error) {
    console.error('Failed to load advice data:', error);
    // Return empty structure if fetch fails
    return { treatments: {}, prevention: {} };
  }
}

/**
 * Get treatment advice - uses Gemini if online, JSON fallback if offline
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

  // Map locale to language code
  const langMap: Record<string, string> = { en: 'en', hi: 'hi', mr: 'mr' };
  const lang = langMap[locale] || 'en';

  // Check if online
  if (navigator.onLine) {
    try {
      return await getGeminiAdvice('treatment', diseaseName, lang);
    } catch (error) {
      console.warn('Gemini API failed, falling back to offline data:', error);
      return await getOfflineAdvice('treatment', scanResult.treatment, lang);
    }
  } else {
    return await getOfflineAdvice('treatment', scanResult.treatment, lang);
  }
}

/**
 * Get prevention advice - uses Gemini if online, JSON fallback if offline
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

  // Map locale to language code
  const langMap: Record<string, string> = { en: 'en', hi: 'hi', mr: 'mr' };
  const lang = langMap[locale] || 'en';

  // Check if online
  if (navigator.onLine) {
    try {
      return await getGeminiAdvice('prevention', diseaseName, lang);
    } catch (error) {
      console.warn('Gemini API failed, falling back to offline data:', error);
      return await getOfflineAdvice('prevention', scanResult.treatment, lang);
    }
  } else {
    return await getOfflineAdvice('prevention', scanResult.treatment, lang);
  }
}

/**
 * Get offline advice from JSON file
 */
async function getOfflineAdvice(
  type: 'treatment' | 'prevention',
  diseaseKey: string,
  lang: string
): Promise<string> {
  const data = await loadAdviceData();
  const typeData = type === 'treatment' ? data.treatments : data.prevention;
  
  // Try to get the specific disease advice
  if (typeData[diseaseKey] && typeData[diseaseKey][lang]) {
    return typeData[diseaseKey][lang];
  }

  // Fallback to English if specific language not available
  if (typeData[diseaseKey] && typeData[diseaseKey]['en']) {
    return typeData[diseaseKey]['en'];
  }

  // Final fallback message
  return type === 'treatment'
    ? 'Treatment advice not available. Please consult with a local agricultural expert.'
    : 'Prevention tips not available. Maintain good farm practices and regular monitoring.';
}

/**
 * Get advice from Gemini API via server route
 */
async function getGeminiAdvice(
  type: 'treatment' | 'prevention',
  diseaseName: string,
  lang: string
): Promise<string> {
  try {
    console.log('Calling advice API route:', { type, diseaseName, lang });

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

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('Failed to parse advice API response:', parseError);
      throw new Error('Invalid response from advice API');
    }

    if (!response.ok) {
      const errorMessage = data?.error || `HTTP ${response.status}`;
      const details = data?.details || '';
      console.error('Advice API Error:', {
        status: response.status,
        error: errorMessage,
        details: details
      });
      throw new Error(`Advice API error: ${errorMessage}${details ? ` - ${details}` : ''}`);
    }

    if (!data.advice) {
      console.warn('No advice in response:', data);
      throw new Error('No advice returned from API');
    }

    console.log('Advice API Success:', { type, diseaseName, adviceLength: data.advice.length });
    return data.advice;
  } catch (error) {
    console.error('Advice API call failed:', error);
    throw error;
  }
}
