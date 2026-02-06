-- Enable PostGIS extension
create extension if not exists postgis schema extensions;

-- Create profiles table (matches Supabase Auth)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  preferred_language text default 'en',
  created_at timestamptz default now()
);

-- Create fields table
create table if not exists public.fields (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  crop_type text,
  geometry geometry(Polygon, 4326) not null,
  planting_date date,
  created_at timestamptz default now()
);

-- Create vegetation_readings table
create table if not exists public.vegetation_readings (
  id uuid default gen_random_uuid() primary key,
  field_id uuid references public.fields(id) on delete cascade not null,
  date date not null,
  ndvi_mean double precision,
  ndvi_std double precision,
  ndwi_mean double precision,
  evi_mean double precision,
  cloud_cover double precision,
  valid_pixel_ratio double precision,
  created_at timestamptz default now()
);

-- Create alerts table
create table if not exists public.alerts (
  id uuid default gen_random_uuid() primary key,
  field_id uuid references public.fields(id) on delete cascade not null,
  type text not null, -- e.g. 'ndvi_drop', 'water_stress'
  severity text check (severity in ('low', 'medium', 'high')),
  message text,
  detected_at timestamptz default now(),
  resolved_at timestamptz
);

-- Create Spatial Index
create index if not exists fields_geometry_idx on public.fields using gist (geometry);

-- Set up RLS (Row Level Security)
alter table public.profiles enable row level security;
alter table public.fields enable row level security;
alter table public.vegetation_readings enable row level security;
alter table public.alerts enable row level security;

-- Policies
-- Profiles: Users can view and update their own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Fields: Users can CRUD their own fields
create policy "Users can view own fields" on public.fields
  for select using (auth.uid() = user_id);

create policy "Users can insert own fields" on public.fields
  for insert with check (auth.uid() = user_id);

create policy "Users can update own fields" on public.fields
  for update using (auth.uid() = user_id);

create policy "Users can delete own fields" on public.fields
  for delete using (auth.uid() = user_id);

-- Vegetation Readings: Users can view readings for their fields
create policy "Users can view readings for own fields" on public.vegetation_readings
  for select using (
    exists (
      select 1 from public.fields
      where fields.id = vegetation_readings.field_id
      and fields.user_id = auth.uid()
    )
  );
  
-- Allow service role or backend to insert readings (if not using service role key in app code, you might need a policy for insert, but typically backend uses service role or the user inserts via an API that checks ownership)
-- For simplicity, assuming the API runs as the user or as service role. If API runs as user, we need insert policy.
create policy "Users can insert readings for own fields" on public.vegetation_readings
  for insert with check (
    exists (
      select 1 from public.fields
      where fields.id = vegetation_readings.field_id
      and fields.user_id = auth.uid()
    )
  );

-- Alerts: Users can view alerts for their fields
create policy "Users can view alerts for own fields" on public.alerts
  for select using (
    exists (
      select 1 from public.fields
      where fields.id = alerts.field_id
      and fields.user_id = auth.uid()
    )
  );

create policy "Users can insert alerts for own fields" on public.alerts
  for insert with check (
    exists (
      select 1 from public.fields
      where fields.id = alerts.field_id
      and fields.user_id = auth.uid()
    )
  );

-- Handle user creation trigger to create profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create Storage Bucket if not exists (This usually needs to be done via API or UI, but can be done via SQL in Supabase)
insert into storage.buckets (id, name, public) 
values ('field-maps', 'field-maps', true)
on conflict (id) do nothing;

-- Storage Policies
create policy "Maps are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'field-maps' );

create policy "Any authenticated user can manage field maps"
  on storage.objects for all
  using ( bucket_id = 'field-maps' AND auth.role() = 'authenticated' )
  with check ( bucket_id = 'field-maps' AND auth.role() = 'authenticated' );
