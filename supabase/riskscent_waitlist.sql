-- PerilWatch — RiskScent waitlist table
-- Run in Supabase SQL Editor (same project as LiabilityScore™).

create table if not exists public.riskscent_waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  created_at timestamptz not null default now(),
  constraint riskscent_waitlist_email_unique unique (email)
);

-- RLS: allow anonymous inserts (for CF Pages Function using anon key),
-- but only service role can read.
alter table public.riskscent_waitlist enable row level security;

create policy "anon insert"
  on public.riskscent_waitlist
  for insert
  to anon
  with check (true);

-- Only service_role can select (admin use only — no public reads).
-- No select policy needed for anon key.
