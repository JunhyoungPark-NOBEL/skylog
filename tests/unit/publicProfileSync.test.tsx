import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicProfileSync } from '@/features/personal/PublicProfileSync';
import { readCommunityIdentities, saveCommunityIdentity } from '@/community/identity';
import { DEFAULT_AVATAR } from '@/personal/avatar';
import type * as IdentityModule from '@/community/identity';

const auth = vi.hoisted(() => ({ id: 'account-a' }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/community/client', () => ({
  communityConfigured: true,
  communityError: () => 'social.error',
  useCommunityUser: () => ({ ready: true, user: { id: auth.id } }),
}));
vi.mock('@/community/identity', async (importOriginal) => ({
  ...(await importOriginal<typeof IdentityModule>()),
  readCommunityIdentities: vi.fn(),
  saveCommunityIdentity: vi.fn(),
}));
let host: HTMLDivElement;
let root: Root;
const current = { ...DEFAULT_AVATAR, hair: 'bob' } as const;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  auth.id = 'account-a';
  vi.mocked(readCommunityIdentities)
    .mockReset()
    .mockResolvedValue({ 'account-a': { name: '밤 산책', avatar: DEFAULT_AVATAR } });
  vi.mocked(saveCommunityIdentity).mockReset().mockResolvedValue();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
const mount = () => act(async () => root.render(<PublicProfileSync profile={current} />));
const input = () => host.querySelector('input')!;
async function type(value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input(), value);
    input().dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const submit = () =>
  act(async () =>
    host
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
  );

describe('공개 프로필 명시 동기화', () => {
  it('아바타를 읽거나 닉네임을 편집하는 것만으로 보내지 않고 실패한 초안을 유지한다', async () => {
    await mount();
    await type('나의 별밤');
    expect(saveCommunityIdentity).not.toHaveBeenCalled();
    vi.mocked(saveCommunityIdentity).mockRejectedValueOnce(new Error('offline'));
    await submit();
    expect(input().value).toBe('나의 별밤');
    expect(host.textContent).toContain('social.error');
    expect(saveCommunityIdentity).toHaveBeenCalledWith('나의 별밤', current, 'account-a');
    await submit();
    expect(host.textContent).toContain('communityIdentity.saved');
    expect(host.querySelector('button[type="submit"]')!.matches(':disabled')).toBe(true);
  });
  it('계정 변경 후 이전 계정의 늦은 성공이 새 별칭을 덮어쓰지 않는다', async () => {
    await mount();
    let finish!: () => void;
    vi.mocked(saveCommunityIdentity).mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    await submit();
    auth.id = 'account-b';
    vi.mocked(readCommunityIdentities).mockResolvedValue({
      'account-b': { name: '다른 관측자', avatar: DEFAULT_AVATAR },
    });
    await mount();
    await act(async () => finish());
    expect(input().value).toBe('다른 관측자');
    expect(host.textContent).not.toContain('communityIdentity.saved');
  });
  it('이메일 주소는 동기화 버튼을 활성화하지 않는다', async () => {
    await mount();
    await type('private@example.org');
    expect(host.querySelector('button[type="submit"]')!.matches(':disabled')).toBe(true);
    expect(saveCommunityIdentity).not.toHaveBeenCalled();
  });
});
