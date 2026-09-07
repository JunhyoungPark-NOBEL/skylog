/**
 * 검색 정규화 — 빌드(`scripts/data/build-search-index.ts`)와 클라이언트(`catalog/searchIndex.ts`)가 **같은 함수**를 쓴다.
 * 규칙(docs/ARCHITECTURE.md): NFC → 소문자 → 공백·하이픈·점·따옴표·가운뎃점 제거 → 괄호 제거.
 * 그리스 문자(α)는 빌드 시 라틴 표기(alpha/alp)도 함께 별칭으로 넣어 두므로 여기서는 바꾸지 않는다.
 */
export function normalizeAlias(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\s\-_.'’·]/g, '')
    .replace(/[()]/g, '');
}

const CHOSEONG = [
  'ㄱ',
  'ㄲ',
  'ㄴ',
  'ㄷ',
  'ㄸ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅃ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅉ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
] as const;
const CHOSEONG_SET = new Set<string>(CHOSEONG);

/** 한글 음절을 초성으로 바꾼다(그 외 문자는 그대로). "직녀성" → "ㅈㄴㅅ" */
export function toChoseong(s: string): string {
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (code >= 0xac00 && code <= 0xd7a3) out += CHOSEONG[Math.floor((code - 0xac00) / 588)]!;
    else out += ch;
  }
  return out;
}

/** 질의가 초성만으로 이루어졌는가("ㅈㄴㅅ") */
export function isChoseongQuery(s: string): boolean {
  if (!s) return false;
  for (const ch of s) if (!CHOSEONG_SET.has(ch)) return false;
  return true;
}

/** 한글 음절이 하나라도 있는가 */
export function hasHangul(s: string): boolean {
  return /[가-힣]/.test(s);
}
