-- Laufwelt: one save per user. Run this once in the Supabase dashboard (SQL Editor → New query → Run).

create table if not exists public.game_saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row Level Security: every user can only see and change their own save.
-- Runs contain GPS routes, which reveal where someone lives, so this must stay on.
alter table public.game_saves enable row level security;

drop policy if exists "Eigenen Spielstand lesen" on public.game_saves;
create policy "Eigenen Spielstand lesen" on public.game_saves
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Eigenen Spielstand anlegen" on public.game_saves;
create policy "Eigenen Spielstand anlegen" on public.game_saves
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Eigenen Spielstand ändern" on public.game_saves;
create policy "Eigenen Spielstand ändern" on public.game_saves
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
