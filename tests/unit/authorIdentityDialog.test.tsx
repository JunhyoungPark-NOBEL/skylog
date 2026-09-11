import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorIdentity } from '@/features/personal/AuthorIdentity';
import { DEFAULT_AVATAR } from '@/personal/avatar';
import { DEFAULT_PERSONAL, type Personal } from '@/personal/catalog';
import type { CommunityIdentity } from '@/community/identity';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { name: string }) => (values ? `${key}:${values.name}` : key),
  }),
}));
vi.mock('@/features/personal/GardenArt', () => ({
  GardenArt: ({ profile }: { profile: Personal }) => (
    <svg data-testid="public-profile-art" data-profile={JSON.stringify(profile)}>
      <circle r="5" />
    </svg>
  ),
}));

const identity: CommunityIdentity = {
  name: '토성 관측자',
  avatar: { ...DEFAULT_AVATAR, hat: 'saturnhat' },
  horizon: {
    ground: 'stone',
    slots: ['sct', null, 'bench', null, null],
    sceneryScale: 'small',
    sceneryEnabled: true,
  },
};
let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');
const opener = () => host.querySelector<HTMLButtonElement>('button')!;
const closeButton = () => dialog()!.querySelector<HTMLButtonElement>('button')!;
const click = (target: Element) =>
  act(async () => target.dispatchEvent(new MouseEvent('click', { bubbles: true })));

describe('댓글 작성자의 프로필 보기', () => {
  it('댓글에는 아바타만, 프로필에는 공개된 지평선과 아바타를 함께 표시한다', async () => {
    await act(async () => root.render(<AuthorIdentity identity={identity} />));
    expect(host.querySelector('[data-avatar-background]')).toBeNull();
    expect(dialog()).toBeNull();
    await click(opener());
    const rendered = JSON.parse(
      document.querySelector('[data-profile]')!.getAttribute('data-profile')!,
    ) as Personal;
    expect(rendered).toEqual({
      ...DEFAULT_PERSONAL,
      ...identity.avatar,
      ...identity.horizon,
      name: identity.name,
    });
    expect(document.activeElement).toBe(closeButton());
    expect(dialog()!.getAttribute('aria-modal')).toBe('true');
    const titleId = dialog()!.getAttribute('aria-labelledby');
    expect(document.getElementById(titleId!)?.textContent).toBe(identity.name);
  });

  it('그림 내부 클릭이나 재조회 렌더링으로 닫히지 않고 Tab·Escape·초점 복귀가 유지된다', async () => {
    await act(async () => root.render(<AuthorIdentity identity={identity} />));
    await click(opener());
    await click(document.querySelector('[data-testid="public-profile-art"]')!);
    expect(dialog()).not.toBeNull();
    await act(async () =>
      root.render(<AuthorIdentity identity={{ ...identity, avatar: { ...identity.avatar } }} />),
    );
    expect(dialog()).not.toBeNull();
    for (const shiftKey of [false, true]) {
      await act(async () =>
        closeButton().dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true }),
        ),
      );
      expect(document.activeElement).toBe(closeButton());
    }
    const anchor = opener();
    await act(async () =>
      closeButton().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    );
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(anchor);
    await click(anchor);
    await click(dialog()!.parentElement!);
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(anchor);
  });

  it('구형 작성자는 장식 없는 프로필로 안내하고 축약형은 중첩 버튼을 만들지 않는다', async () => {
    await act(async () =>
      root.render(<AuthorIdentity identity={{ name: '예전 관측자', avatar: DEFAULT_AVATAR }} />),
    );
    await click(opener());
    expect(dialog()!.textContent).toContain('communityIdentity.noHorizon');
    const rendered = JSON.parse(
      document.querySelector('[data-profile]')!.getAttribute('data-profile')!,
    ) as Personal;
    expect(rendered.slots).toEqual([null, null, null, null, null]);
    await click(closeButton());
    await act(async () =>
      root.render(
        <button type="button">
          <AuthorIdentity identity={identity} compact />
        </button>,
      ),
    );
    expect(host.querySelectorAll('button')).toHaveLength(1);
    expect(host.querySelector('[data-testid="author-identity"]')?.tagName).toBe('SPAN');
    expect(dialog()).toBeNull();
  });

  it('비포커스 그림을 누른 뒤 초점이 body로 옮겨져도 Tab과 Escape가 모달에 적용된다', async () => {
    await act(async () => root.render(<AuthorIdentity identity={identity} />));
    await click(opener());
    closeButton().blur();
    expect(document.activeElement).toBe(document.body);
    await act(async () =>
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
      ),
    );
    expect(document.activeElement).toBe(closeButton());
    closeButton().blur();
    await act(async () =>
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      ),
    );
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(opener());
  });
});
