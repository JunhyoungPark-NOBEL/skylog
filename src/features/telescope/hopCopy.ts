import type { Lang } from '@/app/i18n';
/** 실제 원형 시야의 지름 기준 거리. '시야 0.2개' 같은 개수 표현을 피한다. */
export function hopFieldHint(fields: number, lang: Lang): string {
  if (!Number.isFinite(fields) || fields <= 0) return '';
  if (fields < 0.95) {
    const percent = Math.max(1, Math.round(fields * 100));
    return lang === 'ko'
      ? `보이는 원 너비의 약 ${percent}%만큼 이동해요.`
      : `Move about ${percent}% of the field’s width.`;
  }
  if (fields <= 1.05)
    return lang === 'ko' ? '보이는 원의 너비만큼 이동해요.' : 'Move about one field width.';
  const width = Number(fields.toFixed(1));
  return lang === 'ko'
    ? `보이는 원 너비의 약 ${width}배 거리예요. 조금씩 겹쳐 움직여요.`
    : `About ${width} field widths. Move in small, overlapping steps.`;
}
