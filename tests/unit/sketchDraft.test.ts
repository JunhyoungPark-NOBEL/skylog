import { afterEach, expect, it, vi } from 'vitest';
import { clearSketchDraft, prepareSketchDraft, useSketchDraft } from '@/community/sketchDraft';
import { prepareCommunityImage } from '@/community/image';
vi.mock('@/community/image', () => ({ prepareCommunityImage: vi.fn() }));
afterEach(clearSketchDraft);
it('선택한 이미지·천체만 공유 초안에 넣고 취소하면 메모리에서 지운다', async () => {
  const original = new Blob(['private original'], { type: 'image/png' });
  const copy = new Blob(['public copy'], { type: 'image/jpeg' });
  vi.mocked(prepareCommunityImage).mockResolvedValue(copy);
  const network = vi.spyOn(globalThis, 'fetch');
  await prepareSketchDraft('moon', original);
  expect(useSketchDraft.getState().draft).toEqual({ objectId: 'moon', image: copy });
  expect(network).not.toHaveBeenCalled();
  clearSketchDraft();
  expect(useSketchDraft.getState().draft).toBeNull();
  network.mockRestore();
});
