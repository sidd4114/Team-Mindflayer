-- Script to populate test data for advanced features
-- Run this in Supabase SQL Editor to see all components

-- 1. Add sample NDVI statistics (for VCI calculation)
-- Replace 'YOUR_FIELD_ID' with your actual field ID

INSERT INTO public.ndvi_statistics (field_id, year, doy_start, doy_end, ndvi_min, ndvi_max, ndvi_mean, sample_count)
VALUES 
  -- Replace with your field ID
  ('YOUR_FIELD_ID', 2025, 1, 90, 0.35, 0.82, 0.65, 45),
  ('YOUR_FIELD_ID', 2025, 91, 180, 0.42, 0.88, 0.72, 48),
  ('YOUR_FIELD_ID', 2024, 1, 90, 0.38, 0.79, 0.63, 42),
  ('YOUR_FIELD_ID', 2024, 91, 180, 0.45, 0.85, 0.70, 46)
ON CONFLICT (field_id, year, doy_start, doy_end) DO NOTHING;

-- 2. Add historical benchmark data
INSERT INTO public.season_benchmarks (field_id, year, das_start, das_end, ndvi_mean, ndvi_min, ndvi_max, yield_actual, notes)
VALUES 
  ('YOUR_FIELD_ID', 2024, 30, 60, 0.68, 0.45, 0.79, 4500, 'Good season with adequate rainfall'),
  ('YOUR_FIELD_ID', 2023, 30, 60, 0.62, 0.38, 0.75, 4100, 'Moderate drought stress'),
  ('YOUR_FIELD_ID', 2025, 30, 60, 0.71, 0.52, 0.82, NULL, 'Current season - ongoing')
ON CONFLICT (field_id, year, das_start, das_end) DO NOTHING;

-- 3. Check if your field has a planting date (required for benchmark)
-- If NULL, update it:
-- UPDATE public.fields 
-- SET planting_date = '2026-01-01'  -- Adjust date as needed
-- WHERE id = 'YOUR_FIELD_ID';

-- 4. Verify the data was inserted
SELECT 'NDVI Stats Count' as check_type, COUNT(*) as count FROM public.ndvi_statistics WHERE field_id = 'YOUR_FIELD_ID'
UNION ALL
SELECT 'Benchmark Count', COUNT(*) FROM public.season_benchmarks WHERE field_id = 'YOUR_FIELD_ID'
UNION ALL
SELECT 'Readings Count', COUNT(*) FROM public.vegetation_readings WHERE field_id = 'YOUR_FIELD_ID';
