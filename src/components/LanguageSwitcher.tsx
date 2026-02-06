'use client';

import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { Languages } from 'lucide-react';

type Locale = 'en' | 'hi' | 'mr';

const languages: { code: Locale; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'EN' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिं' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मर' },
];

type Variant = 'dark' | 'light';

export function LanguageSwitcher({ variant = 'dark' }: { variant?: Variant }) {
  const { locale, setLocale } = useI18n();
  const isLight = variant === 'light';

  return (
    <div className={`flex gap-0.5 items-center rounded-lg p-0.5 ${
      isLight ? 'bg-slate-200/70' : 'bg-white/10 backdrop-blur-sm'
    }`}>
      {languages.map(({ code, label, nativeLabel }) => (
        <button
          key={code}
          onClick={() => setLocale(code)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
            locale === code
              ? isLight ? 'bg-slate-400/80 text-white' : 'bg-white/20 text-white shadow-sm'
              : isLight ? 'text-slate-600 active:bg-slate-300/50' : 'text-white/70 hover:text-white'
          }`}
          aria-label={`Switch to ${label}`}
          aria-pressed={locale === code}
        >
          {nativeLabel}
        </button>
      ))}
    </div>
  );
}
