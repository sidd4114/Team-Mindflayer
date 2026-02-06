'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import en from '@/messages/en.json';
import hi from '@/messages/hi.json';
import mr from '@/messages/mr.json';

type Locale = 'en' | 'hi' | 'mr';

const LOCALE_STORAGE_KEY = 'farmScan_locale';

function getStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored === 'en' || stored === 'hi' || stored === 'mr') return stored;
  return null;
}

type TranslationValue = string | { [key: string]: TranslationValue };

interface I18nContextType {
  locale: Locale;
  messages: TranslationValue;
  setLocale: (locale: Locale) => void;
  t: (path: string, defaultValue?: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const messages: Record<Locale, TranslationValue> = {
  en: en as TranslationValue,
  hi: hi as TranslationValue,
  mr: mr as TranslationValue,
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const stored = getStoredLocale();
    if (stored) setLocaleState(stored);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window !== 'undefined') localStorage.setItem(LOCALE_STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (path: string, defaultValue?: string): string => {
      const keys = path.split('.');
      let value: TranslationValue = messages[locale];

      for (const key of keys) {
        if (typeof value === 'object' && value !== null) {
          value = value[key];
        } else {
          value = undefined as unknown as TranslationValue;
          break;
        }
      }

      return typeof value === 'string' ? value : defaultValue || path;
    },
    [locale]
  );

  return (
    <I18nContext.Provider
      value={{
        locale,
        messages: messages[locale],
        setLocale,
        t,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
