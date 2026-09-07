/**
 * `pnpm data:content` — data-src/content-raw/G3-natural/*.json(자연어 재작성본, D-024) →
 * public/data/content/v1/<id>.json + index.json. 검증 실패 항목은 팩에서 뺀다.
 *
 * 표시 정책(D-024): facts 중 "검토 보류" 값·"목록 식별자"는 뺀다. 라벨의 "(첨부…)" 꼬리표는 떼고,
 * 대역/판본 미확인이 붙었던 수치는 `review: true`로 표시한다(뷰어가 "검토 중" 배지).
 * 수치 대조(task-06 §3.4): 등급 ±0.3, 거리 별 ±30%·DSO ±40%, 각크기 ±30%, 분광형 앞 두 글자 — 어긋나면 경고 + needsReview.
 * 리뷰 로그: data-src/content-raw/review-log.md
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  contentFileName,
  toIndexEntry,
  validateContentEntry,
  type ContentEntry,
  type ContentFact,
  type ContentIndex,
  type ContentIndexEntry,
} from '../../src/content/schema.ts';
import { CONTENT_RAW_DIR, CURATED_DIR, OUT_DIR, fail, log, readCsv } from './lib.ts';

import { crossCheck, type NamedStar, type Dso } from '../../src/content/crossCheck.ts';

const NATURAL_DIR = path.join(CONTENT_RAW_DIR, 'G3-natural');
const ORIGINAL_DIR = path.join(CONTENT_RAW_DIR, 'G3-original');
const CONTENT_OUT = path.join(OUT_DIR, 'content', 'v1');
const REVIEW_LOG = path.join(CONTENT_RAW_DIR, 'review-log.md');

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

/** 값 자체가 보류/미확정인 사실 — 표에서 뺀다 */
const HOLD = /검토 보류|미확정|미확인|값 없음/;
/** "약 2,500만 광년 — 첨부 빈칸; 해당 출처의 추정" 같은 외부 소개값: 값만 남기고 검토 배지 */
const EXTERNAL_TAIL = /\s*[—–-]\s*첨부 빈칸.*$/;
const LABEL_TAIL =
  /\s*\((첨부[^)]*|목록 기준[^)]*|외부 소개값[^)]*|[^)]*미확인[^)]*|[^)]*판본[^)]*)\)\s*/g;

/** 표시용 facts 정리. 뺀 항목은 notes에 기록. */
function cleanFacts(facts: ContentFact[], notes: string[]): ContentFact[] {
  const out: ContentFact[] = [];
  for (const f of facts) {
    if (f.label === '목록 식별자') continue;
    if (HOLD.test(f.value)) {
      notes.push(`facts 제외(검토 보류): ${f.label} = ${f.value}`);
      continue;
    }
    let value = f.value;
    let review = /미확인|판본|대역|외부 소개값/.test(f.label);
    if (EXTERNAL_TAIL.test(value)) {
      value = value.replace(EXTERNAL_TAIL, '').trim();
      review = true;
      notes.push(`facts 외부 소개값(검토 배지): ${f.label} = ${value}`);
    }
    const label = f.label.replace(LABEL_TAIL, '').trim();
    const g: ContentFact = { label, value };
    if (f.source) g.source = f.source;
    if (review) g.review = true;
    out.push(g);
  }
  return out;
}

/** 내부 입력 파일을 가리키는 출처 문자열을 사용자용 표기로 바꾸고 중복을 없앤다 */
function cleanSources(sources: string[]): string[] {
  const out: string[] = [];
  for (const s of sources) {
    let v = s;
    if (/^첨부 catalog-values/.test(s)) v = 'skylog 카탈로그 값 (HYG v4.4 · OpenNGC)';
    else if (/^첨부 G2/.test(s)) v = '한국천문학회 별자리·별 이름 표 (G2)';
    else if (/^첨부/.test(s)) v = 'skylog 카탈로그 값';
    if (!out.includes(v)) out.push(v);
  }
  return out;
}

