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
  landmarks: readonly ObjectId[];
  steps: readonly { ko: string; en: string }[];
  recognize: { ko: string; en: string };
}

/** 경로 설명만 참고하고 위치·차트는 자체 HYG/DSO 카탈로그로 계산한다. */
export const HOP_COURSES: readonly HopCourse[] = [
  {
    id: 'orion-sword',
    landmarks: ['star:HIP26727', 'star:HIP26311', 'star:HIP25930', 'star:HIP26241'],
    recognize: {
      ko: '세 별이 나란한 허리띠와 그 아래로 늘어진 검을 맨눈으로 먼저 찾아요.',
      en: 'First locate the three belt stars and the sword hanging below them with your unaided eyes.',
    },
    steps: [
      {
        ko: '허리띠의 밝은 알니타크를 확인한 뒤, 검 끝의 이오타별로 이동해요. 차트에서 두 별 사이의 방향을 먼저 비교해 보세요.',
        en: 'Identify Alnitak in the bright belt, then move to Iota at the tip of the sword. Compare their direction on the chart first.',
      },
      {
        ko: '이오타별 가까이에서 작은 별 몇 개를 감싼 흐릿한 빛을 찾아요. 낮은 배율로 성운과 주변 별이 함께 보이게 해 주세요.',
        en: 'Near Iota, look for a hazy glow surrounding a few small stars. Use low power to keep the nebula and nearby stars in view.',
      },
    ],
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
    landmarks: ['star:HIP677', 'star:HIP3092', 'star:HIP5447', 'star:HIP4436', 'star:HIP3881'],
    recognize: {
      ko: '페가수스 사각형의 알페라츠에서 안드로메다 별줄기를 따라가 밝은 미라크를 찾아요.',
      en: 'Follow the Andromeda chain from Alpheratz at the corner of the Great Square to bright Mirach.',
    },
    steps: [
      {
        ko: '미라크에서 카시오페이아 쪽에 있는 뮤별을 찾아요. 두 별의 간격을 기억해 두면 다음 구간을 찾기 쉬워요.',
        en: 'From Mirach, find Mu on the Cassiopeia side. Remember their spacing for the next part.',
      },
      {
        ko: '뮤별에서 같은 쪽으로 더 이동해 뉴별을 찾아요. 조금 어두우니 파인더 안의 별 배열을 차트와 비교해 보세요.',
        en: 'Continue in the same general direction from Mu to Nu. Nu is fainter; match the finder star pattern to the chart.',
      },
      {
        ko: '뉴별 옆의 길쭉한 빛이 안드로메다은하예요. 도심에서는 타원형 중심부만 보일 수 있어요.',
        en: 'The elongated glow beside Nu is the Andromeda Galaxy. In a city you may see only its oval core.',
      },
    ],
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
    landmarks: ['star:HIP91262', 'star:HIP81833', 'star:HIP81693'],
    recognize: {
      ko: '베가 서쪽의 허큘리스 사다리꼴을 찾아요. 서쪽 변 위쪽의 에타별과 아래쪽의 제타별이 길잡이예요.',
      en: 'Find the Hercules Keystone west of Vega. Eta and Zeta mark its western side.',
    },
    steps: [
      {
        ko: '에타별과 제타별을 잇는 변을 확인해요. 에타별에서 제타별 쪽으로 약 3분의 1 지점에 있는 작은 솜뭉치를 찾아요.',
        en: 'Locate the side joining Eta and Zeta. Look for a small fuzzy ball about one third of the way from Eta toward Zeta.',
      },
    ],
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
    landmarks: ['star:HIP91262', 'star:HIP92420', 'star:HIP93194'],
    recognize: {
      ko: '여름 대삼각형의 밝은 베가와 바로 옆 작은 평행사변형을 찾아요.',
      en: 'Find brilliant Vega in the Summer Triangle and the small parallelogram beside it.',
    },
    steps: [
      {
        ko: '베가에서 작은 평행사변형의 셸리아크를 찾아요. 구간이 넓으니 맨눈으로 두 별을 먼저 짚고 파인더를 맞춰 주세요.',
        en: 'From Vega, locate Sheliak in the small parallelogram. Identify both stars by eye before pointing the finder across this wider span.',
      },
      {
        ko: '셸리아크에서 술라파트 쪽으로 약 3분의 1 지점을 살펴요. 파인더에서는 안 보일 수 있어요. 별 배열로 위치를 맞춘 뒤 저배율 접안렌즈로 확인해요.',
        en: 'Look about one third of the way from Sheliak toward Sulafat. M57 may be invisible in the finder; match the stars, then check at low power.',
      },
    ],
    target: 'dso:M57',
    points: ['star:HIP91262', 'star:HIP92420', 'dso:M57'],
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
    landmarks: ['star:HIP97649', 'star:HIP98337', 'star:HIP97365'],
    recognize: {
      ko: '알타이르 북쪽에서 작은 화살 모양을 찾아요. 화살 끝의 감마별이 출발점이에요.',
      en: 'Look north of Altair for the small arrow. Gamma at its tip is your starting star.',
    },
    steps: [
      {
        ko: '화살 끝의 감마별에서 천구 북쪽으로 약 3도 이동해요. 화면 위쪽과 다를 수 있으니 표시된 연결 방향을 따라가며 흐릿한 얼룩을 찾아요.',
        en: 'Move roughly three degrees toward celestial north from Gamma at the arrow tip. North may not be screen-up; follow the chart connection to a faint patch.',
      },
    ],
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
    landmarks: [
      'star:HIP97649',
      'star:HIP95501',
      'star:HIP93805',
      'star:HIP93429',
      'star:HIP92175',
    ],
    recognize: {
      ko: '알타이르에서 델타별을 지나 꼬리의 람다별까지 큰 별줄기를 맨눈으로 먼저 짚어요.',
      en: 'Trace the broad line from Altair through Delta to Lambda at the tail with your unaided eyes first.',
    },
    steps: [
      {
        ko: '독수리 꼬리의 람다별 옆에서 12번 별을 찾아요. 갈고리처럼 굽은 꼬리의 끝을 확인하며 이동해요.',
        en: 'Find 12 Aquilae beside Lambda in the eagle\u2019s tail. Follow the slight hook at the tail\u2019s end.',
      },
      {
        ko: '꼬리의 흐름을 남서쪽으로 이어 가며 작은 빛무리를 찾아요. 주변의 낱별보다 뿌옇고 촘촘한 M11이 보여요.',
        en: 'Extend the tail\u2019s line southwest to a compact glow. M11 looks hazier and denser than nearby single stars.',
      },
    ],
    target: 'dso:M11',
    points: ['star:HIP93805', 'star:HIP93429', 'dso:M11'],
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
