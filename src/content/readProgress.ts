/**
 * 콘텐츠 읽음 표시(task-06 §3.5) — `progress` 테이블 `content.read:<id>` = { at }. T7 학습(read 단계)이 같은 키를 본다.
 */
import { create } from 'zustand';
import type { ObjectId } from '@/catalog/objectId';
import { onDbChange } from '@/db/events';
import { listProgress, setProgress } from '@/db/repos/progress';

export const READ_PREFIX = 'content.read:';
export const REPORT_PREFIX = 'content.report:';

export interface ReadMark {
  at: string;
}

export interface ReadState {
  readSet: Set<ObjectId>;
  ready: boolean;
  refresh(): Promise<void>;
}

export const useReadStore = create<ReadState>()((set) => ({
  readSet: new Set(),
  ready: false,
  refresh: async () => {
    const rows = await listProgress<ReadMark>(READ_PREFIX);
    set({
      readSet: new Set([...rows.keys()].map((k) => k.slice(READ_PREFIX.length) as ObjectId)),
      ready: true,
    });
  },
}));

/** 앱에서 한 번: 읽음 집합 로드 + progress 변경 구독 */
export function startReadSync(): () => void {
  void useReadStore.getState().refresh();
  return onDbChange((t) => {
    if (t === 'progress' || t === 'all') void useReadStore.getState().refresh();
  });
}

export async function markRead(id: ObjectId, at: Date = new Date()): Promise<void> {
  if (useReadStore.getState().readSet.has(id)) return;
  await setProgress(`${READ_PREFIX}${id}`, { at: at.toISOString() } satisfies ReadMark);
}

/** "오류 신고": 로컬 메모로 남긴다(내보내기에 포함됨). */
export async function reportContentIssue(id: ObjectId, note: string): Promise<void> {
  const key = `${REPORT_PREFIX}${id}`;
  const prev = (await listProgress<{ notes: { at: string; note: string }[] }>(key)).get(key);
  const notes = [...(prev?.notes ?? []), { at: new Date().toISOString(), note }];
  await setProgress(key, { notes });
}
