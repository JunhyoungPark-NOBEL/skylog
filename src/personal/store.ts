import { getDb, newId, nowIso } from '@/db/database';
import { emitDbChange } from '@/db/events';
import { getProgress, listProgress } from '@/db/repos/progress';
import { DB_SCHEMA_VERSION, type Progress } from '@/db/types';
import { AVATAR_REWARDS, FREE_AVATAR_OPTIONS, normalizeAvatar, type AvatarLook } from './avatar';
import {
  DECORATIONS,
  normalizePersonal,
  normalizePersonalName,
  rewardsFor,
  type Personal,
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
  const [rewards, avatarRewards, profile, looks] = await Promise.all([
    listProgress('personal.reward:'),
    listProgress('avatar.reward:'),
    getProgress('personal.profile'),
    getProgress('personal.looks'),
  ]);
  const owned = new Set<string>(
    DECORATIONS.filter((d) => !d.badge || hasReward(rewards.get('personal.reward:' + d.id))).map(
      (d) => d.id,
    ),
  );
  const ownedAvatar = new Set(FREE_AVATAR_OPTIONS);
  for (const reward of AVATAR_REWARDS) {
    if (hasReward(avatarRewards.get('avatar.reward:' + reward.key))) ownedAvatar.add(reward.key);
  }
  return {
    profile: normalizePersonal(profile, owned, ownedAvatar),
    owned,
    ownedAvatar,
    looks: normalizeLooks(looks, ownedAvatar),
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

export async function savePersonal(profile: Personal): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.progress, async () => {
    const { owned, ownedAvatar } = await loadPersonal();
    await writeProgress('personal.profile', normalizePersonal(profile, owned, ownedAvatar));
  });
  emitDbChange('progress');
}

/** 편집 중 바뀐 마당 이름·배치를 아바타 저장으로 덮어쓰지 않는다. */
export async function saveAvatarLook(look: AvatarLook): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.progress, async () => {
    const { profile, ownedAvatar } = await loadPersonal();
    await writeProgress('personal.profile', { ...profile, ...normalizeAvatar(look, ownedAvatar) });
  });
  emitDbChange('progress');
}

/** 이름 또는 배치만 저장해도 최신 아바타와 다른 마당 설정을 보존한다. */
export async function saveGarden(garden: Partial<Pick<Personal, 'name' | 'slots'>>): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.progress, async () => {
    const { profile, owned, ownedAvatar } = await loadPersonal();
    const next = {
      ...profile,
      name: garden.name ?? profile.name,
      slots: garden.slots ?? profile.slots,
    };
    await writeProgress('personal.profile', normalizePersonal(next, owned, ownedAvatar));
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
    const { looks, ownedAvatar } = await loadPersonal();
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
    const { looks } = await loadPersonal();
    looks[index] = null;
    await writeProgress('personal.looks', looks);
  });
  emitDbChange('progress');
}
