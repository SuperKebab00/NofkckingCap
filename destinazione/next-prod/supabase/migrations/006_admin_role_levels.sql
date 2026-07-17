-- Two-level admin authorization model for production Admin.

alter table public.admin_users
add column if not exists role text not null default 'admin';

alter table public.admin_users
drop constraint if exists admin_users_role_valid;

alter table public.admin_users
add constraint admin_users_role_valid
check (role in ('admin', 'super_admin'));

update public.admin_users
set role = 'admin'
where role is null or role not in ('admin', 'super_admin');

create or replace function app_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
      and is_admin = true
      and role in ('admin', 'super_admin')
  );
$$;

create or replace function app_private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
      and is_admin = true
      and role = 'super_admin'
  );
$$;

revoke all on function app_private.is_super_admin() from public;
grant execute on function app_private.is_super_admin() to authenticated;

comment on column public.admin_users.role is
  'Admin authorization level: admin or super_admin.';
