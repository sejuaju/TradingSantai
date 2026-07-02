-- =============================================================================
-- Trading Santai — user_positions (fresh install)
-- Jalankan SELURUH file ini di Supabase → SQL Editor
--
-- PERINGATAN: Script ini MENGHAPUS tabel lama + semua data posisi user.
-- =============================================================================

-- 1. Hapus policy lama (abaikan error jika belum ada)
drop policy if exists "Users read own positions" on public.user_positions;
drop policy if exists "Users insert own positions" on public.user_positions;
drop policy if exists "Users update own positions" on public.user_positions;
drop policy if exists "Users delete own positions" on public.user_positions;

-- 2. Hapus tabel lama
drop table if exists public.user_positions cascade;

-- 3. Buat tabel baru
create table public.user_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  instrument_id text not null default '',
  position_type text not null check (position_type in ('BUY', 'SELL')),
  price double precision not null,
  sl double precision not null,
  tp double precision not null,
  rsi double precision not null default 50,
  reason text not null default '',
  signal_time bigint not null,
  status text not null check (status in ('active', 'win', 'loss')),
  close_price double precision,
  close_time bigint,
  entry_timeframe text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_positions_unique_key
    unique (user_id, signal_time, instrument_id, position_type)
);

comment on table public.user_positions is
  'Open positions & signal history per Trading Santai member';
comment on column public.user_positions.entry_timeframe is
  'Chart timeframe at entry, e.g. 1m, 5m, 1H';

-- 4. Index untuk load cepat per user
create index user_positions_user_id_idx
  on public.user_positions (user_id, signal_time desc);

-- 5. Row Level Security
alter table public.user_positions enable row level security;

create policy "Users read own positions"
  on public.user_positions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own positions"
  on public.user_positions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own positions"
  on public.user_positions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own positions"
  on public.user_positions for delete
  to authenticated
  using (auth.uid() = user_id);