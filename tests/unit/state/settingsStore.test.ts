import { describe, expect, it } from 'vitest';
import { getDb } from '@/db/database';
import { setSetting } from '@/db/repos/settings';
import {
  DEFAULT_SETTINGS,
  SETTINGS_PERSIST_NAME,
  useSettingsStore,
  waitForSettingsHydration,
} from '@/state/settingsStore';

async function flush(): Promise<void> {
  // persist의 setItem은 비동기 — Dexie 트랜잭션이 끝날 때까지 잠깐 기다린다.
  await new Promise((r) => setTimeout(r, 20));
}

describe('settingsStore ↔ Dexie settings (D-010)', () => {
  it('변경 사항이 Dexie settings 테이블에 키마다 한 행으로 저장된다', async () => {
    await useSettingsStore.persist.rehydrate();
    await waitForSettingsHydration();
    useSettingsStore.getState().setTheme('night');
    useSettingsStore.getState().setLang('en');
    await flush();

    const db = getDb();
    const theme = await db.settings.get(`${SETTINGS_PERSIST_NAME}.theme`);
    const lang = await db.settings.get(`${SETTINGS_PERSIST_NAME}.lang`);
    const version = await db.settings.get(`${SETTINGS_PERSIST_NAME}.__version`);
    expect(theme?.value).toBe('night');
    expect(lang?.value).toBe('en');
    expect(version?.value).toBe(1);
    // localStorage는 사용하지 않는다.
    expect(globalThis.localStorage?.getItem(SETTINGS_PERSIST_NAME) ?? null).toBeNull();
  });

  it('Dexie에 있는 값이 스토어로 복원된다', async () => {
    await setSetting(`${SETTINGS_PERSIST_NAME}.theme`, 'night');
    await setSetting(`${SETTINGS_PERSIST_NAME}.debugHud`, true);
    await setSetting(`${SETTINGS_PERSIST_NAME}.__version`, 1);
    await useSettingsStore.persist.rehydrate();
    expect(useSettingsStore.getState().theme).toBe('night');
    expect(useSettingsStore.getState().debugHud).toBe(true);
    // 저장되지 않은 키는 기본값 유지
    expect(useSettingsStore.getState().units).toBe(DEFAULT_SETTINGS.units);
  });
});
