/**
 * ObjectId (마스터 플랜 §6.1)
 *   star:HIP91262 | star:HYG12345 | dso:M31 | dso:NGC7000 | dso:IC434
 *   planet:mercury … planet:neptune | moon | sun | const:Ori
 */
export const PLANET_KEYS = [
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
] as const;
export type PlanetKey = (typeof PLANET_KEYS)[number];

export type StarId = `star:HIP${number}` | `star:HYG${number}`;
/**
 * DSO id 우선순위 M > NGC > IC (마스터 플랜 §6.1). NGC/IC 번호가 없는 유명 천체
 * (히아데스 C41, 석탄자루 C99, 동굴성운 C9, 말머리 B33 등)는 콜드웰(C) 또는 바너드(B) 번호를 쓴다(D-014).
 */
export type DsoId =
  | `dso:M${number}`
  | `dso:NGC${string}`
  | `dso:IC${string}`
  | `dso:C${number}`
  | `dso:B${number}`
  /** OpenNGC가 다른 카탈로그 이름만 가진 천체(Mel111 머리털자리 성단, Cr399 옷걸이, ESO/PGC/UGC…) — 데이터 팩 v1에 실재(D-020) */
  | `dso:Mel${number}`
  | `dso:Cr${number}`
  | `dso:${'ESO' | 'PGC' | 'UGC' | 'HCG' | 'MWSC' | 'H'}${string}`;
export type PlanetId = `planet:${PlanetKey}`;
export type ConstellationId = `const:${string}`;
export type ObjectId = StarId | DsoId | PlanetId | 'moon' | 'sun' | ConstellationId;

export type ObjectKind = 'star' | 'dso' | 'planet' | 'moon' | 'sun' | 'const';

export function kindOf(id: ObjectId): ObjectKind {
  if (id === 'moon' || id === 'sun') return id;
  const prefix = id.slice(0, id.indexOf(':'));
  return prefix as ObjectKind;
}

const OBJECT_ID_RE =
  /^(star:(HIP|HYG)\d+|dso:(M\d+|NGC[0-9A-Z-]+|IC[0-9A-Z -]+|C\d+|B\d+|Mel\d+|Cr\d+|(ESO|PGC|UGC|HCG|MWSC|H)[0-9A-Z-]+)|planet:(mercury|venus|mars|jupiter|saturn|uranus|neptune)|moon|sun|const:[A-Z][A-Za-z]{2})$/;

export function isObjectId(value: string): value is ObjectId {
  return OBJECT_ID_RE.test(value);
}
