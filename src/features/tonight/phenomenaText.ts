/** 천문 현상 제목·날짜 포맷(카드 공용, 컴포넌트 파일과 분리해 Fast Refresh 경고를 피한다) */
import type { Lang } from '@/app/i18n';
import type { Phenomenon } from '@/astro/phenomena';
import { displayName, type Catalog } from '@/catalog/catalog';
import type { MeteorShower } from '@/catalog/meteors';

export type Translate = (key: string, opts?: Record<string, unknown>) => string;

export function formatDateShort(d: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'ko' ? 'ko-KR' : 'en-US', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
  }).format(d);
}

export function showerName(id: string | undefined, showers: MeteorShower[], lang: Lang): string {
  const s = showers.find((x) => x.id === id);
  return s ? (lang === 'ko' ? s.names.ko : s.names.en) : (id ?? '');
}

export function phenomenonTitle(
  p: Phenomenon,
  cat: Catalog,
  lang: Lang,
  t: Translate,
  showers: MeteorShower[] = [],
): string {
  const name = p.objectId ? displayName(cat, p.objectId, lang) : '';
  switch (p.kind) {
    case 'opposition':
      return t('phenomena.opposition', { name });
    case 'conjunction':
      return t('phenomena.conjunction', { name });
    case 'inferiorConjunction':
      return t('phenomena.inferiorConjunction', { name });
    case 'superiorConjunction':
      return t('phenomena.superiorConjunction', { name });
    case 'maxElongation':
      return t(`phenomena.maxElongation.${p.visibility ?? 'evening'}`, {
        name,
        deg: Math.round(p.elongationDeg ?? 0),
      });
    case 'moonQuarter':
      return t(`phenomena.quarter.${p.quarter ?? 0}`);
    case 'lunarEclipse':
      return t('phenomena.lunarEclipse', { kind: t(`phenomena.eclipseKind.${p.eclipseKind ?? 'partial'}`) });
    case 'solarEclipse':
      return t('phenomena.solarEclipse', { kind: t(`phenomena.eclipseKind.${p.eclipseKind ?? 'partial'}`) });
    case 'perigeeFullMoon':
      return t('phenomena.perigeeFullMoon');
    case 'greatestBrilliancy':
      return t('phenomena.greatestBrilliancy');
    case 'meteorPeak':
      return t('phenomena.meteorPeak', { name: showerName(p.meteor?.id, showers, lang) });
    default:
      return '';
  }
}
