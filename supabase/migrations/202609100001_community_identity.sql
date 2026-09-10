-- 공개 프로필은 별칭과 정해진 꾸미기 enum만 받는다. 이메일·파일 URL·SVG·성취/결제 증거는 저장하지 않는다.
create function public.sky_valid_avatar(look jsonb) returns boolean
language sql immutable set search_path = '' as $$
 select case when jsonb_typeof(look) <> 'object' or look is null then false
 when (select count(*) from jsonb_object_keys(look)) <> 9 then false
 else coalesce(
   look->>'suit' = any(array['sage','lavender','clay','navy','ochre','rose']) and
   look->>'skin' = any(array['sand','amber','cocoa','porcelain','umber']) and
   look->>'hat' = any(array['none','beanie','helmet','bucket','starcap','starcrown','meteorcap']) and
   look->>'hair' = any(array['none','short','bob','waves','ponytail']) and
   look->>'hairColor' = any(array['ink','chestnut','copper','gold','silver']) and
   look->>'expression' = any(array['smile','calm','joy','wink']) and
   look->>'outfit' = any(array['classic','hoodie','overalls','spacesuit']) and
   look->>'accessory' = any(array['none','binoculars','sketchbook','lantern','starwand']) and
   look->>'background' = any(array['garden','orion','moonlit','saturn','galaxy']), false) end;
$$;
create function public.sky_valid_public_name(value text) returns boolean
language sql immutable set search_path = '' as $$
 select coalesce(char_length(value) between 1 and 24 and value=btrim(value)
   and value !~ '[[:cntrl:]<>@]'
   and value !~ ('[' || chr(173) || chr(1564) || chr(8203) || '-' || chr(8207) || chr(8234) || '-' || chr(8238) || chr(8288) || '-' || chr(8303) || chr(65279) || ']'), false);
$$;
alter table public.sky_members add column avatar jsonb not null default
 '{"suit":"sage","skin":"amber","hat":"beanie","hair":"none","hairColor":"ink","expression":"smile","outfit":"classic","accessory":"none","background":"garden"}'::jsonb;
alter table public.sky_members add constraint sky_members_avatar check (public.sky_valid_avatar(avatar));
-- 기존 별칭을 임의로 바꾸지 않는다. 이후 쓰기부터 검사하며 예전 잘못된 별칭은 UI에서 일반 작성자로 표시한다.
alter table public.sky_members add constraint sky_members_public_name check (public.sky_valid_public_name(name)) not valid;

create policy member_identity_self on public.sky_members for update
 to authenticated using(id=auth.uid() and not suspended)
 with check(id=auth.uid() and not suspended);
grant update(name,avatar) on public.sky_members to authenticated;

create function public.sky_update_profile(display_name text, look jsonb, expected_user uuid) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if expected_user is distinct from auth.uid() then raise exception 'ACCOUNT_CHANGED'; end if;
 if not public.sky_active(auth.uid()) then raise exception 'ACCOUNT_UNAVAILABLE'; end if;
 if not public.sky_valid_public_name(btrim(display_name)) or not public.sky_valid_avatar(look)
 then raise exception 'INVALID_PROFILE'; end if;
 update public.sky_members set name=btrim(display_name),avatar=look where id=auth.uid();
 if not found then raise exception 'NOT_OWNER'; end if;
end $$;
revoke all on function public.sky_update_profile(text,jsonb,uuid) from public,anon;
grant execute on function public.sky_update_profile(text,jsonb,uuid) to authenticated;
revoke all on function public.sky_valid_avatar(jsonb),public.sky_valid_public_name(text) from public;
grant execute on function public.sky_valid_avatar(jsonb),public.sky_valid_public_name(text) to anon,authenticated,service_role;
