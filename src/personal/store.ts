import { getDb, newId, nowIso } from '@/db/database';
import { emitDbChange } from '@/db/events';
import { getProgress, listProgress } from '@/db/repos/progress';
import { DB_SCHEMA_VERSION, type Progress } from '@/db/types';
import {
  AVATAR_REWARDS,
  FREE_AVATAR_OPTIONS,
  LEGACY_FREE_AVATAR_OPTIONS,
  normalizeAvatar,
  type AvatarLook,
} from './avatar';
import {
  DECORATIONS,
  BACKDROP_STYLES,
  GROUND_STYLES,
  LEGACY_FREE_DECORATIONS,
  LEGACY_DECORATION_REPLACEMENTS,
  activeDecorationId,
  normalizePersonal,
  normalizePersonalName,
  rewardsFor,
  type Personal,
  type HorizonLook,
} from './catalog';

export type SavedLook = { name: string; avatar: AvatarLook } | null;
export type SavedLooks = [SavedLook, SavedLook, SavedLook];

/** 손상된 백업의 보상 값은 인정하지 않는다. 로컬 JSON의 진위를 검증하는 보안 장치는 아니다. */
function hasReward(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const earnedAt = (value as Record<string, unknown>).earnedAt;
  return typeof earnedAt === 'string' && Number.isFinite(Date.parse(earnedAt));
}

export async function grantRewards(badges: ReadonlySet<string>): Promise<void> {
  const db = getDb();
  let changed = false;
  const keys = [
    ...rewardsFor(badges).map((id) => 'personal.reward:' + id),
    ...AVATAR_REWARDS.filter((reward) => badges.has(reward.badge)).map(
      (reward) => 'avatar.reward:' + reward.key,
    ),
    ...GROUND_STYLES.filter((item) => item.badge && badges.has(item.badge)).map(
      (item) => 'ground.reward:' + item.id,
    ),
    ...BACKDROP_STYLES.filter((item) => item.badge && badges.has(item.badge)).map(
      (item) => 'backdrop.reward:' + item.id,
    ),
  ];
  await db.transaction('rw', db.progress, async () => {
    for (const key of keys) {
      const existing = await db.progress.where('key').equals(key).first();
      if (existing && !existing.deletedAt && hasReward(existing.value)) continue;
      const now = nowIso();
      const record: Progress = existing
        ? { ...existing, value: { earnedAt: now }, updatedAt: now }
        : {
            id: newId(),
            key,
            value: { earnedAt: now },
            createdAt: now,
            updatedAt: now,
            schemaVersion: DB_SCHEMA_VERSION,
          };
      delete record.deletedAt;
      await db.progress.put(record);
      changed = true;
    }
  });
  if (changed) emitDbChange('progress');
}
function normalizeLooks(value: unknown, ownedAvatar: ReadonlySet<string>): SavedLooks {
  const slots: unknown[] = Array.isArray(value) ? value : [];
  function slot(index: number): SavedLook {
    const item = slots[index];
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const entry = item as Record<string, unknown>;
    if (!entry.avatar || typeof entry.avatar !== 'object' || Array.isArray(entry.avatar))
      return null;
    return {
      name: normalizePersonalName(entry.name),
      avatar: normalizeAvatar(entry.avatar, ownedAvatar),
    };
  }
  return [slot(0), slot(1), slot(2)];
}

/** 호출자의 progress 트랜잭션 안에서 보유 목록·프로필을 일관된 시점에 읽는다. */
async function loadPersonal() {
  const [rewards, avatarRewards, groundRewards, backdropRewards, profile, looks, ownership] =
    await Promise.all([
      listProgress('personal.reward:'),
      listProgress('avatar.reward:'),
      listProgress('ground.reward:'),
      listProgress('backdrop.reward:'),
      getProgress('personal.profile'),
      getProgress('personal.looks'),
      getProgress('personal.ownership-v2'),
    ]);
  // 구버전에서 이미 제공했던 기본 코디·장식은 회수하지 않는다.
  // 최초 저장 때 판정 값을 고정하므로 새 사용자는 저장 후에도 기존 사용자로 바뀌지 않는다.
  const legacy =
    ownership && typeof ownership === 'object'
      ? (ownership as Record<string, unknown>).legacy === true
      : !!(profile && typeof profile === 'object') || Array.isArray(looks);
  const owned = new Set<string>(
    DECORATIONS.filter((d) => !d.badge || hasReward(rewards.get('personal.reward:' + d.id))).map(
      (d) => d.id,
    ),
  );
  if (legacy) for (const id of LEGACY_FREE_DECORATIONS) owned.add(activeDecorationId(id)!);
  // 보상 행을 삭제하거나 덮어쓰지 않고 새 장식 소유권으로 읽는다. 옛 백업도 같은 규칙을 따른다.
  for (const [oldId, newId] of Object.entries(LEGACY_DECORATION_REPLACEMENTS)) {
    if (hasReward(rewards.get('personal.reward:' + oldId))) owned.add(newId);
  }
  const ownedAvatar = new Set(FREE_AVATAR_OPTIONS);
  if (legacy) for (const key of LEGACY_FREE_AVATAR_OPTIONS) ownedAvatar.add(key);
  for (const reward of AVATAR_REWARDS) {
    if (hasReward(avatarRewards.get('avatar.reward:' + reward.key))) ownedAvatar.add(reward.key);
  }
  const ownedGround = new Set<string>(
    GROUND_STYLES.filter(
      (item) => !item.badge || hasReward(groundRewards.get('ground.reward:' + item.id)),
    ).map((item) => item.id),
  );
  const ownedBackdrop = new Set<string>(
    BACKDROP_STYLES.filter(
      (item) => !item.badge || hasReward(backdropRewards.get('backdrop.reward:' + item.id)),
    ).map((item) => item.id),
  );
  return {
    profile: normalizePersonal(profile, owned, ownedAvatar, ownedGround, ownedBackdrop),
    owned,
    ownedAvatar,
    ownedGround,
    ownedBackdrop,
    looks: normalizeLooks(looks, ownedAvatar),
    legacy,
  };
}

