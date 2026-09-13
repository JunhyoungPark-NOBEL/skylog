import { useMemo } from 'react';
import { bodyState } from '@/astro/bodies';
import { angularSeparation } from '@/astro/coords';
import { sunUnsafe, type AlignmentSample } from '@/astro/pointing';
import type { Catalog } from '@/catalog/catalog';
import type { ObjectId } from '@/catalog/objectId';
import { guideTarget } from './skyData';

/** 센서의 매 입력이 아니라 시각·관측지·진도가 달라질 때만 후보를 계산한다. */
export function useCalibrationStars(
  cat: Catalog | null,
  date: Date,
  lat: number,
  lon: number,
  elevation: number,
  samples: AlignmentSample[],
) {
  return useMemo(() => {
    const observer = { lat, lon, elevation };
    if (!cat) return [];
    const ids: ObjectId[] = [...cat.starById.values()].filter((s) => s.mag <= 2.5).map((s) => s.id);
    const solar = bodyState('sun', date, observer);
    return ids
      .map((id) => guideTarget(cat, id, date, observer))
      .filter(
        (s): s is NonNullable<ReturnType<typeof guideTarget>> =>
          s !== null &&
          s.altDeg >= 25 &&
          s.altDeg <= 75 &&
          (samples.length >= 3 ||
            samples.every((sample) => {
              const separation = angularSeparation(sample.direction, s.direction);
              return sample.objectId !== s.id && separation >= 20 && separation <= 150;
            })) &&
          !sunUnsafe(solar.altDeg, solar.azDeg, [s.direction]),
      )
      .sort((a, b) => (a.mag ?? 0) - (b.mag ?? 0))
      .slice(0, 30);
  }, [cat, date, lat, lon, elevation, samples]);
}
