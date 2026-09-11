import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PERSONAL, type Personal } from '@/personal/catalog';
import { HorizonEditor } from '@/features/personal/HorizonEditor';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key,
  }),
}));
vi.mock('@/features/personal/GardenArt', () => ({
  DecorationArt: () => <g />,
  GardenArt: ({ profile }: { profile: Personal }) => <div data-backdrop={profile.backdrop} />,
}));

let container: HTMLDivElement;
let root: Root;
const save = vi.fn<Parameters<typeof HorizonEditor>[0]['onSave']>().mockResolvedValue(undefined);
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  save.mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
function button(name: string) {
  const result = [...container.querySelectorAll<HTMLButtonElement>('button')].find(
    (item) => item.getAttribute('aria-label') === name || item.textContent?.trim().startsWith(name),
  );
  if (!result) throw new Error('Missing button: ' + name);
  return result;
}
async function render(profile: Partial<Personal> = {}, owned = new Set(['bench']), busy = false) {
  await act(async () =>
    root.render(
      <HorizonEditor
        profile={{ ...DEFAULT_PERSONAL, ...profile }}
        owned={owned}
        ownedGround={new Set(['meadow'])}
        ownedBackdrop={new Set(['field'])}
        progress={new Map([['challenge-stages-cleared-20', { n: 3, total: 20 }]])}
        busy={busy}
        slot={0}
        onSlot={vi.fn()}
        onSave={save}
      />,
    ),
  );
}
async function click(name: string) {
  await act(async () => button(name).click());
}

describe('관측 지평선 편집', () => {
  it('다른 자리에 놓인 장식은 중복 없이 옮기며 다른 설정을 저장 요청에 덮어쓰지 않는다', async () => {
    await render();
    await click('personal.items.bench');
    expect(save).toHaveBeenCalledExactlyOnceWith({ slots: ['bench', null, null, null, null] });
  });
  it('잠긴 장식에는 조건과 현재 업적 진도가 연결되고 저장할 수 없다', async () => {
    await render();
    await click('personal.newRewards');
    const pavilion = button('personal.items.pavilion');
    expect(pavilion.disabled).toBe(true);
    expect(
      document.getElementById(pavilion.getAttribute('aria-describedby')!)?.textContent,
    ).toContain('personal.unlock.pavilion');
    expect(
      document.getElementById(pavilion.getAttribute('aria-describedby')!)?.textContent,
    ).toContain('"n":3,"total":20');
    await click('personal.items.pavilion');
    expect(save).not.toHaveBeenCalled();
  });
  it('미획득 지면은 고를 수 없고 크기와 숨기기는 각각의 속성만 저장한다', async () => {
    await render();
    await click('horizon.tabs.ground');
    expect(button('horizon.ground.snow').disabled).toBe(true);
    await click('horizon.ground.snow');
    expect(save).not.toHaveBeenCalled();
    await click('horizon.tabs.view');
    await click('horizon.scale.medium');
    expect(save).toHaveBeenLastCalledWith({ sceneryScale: 'medium' });
    const toggle = container.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    await act(async () => toggle.click());
    expect(save).toHaveBeenLastCalledWith({ sceneryEnabled: false });
  });
  it('저장 후 최신 읽기가 끝날 때까지 다음 편집과 지면 변경이 비활성이다', async () => {
    await render({}, new Set(['bench']), true);
    expect(button('personal.items.bench').matches(':disabled')).toBe(true);
    await click('horizon.tabs.ground');
    expect(button('horizon.ground.meadow').matches(':disabled')).toBe(true);
    await click('horizon.tabs.view');
    expect(button('horizon.scale.medium').matches(':disabled')).toBe(true);
    expect(save).not.toHaveBeenCalled();
  });
  it('잠긴 배경도 미리 볼 수 있지만 저장하지 않으며 닫으면 초점을 돌려준다', async () => {
    await render();
    await click('horizon.tabs.background');
    expect(button('horizon.backdrop.snow-peaks').disabled).toBe(true);
    const preview = button('horizon.previewBackdrop:{"name":"horizon.backdrop.snow-peaks"}');
    await act(async () => preview.click());
    expect(
      document.querySelector('[role="dialog"] [data-backdrop]')?.getAttribute('data-backdrop'),
    ).toBe('snow-peaks');
    expect(save).not.toHaveBeenCalled();
    await act(async () =>
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(preview);
  });
});