export async function readPersonal() {
  const db = getDb();
  return db.transaction('r', db.progress, loadPersonal);
}

/** 호출자의 쓰기 트랜잭션에 참여하며, 변경 알림은 커밋 후에 보낸다. */
async function writeProgress(key: string, value: unknown): Promise<void> {
  const db = getDb();
  const existing = await db.progress.where('key').equals(key).first();
  const now = nowIso();
  const record: Progress = existing
    ? { ...existing, value, updatedAt: now }
    : { id: newId(), key, value, createdAt: now, updatedAt: now, schemaVersion: DB_SCHEMA_VERSION };
  delete record.deletedAt;
  await db.progress.put(record);
}

async function preserveOwnership(legacy: boolean): Promise<void> {
  if (!(await getProgress('personal.ownership-v2')))
    await writeProgress('personal.ownership-v2', { version: 2, legacy });
}

export async function savePersonal(profile: Personal): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.progress, async () => {
    const { owned, ownedAvatar, ownedGround, ownedBackdrop, legacy } = await loadPersonal();
    await preserveOwnership(legacy);
    await writeProgress(
      'personal.profile',
      normalizePersonal(profile, owned, ownedAvatar, ownedGround, ownedBackdrop),
    );
  });
  emitDbChange('progress');
}

/** 편집 중 바뀐 마당 이름·배치를 아바타 저장으로 덮어쓰지 않는다. */
export async function saveAvatarLook(look: AvatarLook): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.progress, async () => {
    const { profile, ownedAvatar, legacy } = await loadPersonal();
    await preserveOwnership(legacy);
    await writeProgress('personal.profile', { ...profile, ...normalizeAvatar(look, ownedAvatar) });
  });
  emitDbChange('progress');
}

/** 이름 또는 배치만 저장해도 최신 아바타와 다른 마당 설정을 보존한다. */
export async function saveGarden(
  garden: Partial<HorizonLook & Pick<Personal, 'name'>>,
): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.progress, async () => {
    const { profile, owned, ownedAvatar, ownedGround, ownedBackdrop, legacy } =
      await loadPersonal();
    await preserveOwnership(legacy);
    const next = {
      ...profile,
      name: garden.name ?? profile.name,
      slots: garden.slots ?? profile.slots,
      ground: garden.ground ?? profile.ground,
      sceneryEnabled: garden.sceneryEnabled ?? profile.sceneryEnabled,
      sceneryScale: garden.sceneryScale ?? profile.sceneryScale,
      backdrop: garden.backdrop ?? profile.backdrop,
    };
    await writeProgress(
      'personal.profile',
      normalizePersonal(next, owned, ownedAvatar, ownedGround, ownedBackdrop),
    );
  });
  emitDbChange('progress');
}

function checkLookIndex(index: number): void {
  if (!Number.isInteger(index) || index < 0 || index > 2) {
    throw new RangeError('Saved look index must be 0, 1, or 2.');
  }
}

/** 코디 세 칸을 원자적으로 갱신하여 다른 칸의 동시 저장을 보존한다. */
export async function saveLook(index: number, name: string, look: AvatarLook): Promise<void> {
  checkLookIndex(index);
  const db = getDb();
  await db.transaction('rw', db.progress, async () => {
    const { looks, ownedAvatar, legacy } = await loadPersonal();
    await preserveOwnership(legacy);
    looks[index] = {
      name: normalizePersonalName(name),
      avatar: normalizeAvatar(look, ownedAvatar),
    };
    await writeProgress('personal.looks', looks);
  });
  emitDbChange('progress');
}

export async function deleteLook(index: number): Promise<void> {
  checkLookIndex(index);
  const db = getDb();
  await db.transaction('rw', db.progress, async () => {
    const { looks, legacy } = await loadPersonal();
    await preserveOwnership(legacy);
    looks[index] = null;
    await writeProgress('personal.looks', looks);
  });
  emitDbChange('progress');
}
