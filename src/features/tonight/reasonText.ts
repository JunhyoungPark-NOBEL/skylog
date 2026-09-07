/**
 * 추천 이유(ReasonPart[]) → 짧은 문장. 값은 전부 계산 결과에서 온다(추측 문구 없음).
 * 순서(엔진이 정함): 위치 → (짐|뜸|최고) → 달 → 30° 이상 → (이벤트|이중성|계절) → 범위 → 판정. 최대 4개.
 */
import type { TFunction } from 'i18next';
import type { Lang } from '@/app/i18n';
import type { ReasonPart } from '@/astro/recommend';
import { SEASON_SIGNATURES } from '@/catalog/recommendCandidates';
import { compass16, formatDuration, formatTime } from '@/ui/format';

export function reasonSentence(parts: ReasonPart[], lang: Lang, t: TFunction, max = 4): string {
  const out: string[] = [];
  for (const p of parts) {
    switch (p.type) {
      case 'position':
        out.push(
          p.when === 'now'
            ? t('recommend.reason.now', {
                dir: compass16(p.azDeg, lang),
                alt: Math.round(p.altDeg),
              })
            : t('recommend.reason.peakDir', {
                dir: compass16(p.azDeg, lang),
                alt: Math.round(p.altDeg),
                time: p.at ? formatTime(p.at) : '',
              }),
        );
        break;
      case 'peak':
        out.push(
          t('recommend.reason.peakAt', { time: formatTime(p.at), alt: Math.round(p.altDeg) }),
        );
        break;
      case 'moonSep':
        out.push(t('recommend.reason.moonSep', { deg: Math.round(p.deg) }));
        break;
      case 'moonClose':
        out.push(
          t('recommend.reason.moonClose', {
            deg: Math.round(p.deg),
            illum: Math.round(p.illumination * 100),
          }),
        );
        break;
      case 'moonDown':
        out.push(t('recommend.reason.moonDown'));
        break;
      case 'above30':
        out.push(t('recommend.reason.above30', { dur: formatDuration(p.minutes, lang) }));
        break;
      case 'setsAt':
        out.push(t('recommend.reason.setsAt', { time: formatTime(p.at), alt: p.minAltDeg }));
        break;
      case 'risesAt':
        out.push(
          t('recommend.reason.risesAt', { time: formatTime(p.at), dir: compass16(p.azDeg, lang) }),
        );
        break;
      case 'event':
        out.push(t(`recommend.reason.event.${p.kind}`));
        break;
      case 'double':
        out.push(
          t('recommend.reason.double', {
            sep:
              p.sepArcsec >= 60
                ? `${(p.sepArcsec / 60).toFixed(1)}′`
                : `${p.sepArcsec.toFixed(1)}″`,
            equipment: t(`object.equipment.${p.splitWith}`),
          }),
        );
        break;
      case 'season': {
        const s = SEASON_SIGNATURES.find((x) => x.id === p.id);
        if (s) out.push(lang === 'ko' ? s.ko : s.en);
        break;
      }
      case 'siteClipped':
        out.push(t('recommend.reason.siteClipped'));
        break;
      case 'verdict':
      case 'fresh':
        break;
    }
    if (out.length >= max) break;
  }
  return out.join(' · ');
}
