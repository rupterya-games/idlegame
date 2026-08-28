create table if not exists public.idle_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gold bigint not null default 0 check (gold >= 0),
  kills bigint not null default 0 check (kills >= 0),
  wood bigint not null default 0 check (wood >= 0),
  stone bigint not null default 0 check (stone >= 0),
  buildings jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.idle_profiles enable row level security;

create policy "players read own idle profile" on public.idle_profiles
  for select using (auth.uid() = user_id);

create policy "players create own idle profile" on public.idle_profiles
  for insert with check (auth.uid() = user_id);

create policy "players update own idle profile" on public.idle_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
