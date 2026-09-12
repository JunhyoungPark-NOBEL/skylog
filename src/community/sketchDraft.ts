import { create } from 'zustand';
import type { ObjectId } from '@/catalog/objectId';
import { prepareCommunityImage } from './image';

export interface SketchDraft {
  objectId: ObjectId;
  image: Blob;
}

/** 메모·위치 없이 공개용 사본만 메모리에 둔다. 게시 동의 전에는 전송하지 않는다. */
export const useSketchDraft = create<{ draft: SketchDraft | null }>(() => ({ draft: null }));

export async function prepareSketchDraft(objectId: ObjectId, image: Blob) {
  const copy = await prepareCommunityImage(new File([image], 'sketch.png', { type: 'image/png' }));
  useSketchDraft.setState({ draft: { objectId, image: copy } });
}

export function clearSketchDraft() {
  useSketchDraft.setState({ draft: null });
}
