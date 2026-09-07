/**
 * `pnpm data:learn [--original]` — data-src/learn-raw/G5-natural/{paths,missions,badges,quiz-part1,quiz-part2}.json
 * (자연어 재작성본, D-025) → public/data/learn/v1/{paths,missions,badges,quiz,manifest}.json
 *
 * 1) 원본(G5-original)과 구조 대조: 산문 외 필드(id·level·season·steps의 type/objectId/quizIds/answer·rule…)가
 *    바이트 단위로 같아야 한다. 다르면 실패.
 * 2) `validateLearnData`(스키마·참조 무결성·카탈로그 id·게시된 콘텐츠 id).
 * 3) 실행 정책(D-025·D-029): skyPick 36문항은 전천 검증 전 비활성. T5 실제 이벤트 연결 후 미션 30/배지 18 활성.
 *    G5 구조 대조 뒤 별도 observing-quiz.json(한·영 60문항)을 병합한다. 문항 version=1.
 * 4) 리뷰 로그: data-src/learn-raw/review-log.md
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  validateLearnData,
  type Badge,
  type LearnData,
  type LearningPath,
  type Mission,
  type QuizItem,
} from '../../src/learn/schema.ts';
import { OUT_DIR, ROOT, fail, log } from './lib.ts';

const LEARN_RAW = path.join(ROOT, 'data-src', 'learn-raw');
const useOriginal = process.argv.includes('--original');
const IN = path.join(LEARN_RAW, useOriginal ? 'G5-original' : 'G5-natural');
const ORIG = path.join(LEARN_RAW, 'G5-original');
const LEARN_OUT = path.join(OUT_DIR, 'learn', 'v1');
const REVIEW_LOG = path.join(LEARN_RAW, 'review-log.md');

/** 앱에 이미 있는 기능(스킬). 없는 것은 미션 비활성. */
const AVAILABLE_SKILLS = new Set([
  'arMode',
  'sketch',
  'backup',
  'align1',
  'align2',
  'starhop',
  'fovSetup',
]);
const SKILL_REASON: Record<string, string> = {
  align1: '망원경의 별 정렬은 망원경 가이드에서 열려요. 현재 휴대전화 방향 보정과는 별도예요.',
  fovSetup: '망원경·쌍안경 시야원 설정은 다음 업데이트(망원경 가이드)에서 열려요.',
  starhop: '스타 호핑 안내는 다음 업데이트(망원경 가이드)에서 열려요.',
  align2: '2별 정렬은 다음 업데이트(망원경 가이드)에서 열려요.',
};
const SKYPICK_REASON = '하늘에서 직접 고르는 문제는 화면 검증이 끝나면 열려요.';

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

/** 산문 키를 지운 뒤 비교용 문자열 */
const PROSE_KEYS = new Set(['ko', 'en']);
function skeleton(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(skeleton);
  if (v && typeof v === 'object') {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (PROSE_KEYS.has(k) && typeof x === 'string') continue;
      o[k] = skeleton(x);
    }
    return o;
  }
  return v;
}

function loadSet(dir: string): LearnData {
  const quiz = existsSync(path.join(dir, 'quiz-part1.json'))
    ? [
        ...readJson<QuizItem[]>(path.join(dir, 'quiz-part1.json')),
        ...readJson<QuizItem[]>(path.join(dir, 'quiz-part2.json')),
      ]
    : readJson<QuizItem[]>(path.join(dir, 'quiz.json'));
  return {
    paths: readJson<LearningPath[]>(path.join(dir, 'paths.json')),
    missions: readJson<Mission[]>(path.join(dir, 'missions.json')),
    badges: readJson<Badge[]>(path.join(dir, 'badges.json')),
    quiz,
  };
}

