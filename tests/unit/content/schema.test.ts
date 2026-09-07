import { describe, expect, it } from 'vitest';
import {
  contentFileName,
  toIndexEntry,
  validateContentEntry,
  type ContentEntry,
} from '@/content/schema';

const SUMMARY = '가'.repeat(200);
const STORY = '나'.repeat(300);

function good(over: Partial<ContentEntry> = {}): ContentEntry {
  return {
    id: 'dso:M31',
    version: 2,
    title: { ko: '안드로메다은하', en: 'Andromeda Galaxy' },
    oneLiner: { ko: '가을 하늘의 희미한 타원' },
    summary: { ko: SUMMARY },
    facts: [
      { label: '종류', value: '나선은하', source: 'NASA' },
      { label: '별자리', value: '안드로메다자리 (And)' },
      { label: '밝기', value: '3.4등급', review: true },
    ],
    story: { ko: STORY, cultures: ['기타'], sources: ['NASA — M31 — https://example.org'] },
    howToFind: {
      ko: '페가수스 대사각형에서 알페라츠를 찾아 별 사슬을 따라가요. '.repeat(3),
      season: 'autumn',
      hopFrom: ['star:HIP677', 'const:And'],
    },
    observing: {
      binoculars: '10×50으로 길쭉한 빛을 찾아요. 중심만 보여도 괜찮아요.',
      bestMonths: [9, 10, 11],
      difficulty: 3,
    },
    funFacts: ['앞쪽 별들은 우리은하 별이에요.'],
    sources: ['NASA — https://example.org'],
    meta: {
      generatedBy: 'gpt-5-pro',
      generatedAt: '2026-09-07',
      reviewedBy: 'claude',
      reviewedAt: '2026-09-07',
      confidence: 'medium',
    },
    ...over,
  };
}

describe('validateContentEntry', () => {
  it('정상 항목은 오류 없음', () => {
    const r = validateContentEntry(good());
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });
  it('필수 필드·길이·enum·id 형식을 잡는다', () => {
    const r = validateContentEntry(
      good({
        id: 'dso:' as never,
        oneLiner: { ko: '가'.repeat(61) },
        summary: { ko: '짧다' },
        story: { ko: STORY, cultures: ['화성'], sources: [] },
        howToFind: { ko: '…', season: 'monsoon' as never, hopFrom: ['nope' as never] },
        observing: { difficulty: 9 as never },
        sources: [],
      }),
    );
    expect(r.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('id 형식'),
        expect.stringContaining('oneLiner 61자'),
        expect.stringContaining('summary 2자'),
        expect.stringContaining('story.cultures 값 오류'),
        expect.stringContaining('story.sources 필요'),
        expect.stringContaining('howToFind.season'),
        expect.stringContaining('hopFrom id 오류'),
        expect.stringContaining('difficulty'),
        expect.stringContaining('observing 안내가 하나도 없음'),
        expect.stringContaining('sources 필요'),
      ]),
    );
  });
  it('태양은 safety가 없으면 오류', () => {
    const r = validateContentEntry(good({ id: 'sun', title: { ko: '태양', en: 'Sun' } }));
    expect(r.errors).toContain('태양 항목은 safety 문구 필수');
    expect(
      validateContentEntry(
        good({
          id: 'sun',
          title: { ko: '태양', en: 'Sun' },
          safety: '필터 없이 절대 보지 마세요.',
        }),
      ).errors,
    ).toEqual([]);
  });
  it('과장·내부 말투·합쇼체는 경고', () => {
    const r = validateContentEntry(
      good({
        summary: { ko: `${SUMMARY} 이것은 확실히 보입니다. 첨부 값입니다.` },
      }),
    );
    expect(r.errors).toEqual([]);
    expect(r.warnings.join(' ')).toMatch(/과장 표현/);
    expect(r.warnings.join(' ')).toMatch(/내부 말투/);
    expect(r.warnings.join(' ')).toMatch(/합쇼체/);
  });
  it('별자리 제목에 자리가 없으면 경고', () => {
    const r = validateContentEntry(good({ id: 'const:Ori', title: { ko: '오리온', en: 'Orion' } }));
    expect(r.warnings.join(' ')).toMatch(/자리/);
  });
  it('인덱스 항목·파일명', () => {
    const e = good();
    expect(contentFileName(e.id)).toBe('dso_M31.json');
    const ix = toIndexEntry(e, 'dso_M31.json', 1);
    expect(ix).toMatchObject({
      id: 'dso:M31',
      kind: 'dso',
      hasStory: true,
      hasTradition: false,
      season: 'autumn',
      bestMonths: [9, 10, 11],
      priority: 1,
      reviewCount: 0,
      difficulty: 3,
    });
  });
});
