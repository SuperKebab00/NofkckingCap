-- Proposed manual migration for public.admin_users.
-- Do not apply automatically from this repository.
-- Apply manually in Supabase only when real admin auth activation is planned.

begin;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_admin_users_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_admin_users_updated_at on public.admin_users;

create trigger trg_admin_users_updated_at
before update on public.admin_users
for each row
execute function public.set_admin_users_updated_at();

alter table public.admin_users enable row level security;

-- Intentionally no anon/authenticated client policies yet.
-- With RLS enabled and no permissive policies, browser-side reads stay blocked.
-- Future server-side Cloudflare verification may use privileged backend access
-- only after JWT verification and DB-backed admin checks are fully implemented.

-- Manual seed example only. Replace <supabase-user-uuid> manually.
-- insert into public.admin_users (user_id, is_admin)
-- values ('<supabase-user-uuid>', true);

commit;
