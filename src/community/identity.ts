import { AVATAR_OPTIONS, normalizeAvatar, type AvatarLook } from '@/personal/avatar';
import { communityClient } from './client';
import { normalizePublicHorizon, type HorizonLook } from '@/personal/catalog';

export interface CommunityIdentity {
  name: string;
  avatar: AvatarLook;
  horizon?: HorizonLook;
}

const SAFE_OPTIONS = new Set(
  Object.entries(AVATAR_OPTIONS).flatMap(([key, values]) =>
    values.map((value) => `${key}:${value}`),
  ),
);

/** 공개 별칭에 이메일·제어문자·마크업을 받지 않는다. 로그인 이메일에서 별칭을 만들지 않는다. */
export function publicNickname(value: unknown): string {
  if (typeof value !== 'string') return '';
  const name = value.trim();
  return [...name].length >= 1 && [...name].length <= 24 && !/[@<>\p{Cc}\p{Cf}]/u.test(name)
    ? name
    : '';
}

/** 다른 작성자의 보상은 검증된 선택값으로 표시한다. 서버 검증 성취나 결제 권한을 뜻하지 않는다. */
export function communityIdentity(value: unknown): CommunityIdentity {
  const v = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    name: publicNickname(v.name),
    avatar: normalizeAvatar(v.avatar, SAFE_OPTIONS),
    ...(v.horizon && typeof v.horizon === 'object'
      ? { horizon: normalizePublicHorizon(v.horizon) }
      : {}),
  };
}

export async function readCommunityIdentities(
  ids: readonly string[],
  signal?: AbortSignal,
): Promise<Record<string, CommunityIdentity>> {
  const owners = [...new Set(ids)];
  if (!owners.length) return {};
  let query = communityClient()
    .from('sky_members')
    .select('id,name,avatar,horizon')
    .in('id', owners);
  if (signal) query = query.abortSignal(signal);
  const result = await query;
  // 마이그레이션 전 서버와 구버전 작성자는 이름과 기본 초상으로 읽을 수 있다.
  if (result.error?.code === '42703') {
    let legacy = communityClient().from('sky_members').select('id,name,avatar').in('id', owners);
    if (signal) legacy = legacy.abortSignal(signal);
    let old = await legacy;
    if (old.error?.code === '42703') {
      let names = communityClient().from('sky_members').select('id,name').in('id', owners);
      if (signal) names = names.abortSignal(signal);
      old = (await names) as typeof old;
    }
    if (old.error) throw new Error(old.error.message);
    return Object.fromEntries((old.data ?? []).map((row) => [row.id, communityIdentity(row)]));
  }
  if (result.error) throw new Error(result.error.message);
  return Object.fromEntries(
    (result.data as { id: string; name: unknown; avatar: unknown; horizon: unknown }[]).map(
      (row) => [row.id, communityIdentity(row)],
    ),
  );
}

export async function saveCommunityIdentity(
  name: string,
  avatar: AvatarLook,
  expectedUser: string,
  horizon?: HorizonLook,
): Promise<void> {
  const nickname = publicNickname(name);
  if (!nickname) throw new Error('INVALID_PROFILE');
  const result = await communityClient().rpc(
    horizon ? 'sky_update_profile_v2' : 'sky_update_profile',
    {
      display_name: nickname,
      look: avatar,
      expected_user: expectedUser,
      ...(horizon ? { scenery: normalizePublicHorizon(horizon) } : {}),
    },
  );
  if (result.error) throw new Error(result.error.message);
}
