-- 무료 커뮤니티. 테이블 쓰기는 제한하고 사용자 작업은 검증된 RPC로만 허용한다.
create table public.sky_members (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 24),
  accepted_at timestamptz not null default now(),
  suspended boolean not null default false
);
create table public.sky_moderators (id uuid primary key references auth.users(id) on delete cascade);
create table public.sky_posts (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.sky_members(id) on delete cascade,
  object_id text not null check (object_id ~ '^(star:(HIP|HYG)[0-9]+|dso:[A-Za-z]+[0-9]+|planet:(mercury|venus|mars|jupiter|saturn|uranus|neptune)|moon|sun|const:[A-Z][a-zA-Z]{2})$'),
  caption text not null check (char_length(caption) between 1 and 1000),
  equipment text not null default '' check (char_length(equipment) <= 160),
  kind text not null check (kind in ('capture','processed','creative')),
  status text not null default 'uploading' check (status in ('uploading','pending','published','rejected','hidden','deleted')),
  image_path text not null unique,
  created_at timestamptz not null default now()
);
create table public.sky_comments (
  id uuid primary key default gen_random_uuid(), post_id uuid not null references public.sky_posts(id) on delete cascade,
  owner uuid not null references public.sky_members(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  status text not null default 'pending' check (status in ('pending','published','rejected','hidden','deleted')),
  created_at timestamptz not null default now()
);
create table public.sky_blocks (
  owner uuid not null references public.sky_members(id) on delete cascade,
  target uuid not null references public.sky_members(id) on delete cascade,
  primary key(owner,target), check(owner <> target)
);
create table public.sky_reactions (
  owner uuid not null references public.sky_members(id) on delete cascade,
  post_id uuid not null references public.sky_posts(id) on delete cascade,
  primary key(owner,post_id)
);
create table public.sky_reports (
  id uuid primary key default gen_random_uuid(), owner uuid not null references public.sky_members(id) on delete cascade,
  post_id uuid references public.sky_posts(id) on delete cascade,
  comment_id uuid references public.sky_comments(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  resolved boolean not null default false, created_at timestamptz not null default now(),
  check ((post_id is null) <> (comment_id is null))
);
create unique index sky_report_post_once on public.sky_reports(owner,post_id) where not resolved;
create unique index sky_report_comment_once on public.sky_reports(owner,comment_id) where not resolved;
create table public.sky_appeals (
  id uuid primary key default gen_random_uuid(), owner uuid not null references public.sky_members(id) on delete cascade,
  post_id uuid references public.sky_posts(id) on delete cascade,
  comment_id uuid references public.sky_comments(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  resolved boolean not null default false, created_at timestamptz not null default now(),
  check ((post_id is null) <> (comment_id is null))
);
create table public.sky_audit (
  id bigint generated always as identity primary key,
  actor uuid references auth.users(id) on delete set null,
  affected uuid references auth.users(id) on delete set null,
  action text not null, target uuid not null, reason text not null,
  created_at timestamptz not null default now()
);
create table public.sky_backups (
  id uuid primary key default gen_random_uuid(), owner uuid not null references auth.users(id) on delete cascade,
  path text not null unique, size integer not null check(size between 1 and 20971520),
  ready boolean not null default false, created_at timestamptz not null default now()
);
create index on public.sky_posts(status,created_at desc);
create index on public.sky_posts(object_id,status,created_at desc);
create index on public.sky_comments(post_id,status,created_at);
create index on public.sky_posts(owner,created_at);
create index on public.sky_comments(owner,created_at);

create function public.sky_is_mod() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.sky_moderators where id = auth.uid());
$$;
create function public.sky_unblocked(person uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select not exists(select 1 from public.sky_blocks where (owner=auth.uid() and target=person) or (target=auth.uid() and owner=person));
$$;
create function public.sky_active(person uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.sky_members where id=person and not suspended);
$$;
create function public.sky_can_post_read(pid uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.sky_posts p where p.id=pid and (p.owner=auth.uid() or public.sky_is_mod() or (p.status='published' and public.sky_unblocked(p.owner) and public.sky_active(p.owner))));
$$;
create function public.sky_can_interact(pid uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.sky_posts p where p.id=pid and p.status='published' and public.sky_unblocked(p.owner) and public.sky_active(p.owner));
$$;

alter table public.sky_members enable row level security;
alter table public.sky_moderators enable row level security;
alter table public.sky_posts enable row level security;
alter table public.sky_comments enable row level security;
alter table public.sky_blocks enable row level security;
alter table public.sky_reactions enable row level security;
alter table public.sky_reports enable row level security;
alter table public.sky_appeals enable row level security;
alter table public.sky_audit enable row level security;
alter table public.sky_backups enable row level security;
create policy members_read on public.sky_members for select using (id=auth.uid() or public.sky_is_mod() or (not suspended and public.sky_unblocked(id)));
create policy moderator_self on public.sky_moderators for select using (id=auth.uid());
create policy posts_read on public.sky_posts for select using (public.sky_can_post_read(id));
create policy comments_read on public.sky_comments for select using (public.sky_can_post_read(post_id) and (owner=auth.uid() or public.sky_is_mod() or (status='published' and public.sky_active(owner) and public.sky_unblocked(owner))));
create policy blocks_self on public.sky_blocks for select using(owner=auth.uid());
create policy reactions_self on public.sky_reactions for select using(owner=auth.uid());
create policy reports_self on public.sky_reports for select using(owner=auth.uid() or public.sky_is_mod());
create policy appeals_self on public.sky_appeals for select using(owner=auth.uid() or public.sky_is_mod());
create policy audit_read on public.sky_audit for select using(affected=auth.uid() or public.sky_is_mod());
create policy backups_self on public.sky_backups for select using(owner=auth.uid());
revoke all on public.sky_members,public.sky_moderators,public.sky_posts,public.sky_comments,public.sky_blocks,public.sky_reactions,public.sky_reports,public.sky_appeals,public.sky_audit,public.sky_backups from anon,authenticated;
grant select on public.sky_members,public.sky_posts,public.sky_comments to anon,authenticated;
grant select on public.sky_moderators,public.sky_blocks,public.sky_reactions,public.sky_reports,public.sky_appeals,public.sky_audit,public.sky_backups to authenticated;
grant all on public.sky_members,public.sky_moderators,public.sky_posts,public.sky_comments,public.sky_blocks,public.sky_reactions,public.sky_reports,public.sky_appeals,public.sky_audit,public.sky_backups to service_role;
grant usage,select on sequence public.sky_audit_id_seq to service_role;

-- 같은 계정의 요청은 직렬화하여 동시에 요청해도 횟수 제한을 적용한다.
create function public.sky_action(action text, payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); target_id uuid; parent_id uuid; affected_id uuid; note text; result_id uuid;
begin
 if actor is null then raise exception 'AUTH_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
 if action='join' then
   if payload->>'terms' <> '2026-09-08' or payload->>'terms' is null then raise exception 'TERMS_REQUIRED'; end if;
   insert into public.sky_members(id,name) values(actor,btrim(payload->>'name')) on conflict(id) do update set name=excluded.name;
   return '{}';
 end if;
 if not public.sky_active(actor) and action not in ('appeal','unblock') then raise exception 'ACCOUNT_UNAVAILABLE'; end if;
 target_id := nullif(payload->>'id','')::uuid;
 note := btrim(coalesce(payload->>'text',''));
 if action='comment' then
   if not public.sky_can_interact(target_id) then raise exception 'NOT_AVAILABLE'; end if;
   if exists(select 1 from public.sky_comments where owner=actor and created_at>now()-interval '20 seconds') or (select count(*) from public.sky_comments where owner=actor and created_at>now()-interval '1 day')>=40 then raise exception 'RATE_LIMIT'; end if;
   insert into public.sky_comments(owner,post_id,body) values(actor,target_id,note) returning id into result_id;
 elsif action='react' then
   if not public.sky_can_interact(target_id) then raise exception 'NOT_AVAILABLE'; end if;
   if coalesce((payload->>'on')::boolean,false) then insert into public.sky_reactions(owner,post_id) values(actor,target_id) on conflict do nothing;
   else delete from public.sky_reactions where owner=actor and post_id=target_id; end if;
 elsif action in ('block','unblock') then
   if action='block' then insert into public.sky_blocks(owner,target) values(actor,target_id) on conflict do nothing;
   else delete from public.sky_blocks where owner=actor and target=target_id; end if;
 elsif action='deletePost' then
   update public.sky_posts set status='deleted' where id=target_id and owner=actor;
 elsif action='deleteComment' then
   update public.sky_comments set status='deleted' where id=target_id and owner=actor;
 elsif action in ('report','appeal') then
   if char_length(note) not between 1 and 500 then raise exception 'INVALID_TEXT'; end if;
   if payload->>'type'='comment' then
     select owner,post_id into affected_id,parent_id from public.sky_comments where id=target_id and (status='published' or owner=actor);
   elsif payload->>'type'='post' then
     select owner,id into affected_id,parent_id from public.sky_posts where id=target_id;
   else raise exception 'INVALID_TYPE'; end if;
   if affected_id is null or not public.sky_can_post_read(parent_id) then raise exception 'NOT_AVAILABLE'; end if;
   if action='appeal' then
     if affected_id<>actor then raise exception 'NOT_OWNER'; end if;
     if (select count(*) from public.sky_appeals where owner=actor and created_at>now()-interval '1 day')>=5 then raise exception 'RATE_LIMIT'; end if;
     insert into public.sky_appeals(owner,post_id,comment_id,reason) values(actor,case when payload->>'type'='post' then target_id end,case when payload->>'type'='comment' then target_id end,note);
   else
     if affected_id=actor then raise exception 'INVALID_TARGET'; end if;
     if (select count(*) from public.sky_reports where owner=actor and created_at>now()-interval '1 day')>=10 then raise exception 'RATE_LIMIT'; end if;
     insert into public.sky_reports(owner,post_id,comment_id,reason) values(actor,case when payload->>'type'='post' then target_id end,case when payload->>'type'='comment' then target_id end,note);
   end if;
 elsif action in ('reviewPost','reviewComment','resolveReport','resolveAppeal','suspend') then
   if not public.sky_is_mod() then raise exception 'FORBIDDEN'; end if;
   if char_length(note) not between 1 and 500 then raise exception 'REASON_REQUIRED'; end if;
   if action in ('reviewPost','reviewComment') then
     if payload->>'status' not in ('published','rejected','hidden') or payload->>'status' is null then raise exception 'INVALID_STATUS'; end if;
     if action='reviewPost' then update public.sky_posts set status=payload->>'status' where id=target_id and status not in ('uploading','deleted') returning owner into affected_id;
     else update public.sky_comments set status=payload->>'status' where id=target_id and status<>'deleted' returning owner into affected_id; end if;
   elsif action='resolveReport' then update public.sky_reports set resolved=true where id=target_id returning owner into affected_id;
   elsif action='resolveAppeal' then update public.sky_appeals set resolved=true where id=target_id returning owner into affected_id;
   else
     if target_id=actor or exists(select 1 from public.sky_moderators where id=target_id) then raise exception 'INVALID_TARGET'; end if;
     update public.sky_members set suspended=coalesce((payload->>'on')::boolean,false) where id=target_id returning id into affected_id;
   end if;
   if affected_id is null then raise exception 'NOT_AVAILABLE'; end if;
   insert into public.sky_audit(actor,affected,action,target,reason) values(actor,affected_id,action || ':' || coalesce(payload->>'status',payload->>'on',''),target_id,note);
 else raise exception 'INVALID_ACTION'; end if;
 return jsonb_build_object('id',result_id);
end $$;
revoke all on function public.sky_action(text,jsonb) from public,anon;
grant execute on function public.sky_action(text,jsonb) to authenticated;

-- Edge 함수 전용. 업로드 전에 사용량을 예약한다.
create function public.sky_reserve(actor uuid, payload jsonb, backup boolean default false) returns uuid
language plpgsql security definer set search_path = '' as $$
declare rid uuid := gen_random_uuid();
begin
 perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
 if not public.sky_active(actor) then raise exception 'ACCOUNT_UNAVAILABLE'; end if;
 if backup then
   if (select count(*) from public.sky_backups where owner=actor)>=5 then raise exception 'BACKUP_FULL'; end if;
   insert into public.sky_backups(id,owner,path,size) values(rid,actor,actor::text||'/'||rid::text||'.json',(payload->>'size')::integer);
 else
   if (select count(*) from public.sky_posts where owner=actor and created_at>now()-interval '1 day')>=10 then raise exception 'RATE_LIMIT'; end if;
   insert into public.sky_posts(id,owner,object_id,caption,equipment,kind,image_path) values(rid,actor,payload->>'object',btrim(payload->>'caption'),btrim(coalesce(payload->>'equipment','')),payload->>'kind',actor::text||'/'||rid::text||'.jpg');
 end if;
 return rid;
end $$;
revoke all on function public.sky_reserve(uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.sky_reserve(uuid,jsonb,boolean) to service_role;

revoke all on function public.sky_is_mod(),public.sky_unblocked(uuid),public.sky_active(uuid),public.sky_can_post_read(uuid),public.sky_can_interact(uuid) from public;
grant execute on function public.sky_is_mod(),public.sky_unblocked(uuid),public.sky_active(uuid),public.sky_can_post_read(uuid),public.sky_can_interact(uuid) to anon,authenticated,service_role;
