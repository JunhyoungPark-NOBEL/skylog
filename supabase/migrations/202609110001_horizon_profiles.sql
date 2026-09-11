-- 공개 지평선은 허용된 선택 ID만 저장하며 기존 사진/댓글과 동일한 공개 범위를 따른다.
-- 구버전 RPC를 보존하고, 새로운 공개 동기화에서만 scenery를 기록한다.
create or replace function public.sky_valid_avatar(look jsonb) returns boolean
language sql immutable set search_path = '' as $$
 select case when jsonb_typeof(look) <> 'object' or look is null then false
 when (select count(*) from jsonb_object_keys(look)) <> 9 then false
 else coalesce(
   look->>'suit' = any(array['sage','lavender','clay','navy','ochre','rose']) and
   look->>'skin' = any(array['sand','amber','cocoa','porcelain','umber']) and
   look->>'hat' = any(array['none','beanie','helmet','bucket','starcap','starcrown','meteorcap','crescentberet','saturnhat','planetarium']) and
   look->>'hair' = any(array['none','short','bob','waves','ponytail']) and
   look->>'hairColor' = any(array['ink','chestnut','copper','gold','silver']) and
   look->>'expression' = any(array['smile','calm','joy','wink']) and
   look->>'outfit' = any(array['classic','hoodie','overalls','spacesuit','observatorycoat','constellationponcho']) and
   look->>'accessory' = any(array['none','binoculars','sketchbook','lantern','starwand','cometscarf','planisphere','orrery']) and
   look->>'background' = any(array['garden','orion','moonlit','saturn','galaxy']), false) end;
$$;

create function public.sky_valid_horizon(scenery jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare item jsonb; ids text[] := array[]::text[];
begin
 if scenery is null or jsonb_typeof(scenery) <> 'object' then return false; end if;
 if (select count(*) from jsonb_object_keys(scenery)) <> 4 then return false; end if;
 if not coalesce(scenery->>'ground' = any(array['meadow','sand','stone','snow'])
    and scenery->>'sceneryScale' = any(array['small','medium'])
    and jsonb_typeof(scenery->'sceneryEnabled') = 'boolean'
    and jsonb_typeof(scenery->'slots') = 'array', false) then return false; end if;
 if jsonb_array_length(scenery->'slots') <> 5 then return false; end if;
 for item in select value from jsonb_array_elements(scenery->'slots') loop
   if item = 'null'::jsonb then continue; end if;
   if jsonb_typeof(item) <> 'string' or not coalesce(item #>> '{}' = any(array[
      'flowers','bench','stones','fern','telescope','sketchbook','signpost','lantern','moon','books','sunflowers','crystal',
      'picnic-table','pavilion','binocular-mount','refractor-long','reflector','dobsonian','sct','radio-dish','observatory-dome']), false)
      or (item #>> '{}') = any(ids) then return false; end if;
   ids := array_append(ids, item #>> '{}');
 end loop;
 return true;
end $$;

alter table public.sky_members add column horizon jsonb;
alter table public.sky_members add constraint sky_members_horizon check (horizon is null or public.sky_valid_horizon(horizon));
grant update(horizon) on public.sky_members to authenticated;

create function public.sky_update_profile_v2(display_name text, look jsonb, expected_user uuid, scenery jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if expected_user is distinct from auth.uid() then raise exception 'ACCOUNT_CHANGED'; end if;
 if not public.sky_active(auth.uid()) then raise exception 'ACCOUNT_UNAVAILABLE'; end if;
 if not public.sky_valid_public_name(btrim(display_name)) or not public.sky_valid_avatar(look)
   or not public.sky_valid_horizon(scenery) then raise exception 'INVALID_PROFILE'; end if;
 update public.sky_members set name=btrim(display_name), avatar=look, horizon=scenery where id=auth.uid();
 if not found then raise exception 'NOT_OWNER'; end if;
end $$;
revoke all on function public.sky_update_profile_v2(text,jsonb,uuid,jsonb) from public,anon;
grant execute on function public.sky_update_profile_v2(text,jsonb,uuid,jsonb) to authenticated;
revoke all on function public.sky_valid_horizon(jsonb) from public;
grant execute on function public.sky_valid_horizon(jsonb) to anon,authenticated,service_role;
notify pgrst, 'reload schema';
