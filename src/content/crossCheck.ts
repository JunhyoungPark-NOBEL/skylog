/** 카탈로그와 이야기의 수치를 대조한다. 불일치는 검토 메모로 남긴다. */
import type { ContentEntry } from './schema';

export interface NamedStar {
  id: string;
  mag?: number;
  distLy?: number;
  spect?: string;
}
export interface Dso {
  id: string;
  mag?: number;
  distLy?: number;
  majArcmin?: number;
}

/** "3.44등급" → 3.44, "약 250만 광년" → 2_500_000, "177.83′ × 69.66′" → 177.83 */
function firstNumber(s: string): number | null {
  const m = s.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  let v = Number(m[0]);
  if (/만\s*광년|만 광년|만광년/.test(s)) v *= 10_000;
  return v;
}

interface Cross {
  warnings: string[];
}

export function crossCheck(
  e: ContentEntry,
  stars: Map<string, NamedStar>,
  dso: Map<string, Dso>,
): Cross {
  const warnings: string[] = [];
  const star = stars.get(e.id);
  const d = dso.get(e.id);
  for (const f of e.facts) {
    const v = firstNumber(f.value);
    if (/등급/.test(f.label) && v !== null) {
      const ref = star?.mag ?? d?.mag;
      if (ref !== undefined && Math.abs(ref - v) > 0.3)
        warnings.push(`등급 ${v} vs 카탈로그 ${ref} (차 ${(v - ref).toFixed(2)})`);
    } else if (/거리/.test(f.label) && v !== null && /광년/.test(f.value)) {
      const ref = star?.distLy ?? d?.distLy;
      const tol = star ? 0.3 : 0.4;
      if (ref !== undefined && ref > 0 && Math.abs(v - ref) / ref > tol)
        warnings.push(
          `거리 ${v}광년 vs 카탈로그 ${ref}광년 (${((v / ref - 1) * 100).toFixed(0)}%)`,
        );
    } else if (/분광형/.test(f.label) && star?.spect) {
      const a = f.value.trim().slice(0, 2).toUpperCase();
      const b = star.spect.trim().slice(0, 2).toUpperCase();
      if (a && b && a !== b) warnings.push(`분광형 ${f.value} vs 카탈로그 ${star.spect}`);
    } else if (/각크기|크기/.test(f.label) && v !== null && d?.majArcmin) {
      if (Math.abs(v - d.majArcmin) / d.majArcmin > 0.3)
        warnings.push(`각크기 ${v}′ vs 카탈로그 ${d.majArcmin}′`);
    }
  }
  return { warnings };
}
