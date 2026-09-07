/**
 * 학습 데이터 스키마 (task-07 §3.1, D-025). G5 산출물 → `public/data/learn/v1/{paths,missions,badges,quiz}.json`.
 * 빌드 스크립트(`scripts/data/build-learn.ts`)와 앱이 같은 검증을 쓴다. 외부 스키마 라이브러리 없음.
 * 상대 경로 import: tsx 스크립트가 이 파일을 그대로 가져온다.
 */
import { isObjectId, type ObjectId } from '../catalog/objectId';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'any';
export type Level = 'naked' | 'binoculars' | 'telescope';
export interface Text {
  ko: string;
  en?: string;
}

export const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter', 'any'];
export const LEVELS: readonly Level[] = ['naked', 'binoculars', 'telescope'];
export const SKILLS = [
  'arMode',
  'align1',
  'align2',
  'starhop',
  'sketch',
  'fovSetup',
  'backup',
] as const;
export type Skill = (typeof SKILLS)[number];
export const OBSERVE_CATEGORIES = [
  'planet',
  'moon',
  'star',
  'doubleStar',
  'openCluster',
  'globularCluster',
  'nebula',
  'planetaryNebula',
  'galaxy',
  'constellation',
] as const;
export type ObserveCategory = (typeof OBSERVE_CATEGORIES)[number];

export interface LearningPath {
  id: string;
  title: Text;
  description: Text;
  level: Level;
  season?: Season;
  missionIds: string[];
}

export type MissionStep =
  | { type: 'find'; objectId: ObjectId; hint: Text }
  | { type: 'observe'; objectId: ObjectId; minRating?: 1 | 2 | 3 | 4 | 5 }
  | { type: 'observeAny'; category: ObserveCategory; count: number }
  | { type: 'read'; contentId: ObjectId }
  | { type: 'quiz'; quizIds: string[]; passRatio: number }
  | { type: 'skill'; skill: Skill }
  | { type: 'checklist'; items: Text[] };

export interface Mission {
  id: string;
  title: Text;
  description: Text;
  level: Level;
  season?: Season;
  estimatedMinutes: number;
  requires?: { equipment?: Level[]; darkSky?: boolean; prerequisiteMissionIds?: string[] };
  steps: MissionStep[];
  rewardBadgeId?: string;
  contentIds?: ObjectId[];
  /** 빌드가 붙이는 실행 조건(D-025): 앱 기능이 아직 없으면 비활성 */
  enabled?: boolean;
  disabledReason?: string;
}

export type BadgeRule =
  | { key: 'firstObservation' }
  | { key: 'firstSketch' }
  | { key: 'firstStarHop' }
  | { key: 'align2Success' }
  | { key: 'messierCount'; n: number }
  | { key: 'constellationCount'; n: number }
  | { key: 'caldwellCount'; n: number }
  | { key: 'planetsAll' }
  | { key: 'moonPhasesAll' }
  | { key: 'streakNights'; n: number }
  | {
      key: 'seasonSignature';
      id: 'summerTriangle' | 'winterDiamond' | 'springTriangle' | 'autumnSquare';
    }
  | { key: 'missionsCompleted'; n: number }
  | { key: 'quizStreak'; n: number };

export const BADGE_KEYS: readonly BadgeRule['key'][] = [
  'firstObservation',
  'firstSketch',
  'firstStarHop',
  'align2Success',
  'messierCount',
  'constellationCount',
  'caldwellCount',
  'planetsAll',
  'moonPhasesAll',
  'streakNights',
  'seasonSignature',
  'missionsCompleted',
  'quizStreak',
];

export interface Badge {
  id: string;
  title: Text;
  description: Text;
  icon: string;
  rule: BadgeRule;
  enabled?: boolean;
  disabledReason?: string;
}

export type QuizType = 'mc' | 'trueFalse' | 'skyPick';

export interface QuizItem {
  id: string;
  objectId?: ObjectId;
  constellation?: string;
  type: QuizType;
  question: Text;
  choices?: Text[];
  /** mc: choices 인덱스 / trueFalse: boolean / skyPick: ObjectId */
  answer: number | boolean | string;
  explanation: Text;
  difficulty: 1 | 2 | 3;
  tags: string[];
  /** 문항 버전 — 보기 순서를 바꾸면 +1(과거 응답은 그 버전의 보기로 판정, D-025) */
  version?: number;
  enabled?: boolean;
  disabledReason?: string;
}

