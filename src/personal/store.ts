import { getDb, newId, nowIso } from '@/db/database';
import { emitDbChange } from '@/db/events';
import { getProgress, listProgress, setProgress } from '@/db/repos/progress';
import { DB_SCHEMA_VERSION } from '@/db/types';
import { DECORATIONS, normalizePersonal, rewardsFor, type Personal } from './catalog';

export async function grantRewards(badges: ReadonlySet<string>): Promise<void> {
  const db = getDb();
  let changed = false;
  await db.transaction('rw', db.progress, async () => {
    for (const id of rewardsFor(badges)) {
      const key = 'personal.reward:' + id;
      if (await db.progress.where('key').equals(key).first()) continue;
      const now = nowIso();
      await db.progress.add({
        id: newId(),
        key,
        value: { earnedAt: now },
        createdAt: now,
        updatedAt: now,
        schemaVersion: DB_SCHEMA_VERSION,
      });
      changed = true;
    }
  });
  if (changed) emitDbChange('progress');
}
export async function readPersonal() {
  const rewards = await listProgress('personal.reward:');
  const owned = new Set<string>(
    DECORATIONS.filter((d) => !d.badge || rewards.has('personal.reward:' + d.id)).map((d) => d.id),
  );
  return { profile: normalizePersonal(await getProgress('personal.profile'), owned), owned };
}
export async function savePersonal(profile: Personal) {
  const { owned } = await readPersonal();
  await setProgress('personal.profile', normalizePersonal(profile, owned));
}