function main(): void {
  if (!existsSync(NATURAL_DIR)) fail(`없음: ${NATURAL_DIR}`);
  mkdirSync(CONTENT_OUT, { recursive: true });
  const stars = new Map<string, NamedStar>();
  for (const s of readJson<NamedStar[]>(path.join(OUT_DIR, 'stars-bright.v1.json')))
    stars.set(s.id, s);
  const dso = new Map<string, Dso>();
  for (const x of readJson<Dso[]>(path.join(OUT_DIR, 'dso.v1.json'))) dso.set(x.id, x);
  const priority = new Map<string, 1 | 2 | 3>();
  const targetsCsv = path.join(CURATED_DIR, 'content-targets.v1.csv');
  if (existsSync(targetsCsv))
    for (const r of readCsv(targetsCsv)) priority.set(r['id']!, Number(r['priority']) as 1 | 2 | 3);

  const files = readdirSync(NATURAL_DIR)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .sort();
  const originals = existsSync(ORIGINAL_DIR)
    ? readdirSync(ORIGINAL_DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    : [];
  const missing = originals.filter((f) => !files.includes(f));
  const entries: ContentIndexEntry[] = [];
  const logLines: string[] = [];
  let excluded = 0;
  let warned = 0;
  let reviewTotal = 0;
  for (const f of files) {
    const raw = readJson<ContentEntry>(path.join(NATURAL_DIR, f));
    const notes: string[] = [];
    const entry: ContentEntry = {
      ...raw,
      facts: cleanFacts(raw.facts ?? [], notes).map((f) =>
        f.source ? { ...f, source: cleanSources([f.source])[0] } : f,
      ),
      sources: cleanSources(raw.sources ?? []),
      story: { ...raw.story, sources: cleanSources(raw.story?.sources ?? []) },
      ...(raw.koreanTradition
        ? {
            koreanTradition: {
              ...raw.koreanTradition,
              sources: cleanSources(raw.koreanTradition.sources ?? []),
            },
          }
        : {}),
    };
    const { errors, warnings } = validateContentEntry(entry);
    if (errors.length) {
      excluded++;
      logLines.push(`- ❌ ${raw.id}: ${errors.join(' · ')}`);
      continue;
    }
    const cross = crossCheck(entry, stars, dso);
    const allWarnings = [...warnings, ...cross.warnings];
    if (allWarnings.length) warned++;
    const needsReview = [...(entry.meta.needsReview ?? [])];
    for (const w of cross.warnings)
      if (!needsReview.some((n) => n.includes(w))) needsReview.push(`빌드 대조: ${w}`);
    if (needsReview.length) entry.meta = { ...entry.meta, needsReview };
    else delete entry.meta.needsReview;
    reviewTotal += needsReview.length;
    const file = contentFileName(entry.id);
    writeFileSync(path.join(CONTENT_OUT, file), JSON.stringify(entry, null, 0) + '\n');
    entries.push(toIndexEntry(entry, file, priority.get(entry.id)));
    if (allWarnings.length || notes.length)
      logLines.push(`- ${raw.id}: ${[...allWarnings.map((w) => `⚠ ${w}`), ...notes].join(' · ')}`);
  }
  entries.sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9) || a.id.localeCompare(b.id));
  const index: ContentIndex = {
    schema: 'skylog-content-index',
    version: 1,
    generatedAt: new Date().toISOString(),
    count: entries.length,
    entries,
  };
  writeFileSync(path.join(CONTENT_OUT, 'index.json'), JSON.stringify(index) + '\n');
  // 이전 빌드에서 남은 파일 정리
  const keep = new Set([...entries.map((e) => e.file), 'index.json']);
  for (const f of readdirSync(CONTENT_OUT))
    if (!keep.has(f)) {
      // 남은 파일은 지운다(팩은 빌드 산출물)
      writeFileSync(path.join(CONTENT_OUT, f), '');
    }
  const md = [
    '# 콘텐츠 팩 빌드 리뷰 로그',
    '',
    `생성: ${index.generatedAt} · 포함 ${entries.length} · 제외 ${excluded} · 경고 있는 항목 ${warned} · needsReview 총 ${reviewTotal}`,
    missing.length ? `\n누락(자연어 재작성본 없음): ${missing.join(', ')}` : '',
    '',
    '## 항목별',
    ...logLines,
    '',
  ].join('\n');
  writeFileSync(REVIEW_LOG, md);
  log(
    `content/v1: ${entries.length}개 포함, ${excluded}개 제외, 경고 ${warned}개, 누락 ${missing.length}개 → ${REVIEW_LOG}`,
  );
  if (excluded > 0) process.exitCode = 1;
}

main();
