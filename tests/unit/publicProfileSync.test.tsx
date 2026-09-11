import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicProfileSync } from '@/features/personal/PublicProfileSync';
import { readCommunityIdentities, saveCommunityIdentity } from '@/community/identity';
import { DEFAULT_AVATAR } from '@/personal/avatar';
import { DEFAULT_PERSONAL, horizonOf, type Personal } from '@/personal/catalog';
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
  it('공개하기를 누른 시점의 아바타·지평선만 보내고 이후 로컬 변경을 미전송 상태로 남긴다', async () => {
    const profile: Personal & { lat: number; lon: number; address: string } = {
      ...DEFAULT_PERSONAL,
      ...current,
      name: '개인 관측지 이름',
      lat: 37.56,
      lon: 126.98,
      address: '비공개 주소',
      slots: ['bench', null, 'sct', null, 'pavilion'],
      ground: 'stone',
      sceneryScale: 'medium',
    };
    await act(async () => root.render(<PublicProfileSync profile={profile} />));
    expect(saveCommunityIdentity).not.toHaveBeenCalled();
    let finish!: () => void;
    vi.mocked(saveCommunityIdentity).mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    await submit();
    expect(saveCommunityIdentity).toHaveBeenCalledWith(
      '밤 산책',
      current,
      'account-a',
      horizonOf(profile),
    );
    const submittedHorizon = vi.mocked(saveCommunityIdentity).mock.calls[0]![3]!;
    profile.slots[0] = 'flowers';
    expect(submittedHorizon.slots[0]).toBe('bench');
    const next = { ...profile, ground: 'snow' } as const;
    await act(async () => root.render(<PublicProfileSync profile={next} />));
    await act(async () => finish());
    expect(host.querySelector('button[type="submit"]')!.matches(':disabled')).toBe(false);
    await submit();
    expect(saveCommunityIdentity).toHaveBeenLastCalledWith(
      '밤 산책',
      current,
      'account-a',
      horizonOf(next),
    );
    expect(JSON.stringify(vi.mocked(saveCommunityIdentity).mock.calls)).not.toMatch(
      /개인 관측지|비공개 주소|37\.56|126\.98/,
    );
    expect(host.querySelector('button[type="submit"]')!.matches(':disabled')).toBe(true);
  });
  it('계정이 바뀌면 이전 공개 프로필의 늦은 조회를 무시하고 새 계정의 지평선을 기준으로 비교한다', async () => {
    let finish!: (value: Awaited<ReturnType<typeof readCommunityIdentities>>) => void;
    vi.mocked(readCommunityIdentities).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const profile = { ...DEFAULT_PERSONAL, ...current };
    await act(async () => root.render(<PublicProfileSync profile={profile} />));
    const oldSignal = vi.mocked(readCommunityIdentities).mock.calls[0]![1];
    auth.id = 'account-b';
    vi.mocked(readCommunityIdentities).mockResolvedValue({
      'account-b': { name: '두 번째 관측자', avatar: current, horizon: horizonOf(profile) },
    });
    await act(async () => root.render(<PublicProfileSync profile={profile} />));
    await act(async () =>
      finish({
        'account-a': {
          name: '옛 계정',
          avatar: DEFAULT_AVATAR,
          horizon: { ...horizonOf(profile), ground: 'snow' },
        },
      }),
    );
    expect(oldSignal?.aborted).toBe(true);
    expect(input().value).toBe('두 번째 관측자');
    expect(host.querySelector('button[type="submit"]')!.matches(':disabled')).toBe(true);
    expect(saveCommunityIdentity).not.toHaveBeenCalled();
  });
});
