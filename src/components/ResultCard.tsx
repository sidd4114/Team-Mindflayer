'use client';

import React from 'react';
import { CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface ResultCardProps {
  disease: string;
  confidence: number;
  treatment: string;
  severity: 'low' | 'medium' | 'high';
  onClose: () => void;
}

export function ResultCard({
  disease,
  confidence,
  treatment,
  severity,
  onClose,
}: ResultCardProps) {
  const { t } = useI18n();

  const isHealthy = disease === 'Healthy';
  const severityColors = {
    low: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    medium: 'bg-amber-50 border-amber-200 text-amber-700',
    high: 'bg-red-50 border-red-200 text-red-700',
  };

  const severityLabels = {
    low: 'Healthy',
    medium: 'Moderate',
    high: 'Severe',
  };

  const getTreatmentText = () => {
    if (treatment === 'healthy') {
      return t('results.healthyMsg');
    }
    return t(`treatment.${treatment}`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div
          className={`p-6 text-center ${
            isHealthy
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
              : 'bg-gradient-to-r from-amber-500 to-orange-600'
          }`}
        >
          {isHealthy ? (
            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-white" />
          ) : (
            <AlertCircle className="w-12 h-12 mx-auto mb-2 text-white" />
          )}
          <h2 className="text-white font-bold text-2xl">{disease}</h2>
          <p className="text-white text-opacity-90 text-sm mt-1">
            {isHealthy ? t('results.healthy') : t('results.disease')}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Severity Badge */}
          {!isHealthy && (
            <div>
              <label className="font-semibold text-gray-700 block mb-2">
                {t('results.severity')}
              </label>
              <div className={`px-4 py-2 rounded-lg border-2 font-semibold text-center ${severityColors[severity]}`}>
                {severityLabels[severity]}
              </div>
            </div>
          )}

          {/* Treatment */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-600" />
              {t('results.treatment')}
            </h3>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-sm text-gray-700 leading-relaxed">
              {getTreatmentText()}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
          >
            {t('results.viewReport')}
          </button>
        </div>
      </div>
    </div>
  );
}
