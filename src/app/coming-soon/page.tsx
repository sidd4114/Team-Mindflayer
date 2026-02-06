'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Sparkles } from 'lucide-react';

export default function ComingSoonPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Header with Back Button - Mobile Optimized */}
      <div className="bg-amber-700 px-4 py-4 safe-top">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white font-semibold active:opacity-70 transition-opacity"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
          <span className="text-base">Go Back</span>
        </button>
      </div>

      {/* Main Content - Centered on Mobile */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-lg w-full">
          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-stone-200">
            {/* Header with gradient - Compact on Mobile */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-8 sm:py-12 text-center">
              <div className="flex justify-center mb-3 sm:mb-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                  <Sparkles className="w-14 h-14 sm:w-16 sm:h-16 text-white" strokeWidth={2} />
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1.5">Coming Soon!</h1>
              <p className="text-white/95 text-lg sm:text-xl font-medium">जल्द ही आ रहा है</p>
            </div>

            {/* Content - Mobile Optimized Spacing */}
            <div className="p-5 sm:p-6 space-y-5">
              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border-2 border-amber-200">
                <Clock className="w-7 h-7 text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                <div>
                  <h2 className="font-bold text-stone-900 text-base sm:text-lg mb-2">
                    Feature Under Development
                  </h2>
                  <p className="text-sm text-stone-700 leading-relaxed">
                    We're working hard to bring you this exciting new feature! Our team is continuously 
                    improving farmScan to provide you with the best tools for smart farming.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-stone-200">
                <p className="text-stone-600 text-sm text-center leading-relaxed">
                  Stay tuned for updates. We'll notify you when this feature becomes available!
                </p>
              </div>

              {/* Touch-Friendly Button */}
              <button
                onClick={() => router.back()}
                className="w-full bg-amber-600 text-white rounded-xl py-4 font-bold text-base hover:bg-amber-700 active:scale-[0.98] transition-all border-2 border-amber-700 shadow-md"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
