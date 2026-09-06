-- Facility Desk — Supabase schema
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query) once,
-- after creating your project.

create extension if not exists pgcrypto;

create table if not exists complaints (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  description text not null check (char_length(description) between 1 and 1000),
  category text not null default 'Other'
    check (category in ('Electrical','Plumbing','Furniture','IT/Network','Housekeeping','Other')),
  location text not null,
  reported_by text not null,
  status text not null default 'Open'
    check (status in ('Open','In Progress','Resolved')),
  priority text not null default 'Medium'
    check (priority in ('Low','Medium','High')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at current on every UPDATE, mirroring Mongoose's { timestamps: true }
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_complaints_updated_at on complaints;
create trigger trg_complaints_updated_at
  before update on complaints
  for each row execute function set_updated_at();

-- Row Level Security: enabled with NO policies for the anon/public role.
-- This means the table is completely unreachable via Supabase's
-- auto-generated REST API using the public "anon" key — the only way in
-- is the "service_role" key, which is kept server-side in Vercel's
-- serverless functions and never shipped to the browser. The frontend
-- therefore always goes through our own /api/complaints endpoints,
-- which is what satisfies the "implement RESTful APIs" requirement
-- rather than relying on Supabase's auto-generated table API directly.
alter table complaints enable row level security;

-- Helpful index for the status filter used by the frontend/API
create index if not exists idx_complaints_status on complaints (status);
