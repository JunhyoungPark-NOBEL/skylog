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
export type DsoId = `dso:M${number}` | `dso:NGC${string}` | `dso:IC${string}`;
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
  /^(star:(HIP|HYG)\d+|dso:(M\d+|NGC[0-9A-Z-]+|IC[0-9A-Z-]+)|planet:(mercury|venus|mars|jupiter|saturn|uranus|neptune)|moon|sun|const:[A-Z][A-Za-z]{2})$/;

export function isObjectId(value: string): value is ObjectId {
  return OBJECT_ID_RE.test(value);
}
