-- TravelMind – Supabase schema
-- Pega este SQL en el SQL Editor de tu proyecto Supabase y ejecútalo.

create table if not exists public.trips (
  id         text primary key,
  data       jsonb not null,
  created_at timestamptz default now()
);

-- Para una app personal sin autenticación, desactivamos RLS.
-- Si en el futuro añades usuarios, actívalo y crea políticas por user_id.
alter table public.trips disable row level security;
