/**
 * 콘텐츠 팩 스키마 (task-06 §3.1, D-024). 빌드 스크립트(`scripts/data/build-content.ts`)와 앱이 같은 검증을 쓴다.
 * 외부 스키마 라이브러리 없이 손으로 검사한다(번들 예산·의존성 최소화).
 * 텍스트는 마크다운이 아니라 평문 + `\n` 문단이다. 뷰어는 HTML을 주입하지 않는다.
 */
// 상대 경로: 빌드 스크립트(tsx)도 이 파일을 그대로 가져오므로 `@/` 별칭을 쓰지 않는다.
import { isObjectId, kindOf, type ObjectId, type ObjectKind } from '../catalog/objectId';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'any';
export const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter', 'any'];
export const CULTURES = ['그리스·로마', '동아시아', '한국', '아랍', '이집트', '기타'] as const;
export type Culture = (typeof CULTURES)[number];
export type Confidence = 'high' | 'medium' | 'low';
export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface ContentFact {
  label: string;
  value: string;
  source?: string;
  /** 원값 검토 중 — 표시할 때 "검토 중" 배지를 붙인다 */
  review?: true;
}

export interface ContentEntry {
  id: ObjectId;
  /** 항목 단위 버전(수정 시 +1). G3 원문 1 → 자연어 재작성 2 */
  version: number;
  title: { ko: string; en: string; alt?: string[] };
  oneLiner: { ko: string; en?: string };
  summary: { ko: string; en?: string };
  facts: ContentFact[];
  story: { ko: string; cultures: string[]; sources: string[] };
  koreanTradition?: { name?: string; asterism?: string; note: string; sources: string[] };
  howToFind: { ko: string; season?: Season; hopFrom?: ObjectId[] };
  observing: {
    nakedEye?: string;
    binoculars?: string;
    telescope?: string;
    bestMonths?: number[];
    difficulty: Difficulty;
  };
  funFacts?: string[];
  safety?: string;
  sources: string[];
  meta: {
    generatedBy: 'gpt-5-pro' | 'claude' | 'human';
    generatedAt: string;
    reviewedBy?: 'claude' | 'human';
    reviewedAt?: string;
    confidence: Confidence;
    needsReview?: string[];
  };
}

/** `index.json` 한 줄 — 검색·오늘의 천체·시트 배지가 쓰는 가벼운 요약 */
export interface ContentIndexEntry {
  id: ObjectId;
  kind: ObjectKind;
  title: { ko: string; en: string };
  oneLiner: string;
  difficulty: Difficulty;
  season?: Season;
  bestMonths?: number[];
  hasStory: boolean;
  hasTradition: boolean;
  version: number;
  confidence: Confidence;
  /** meta.needsReview 개수 */
  reviewCount: number;
  /** content-targets.v1.csv의 우선순위(1이 가장 유명) */
  priority?: 1 | 2 | 3;
  /** 파일명(`content/v1/<file>`) */
  file: string;
}

export interface ContentIndex {
  schema: 'skylog-content-index';
  version: 1;
  generatedAt: string;
  count: number;
  entries: ContentIndexEntry[];
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export const LIMITS = {
  oneLinerMax: 60,
  summaryMin: 120,
  summaryMax: 450,
  storyMin: 200,
  storyMax: 700,
  factsMin: 3,
  factsMax: 8,
  funFactsMax: 3,
} as const;

/** 과장 표현(task-06 §3.4 금칙) — 경고 */
const EXAGGERATION = /틀림없이|반드시 보(여요|입니다)|확실히 보(여요|입니다)|100%/;
/** 프로젝트 내부 말투가 남았는지(D-024 자연어 규칙) — 경고 */
const INTERNAL_TONE = /첨부|원본|검증|게시|승인|보장하지|강제하지|판단하면 안|편집 제안|T0b|G2|G5/;
/** 합쇼체 어미 — 경고(사실표·출처 제외) */
const HAPSYO = /(입니다|습니다|십시오)[.!?]/;

const len = (s: unknown): number => (typeof s === 'string' ? [...s].length : 0);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const isStrArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => isStr(x));

