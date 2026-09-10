-- 구매 검증 결과와 무료 부여는 서버만 쓴다. 기존 관측/학습/보상 테이블은 변경하지 않는다.
create table public.sky_billing_accounts (
  owner uuid primary key references auth.users(id) on delete cascade,
  obfuscated_id text unique not null default replace(gen_random_uuid()::text || gen_random_uuid()::text,'-','') check (obfuscated_id ~ '^[a-f0-9]{64}$')
);
create table public.sky_play_purchases (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  purchase_token text not null check (length(purchase_token) between 20 and 4096),
  -- 계정 삭제 후에도 토큰 귀속 흔적을 남겨 다른 계정의 자동 재청구를 막는다.
  owner uuid references auth.users(id) on delete set null,
  obfuscated_id text not null check (obfuscated_id ~ '^[a-f0-9]{64}$'),
  product_id text not null check (product_id = 'skyard_plus_lifetime'),
  state text not null check (state in ('pending','purchased','cancelled')),
  acknowledged boolean not null default false,
  test_purchase boolean not null default false,
  verified_at timestamptz not null default now(),
  checked_at timestamptz not null default now()
);
create index sky_play_owner on public.sky_play_purchases(owner);
create index sky_play_reconcile on public.sky_play_purchases(checked_at) where state <> 'cancelled';
create table public.sky_plus_grants (
  owner uuid primary key references auth.users(id) on delete cascade,
  reason text not null check (length(reason) between 3 and 200),
  granted_by text not null check (length(granted_by) between 3 and 200),
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz
);
create table public.sky_billing_rate (
  owner uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null default now(),
  count integer not null default 0
);
alter table public.sky_billing_accounts enable row level security;
alter table public.sky_play_purchases enable row level security;
alter table public.sky_plus_grants enable row level security;
alter table public.sky_billing_rate enable row level security;
revoke all on public.sky_billing_accounts,public.sky_play_purchases,public.sky_plus_grants,public.sky_billing_rate from public,anon,authenticated;
grant all on public.sky_billing_accounts,public.sky_play_purchases,public.sky_plus_grants,public.sky_billing_rate to service_role;

create function public.sky_billing_account(p_owner uuid) returns text language plpgsql security definer set search_path='' as $$
declare value text;
begin
  insert into public.sky_billing_accounts(owner) values(p_owner) on conflict do nothing;
  select obfuscated_id into strict value from public.sky_billing_accounts where owner=p_owner;
  return value;
end $$;

create function public.sky_billing_allow(p_owner uuid) returns void language plpgsql security definer set search_path='' as $$
declare n integer;
begin
  insert into public.sky_billing_rate(owner,count) values(p_owner,1) on conflict(owner) do update
    set count=case when sky_billing_rate.window_start < now()-interval '1 minute' then 1 else sky_billing_rate.count+1 end,
        window_start=case when sky_billing_rate.window_start < now()-interval '1 minute' then now() else sky_billing_rate.window_start end
    returning count into n;
  if n>12 then raise exception 'RATE_LIMIT'; end if;
end $$;

create function public.sky_save_play_purchase(p_owner uuid,p_hash text,p_token text,p_obfuscated text,p_state text,p_ack boolean,p_test boolean)
returns void language plpgsql security definer set search_path='' as $$
declare existing public.sky_play_purchases;
begin
  if p_state not in ('pending','purchased','cancelled') or p_owner is null or
     not exists(select 1 from public.sky_billing_accounts where owner=p_owner and obfuscated_id=p_obfuscated) then
    raise exception 'PURCHASE_ACCOUNT_MISMATCH';
  end if;
  -- 같은 토큰의 동시 복원을 직렬화한다. 취소는 끝 상태이며 오래된 결과로 되살리지 않는다.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_hash,0));
  select * into existing from public.sky_play_purchases where token_hash=p_hash for update;
  if found then
    if existing.owner is distinct from p_owner or existing.obfuscated_id<>p_obfuscated or existing.purchase_token<>p_token then
      raise exception 'PURCHASE_ACCOUNT_MISMATCH';
    end if;
    update public.sky_play_purchases set
      state=case when state='cancelled' or p_state='cancelled' then 'cancelled' when state='purchased' then 'purchased' else p_state end,
      acknowledged=acknowledged or p_ack,
      verified_at=case when state='purchased' and p_state='pending' then verified_at else now() end, checked_at=now()
      where token_hash=p_hash;
  else
    insert into public.sky_play_purchases(token_hash,purchase_token,owner,obfuscated_id,product_id,state,acknowledged,test_purchase)
      values(p_hash,p_token,p_owner,p_obfuscated,'skyard_plus_lifetime',p_state,p_ack,p_test);
  end if;
end $$;

create function public.sky_plus_status(p_owner uuid) returns jsonb language sql stable security definer set search_path='' as $$
  select case
    when exists(select 1 from public.sky_plus_grants where owner=p_owner and revoked_at is null and (expires_at is null or expires_at>now()))
      then jsonb_build_object('hasPlus',true,'source','grant','validUntil',least(now()+interval '24 hours',coalesce((select expires_at from public.sky_plus_grants where owner=p_owner),now()+interval '24 hours')))
    when exists(select 1 from public.sky_play_purchases where owner=p_owner and state='purchased' and acknowledged and verified_at>now()-interval '24 hours')
      then jsonb_build_object('hasPlus',true,'source','play','validUntil',(select max(verified_at)+interval '24 hours' from public.sky_play_purchases where owner=p_owner and state='purchased' and acknowledged))
    else jsonb_build_object('hasPlus',false,'source','none','validUntil',null)
  end;
$$;

-- 관리용 SQL/RPC. 실제 UUID·계정 소유 확인과 감사용 담당자/사유 없이 부여하지 않는다.
create function public.sky_set_plus_grant(p_owner uuid,p_operator text,p_reason text,p_revoke boolean default false)
returns void language plpgsql security definer set search_path='' as $$
begin
  insert into public.sky_plus_grants(owner,reason,granted_by,revoked_at)
    values(p_owner,p_reason,p_operator,case when p_revoke then now() else null end)
    on conflict(owner) do update set reason=excluded.reason,granted_by=excluded.granted_by,
      granted_at=now(),expires_at=null,revoked_at=excluded.revoked_at;
end $$;

revoke all on function public.sky_billing_account(uuid),public.sky_billing_allow(uuid),public.sky_save_play_purchase(uuid,text,text,text,text,boolean,boolean),public.sky_plus_status(uuid),public.sky_set_plus_grant(uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.sky_billing_account(uuid),public.sky_billing_allow(uuid),public.sky_save_play_purchase(uuid,text,text,text,text,boolean,boolean),public.sky_plus_status(uuid),public.sky_set_plus_grant(uuid,text,text,boolean) to service_role;
