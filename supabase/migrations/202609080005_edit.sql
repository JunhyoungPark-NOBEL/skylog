alter table public.sky_posts drop constraint sky_posts_status_check;
alter table public.sky_posts add constraint sky_posts_status_check check(status in ('uploading','private','pending','published','rejected','hidden','deleted'));
create function public.sky_edit_post(pid uuid,caption_text text,equipment_text text,image_kind text,submit boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.sky_active(auth.uid()) then raise exception 'ACCOUNT_UNAVAILABLE';end if;
 update public.sky_posts set caption=btrim(caption_text),equipment=btrim(equipment_text),kind=image_kind,status=case when submit then 'pending' else 'private' end
 where id=pid and owner=auth.uid() and status not in ('deleted','uploading');
 if not found then raise exception 'NOT_OWNER';end if;
end $$;
revoke all on function public.sky_edit_post(uuid,text,text,text,boolean) from public,anon;
grant execute on function public.sky_edit_post(uuid,text,text,text,boolean) to authenticated;

-- 운영자도 작성자가 비공개로 전환한 사진을 다시 공개하지 못한다.
create or replace function public.sky_action(action text, payload jsonb default '{}') returns jsonb
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
     if action='reviewPost' then update public.sky_posts set status=payload->>'status' where id=target_id and status not in ('uploading','deleted','private') returning owner into affected_id;
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
create or replace function public.sky_can_post_read(pid uuid) returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from public.sky_posts p where p.id=pid and (p.owner=auth.uid() or (public.sky_is_mod() and p.status<>'private') or (p.status='published' and public.sky_unblocked(p.owner) and public.sky_active(p.owner))));
$$;
