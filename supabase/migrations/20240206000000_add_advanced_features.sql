    -- Add Historical NDVI Statistics table for VCI calculation
    create table if not exists public.ndvi_statistics (
    id uuid default gen_random_uuid() primary key,
    field_id uuid references public.fields(id) on delete cascade not null,
    year integer not null,
    doy_start integer not null, -- Day of year start (1-365)
    doy_end integer not null,   -- Day of year end
    ndvi_min double precision not null,
    ndvi_max double precision not null,
    ndvi_mean double precision,
    sample_count integer,
    updated_at timestamptz default now(),
    unique(field_id, year, doy_start, doy_end)
    );

    -- Create Management Zones table
    create table if not exists public.management_zones (
    id uuid default gen_random_uuid() primary key,
    field_id uuid references public.fields(id) on delete cascade not null,
    zone_number integer not null,
    zone_type text not null, -- 'low', 'medium', 'high'
    geometry geometry(Polygon, 4326) not null,
    avg_ndvi double precision,
    recommendation_n double precision, -- Nitrogen kg/ha
    recommendation_p double precision, -- Phosphorus kg/ha
    recommendation_k double precision, -- Potassium kg/ha
    created_at timestamptz default now(),
    analysis_date date not null
    );

    -- Create Sentinel Zone Monitoring table (sub-polygons within fields)
    create table if not exists public.sentinel_zones (
    id uuid default gen_random_uuid() primary key,
    field_id uuid references public.fields(id) on delete cascade not null,
    name text not null,
    zone_type text, -- e.g., 'reference_high', 'reference_low', 'problem_area'
    geometry geometry(Polygon, 4326) not null,
    created_at timestamptz default now()
    );

    -- Create Historical Benchmarks table
    create table if not exists public.season_benchmarks (
    id uuid default gen_random_uuid() primary key,
    field_id uuid references public.fields(id) on delete cascade not null,
    year integer not null,
    das_start integer, -- Days After Sowing start
    das_end integer,
    ndvi_mean double precision,
    ndvi_min double precision,
    ndvi_max double precision,
    yield_actual double precision, -- Actual yield if available
    notes text,
    created_at timestamptz default now(),
    unique(field_id, year, das_start, das_end)
    );

    -- Add indices
    create index if not exists ndvi_stats_field_idx on public.ndvi_statistics(field_id);
    create index if not exists management_zones_field_idx on public.management_zones(field_id);
    create index if not exists management_zones_geometry_idx on public.management_zones using gist(geometry);
    create index if not exists sentinel_zones_field_idx on public.sentinel_zones(field_id);
    create index if not exists sentinel_zones_geometry_idx on public.sentinel_zones using gist(geometry);
    create index if not exists season_benchmarks_field_idx on public.season_benchmarks(field_id);

    -- RLS Policies
    alter table public.ndvi_statistics enable row level security;
    alter table public.management_zones enable row level security;
    alter table public.sentinel_zones enable row level security;
    alter table public.season_benchmarks enable row level security;

    -- NDVI Statistics policies
    create policy "Users can view stats for own fields" on public.ndvi_statistics
    for select using (
        exists (
        select 1 from public.fields
        where fields.id = ndvi_statistics.field_id
        and fields.user_id = auth.uid()
        )
    );

    create policy "Users can insert stats for own fields" on public.ndvi_statistics
    for insert with check (
        exists (
        select 1 from public.fields
        where fields.id = ndvi_statistics.field_id
        and fields.user_id = auth.uid()
        )
    );

    -- Management Zones policies
    create policy "Users can view zones for own fields" on public.management_zones
    for select using (
        exists (
        select 1 from public.fields
        where fields.id = management_zones.field_id
        and fields.user_id = auth.uid()
        )
    );

    create policy "Users can insert zones for own fields" on public.management_zones
    for insert with check (
        exists (
        select 1 from public.fields
        where fields.id = management_zones.field_id
        and fields.user_id = auth.uid()
        )
    );

    create policy "Users can delete zones for own fields" on public.management_zones
    for delete using (
        exists (
        select 1 from public.fields
        where fields.id = management_zones.field_id
        and fields.user_id = auth.uid()
        )
    );

    -- Sentinel Zones policies
    create policy "Users can view sentinel zones for own fields" on public.sentinel_zones
    for select using (
        exists (
        select 1 from public.fields
        where fields.id = sentinel_zones.field_id
        and fields.user_id = auth.uid()
        )
    );

    create policy "Users can manage sentinel zones for own fields" on public.sentinel_zones
    for all using (
        exists (
        select 1 from public.fields
        where fields.id = sentinel_zones.field_id
        and fields.user_id = auth.uid()
        )
    );

    -- Season Benchmarks policies
    create policy "Users can view benchmarks for own fields" on public.season_benchmarks
    for select using (
        exists (
        select 1 from public.fields
        where fields.id = season_benchmarks.field_id
        and fields.user_id = auth.uid()
        )
    );

    create policy "Users can manage benchmarks for own fields" on public.season_benchmarks
    for all using (
        exists (
        select 1 from public.fields
        where fields.id = season_benchmarks.field_id
        and fields.user_id = auth.uid()
        )
    );

    -- Remove duplicate vegetation_readings before adding unique constraint
    -- Keep only the most recent entry for each field_id + date combination
    delete from public.vegetation_readings
    where id in (
        select id from (
            select id,
                   row_number() over (
                       partition by field_id, date 
                       order by created_at desc nulls last, id desc
                   ) as rn
            from public.vegetation_readings
        ) as ranked
        where rn > 1
    );

    -- Add unique constraint to vegetation_readings
    alter table public.vegetation_readings add constraint vegetation_readings_field_date_unique unique(field_id, date);
