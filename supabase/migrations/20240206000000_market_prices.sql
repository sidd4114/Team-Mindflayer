-- Market Intelligence: price data and sell alerts
-- Prices can be populated by external feeds (APMC/AGMARKNET) or demo seed

create table if not exists public.market_prices (
  id uuid default gen_random_uuid() primary key,
  region text not null default 'default',
  crop_type text not null,
  date date not null,
  price_per_kg numeric(10, 2) not null,
  source text,
  created_at timestamptz default now(),
  unique(region, crop_type, date)
);

create index if not exists market_prices_region_crop_date_idx
  on public.market_prices (region, crop_type, date);

alter table public.market_prices enable row level security;

-- Allow read for all (prices are public market data)
create policy "Anyone can read market prices"
  on public.market_prices for select
  using (true);

-- Service/backend can insert (e.g. cron job)
create policy "Service can insert market prices"
  on public.market_prices for insert
  with check (true);
