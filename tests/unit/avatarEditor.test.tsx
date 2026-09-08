import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emitDbChange } from '@/db/events';
import { DEFAULT_AVATAR, FREE_AVATAR_OPTIONS, type AvatarLook } from '@/personal/avatar';
import { DEFAULT_PERSONAL, type Personal } from '@/personal/catalog';
import {
  deleteLook,
  grantRewards,
  readPersonal,
  saveAvatarLook,
  saveGarden,
  saveLook,
  type SavedLooks,
} from '@/personal/store';
import ProfileScreen from '@/features/personal/ProfileScreen';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key,
  }),
}));
vi.mock('@/features/learn/useLearning', () => ({ useLearning: () => ({ value: null }) }));
vi.mock('@/personal/store', () => ({
  readPersonal: vi.fn(),
  grantRewards: vi.fn(),
  saveAvatarLook: vi.fn(),
  saveGarden: vi.fn(),
  saveLook: vi.fn(),
  deleteLook: vi.fn(),
}));
// 그림 대신 전달된 코디를 읽는다. 실제 부모·편집기·버튼·DB 변경 구독은 그대로 마운트한다.
vi.mock('@/features/personal/AvatarArt', () => ({
  AvatarPreview: ({ profile, label }: { profile: AvatarLook; label: string }) => (
    <svg data-suit={profile.suit} aria-label={label} />
  ),
}));
vi.mock('@/features/personal/GardenArt', () => ({
  GardenArt: ({ profile }: { profile: Personal }) => (
    <div
      data-testid="garden-art"
      data-suit={profile.suit}
      data-slots={JSON.stringify(profile.slots)}
    />
  ),
  DecorationArt: () => <g />,
}));