function knownObjectIds(): Set<string> {
  const ids = new Set<string>(['sun', 'moon']);
  for (const k of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'])
    ids.add(`planet:${k}`);
  for (const s of readJson<{ id: string }[]>(path.join(OUT_DIR, 'stars-bright.v1.json')))
    ids.add(s.id);
  for (const d of readJson<{ id: string }[]>(path.join(OUT_DIR, 'dso.v1.json'))) ids.add(d.id);
  for (const abbr of Object.keys(
    readJson<Record<string, unknown>>(path.join(OUT_DIR, 'constellations.v1.json')),
  ))
    ids.add(`const:${abbr}`);
  return ids;
}

function contentIds(): Set<string> | undefined {
  const idx = path.join(OUT_DIR, 'content', 'v1', 'index.json');
  if (!existsSync(idx)) return undefined;
  return new Set(readJson<{ entries: { id: string }[] }>(idx).entries.map((e) => e.id));
}

function main(): void {
  if (!existsSync(IN)) fail(`없음: ${IN}`);
  const data = loadSet(IN);
  const lines: string[] = [];

  // 1) 구조 대조
  if (!useOriginal && existsSync(ORIG)) {
    const orig = loadSet(ORIG);
    const pairs: [string, unknown, unknown][] = [
      ['paths', orig.paths, data.paths],
      ['missions', orig.missions, data.missions],
      ['badges', orig.badges, data.badges],
      ['quiz', orig.quiz, data.quiz],
    ];
    for (const [name, a, b] of pairs) {
      const sa = JSON.stringify(skeleton(a));
      const sb = JSON.stringify(skeleton(b));
      if (sa !== sb) {
        // 어느 항목이 다른지 찾아 준다
        const la = a as { id: string }[];
        const lb = b as { id: string }[];
        const bad = la
          .map(
            (x, i) =>
              [x.id, JSON.stringify(skeleton(x)) !== JSON.stringify(skeleton(lb[i]))] as const,
          )
          .filter(([, d]) => d)
          .map(([id]) => id);
        fail(`${name}: 산문 외 필드가 원본과 다릅니다 → ${bad.join(', ') || '(개수 차이)'}`);
      }
    }
    lines.push('- 구조 대조: 원본과 동일(산문 외 필드)');
  }

  // 3) 정책
  const missions = data.missions.map((m) => {
    const missing = m.steps
      .filter((s) => s.type === 'skill')
      .map((s) => (s as { skill: string }).skill)
      .filter((k) => !AVAILABLE_SKILLS.has(k));
    if (missing.length) {
      lines.push(`- 미션 비활성: ${m.id} (${missing.join(', ')})`);
      return {
        ...m,
        enabled: false,
        disabledReason: SKILL_REASON[missing[0]!] ?? missing.join(', '),
      };
    }
    return { ...m, enabled: true };
  });
  const badges = data.badges.map((b) => ({ ...b, enabled: true }));
  const quiz = data.quiz.map((q) =>
    q.type === 'skyPick'
      ? { ...q, version: 1, enabled: false, disabledReason: SKYPICK_REASON }
      : { ...q, version: 1, enabled: true },
  );
  const additional = readJson<QuizItem[]>(path.join(LEARN_RAW, 'observing-quiz.json'));
  const final: LearnData = { paths: data.paths, missions, badges, quiz: [...quiz, ...additional] };

  // 2) 검증
  const { errors, warnings } = validateLearnData(final, {
    knownObjectIds: knownObjectIds(),
    contentIds: contentIds(),
  });
  for (const w of warnings) lines.push(`- ⚠ ${w}`);
  if (errors.length) {
    for (const e of errors) lines.push(`- ❌ ${e}`);
    writeFileSync(REVIEW_LOG, `# 학습 팩 빌드 리뷰 로그\n\n${lines.join('\n')}\n`);
    fail(`학습 데이터 검증 실패 ${errors.length}건 → ${REVIEW_LOG}`);
  }

  mkdirSync(LEARN_OUT, { recursive: true });
  const write = (name: string, v: unknown) =>
    writeFileSync(path.join(LEARN_OUT, name), JSON.stringify(v) + '\n');
  write('paths.json', final.paths);
  write('missions.json', final.missions);
  write('badges.json', final.badges);
  write('quiz.json', final.quiz);
  const skyPick = final.quiz.filter((q) => q.type === 'skyPick').length;
  write('manifest.json', {
    schema: 'skylog-learn',
    version: 1,
    generatedAt: new Date().toISOString(),
    counts: {
      paths: final.paths.length,
      missions: final.missions.length,
      badges: final.badges.length,
      quiz: final.quiz.length,
      skyPick,
    },
    disabled: {
      missions: final.missions.filter((m) => m.enabled === false).map((m) => m.id),
      badges: final.badges.filter((b) => b.enabled === false).map((b) => b.id),
      quiz: final.quiz.filter((q) => q.enabled === false).length,
    },
  });
  writeFileSync(
    REVIEW_LOG,
    `# 학습 팩 빌드 리뷰 로그\n\n입력: ${IN} + observing-quiz.json(독자 작성 60문항, docs/OBSERVING-CONTENT.md)\n생성: ${new Date().toISOString()} · 경로 ${final.paths.length} · 미션 ${final.missions.length} · 배지 ${final.badges.length} · 문항 ${final.quiz.length}(하늘 선택 ${skyPick}, 비활성)\n\n${lines.join('\n')}\n`,
  );
  log(
    `learn/v1: 경로 ${final.paths.length} · 미션 ${final.missions.length}(비활성 ${final.missions.filter((m) => !m.enabled).length}) · 배지 ${final.badges.length} · 문항 ${final.quiz.length} · 경고 ${warnings.length} → ${REVIEW_LOG}`,
  );
}

main();