/** 콘텐츠 항목 하나를 검사한다. errors가 비어야 팩에 들어간다. */
export function validateContentEntry(input: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const e = input as Partial<ContentEntry> | null;
  if (!e || typeof e !== 'object') return { errors: ['not an object'], warnings };
  const id = e.id;
  if (!isStr(id) || !isObjectId(id)) errors.push(`id 형식 오류: ${String(id)}`);
  if (typeof e.version !== 'number' || e.version < 1) errors.push('version 누락');
  if (!e.title || !isStr(e.title.ko) || !isStr(e.title.en)) errors.push('title.ko/en 필요');
  if (!e.oneLiner || !isStr(e.oneLiner.ko)) errors.push('oneLiner.ko 필요');
  else if (len(e.oneLiner.ko) > LIMITS.oneLinerMax)
    errors.push(`oneLiner ${len(e.oneLiner.ko)}자 > ${LIMITS.oneLinerMax}`);
  if (!e.summary || !isStr(e.summary.ko)) errors.push('summary.ko 필요');
  else {
    const n = len(e.summary.ko);
    if (n < LIMITS.summaryMin || n > LIMITS.summaryMax)
      errors.push(`summary ${n}자 (허용 ${LIMITS.summaryMin}~${LIMITS.summaryMax})`);
  }
  if (!Array.isArray(e.facts)) errors.push('facts 배열 필요');
  else {
    if (e.facts.length < LIMITS.factsMin || e.facts.length > LIMITS.factsMax)
      errors.push(`facts ${e.facts.length}개 (허용 ${LIMITS.factsMin}~${LIMITS.factsMax})`);
    e.facts.forEach((f, i) => {
      if (!f || !isStr(f.label) || !isStr(f.value)) errors.push(`facts[${i}] label/value 필요`);
    });
  }
  if (!e.story || !isStr(e.story.ko)) errors.push('story.ko 필요');
  else {
    const n = len(e.story.ko);
    if (n < LIMITS.storyMin || n > LIMITS.storyMax)
      errors.push(`story ${n}자 (허용 ${LIMITS.storyMin}~${LIMITS.storyMax})`);
    if (!isStrArray(e.story.cultures) || e.story.cultures.length === 0)
      errors.push('story.cultures 필요');
    else
      for (const c of e.story.cultures)
        if (!(CULTURES as readonly string[]).includes(c))
          errors.push(`story.cultures 값 오류: ${c}`);
    if (!isStrArray(e.story.sources) || e.story.sources.length === 0)
      errors.push('story.sources 필요(출처 없는 이야기 금지)');
  }
  if (e.koreanTradition) {
    if (!isStr(e.koreanTradition.note)) errors.push('koreanTradition.note 필요');
    if (!isStrArray(e.koreanTradition.sources) || e.koreanTradition.sources.length === 0)
      errors.push('koreanTradition.sources 필요');
  }
  if (!e.howToFind || !isStr(e.howToFind.ko)) errors.push('howToFind.ko 필요');
  else {
    if (e.howToFind.season !== undefined && !SEASONS.includes(e.howToFind.season))
      errors.push(`howToFind.season 값 오류: ${String(e.howToFind.season)}`);
    if (e.howToFind.hopFrom !== undefined) {
      if (!Array.isArray(e.howToFind.hopFrom)) errors.push('howToFind.hopFrom 배열 필요');
      else
        for (const h of e.howToFind.hopFrom)
          if (!isStr(h) || !isObjectId(h)) errors.push(`hopFrom id 오류: ${String(h)}`);
    }
  }
  if (!e.observing) errors.push('observing 필요');
  else {
    const d = e.observing.difficulty;
    if (![1, 2, 3, 4, 5].includes(d as number)) errors.push('observing.difficulty 1~5 필요');
    if (e.observing.bestMonths !== undefined) {
      if (
        !Array.isArray(e.observing.bestMonths) ||
        !e.observing.bestMonths.every((m) => Number.isInteger(m) && m >= 1 && m <= 12)
      )
        errors.push('observing.bestMonths는 1~12 정수 배열');
    }
    if (!e.observing.nakedEye && !e.observing.binoculars && !e.observing.telescope)
      errors.push('observing 안내가 하나도 없음');
  }
  if (e.funFacts !== undefined) {
    if (!isStrArray(e.funFacts)) errors.push('funFacts 문자열 배열');
    else if (e.funFacts.length > LIMITS.funFactsMax)
      errors.push(`funFacts ${e.funFacts.length}개 > ${LIMITS.funFactsMax}`);
  }
  if (!isStrArray(e.sources) || e.sources.length === 0) errors.push('sources 필요');
  if (!e.meta) errors.push('meta 필요');
  else {
    if (!['gpt-5-pro', 'claude', 'human'].includes(e.meta.generatedBy))
      errors.push('meta.generatedBy 값 오류');
    if (!['high', 'medium', 'low'].includes(e.meta.confidence))
      errors.push('meta.confidence 값 오류');
    if (e.meta.needsReview !== undefined && !isStrArray(e.meta.needsReview))
      errors.push('meta.needsReview 문자열 배열');
  }
  if (isStr(id) && id === 'sun' && !isStr(e.safety)) errors.push('태양 항목은 safety 문구 필수');
  if (isStr(id) && isObjectId(id) && e.title && isStr(e.title.ko)) {
    // 제목과 id 종류가 어긋나는 흔한 실수: 별자리인데 "자리"가 없음
    if (kindOf(id) === 'const' && !/자리$/.test(e.title.ko))
      warnings.push(`별자리 제목에 "자리"가 없음: ${e.title.ko}`);
  }
  const prose = [
    e.oneLiner?.ko,
    e.summary?.ko,
    e.story?.ko,
    e.howToFind?.ko,
    e.observing?.nakedEye,
    e.observing?.binoculars,
    e.observing?.telescope,
    e.koreanTradition?.note,
    e.safety,
    ...(Array.isArray(e.funFacts) ? e.funFacts : []),
  ]
    .filter(isStr)
    .join('\n');
  const ex = prose.match(EXAGGERATION);
  if (ex) warnings.push(`과장 표현: "${ex[0]}"`);
  const it = prose.match(INTERNAL_TONE);
  if (it) warnings.push(`내부 말투 잔존: "${it[0]}"`);
  const hs = prose.match(HAPSYO);
  if (hs) warnings.push(`합쇼체: "${hs[0]}"`);
  return { errors, warnings };
}

/** 파일명: `dso:M31` → `dso_M31.json` */
export function contentFileName(id: ObjectId): string {
  return `${id.replace(/:/g, '_')}.json`;
}

export function toIndexEntry(
  e: ContentEntry,
  file: string,
  priority?: 1 | 2 | 3,
): ContentIndexEntry {
  const entry: ContentIndexEntry = {
    id: e.id,
    kind: kindOf(e.id),
    title: { ko: e.title.ko, en: e.title.en },
    oneLiner: e.oneLiner.ko,
    difficulty: e.observing.difficulty,
    hasStory: isStr(e.story.ko),
    hasTradition: !!e.koreanTradition,
    version: e.version,
    confidence: e.meta.confidence,
    reviewCount: e.meta.needsReview?.length ?? 0,
    file,
  };
  if (e.howToFind.season) entry.season = e.howToFind.season;
  if (e.observing.bestMonths?.length) entry.bestMonths = e.observing.bestMonths;
  if (priority) entry.priority = priority;
  return entry;
}
