-- Extends the existing cuts model without dropping data.
alter table public.cuts
  add column if not exists image_path text,
  add column if not exists is_published boolean not null default false,
  add column if not exists published_at timestamp with time zone,
  add column if not exists expires_at timestamp with time zone,
  add column if not exists updated_at timestamp with time zone not null default now(),
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.cuts
  alter column id set default ('cut-'::text || replace((gen_random_uuid())::text, '-'::text, ''));

alter table public.cuts
  alter column date set default current_date;

update public.cuts
set published_at = coalesce(published_at, date::timestamp with time zone, created_at)
where is_published = true and published_at is null;

update public.cuts
set expires_at = coalesce(expires_at, published_at + interval '90 days')
where is_published = true and published_at is not null and expires_at is null;

alter table public.cuts
  drop constraint if exists cuts_image_path_safe,
  add constraint cuts_image_path_safe
    check (
      image_path is null or (
        image_path !~ '(^/|\\.\\.|//)' and
        image_path ~ '^[a-zA-Z0-9][a-zA-Z0-9/_\\.-]*$'
      )
    );

alter table public.cuts
  drop constraint if exists cuts_publish_dates_valid,
  add constraint cuts_publish_dates_valid
    check (
      is_published = false or
      (published_at is not null and expires_at is not null and expires_at > published_at)
    );

create unique index if not exists cuts_single_featured_published_idx
on public.cuts (is_featured)
where is_featured = true and is_published = true;

create index if not exists cuts_public_idx
on public.cuts (is_published, expires_at, published_at desc);

create index if not exists cuts_expires_at_idx
on public.cuts (expires_at)
where is_published = true;

drop trigger if exists set_updated_at_cuts on public.cuts;
create trigger set_updated_at_cuts
before update on public.cuts
for each row execute function public.set_updated_at();

create or replace function public.prepare_cut_publication()
returns trigger
language plpgsql
as $$
begin
  if new.is_published = true and (tg_op = 'INSERT' or old.is_published is distinct from true) then
    new.published_at := coalesce(new.published_at, now());
    new.expires_at := coalesce(new.expires_at, new.published_at + interval '90 days');
  elsif new.is_published = true then
    new.published_at := coalesce(new.published_at, now());
    new.expires_at := coalesce(new.expires_at, new.published_at + interval '90 days');
  end if;

  if new.is_featured = true and new.is_published = true then
    update public.cuts
    set is_featured = false
    where id <> new.id and is_featured = true;
  end if;

  return new;
end;
$$;

drop trigger if exists prepare_cut_publication_trigger on public.cuts;
create trigger prepare_cut_publication_trigger
before insert or update on public.cuts
for each row execute function public.prepare_cut_publication();

alter table public.cuts enable row level security;
alter table public.cuts force row level security;

drop policy if exists "Public can read published cuts" on public.cuts;
create policy "Public can read published cuts"
on public.cuts
for select
to anon, authenticated
using (
  is_published = true and
  (expires_at is null or expires_at > now())
);

drop policy if exists "Admins can manage cuts" on public.cuts;
create policy "Admins can manage cuts"
on public.cuts
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cuts', 'cuts', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

update storage.buckets
set
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp']
where id = 'products';

drop policy if exists "Public can read cut images" on storage.objects;
create policy "Public can read cut images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'cuts');

drop policy if exists "Admins can write cut images" on storage.objects;
create policy "Admins can write cut images"
on storage.objects
for all
to authenticated
using (bucket_id = 'cuts' and app_private.is_admin())
with check (bucket_id = 'cuts' and app_private.is_admin());

create or replace function app_private.cuts_retention_candidates()
returns table(id text, image_path text, expires_at timestamp with time zone, reason text)
language sql
security definer
set search_path = public, storage
as $$
  select c.id, c.image_path, c.expires_at, 'expired'::text
  from public.cuts c
  where c.expires_at <= now()
    and c.image_path is not null
    and c.image_path !~ '(^/|\\.\\.|//)'
    and c.image_path like 'cuts/%';
$$;

create or replace function app_private.run_cuts_retention()
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  removed_records integer := 0;
begin
  delete from public.cuts c
  where c.expires_at <= now()
    and (c.image_path is null or c.image_path like 'cuts/%');

  get diagnostics removed_records = row_count;

  insert into public.admin_audit_log (action, entity_type, entity_id, payload)
  values (
    'cuts.retention',
    'cut',
    null,
    jsonb_build_object(
      'removed_records', removed_records,
      'removed_files', 0,
      'storage_cleanup', 'worker_storage_api_required'
    )
  );

  return jsonb_build_object(
    'removed_records', removed_records,
    'removed_files', 0,
    'storage_cleanup', 'worker_storage_api_required'
  );
end;
$$;

revoke all on function app_private.cuts_retention_candidates() from public, anon, authenticated;
revoke all on function app_private.run_cuts_retention() from public, anon, authenticated;
grant execute on function app_private.cuts_retention_candidates() to service_role;
grant execute on function app_private.run_cuts_retention() to service_role;

create or replace function public.cuts_retention_candidates()
returns table(id text, image_path text, expires_at timestamp with time zone, reason text)
language sql
security definer
set search_path = public, app_private
as $$
  select * from app_private.cuts_retention_candidates();
$$;

create or replace function public.run_cuts_retention()
returns jsonb
language sql
security definer
set search_path = public, app_private
as $$
  select app_private.run_cuts_retention();
$$;

revoke all on function public.cuts_retention_candidates() from public, anon, authenticated;
revoke all on function public.run_cuts_retention() from public, anon, authenticated;
grant execute on function public.cuts_retention_candidates() to service_role;
grant execute on function public.run_cuts_retention() to service_role;

create extension if not exists pg_cron with schema extensions;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    if exists (select 1 from cron.job where jobname = 'cuts-retention-daily') then
      perform cron.unschedule('cuts-retention-daily');
    end if;
  end if;
end;
$$;
