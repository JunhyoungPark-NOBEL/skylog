import { altAzToScene, unitVectorToRaDec, type Vec3 } from '@/astro/coords';
import { bodyState } from '@/astro/bodies';
import { eqjToAltAzSlow, j2000ToOfDate, type ObserverLike } from '@/astro/frames';
import { resolveTarget } from '@/catalog/objectTarget';
import type { Catalog } from '@/catalog/catalog';
import type { ObjectId } from '@/catalog/objectId';
import type { StarPack } from '@/catalog/starPackFormat';
import type { HopStar } from '@/astro/starHop';
export function guideTarget(cat: Catalog, id: ObjectId, date: Date, observer: ObserverLike) {
  const target = resolveTarget(cat, id, date, observer);
  if (!target) return null;
  const body = target.bodyKey ? bodyState(target.bodyKey, date, observer) : null;
  const aa =
    body ?? eqjToAltAzSlow(date, observer, target.raJ2000Deg, target.decJ2000Deg, 'normal');
  const eq = body ?? j2000ToOfDate(date, target.raJ2000Deg, target.decJ2000Deg);
  return { ...target, ...aa, ...eq, direction: altAzToScene(aa.altDeg, aa.azDeg) };
}
export function hopStars(pack: StarPack): HopStar[] {
  const stars: HopStar[] = [];
  for (let i = 0; i < pack.count; i++) {
    if (pack.mag[i]! > 9) continue;
    const v: Vec3 = [
      pack.positions[i * 3]!,
      pack.positions[i * 3 + 1]!,
      pack.positions[i * 3 + 2]!,
    ];
    const pos = unitVectorToRaDec(v);
    stars.push({
      id: pack.hip[i] ? `star:HIP${pack.hip[i]!}` : `star:HYG${pack.hygId[i]!}`,
      ra: pos.raDeg,
      dec: pos.decDeg,
      mag: pack.mag[i]!,
    });
  }
  return stars;
}
