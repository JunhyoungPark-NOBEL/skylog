-- 사진을 바로 삭제해도 하루 업로드 제한은 초기화되지 않는다.
create table public.sky_usage(owner uuid not null references auth.users(id) on delete cascade, at timestamptz not null default now());
create index on public.sky_usage(owner,at);
alter table public.sky_usage enable row level security;
revoke all on public.sky_usage from anon,authenticated;
grant all on public.sky_usage to service_role;
create or replace function public.sky_reserve(actor uuid, payload jsonb, backup boolean default false) returns uuid
language plpgsql security definer set search_path = '' as $$
declare rid uuid := gen_random_uuid();
begin
 perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
 if not public.sky_active(actor) then raise exception 'ACCOUNT_UNAVAILABLE'; end if;
 if backup then
   if (select count(*) from public.sky_backups where owner=actor)>=5 then raise exception 'BACKUP_FULL'; end if;
   insert into public.sky_backups(id,owner,path,size) values(rid,actor,actor::text||'/'||rid::text||'.json',(payload->>'size')::integer);
 else
   delete from public.sky_usage where owner=actor and at<now()-interval '1 day';
   if (select count(*) from public.sky_usage where owner=actor)>=10 then raise exception 'RATE_LIMIT'; end if;
   insert into public.sky_usage(owner) values(actor);
   insert into public.sky_posts(id,owner,object_id,caption,equipment,kind,image_path) values(rid,actor,payload->>'object',btrim(payload->>'caption'),btrim(coalesce(payload->>'equipment','')),payload->>'kind',actor::text||'/'||rid::text||'.jpg');
 end if;
 return rid;
end $$;
create function public.sky_blocked_people() returns table(id uuid,name text) language sql stable security definer set search_path='' as $$
 select m.id,m.name from public.sky_blocks b join public.sky_members m on m.id=b.target where b.owner=auth.uid();
$$;
revoke all on function public.sky_blocked_people() from public,anon;
grant execute on function public.sky_blocked_people() to authenticated;