type PersonalState = Awaited<ReturnType<typeof readPersonal>>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function snapshot(
  profile: Partial<Personal> = {},
  looks: SavedLooks = [null, null, null],
): PersonalState {
  return {
    profile: { ...DEFAULT_PERSONAL, ...profile },
    owned: new Set(['flowers', 'bench', 'fern', 'stones']),
    ownedAvatar: new Set(FREE_AVATAR_OPTIONS),
    looks,
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.mocked(readPersonal).mockReset().mockResolvedValue(snapshot());
  for (const save of [saveAvatarLook, saveGarden, saveLook, deleteLook, grantRewards]) {
    vi.mocked(save).mockReset().mockResolvedValue(undefined);
  }
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function button(name: string, within: ParentNode = container): HTMLButtonElement {
  const found = [...within.querySelectorAll<HTMLButtonElement>('button')].find(
    (item) => item.getAttribute('aria-label') === name || item.textContent?.trim() === name,
  );
  if (!found) throw new Error(`Button not found: ${name}`);
  return found;
}

async function click(target: HTMLElement): Promise<void> {
  await act(async () => target.click());
}

async function openEditor(): Promise<void> {
  await act(async () => root.render(<ProfileScreen />));
  await click(button('personal.avatar'));
}

function previewSuit(): string | null | undefined {
  return container.querySelector('[data-testid="avatar-current"] svg')?.getAttribute('data-suit');
}

describe('아바타 저장 뒤 화면 갱신 경계', () => {
  it('쓰기가 끝나도 새 프로필 읽기 전에는 나갈 수 없고, 재진입 시 저장한 코디로 시작한다', async () => {
    await openEditor();
    await click(button('avatar.options.suit.rose'));
    const writing = deferred<void>();
    const reading = deferred<PersonalState>();
    vi.mocked(saveAvatarLook).mockReturnValue(writing.promise);
    vi.mocked(readPersonal).mockReturnValue(reading.promise);
    const apply = button('avatar.apply');
    await click(apply);
    expect(saveAvatarLook).toHaveBeenCalledWith({ ...DEFAULT_AVATAR, suit: 'rose' });
    expect(readPersonal).toHaveBeenCalledTimes(1);
    await act(async () => writing.resolve(undefined));
    expect(readPersonal).toHaveBeenCalledTimes(2);
    expect(apply.disabled).toBe(true);
    expect(button('avatar.cancel').disabled).toBe(true);
    expect(button('avatar.options.suit.sage').matches(':disabled')).toBe(true);
    await click(button('common.back'));
    expect(previewSuit()).toBe('rose');
    expect(container.querySelector('[data-testid="garden-art"]')).toBeNull();
    await act(async () => reading.resolve(snapshot({ suit: 'rose' })));
    expect(container.querySelector('[data-testid="garden-art"]')?.getAttribute('data-suit')).toBe(
      'rose',
    );
    await click(button('personal.avatar'));
    expect(previewSuit()).toBe('rose');
  });

  it('코디 보관 성공 안내와 다시 불러오기는 갱신된 보관함이 온 뒤에만 열린다', async () => {
    await openEditor();
    await click(button('avatar.options.suit.lavender'));
    const reading = deferred<PersonalState>();
    vi.mocked(readPersonal).mockReturnValue(reading.promise);
    const slot = container.querySelector('[data-testid="avatar-look-0"]')!;
    const save = button('avatar.saveLook', slot);
    await click(save);
    expect(saveLook).toHaveBeenCalledTimes(1);
    expect(save.disabled).toBe(true);
    expect(container.querySelector('[role="status"]')).toBeNull();
    await act(async () =>
      reading.resolve(
        snapshot({}, [
          { name: '새 코디', avatar: { ...DEFAULT_AVATAR, suit: 'lavender' } },
          null,
          null,
        ]),
      ),
    );
    expect(container.querySelector('[role="status"]')?.textContent).toBe('avatar.lookSaved');
    await click(button('avatar.options.suit.rose'));
    await click(
      button('avatar.loadLook', container.querySelector('[data-testid="avatar-look-0"]')!),
    );
    expect(previewSuit()).toBe('lavender');
  });

  it('저장 후 읽기가 실패하면 코디를 유지하고 다시 읽기에 성공할 때까지 편집을 막는다', async () => {
    await openEditor();
    await click(button('avatar.options.suit.rose'));
    const reading = deferred<PersonalState>();
    vi.mocked(readPersonal).mockReturnValue(reading.promise);
    await click(button('avatar.apply'));
    await act(async () => reading.reject(new Error('read failed')));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('avatar.reloadError');
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(previewSuit()).toBe('rose');
    expect(button('avatar.apply').matches(':disabled')).toBe(true);
    expect(button('avatar.cancel').matches(':disabled')).toBe(true);
    expect(button('avatar.options.suit.sage').matches(':disabled')).toBe(true);
    const retry = deferred<PersonalState>();
    vi.mocked(readPersonal).mockReturnValue(retry.promise);
    await click(button('avatar.retry'));
    expect(button('avatar.apply').matches(':disabled')).toBe(true);
    await act(async () => retry.resolve(snapshot({ suit: 'rose' })));
    expect(button('avatar.apply').matches(':disabled')).toBe(false);
    expect(previewSuit()).toBe('rose');
    expect(saveAvatarLook).toHaveBeenCalledTimes(1);
    await click(button('avatar.cancel'));
    expect(container.querySelector('[data-testid="garden-art"]')?.getAttribute('data-suit')).toBe(
      'rose',
    );
  });

  it('코디 보관 후 읽기가 실패하면 성공 메시지를 띄우지 않는다', async () => {
    await openEditor();
    const reading = deferred<PersonalState>();
    vi.mocked(readPersonal).mockReturnValue(reading.promise);
    await click(
      button('avatar.saveLook', container.querySelector('[data-testid="avatar-look-0"]')!),
    );
    await act(async () => reading.reject(new Error('read failed')));
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('avatar.reloadError');
    expect(previewSuit()).toBe('sage');
    expect(
      button('avatar.saveLook', container.querySelector('[data-testid="avatar-look-0"]')!).matches(
        ':disabled',
      ),
    ).toBe(true);
  });

  it('읽기 실패 뒤 홈으로 나가도 재로딩 전에는 이전 아바타를 다시 편집할 수 없다', async () => {
    await openEditor();
    await click(button('avatar.options.suit.rose'));
    const reading = deferred<PersonalState>();
    vi.mocked(readPersonal).mockReturnValue(reading.promise);
    await click(button('avatar.apply'));
    await act(async () => reading.reject(new Error('read failed')));
    await click(button('common.back'));
    const reopen = button('personal.avatar');
    expect(reopen.matches(':disabled')).toBe(true);
    await click(reopen);
    expect(container.querySelector('[data-testid="avatar-editor"]')).toBeNull();
    vi.mocked(readPersonal).mockResolvedValue(snapshot({ suit: 'rose' }));
    await click(button('avatar.retry'));
    expect(button('personal.avatar').matches(':disabled')).toBe(false);
    await click(button('personal.avatar'));
    expect(previewSuit()).toBe('rose');
    expect(saveAvatarLook).toHaveBeenCalledTimes(1);
  });

  it('마당의 다음 배치는 저장 후 읽기가 끝난 새 슬롯 배열에서 계산한다', async () => {
    await act(async () => root.render(<ProfileScreen />));
    await click(button('personal.garden'));
    const reading = deferred<PersonalState>();
    vi.mocked(readPersonal).mockReturnValue(reading.promise);
    await click(button('personal.items.stones'));
    expect(saveGarden).toHaveBeenLastCalledWith({ slots: ['stones', 'bench', null, 'fern', null] });
    expect(button('personal.items.flowers').disabled).toBe(true);
    await click(button('personal.items.flowers'));
    expect(saveGarden).toHaveBeenCalledTimes(1);
    await act(async () =>
      reading.resolve(snapshot({ slots: ['stones', 'bench', null, 'fern', null] })),
    );
    await click(button('personal.slot:{"n":2}'));
    vi.mocked(readPersonal).mockResolvedValue(
      snapshot({ slots: ['stones', 'flowers', null, 'fern', null] }),
    );
    await click(button('personal.items.flowers'));
    expect(saveGarden).toHaveBeenLastCalledWith({
      slots: ['stones', 'flowers', null, 'fern', null],
    });
    expect(container.querySelector('[data-testid="garden-art"]')?.getAttribute('data-slots')).toBe(
      JSON.stringify(['stones', 'flowers', null, 'fern', null]),
    );
  });

  it('저장 직후 더 최신 읽기가 시작되면 이전 읽기 성공으로 먼저 편집을 열지 않는다', async () => {
    await openEditor();
    await click(button('avatar.options.suit.rose'));
    const earlier = deferred<PersonalState>();
    const newer = deferred<PersonalState>();
    vi.mocked(readPersonal).mockReturnValueOnce(earlier.promise).mockReturnValueOnce(newer.promise);
    const apply = button('avatar.apply');
    await click(apply);
    await act(async () => emitDbChange('progress'));
    await act(async () => earlier.resolve(snapshot()));
    expect(apply.disabled).toBe(true);
    expect(previewSuit()).toBe('rose');
    await act(async () => newer.resolve(snapshot({ suit: 'rose', name: '최신 마당' })));
    expect(container.querySelector('h2')?.textContent).toBe('최신 마당');
    await click(button('personal.avatar'));
    expect(previewSuit()).toBe('rose');
  });

  it('더 최신 읽기가 대기 중이면 이전 읽기의 실패도 기다리며 새 결과를 적용한다', async () => {
    await openEditor();
    await click(button('avatar.options.suit.rose'));
    const earlier = deferred<PersonalState>();
    const newer = deferred<PersonalState>();
    vi.mocked(readPersonal).mockReturnValueOnce(earlier.promise).mockReturnValueOnce(newer.promise);
    const apply = button('avatar.apply');
    await click(apply);
    await act(async () => emitDbChange('progress'));
    await act(async () => earlier.reject(new Error('superseded read failed')));
    const stayedBusy = apply.disabled;
    const errorBeforeNewer = container.querySelector('[role="alert"]')?.textContent;
    await act(async () => newer.resolve(snapshot({ suit: 'rose' })));
    expect(stayedBusy).toBe(true);
    expect(errorBeforeNewer).toBeUndefined();
    expect(container.querySelector('[data-testid="garden-art"]')?.getAttribute('data-suit')).toBe(
      'rose',
    );
  });

  it('잠긴 보상의 화면 읽기 설명에 획득 조건을 연결한다', async () => {
    await openEditor();
    const locked = button('avatar.options.outfit.spacesuit');
    expect(locked.disabled).toBe(true);
    const id = locked.getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    expect(document.getElementById(id!)?.textContent).toContain('avatar.unlock.spacesuit');
  });
});
