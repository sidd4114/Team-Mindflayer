-- Notifications table for statistical anomaly alerts and user alerts
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  field_id uuid references public.fields(id) on delete cascade,
  type text not null, -- 'statistical_anomaly', 'ndvi_drop', 'low_ndvi', 'sell_alert', etc.
  title text not null,
  body text,
  severity text check (severity in ('low', 'medium', 'high')),
  read_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

alter table public.notifications enable row level security;

create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications (e.g. mark read)"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "Users can insert own notifications"
  on public.notifications for insert
  with check (auth.uid() = user_id);
