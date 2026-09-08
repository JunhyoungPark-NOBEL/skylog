import type { ObjectId } from '@/catalog/objectId';
import type { LearnSnapshot } from './engine';

export interface HopCourse {
  id: string;
  target: ObjectId;
  points: readonly ObjectId[];
  level: 1 | 2 | 3;
  title: { ko: string; en: string };
  description: { ko: string; en: string };
  tip: { ko: string; en: string };
  source: string;
}

/** 경로 설명만 참고하고 위치·차트는 자체 HYG/DSO 카탈로그로 계산한다. */
export const HOP_COURSES: readonly HopCourse[] = [
  {
    id: 'orion-sword',
    target: 'dso:M42',
    points: ['star:HIP26727', 'star:HIP26241', 'dso:M42'],
    level: 1,
    title: { ko: '오리온의 허리띠에서 성운까지', en: 'From Orion’s belt to the nebula' },
    description: {
      ko: '허리띠 끝의 알니타크에서 검 쪽으로 내려가 보세요. 검 끝의 이오타별을 찾은 뒤, 바로 위에 퍼진 오리온성운을 살펴봐요.',
      en: 'Start at Alnitak at the end of Orion’s belt. Follow the sword to Iota Orionis, then look just above it for the Orion Nebula.',
    },
    tip: {
      ko: '먼저 쌍안경이나 파인더로 검 전체를 찾아요. 성운은 사진처럼 선명한 색보다 옅은 구름처럼 보일 수 있어요.',
      en: 'Find the whole sword with binoculars or a finder first. The nebula may look like a faint cloud rather than the vivid colours in photographs.',
    },
    source:
      'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-42/',
  },
  {
    id: 'andromeda-chain',
    target: 'dso:M31',
    points: ['star:HIP5447', 'star:HIP4436', 'star:HIP3881', 'dso:M31'],
    level: 1,
    title: { ko: '미라크에서 안드로메다은하로', en: 'Mirach to the Andromeda Galaxy' },
    description: {
      ko: '밝은 미라크에서 안드로메다자리 뮤별, 뉴별을 차례로 이어요. 뉴별 가까이에서 길쭉하고 흐릿한 빛을 찾아보세요.',
      en: 'Trace Mirach through Mu and Nu Andromedae. Near Nu, look for a faint, elongated glow.',
    },
    tip: {
      ko: '넓은 시야와 어두운 하늘이 유리해요. 도심에서는 밝은 중심부만 보일 수 있어요.',
      en: 'A wide field and dark sky help. Under city lights, only the bright core may be visible.',
    },
    source: 'https://www.skyledge.net/Messier31-hop.htm',
  },
  {
    id: 'hercules-keystone',
    target: 'dso:M13',
    points: ['star:HIP81833', 'dso:M13'],
    level: 2,
    title: { ko: '허큘리스 사각형 속 별무리', en: 'A star cluster in Hercules’ Keystone' },
    description: {
      ko: '허큘리스자리의 사다리꼴을 찾고, 서쪽 변의 에타별에서 제타별 쪽으로 약 3분의 1만큼 이동해요. 작은 솜뭉치 같은 M13이 기다려요.',
      en: 'Find Hercules’ Keystone. Move about one third of the way from Eta toward Zeta along its western side to find the fuzzy globular cluster M13.',
    },
    tip: {
      ko: '낮은 배율로 먼저 찾은 다음 천천히 배율을 높여요. 주변의 별이 성단과 구별되는지 살펴보세요.',
      en: 'Locate it at low power, then increase magnification gradually. Compare the cluster with the surrounding stars.',
    },
    source: 'https://www.skyledge.net/Messier13-hop.htm',
  },
  {
    id: 'lyra-ring',
    target: 'dso:M57',
    points: ['star:HIP92420', 'dso:M57'],
    level: 3,
    title: { ko: '거문고자리의 작은 고리', en: 'Lyra’s tiny ring' },
    description: {
      ko: '거문고자리의 셸리아크와 술라파트를 찾아요. 셸리아크에서 술라파트 쪽으로 약 3분의 1 지점에 작은 고리성운이 있어요.',
      en: 'Find Sheliak and Sulafat in Lyra. About one third of the way from Sheliak toward Sulafat lies the tiny Ring Nebula.',
    },
    tip: {
      ko: '파인더에서는 별처럼 작거나 안 보일 수 있어요. 주변 별 모양으로 위치를 맞춘 뒤 망원경으로 확인해요.',
      en: 'It may be tiny or invisible in the finder. Match the surrounding star pattern, then check through the telescope.',
    },
    source: 'https://www.skyledge.net/Messier57-hop.htm',
  },
  {
    id: 'sagitta-dumbbell',
    target: 'dso:M27',
    points: ['star:HIP98337', 'dso:M27'],
    level: 2,
    title: { ko: '화살 끝에서 아령성운으로', en: 'The arrow tip to the Dumbbell Nebula' },
    description: {
      ko: '작은 화살자리의 끝에 있는 감마별을 출발점으로 삼아요. 천구의 북쪽으로 약 3도 이동해 아령성운을 찾아보세요.',
      en: 'Begin at Gamma Sagittae, the tip of the little arrow. Move roughly three degrees toward celestial north to find the Dumbbell Nebula.',
    },
    tip: {
      ko: '여기서 북쪽은 화면 위쪽과 다를 수 있어요. 정립·반전 설정에 맞춰 차트의 별 배열을 비교해요.',
      en: 'Celestial north may not be up on your screen. Match the chart’s star pattern using the correct image orientation.',
    },
    source: 'https://www.skyledge.net/Messier27-hop.htm',
  },
  {
    id: 'aquila-wild-duck',
    target: 'dso:M11',
    points: ['star:HIP93805', 'dso:M11'],
    level: 3,
    title: {
      ko: '독수리의 꼬리에서 야생오리성단으로',
      en: 'Aquila’s tail to the Wild Duck Cluster',
    },
    description: {
      ko: '알타이르에서 독수리의 꼬리 쪽으로 별을 따라가 람다별을 찾아요. 여기서 남서쪽으로 이동하며 방패자리의 빽빽한 M11을 찾아요.',
      en: 'Follow Aquila from Altair toward its tail to Lambda Aquilae. Sweep southwest into Scutum to find the dense star cluster M11.',
    },
    tip: {
      ko: '은하수에 별이 많아 헷갈리기 쉬워요. 한 번에 크게 움직이지 말고 차트의 별 배열을 한 구간씩 맞춰요.',
      en: 'The Milky Way is crowded here. Move in small steps and match each patch of stars to the chart.',
    },
    source: 'https://www.skyledge.net/Messier11-hop.htm',
  },
];

/** 코스가 지정된 실제 완료 이벤트와 그 뒤의 관측 기록만 이 코스에 반영한다. */
export function hopCourseProgress(
  course: HopCourse,
  snap: Pick<LearnSnapshot, 'skillEvents' | 'observations'>,
) {
  const times = snap.skillEvents
    .filter(
      (e) =>
        e.type === 'starhop' &&
        e.meta?.courseId === course.id &&
        e.meta.objectId === course.target &&
        e.meta.confirmed === true &&
        e.meta.simulated !== true,
    )
    .map((e) => Date.parse(e.at))
    .filter(Number.isFinite);
  const followed = times.length > 0;
  const recorded =
    followed &&
    snap.observations.some(
      (o) =>
        !o.deletedAt &&
        o.objectId === course.target &&
        o.outcome === 'seen' &&
        Date.parse(o.createdAt) >= Math.min(...times),
    );
  return { followed, recorded, count: Number(followed) + Number(recorded) };
}