export interface LearnPack {
  schema: 'skylog-learn';
  version: 1;
  generatedAt: string;
  counts: { paths: number; missions: number; badges: number; quiz: number; skyPick: number };
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const isText = (v: unknown): v is Text => !!v && typeof v === 'object' && isStr((v as Text).ko);
const HAPSYO = /(입니다|습니다|십시오)[.!?]?$/;

export interface LearnData {
  paths: LearningPath[];
  missions: Mission[];
  badges: Badge[];
  quiz: QuizItem[];
}

/** 전체 학습 데이터 교차 검증(참조 무결성 포함). */
export function validateLearnData(
  d: LearnData,
  opts: { knownObjectIds?: ReadonlySet<string>; contentIds?: ReadonlySet<string> } = {},
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missionIds = new Set(d.missions.map((m) => m.id));
  const badgeIds = new Set(d.badges.map((b) => b.id));
  const quizIds = new Set(d.quiz.map((q) => q.id));
  const objOk = (id: string) =>
    isObjectId(id) && (!opts.knownObjectIds || opts.knownObjectIds.has(id));
  const hapsyo = (where: string, text?: Text) => {
    if (text && HAPSYO.test(text.ko.trim())) warnings.push(`합쇼체: ${where}`);
  };

  for (const p of d.paths) {
    if (!isStr(p.id)) errors.push('path id 누락');
    if (!isText(p.title) || !isText(p.description)) errors.push(`path ${p.id}: title/description`);
    if (!LEVELS.includes(p.level)) errors.push(`path ${p.id}: level`);
    if (p.season !== undefined && !SEASONS.includes(p.season)) errors.push(`path ${p.id}: season`);
    if (!Array.isArray(p.missionIds) || p.missionIds.length === 0)
      errors.push(`path ${p.id}: missionIds`);
    else
      for (const m of p.missionIds)
        if (!missionIds.has(m)) errors.push(`path ${p.id}: 없는 미션 ${m}`);
    hapsyo(`path ${p.id} description`, p.description);
  }
  const seenMission = new Set<string>();
  for (const m of d.missions) {
    if (!isStr(m.id)) errors.push('mission id 누락');
    if (seenMission.has(m.id)) errors.push(`mission 중복 id ${m.id}`);
    seenMission.add(m.id);
    if (!isText(m.title) || !isText(m.description))
      errors.push(`mission ${m.id}: title/description`);
    if (!LEVELS.includes(m.level)) errors.push(`mission ${m.id}: level`);
    if (m.season !== undefined && !SEASONS.includes(m.season))
      errors.push(`mission ${m.id}: season`);
    if (!(typeof m.estimatedMinutes === 'number' && m.estimatedMinutes > 0))
      errors.push(`mission ${m.id}: estimatedMinutes`);
    if (m.requires?.equipment)
      for (const e of m.requires.equipment)
        if (!LEVELS.includes(e)) errors.push(`mission ${m.id}: requires.equipment ${e}`);
    if (m.requires?.prerequisiteMissionIds)
      for (const pid of m.requires.prerequisiteMissionIds)
        if (!missionIds.has(pid)) errors.push(`mission ${m.id}: 없는 선행 미션 ${pid}`);
    if (!Array.isArray(m.steps) || m.steps.length === 0)
      errors.push(`mission ${m.id}: steps 비어 있음`);
    else
      m.steps.forEach((s, i) => {
        const w = `mission ${m.id} step[${i}]`;
        switch (s.type) {
          case 'find':
            if (!objOk(s.objectId)) errors.push(`${w}: objectId ${s.objectId}`);
            if (!isText(s.hint)) errors.push(`${w}: hint`);
            hapsyo(`${w} hint`, s.hint);
            break;
          case 'observe':
            if (!objOk(s.objectId)) errors.push(`${w}: objectId ${s.objectId}`);
            break;
          case 'observeAny':
            if (!OBSERVE_CATEGORIES.includes(s.category)) errors.push(`${w}: category`);
            if (!(typeof s.count === 'number' && s.count > 0)) errors.push(`${w}: count`);
            break;
          case 'read':
            if (!isObjectId(s.contentId)) errors.push(`${w}: contentId ${s.contentId}`);
            else if (opts.contentIds && !opts.contentIds.has(s.contentId))
              errors.push(`${w}: 게시되지 않은 콘텐츠 ${s.contentId}`);
            break;
          case 'quiz':
            if (!Array.isArray(s.quizIds) || s.quizIds.length === 0) errors.push(`${w}: quizIds`);
            else
              for (const q of s.quizIds) if (!quizIds.has(q)) errors.push(`${w}: 없는 문항 ${q}`);
            if (!(typeof s.passRatio === 'number' && s.passRatio > 0 && s.passRatio <= 1))
              errors.push(`${w}: passRatio`);
            break;
          case 'skill':
            if (!SKILLS.includes(s.skill)) errors.push(`${w}: skill ${String(s.skill)}`);
            break;
          case 'checklist':
            if (!Array.isArray(s.items) || s.items.length === 0 || !s.items.every(isText))
              errors.push(`${w}: items`);
            else s.items.forEach((it, j) => hapsyo(`${w} item[${j}]`, it));
            break;
          default:
            errors.push(`${w}: 알 수 없는 type ${String((s as { type: string }).type)}`);
        }
      });
    if (m.rewardBadgeId && !badgeIds.has(m.rewardBadgeId))
      errors.push(`mission ${m.id}: 없는 배지 ${m.rewardBadgeId}`);
    if (m.contentIds)
      for (const c of m.contentIds) {
        if (!isObjectId(c)) errors.push(`mission ${m.id}: contentIds ${c}`);
        else if (opts.contentIds && !opts.contentIds.has(c))
          warnings.push(`mission ${m.id}: 콘텐츠 없음 ${c}`);
      }
    hapsyo(`mission ${m.id} description`, m.description);
  }
  for (const b of d.badges) {
    if (!isStr(b.id)) errors.push('badge id 누락');
    if (!isText(b.title) || !isText(b.description)) errors.push(`badge ${b.id}: title/description`);
    if (!isStr(b.icon)) errors.push(`badge ${b.id}: icon`);
    if (!b.rule || !BADGE_KEYS.includes(b.rule.key)) errors.push(`badge ${b.id}: rule.key`);
    else if ('n' in b.rule && !(typeof b.rule.n === 'number' && b.rule.n > 0))
      errors.push(`badge ${b.id}: rule.n`);
    hapsyo(`badge ${b.id} description`, b.description);
  }
  const seenQuiz = new Set<string>();
  for (const q of d.quiz) {
    if (!isStr(q.id)) errors.push('quiz id 누락');
    if (seenQuiz.has(q.id)) errors.push(`quiz 중복 id ${q.id}`);
    seenQuiz.add(q.id);
    if (!['mc', 'trueFalse', 'skyPick'].includes(q.type)) errors.push(`quiz ${q.id}: type`);
    if (!isText(q.question) || !isText(q.explanation))
      errors.push(`quiz ${q.id}: question/explanation`);
    if (![1, 2, 3].includes(q.difficulty)) errors.push(`quiz ${q.id}: difficulty`);
    if (!Array.isArray(q.tags)) errors.push(`quiz ${q.id}: tags`);
    if (q.objectId !== undefined && !objOk(q.objectId))
      errors.push(`quiz ${q.id}: objectId ${q.objectId}`);
    if (q.type === 'mc') {
      if (
        !Array.isArray(q.choices) ||
        q.choices.length < 3 ||
        q.choices.length > 4 ||
        !q.choices.every(isText)
      )
        errors.push(`quiz ${q.id}: mc choices 3~4개`);
      else if (!(
        typeof q.answer === 'number' &&
        Number.isInteger(q.answer) &&
        q.answer >= 0 &&
        q.answer < q.choices.length
      ))
        errors.push(`quiz ${q.id}: mc answer 인덱스`);
      else {
        const texts = q.choices.map((c) => c.ko.trim());
        if (new Set(texts).size !== texts.length) errors.push(`quiz ${q.id}: 보기 중복`);
      }
    } else if (q.type === 'trueFalse') {
      if (typeof q.answer !== 'boolean') errors.push(`quiz ${q.id}: trueFalse answer`);
    } else if (q.type === 'skyPick') {
      if (!(typeof q.answer === 'string' && objOk(q.answer)))
        errors.push(`quiz ${q.id}: skyPick answer ${String(q.answer)}`);
    }
    hapsyo(`quiz ${q.id} explanation`, q.explanation);
  }
  return { errors, warnings };
}
