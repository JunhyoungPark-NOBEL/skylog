import { displayName, type Catalog } from '@/catalog/catalog';
import type { ObjectId } from '@/catalog/objectId';
import type { Lang } from '@/app/i18n';
// 설명과 차트가 같은 이름을 쓴다. 낯선 고유명 대신 실제 Bayer/Flamsteed 표기를 함께 보여 준다.
const COURSE_NAMES: Partial<Record<ObjectId, readonly [string, string]>> = {
  'star:HIP81833': ['에타별 · η Her', 'Eta · η Her'],
  'star:HIP81693': ['제타별 · ζ Her', 'Zeta · ζ Her'],
  'star:HIP26241': ['이오타별 · ι Ori', 'Iota · ι Ori'],
  'star:HIP4436': ['뮤별 · μ And', 'Mu · μ And'],
  'star:HIP3881': ['뉴별 · ν And', 'Nu · ν And'],
  'star:HIP98337': ['감마별 · γ Sge', 'Gamma · γ Sge'],
  'star:HIP97365': ['델타별 · δ Sge', 'Delta · δ Sge'],
  'star:HIP93805': ['람다별 · λ Aql', 'Lambda · λ Aql'],
  'star:HIP93429': ['12번 별 · 12 Aql', '12 Aquilae'],
  'star:HIP95501': ['델타별 · δ Aql', 'Delta · δ Aql'],
  'star:HIP92175': ['베타별 · β Sct', 'Beta · β Sct'],
  'star:HIP3092': ['델타별 · δ And', 'Delta · δ And'],
};
export function hopName(cat: Catalog, id: ObjectId, lang: Lang): string {
  return COURSE_NAMES[id]?.[lang === 'ko' ? 0 : 1] ?? displayName(cat, id, lang);
}
