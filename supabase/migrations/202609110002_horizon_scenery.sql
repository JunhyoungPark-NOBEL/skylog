-- 먼 풍경 선택과 주택·관측 데크·강아지 ID만 확장한다. 기존 회원/사진/댓글은 수정하지 않는다.
-- 구버전 4개 필드와 새 backdrop 필드가 있는 5개 필드를 모두 받는다.
create or replace function public.sky_valid_horizon(scenery jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare item jsonb; ids text[] := array[]::text[];
begin
 if scenery is null or jsonb_typeof(scenery) <> 'object' then return false; end if;
 if scenery - array['slots','ground','sceneryScale','sceneryEnabled','backdrop']::text[] <> '{}'::jsonb then return false; end if;
 if (select count(*) from jsonb_object_keys(scenery)) not in (4,5) then return false; end if;
 if scenery ? 'backdrop' and not coalesce(scenery->>'backdrop' = any(array['field','rocky-peaks','snow-peaks','sea']),false) then return false; end if;
 if not coalesce(scenery->>'ground' = any(array['meadow','sand','stone','snow'])
    and scenery->>'sceneryScale' = any(array['small','medium'])
    and jsonb_typeof(scenery->'sceneryEnabled') = 'boolean'
    and jsonb_typeof(scenery->'slots') = 'array', false) then return false; end if;
 if jsonb_array_length(scenery->'slots') <> 5 then return false; end if;
 for item in select value from jsonb_array_elements(scenery->'slots') loop
   if item = 'null'::jsonb then continue; end if;
   if jsonb_typeof(item) <> 'string' or not coalesce(item #>> '{}' = any(array[
      'flowers','bench','stones','fern','telescope','sketchbook','signpost','lantern','moon','books','sunflowers','crystal',
      'picnic-table','pavilion','binocular-mount','refractor-long','reflector','dobsonian','sct','radio-dish','observatory-dome',
      'house','observing-deck','dog']), false)
      or (item #>> '{}') = any(ids) then return false; end if;
   ids := array_append(ids, item #>> '{}');
 end loop;
 return true;
end $$;
notify pgrst, 'reload schema';
