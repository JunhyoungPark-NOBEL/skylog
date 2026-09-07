/** 유성우 목록(`meteors.v1.json`, IMO 달력 기반 큐레이션). 로더 + 타입. */
import { dataUrl } from '@/catalog/manifest';

export interface MeteorShower {
  id: string;
  names: { ko: string; en: string };
  /** "MM-DD" */
  activeFrom: string;
  activeTo: string;
  peak: string;
  zhr: number;
  radiant: { ra: number; dec: number };
  velocityKms: number;
  parentBody?: string;
  note?: string;
}

let promise: Promise<MeteorShower[]> | null = null;

export function loadMeteors(): Promise<MeteorShower[]> {
  if (!promise) {
    promise = fetch(dataUrl('meteors.v1.json'))
      .then(async (res) => {
        if (!res.ok) throw new Error(`meteors HTTP ${res.status}`);
        return (await res.json()) as MeteorShower[];
      })
      .catch((err: unknown) => {
        promise = null;
        throw err;
      });
  }
  return promise;
}

/** "MM-DD"가 [from, to] 활동 기간 안인가(연말·연초를 넘는 기간 포함) */
export function isActiveOn(shower: MeteorShower, monthDay: string): boolean {
  const a = shower.activeFrom;
  const b = shower.activeTo;
  return a <= b ? monthDay >= a && monthDay <= b : monthDay >= a || monthDay <= b;
}
