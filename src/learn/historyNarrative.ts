import type { HistoryQuest, LocalizedText } from './historyQuests';

type Three<T> = readonly [T, T, T];
export type NarrativeChapter = {
  scenes: Three<LocalizedText>;
  discovery: LocalizedText;
};
export type HistoryNarrative = {
  setting: LocalizedText;
  opening: LocalizedText;
  question: LocalizedText;
  chapters: Three<NarrativeChapter>;
  ending: LocalizedText;
};
const t = (ko: string, en: string): LocalizedText => ({ ko, en });
const act = (
  first: LocalizedText,
  second: LocalizedText,
  third: LocalizedText,
  discovery: LocalizedText,
): NarrativeChapter => ({ scenes: [first, second, third], discovery });

// 역사에서 출발해 독자가 교육용 관측 자료를 조사하는 장면이다. 실제 대화·일기를 재현하지 않는다.
// 문제의 수치·가정·채점 ID는 historyQuests/historyLessons를 그대로 사용한다.
export const HISTORY_NARRATIVES: Record<string, HistoryNarrative> = {
  'eratosthenes-earth': {
    setting: t(
      '기원전 3세기 · 알렉산드리아에서 시작된 질문',
      '3rd century BCE · A question from Alexandria',
    ),
    opening: t(
      '하지 무렵의 정오. 시에네에서는 햇빛이 깊은 우물 안까지 닿는다고 하는데, 북쪽 알렉산드리아의 막대에는 그림자가 남는다. 같은 태양 아래 두 도시가 다른 답을 내놓는다.',
      'Noon near the summer solstice. Sunlight is said to reach deep into a well at Syene, while a rod farther north in Alexandria still casts a shadow. Two cities under one Sun give different answers.',
    ),
    question: t(
      '두 도시의 그림자만으로, 가 보지 못한 지구 한 바퀴를 잴 수 있을까?',
      'Can two cities’ shadows measure a journey all the way around Earth?',
    ),
    chapters: [
      act(
        t(
          '먼저 막대 옆에 서 보자. 길이를 재기 전에 알아낼 것은 햇빛이 머리 위 방향에서 얼마나 기울었는지다. 바닥이 아니라, 하늘을 향해 세운 기준선을 보자.',
          'Stand beside the rod. Before measuring a length, establish how far the sunlight tilts from overhead. Your reference points upward, not along the ground.',
        ),
        t(
          '이제 두 막대를 둥근 지구 위에 세운 그림을 펼친다. 각각의 ‘바로 위’는 나란하지 않다. 작은 그림자 각도가 지구 중심의 각도와 이어질 자리를 찾아보자.',
          'Now place both rods on a drawing of a round Earth. Their local upward directions are not parallel. Look for the link between the shadow angle and an angle at Earth’s center.',
        ),
        t(
          '책상에는 두 가지 측정만 남았다. 두 도시 사이 거리와 그림자에서 읽은 각도. 이번 교육용 자료를 이용해 아직 걸어 보지 않은 나머지 둘레까지 이어 보자.',
          'Two measurements lie on the desk: a distance between cities and an angle read from a shadow. Use this teaching dataset to extend a short measured arc around the unseen rest of Earth.',
        ),
        t(
          '작은 그림자가 지구 전체의 크기로 이어졌다. 하지만 줄자와 각도 눈금이 조금씩 달랐다면? 다음 장에서는 이 숫자 옆에 얼마나 넓은 여백을 남겨야 할지 살핀다.',
          'A small shadow has led to the size of Earth. But what if the distance and angle were slightly different? Next, find how much room to leave around that estimate.',
        ),
      ),
      act(
        t(
          '둘레를 적으려다 손을 멈춘다. 거리 측정도, 그림자의 끝을 읽는 일도 완벽하지 않다. 큰 숫자와 작은 숫자의 흔들림을 공평하게 비교하려면 어떤 기준이 필요할까?',
          'Pause before writing the circumference in ink. Neither a distance measurement nor the end of a shadow is perfectly sharp. How can uncertainty in a large number be compared fairly with uncertainty in a small one?',
        ),
        t(
          '거리 측정은 바뀌어도 각도 측정은 그대로일 수 있다. 두 측정의 흔들림이 서로 독립이라면, 둘을 합칠 때 항상 같은 방향으로 틀어진다고 가정해도 될까?',
          'A distance can shift while an angle stays the same. If their uncertainties are independent, should we combine them as though they always move in the same direction?',
        ),
        t(
          '이제 결과 옆 빈칸을 채울 차례다. 둘레 하나만 적는 대신 측정의 불확도를 함께 남긴다. 다음 사람이 이 기록을 얼마나 믿고 사용할 수 있는지 숫자로 알려 주자.',
          'Now fill the space beside the result. Record the uncertainty as well as the circumference, so the next reader knows how much confidence these measurements support.',
        ),
        t(
          '측정값 옆에 불확도가 생겼다. 그렇다고 모든 실수가 그 안에 들어가는 것은 아니다. 마지막으로 지도를 펴 보니, 두 도시를 잇는 길이 남북에서 비스듬히 벗어나 있다.',
          'The measurement now has an uncertainty. Yet that does not cover every possible mistake. Open the map once more: the route between the cities runs at an angle to north–south.',
        ),
      ),
      act(
        t(
          '그림자 계산에서는 두 도시를 같은 자오선 위에 놓았다. 실제 지도를 살필 때도 그 조건을 먼저 확인해야 한다. 지금의 교육용 지도에서 태양의 높이 차이와 연결할 방향을 골라 보자.',
          'The shadow model placed the cities on one meridian. A map must be checked against that condition. On this simplified map, identify the direction connected to the difference in noon solar height.',
        ),
        t(
          '비스듬한 선을 남북과 동서 두 방향으로 나누어 본다. 실제 이동한 길이를 전부 쓰면, 그림자가 비교하는 간격과 다른 거리를 넣게 된다. 남북 성분만 남길 도구를 찾아보자.',
          'Split the slanted line into north–south and east–west parts. Using the full route would feed the shadow calculation a different distance. Find a way to keep only its north–south component.',
        ),
        t(
          '계산을 덮기 전 마지막 점검이다. 이 지역을 평면으로 근사한 지도에서, 기울어진 길을 그대로 사용하면 둘레는 어느 쪽으로 어긋날까? 처음의 그림자로 돌아가 판단해 보자.',
          'One final check before closing the notebook. In this locally flat map approximation, which way would the slanted route bias the circumference? Return to the original shadows and decide.',
        ),
        t(
          '그림자를 읽는 일, 오차를 묶는 일, 지도와 가정을 맞추는 일이 하나의 측정이 됐다. 그럴듯한 숫자를 얻는 것과 믿을 만한 기록을 남기는 것은 이렇게 연결된다.',
          'Reading a shadow, combining uncertainties, and checking the map against the assumptions have become one measurement. A plausible number is now a result whose limits can be explained.',
        ),
      ),
    ],
    ending: t(
      '처음에는 두 도시의 그림자가 달라 보였을 뿐이다. 이제 그 차이 속에서 둥근 땅의 크기를 읽고, 측정이 흔들리는 범위와 지도의 함정까지 짚었다. 지구를 한 바퀴 돌지 않고도, 한 바퀴를 재는 생각의 길을 걸었다.',
      'At first, two shadows simply looked different. Now that difference reveals Earth’s size, with room for measurement uncertainty and a check on the map. You have followed a way around Earth without travelling around it.',
    ),
  },
  'kepler-orbits': {
    setting: t(
      '17세기 · 티코의 관측 기록에서 두 별의 궤도까지',
      '17th century · From Tycho’s records to a pair of stars',
    ),
    opening: t(
      '하늘의 움직임을 완벽한 원에 맞추려는데 관측 기록이 자꾸 어긋난다. 케플러는 티코 브라헤가 남긴 자료에서 다른 길을 찾았다. 그 타원을 따라, 이번에는 두 별을 재는 관측자가 되어 본다.',
      'Attempts to fit the sky to perfect circles keep missing the observations. Kepler found another path through Tycho Brahe’s records. Follow that ellipse into a modern observing task: measuring a pair of stars.',
    ),
    question: t(
      '별에 닿지 않고, 움직임만으로 무엇을 알아낼 수 있을까?',
      'What can motion reveal about stars we cannot touch?',
    ),
    chapters: [
      act(
        t(
          '사진을 여러 장 겹치니 한 별에 대한 다른 별의 위치가 타원을 그린다. 자를 대기 전에, 이 선이 한 별의 질량중심 궤도인지 두 별 사이의 상대 궤도인지 구별하자.',
          'Overlay several images: one star’s position relative to the other traces an ellipse. Before measuring it, distinguish this relative orbit from either star’s orbit about the center of mass.',
        ),
        t(
          '궤도의 종류를 확인했다. 이제 같은 주기로 더 큰 궤도를 도는 별들을 상상해 보자. 이 움직임을 붙잡아 둘 중력은 어떻게 달라져야 할까?',
          'The orbit is identified. Imagine a larger orbit completed in the same time. How would the gravity holding that motion together need to change?',
        ),
        t(
          '궤도의 크기와 한 바퀴 도는 시간이 준비됐다. 케플러의 관계를 뉴턴의 중력으로 확장한 식을 사용한다. 교육용 쌍성의 두 별을, 궤도라는 저울에 올려 보자.',
          'The orbit size and period are ready. Use the relation extended by Newtonian gravity to weigh the two stars in this teaching example. The orbit itself is your balance.',
        ),
        t(
          '움직임에서 두 별의 총질량을 읽었다. 그런데 사진 사이 간격은 일정해도 별이 이동한 거리는 일정하지 않다. 타원 위에서 속력이 달라지는 이유를 따라가 보자.',
          'Motion has revealed a total mass. Yet equal intervals between photographs do not mean equal distances travelled. Follow the changing speed around the ellipse.',
        ),
      ),
      act(
        t(
          '이번에는 한 초점 주변을 도는 타원 궤도를 본다. 같은 시간 동안 쓸고 간 영역을 얇은 부채꼴로 표시했다. 별 가까이와 멀리에서 무엇이 같아야 할까?',
          'Turn to an ellipse around one focus. Mark the regions swept out during equal times. What must match between the part close to the star and the part far away?',
        ),
        t(
          '초점에서 가장 가까운 곳과 가장 먼 곳에 표식을 남긴다. 두 지점에서는 속도 방향이 반지름에 수직이다. 거리와 속력을 한 쌍으로 묶어 비교해 보자.',
          'Mark the nearest and farthest points from the focus. At both, velocity is perpendicular to the radius. Compare distance and speed as paired quantities.',
        ),
        t(
          '가까운 지점과 먼 지점의 거리를 궤도 모양으로 읽을 수 있다. 이제 사진에서 느꼈던 속력 차이를 비율로 바꾼다. 타원의 찌그러진 정도가 그 차이에 얼마나 영향을 줄까?',
          'The orbit’s shape gives the nearest and farthest distances. Turn the changing speed seen in the images into a ratio. How much does the ellipse’s shape matter?',
        ),
        t(
          '타원 위의 별은 일정한 속력으로 돌지 않는다. 그러니 궤도에서 각도를 절반 옮겼다고 시간이 절반 흐른 것도 아니다. 마지막 관측에서는 도착 시각을 예측해야 한다.',
          'The star does not travel at a constant speed. Half an angular journey need not take half the time. The final task is to predict when it reaches a chosen point.',
        ),
      ),
      act(
        t(
          '다음 관측을 예약하려고 궤도 위 한 점을 고른다. 그런데 그림에는 서로 다른 꼭짓점에서 잰 각도가 있다. 별에서 직접 잰 각도와 보조 원의 각도를 먼저 구별하자.',
          'Choose a point on the orbit for your next observation. The diagram contains angles measured from different places. First distinguish the angle at the focus from the angle on the auxiliary circle.',
        ),
        t(
          '모양을 따라가는 각도와 시간을 따라가는 각도가 서로 다르다. 궤도 위 위치를 시계에 옮기려면, 시간이 일정하게 흐를 때 함께 일정하게 증가하는 양이 필요하다.',
          'An angle describing position is not necessarily an angle describing time. To turn an orbital position into a clock reading, find the quantity that advances uniformly as time passes.',
        ),
        t(
          '관측 일정의 마지막 빈칸은 근일점 이후 경과 시간이다. 그림에서 얻은 각도를 바로 시간으로 나누지 말고, 케플러 방정식을 거쳐 시계의 눈금으로 바꾸어 보자.',
          'The last blank on the observing schedule is time since perihelion. Do not convert the pictured angle directly into elapsed time. Pass through Kepler’s equation to read the orbital clock.',
        ),
        t(
          '궤도는 저울이면서 시계였다. 같은 타원에서 질량을 읽고, 속력의 차이를 설명하고, 다음 위치에 도착할 시간까지 예측했다.',
          'The orbit was both a balance and a clock. One ellipse let you infer mass, explain changing speed, and predict the time of arrival at another position.',
        ),
      ),
    ],
    ending: t(
      '처음에는 원에서 벗어난 움직임이 골칫거리였다. 그 어긋남을 지우지 않고 따라가자, 궤도가 별의 질량과 속력과 시간을 말해 주었다. 다음 밤의 관측 기록은 이제 단순한 점이 아니라, 예측을 확인할 자리가 된다.',
      'What first looked like troublesome motion away from a circle became information. Following it rather than erasing it made the orbit reveal mass, speed, and time. The next night’s observation is now a place to test a prediction.',
    ),
  },
  'romer-light': {
    setting: t(
      '1676년 · 파리 천문대, 목성 위성의 시각표',
      '1676 · Paris Observatory, a timetable for Jupiter’s moon',
    ),
    opening: t(
      '망원경 속 이오가 목성의 그림자에 사라진다. 시각표와 관측 기록을 맞춰 보니, 예상한 때와 실제로 본 때가 조금씩 벌어진다. 위성의 시계가 틀린 걸까, 소식이 늦게 도착한 걸까?',
      'Io disappears into Jupiter’s shadow. Compare the prediction table with the observations: the expected and observed times drift apart. Is the moon’s clock wrong, or is its news arriving late?',
    ),
    question: t(
      '하늘의 시계가 늦어진다면, 그 사이 빛에게 무슨 일이 있었을까?',
      'If a celestial clock runs late, what happened on the light’s journey?',
    ),
    chapters: [
      act(
        t(
          '관측자는 이오에서 바로 시간을 읽을 수 없다. 망원경에 닿은 빛을 보고 사건을 기록한다. 사건이 일어난 때와 우리가 알게 된 때 사이에 어떤 거리가 놓여 있는지 살펴보자.',
          'An observer cannot read a clock at Io directly. The event is recorded from light reaching the telescope. Examine the distance separating the event from the moment it becomes known.',
        ),
        t(
          '지구가 공전하면서 목성과의 거리가 변한다. 같은 사건의 빛도 계절에 따라 다른 길이를 건너온다. 길이 차이와 도착 시각 차이를 연결할 관계를 찾아보자.',
          'As Earth orbits, its distance from Jupiter changes. Light from the same kind of event travels different path lengths at different seasons. Connect the added path to the added travel time.',
        ),
        t(
          '이번 교육용 시각표에는 늘어난 빛의 경로와 누적 지연이 주어졌다. 뢰머가 다룬 핵심은 빛의 유한한 전달 시간이었다. 여기서는 주어진 거리 척도까지 이용해 속력을 추정해 보자.',
          'This teaching timetable gives an extra path length and an accumulated delay. Rømer’s central issue was finite light-travel time; with a supplied distance scale, you can also estimate a speed.',
        ),
        t(
          '도착이 늦어진 까닭을 빛의 이동으로 설명할 수 있다. 하지만 관측자가 두 사건 사이 간격만 재면 어떻게 보일까? 같은 자료를 ‘위성의 하루’라는 시선으로 다시 읽어 보자.',
          'Light travel can explain a late arrival. But what would an observer infer from the interval between successive events? Read the timetable again as a measurement of the moon’s period.',
        ),
      ),
      act(
        t(
          '오늘의 사건도 내일의 사건도 조금 늦게 도착한다. 두 번 모두 같은 만큼 늦었다면, 관측한 사건 간격도 달라질까? 누적 지연과 간격의 변화를 나누어 생각해 보자.',
          'Today’s event and the next one both arrive late. If their delays were identical, would the observed interval change? Separate a total delay from a change in that delay.',
        ),
        t(
          '시각표를 한 줄씩 내려가며 지연의 증가분을 표시한다. 여러 주기 동안 쌓인 차이를 한 주기의 변화로 읽으려면, 사건 횟수보다 무엇을 세어야 할까?',
          'Move down the timetable, marking each added delay. To turn an accumulated difference into a change per period, count the intervals carefully rather than simply counting events.',
        ),
        t(
          '별도의 교육용 기록에서 지연이 여러 주기에 걸쳐 쌓였다. 이오의 실제 운동이 바뀌지 않았더라도, 우리가 적어 넣는 주기는 얼마나 늘어날 수 있을지 계산해 보자.',
          'In a separate teaching record, delay accumulates over several periods. Work out how much the recorded period can lengthen even if Io’s underlying motion stays unchanged.',
        ),
        t(
          '빛의 길이가 바뀌면 관측한 주기도 달라 보인다. 이제 설명을 세운 것에서 한 걸음 더 나가자. 지구의 움직임이 반대가 되는 계절에 무엇을 보게 될지 예측할 차례다.',
          'A changing light path can alter the apparent period. Take the explanation one step further: predict what happens when Earth’s relative motion reverses with the season.',
        ),
      ),
      act(
        t(
          '지금까지는 멀어지는 구간의 시각표를 보았다. 관측 계획을 반년 뒤로 넘겨, 빛의 길이가 줄어드는 구간도 살핀다. 같은 설명이 두 상황을 모두 견뎌야 한다.',
          'So far, the timetable covered a receding part of the orbit. Turn the observing plan to a season when the light path shortens. One explanation must work in both situations.',
        ),
        t(
          '위성 자체의 시계가 늘 느린 경우와, 전달 경로가 길어졌다 짧아지는 경우를 나란히 적는다. 시간이 흐르면서 두 설명이 서로 다른 예측을 내놓는 순간을 찾아보자.',
          'Place two explanations side by side: a moon with a consistently slow clock, and a light path that grows and shrinks. Find an observation that makes their predictions differ.',
        ),
        t(
          '다음 계절의 관측 시간을 신청할 수 있다. 밝기나 한 번의 늦은 사건보다, 지연의 계절적 변화를 살피는 것이 왜 결정적인지 생각하며 검증 계획을 골라 보자.',
          'You can request observing time for the next season. Choose a test that uses the seasonal pattern of delays, rather than relying on brightness or a single late event.',
        ),
        t(
          '늦어진 사건 하나에서 시작한 설명이, 반대 계절에 확인할 예측으로 바뀌었다. 맞는 수를 얻는 것만큼 중요한 것은 설명이 틀릴 기회도 남겨 두는 일이었다.',
          'An explanation for one late event has become a prediction for the opposite season. Beyond obtaining a number, you have designed an opportunity for the explanation to fail.',
        ),
      ),
    ],
    ending: t(
      '처음의 시각표를 다시 펼친다. 이제 늦게 적힌 시각은 단순한 실수가 아니다. 사건과 관측 사이에 빛이 건너온 길이 남긴 흔적이다. 하늘의 시계를 고치려던 질문이, 빛도 이동하는 데 시간이 필요하다는 이야기로 이어졌다.',
      'Open the original timetable again. A late entry is no longer merely an error: it carries the trace of a journey between event and observer. A question about a celestial clock has become a story about the time light needs to travel.',
    ),
  },
  'leavitt-distance': {
    setting: t(
      '1908–1912년 · 하버드 천문대, 유리 건판 속 별들',
      '1908–1912 · Harvard Observatory, stars on glass plates',
    ),
    opening: t(
      '서로 다른 날 찍은 유리 건판을 겹쳐 본다. 대부분의 별은 그대로인데, 몇몇 점은 진해졌다 옅어진다. 리빗이 소마젤란은하의 변광성에서 찾은 규칙은 이 깜빡임에 거리를 묻는 길을 열었다.',
      'Compare glass plates taken on different dates. Most stars stay unchanged; a few marks grow stronger and fainter. The pattern Leavitt found among Small Magellanic Cloud variables opened a way to ask their flickering light about distance.',
    ),
    question: t(
      '밝아졌다 어두워지는 별을, 우주의 거리 표지로 쓸 수 있을까?',
      'Can a star’s changing brightness become a distance marker?',
    ),
    chapters: [
      act(
        t(
          '건판 위의 작은 점이 밝기를 되풀이한다. 지금 재려는 것은 한 번의 반짝임이 아니라 반복에 걸리는 시간이다. 이 주기가 무엇을 알려 줄지 먼저 살펴보자.',
          'A small mark on the plate repeats its brightness cycle. Measure the time of that repetition rather than a single flash. First explore what this period can tell you.',
        ),
        t(
          '주기로 본래 밝기를 추정할 길이 생겼다. 그런데 건판에서 보이는 밝기와는 다르다. 같은 전구도 멀리서 희미해지듯, 두 밝기의 간격을 거리에 연결해 보자.',
          'The period offers a way to estimate intrinsic brightness. That is not the brightness seen on the plate. Like a lamp appearing fainter far away, connect the difference between the two to distance.',
        ),
        t(
          '현대적으로 보정한 관계식과 교육용 변광성 기록을 준비했다. 리빗의 발견에 나중의 거리 보정을 더한 셈이다. 주기에서 본래 밝기로, 다시 거리로 한 줄씩 이어 가자.',
          'A modern calibrated relation and a teaching star record are ready. This adds a later distance calibration to Leavitt’s discovery. Follow the chain from period to intrinsic brightness, then to distance.',
        ),
        t(
          '별의 밝기 변화가 거리 눈금이 됐다. 그러나 빛이 우리에게 오는 길이 비어 있지 않다면? 다음 건판에는 먼지 때문에 더 어둡게 보이는 별이 기다린다.',
          'A star’s changing light has become a distance scale. But what if the path to us is not clear? The next plate contains a star dimmed by dust.',
        ),
      ),
      act(
        t(
          '두 별이 똑같이 멀어도 하나 앞에 먼지가 더 많으면 밝기가 달라진다. 건판은 이유를 적어 주지 않는다. 우선 먼지가 겉보기 등급을 어느 방향으로 바꾸는지 짚어 보자.',
          'Two equally distant stars can look different if one has more dust in front of it. The plate does not label the cause. First decide which way dust shifts apparent magnitude.',
        ),
        t(
          '희미하다는 사실을 모두 거리 탓으로 돌리면 어떻게 될까? 빛을 가리는 효과와 멀어지는 효과가 관측 기록에서 닮아 보이는 이유를 살펴보자.',
          'What happens if every bit of faintness is blamed on distance? Examine why obscuration and greater distance can leave similar marks in the observation.',
        ),
        t(
          '자료에 주어진 소광량만큼 빛이 가려졌다. 이 효과를 빠뜨린 거리 추정이 얼마나 과장되는지 계산한다. 먼지를 지우는 보정이 거리 지도에서 무엇을 바로잡는지 확인하자.',
          'The supplied extinction dims the light by a known amount. Calculate how much ignoring it overstates the distance. See what a dust correction repairs in the distance map.',
        ),
        t(
          '빛의 경로까지 살펴 거리 눈금을 고쳤다. 그런데 이 자의 첫 눈금은 어디에 고정했을까? 마지막에는 관계식의 출발점, 영점을 점검한다.',
          'Accounting for the light’s path has repaired the distance estimate. But where was the ruler’s first mark fixed? The final task checks the relation’s zero point.',
        ),
      ),
      act(
        t(
          '리빗이 비교한 별들은 대략 같은 거리에 있어 밝기의 상대적 차이를 읽기 좋았다. 그 사실만으로 각각이 몇 파섹 떨어졌는지까지 알 수 있을까? 상대적인 눈금과 절대적인 눈금을 나누어 보자.',
          'Leavitt’s stars were at roughly a shared distance, making relative brightness differences useful. Does that alone tell us their distances in parsecs? Separate a relative scale from an absolute one.',
        ),
        t(
          '자를 책상 위에서 통째로 밀어도 눈금 사이 간격은 같다. 밝기 관계식에도 비슷한 일이 생긴다. 기울기는 그대로 두고 영점을 바꾸면 무엇이 함께 움직일까?',
          'Sliding a ruler across the desk does not change the spacing of its marks. A brightness relation has a similar freedom. What moves when its zero point shifts but its slope stays fixed?',
        ),
        t(
          '멀리 있는 별들의 주기는 이미 재었다. 이제 이 관계를 실제 거리의 자로 쓰기 위해 어떤 추가 관측이 필요한지 결정하자. 첫 눈금을 고정할 근거를 골라 보자.',
          'The periods of distant stars are measured. Decide what additional observation is needed to turn the relation into a ruler of actual distance. Choose evidence that can anchor its first mark.',
        ),
        t(
          '주기, 먼지 보정, 절대 거리의 기준점이 하나의 사슬로 이어졌다. 희미한 별 하나를 재는 일은 그 사슬의 어느 고리도 빠뜨리지 않는 일이었다.',
          'Period, dust correction, and an absolute distance anchor now form one chain. Measuring a faint star means keeping every link in view.',
        ),
      ),
    ],
    ending: t(
      '처음에는 건판 위 점 몇 개가 짙어졌다 옅어졌을 뿐이다. 이제 그 반복에서 별의 본래 밝기를 읽고, 먼지를 걷어 내고, 거리의 자를 고정했다. 작은 유리판 위의 변화가 더 넓은 우주를 재는 길로 이어졌다.',
      'At first, a few marks on glass merely darkened and faded. Now their rhythm leads to intrinsic brightness, through dust, and onto an anchored distance scale. A change on a small plate has opened a route to measuring a wider universe.',
    ),
  },
  'payne-stellar-atmospheres': {
    setting: t(
      '1925년 · 하버드, 별빛의 검은 선을 읽다',
      '1925 · Harvard, reading the dark lines in starlight',
    ),
    opening: t(
      '별빛을 펼치면 무지개 사이에 검은 선들이 남는다. 진한 선의 원소가 가장 많다고 읽으면 될까? 세실리아 페인은 별 대기의 온도와 원자의 상태를 함께 따져, 스펙트럼의 익숙한 해석을 바꾸었다.',
      'Spread starlight into a spectrum and dark lines interrupt its colours. Does the strongest line simply mark the most abundant element? Cecilia Payne used temperature and atomic states to change that familiar reading.',
    ),
    question: t(
      '별빛에 강하게 찍힌 선은, 정말 그 원소의 양을 말해 줄까?',
      'Does a strong line in starlight really tell us how much of an element is there?',
    ),
    chapters: [
      act(
        t(
          '스펙트럼 옆에 같은 원소의 원자들을 그려 본다. 어떤 원자는 전자를 붙잡고, 어떤 원자는 잃었다. 선의 진하기를 세기 전에, 온도가 이 구성을 어떻게 바꾸는지 살펴보자.',
          'Draw atoms of one element beside the spectrum. Some retain an electron; others have lost it. Before counting line strength, examine how temperature changes this population.',
        ),
        t(
          '이번 모형에서는 전자 밀도를 고정하고 온도만 올린다. 식 속 거듭제곱과 지수 항이 함께 움직인다. 숫자를 대입하기 전에 두 효과가 향하는 쪽을 읽어 보자.',
          'In this model, electron density is held fixed while temperature rises. Both a power and an exponential factor change. Read their directions before inserting numbers.',
        ),
        t(
          '같은 원소라도 온도가 바뀌면 중성과 이온의 비가 달라진다. 주어진 두 온도를 비교해, 원소를 더 넣지 않고도 스펙트럼이 달라질 수 있는 규모를 계산하자.',
          'The same element can have a different neutral-to-ionized balance at another temperature. Compare the two supplied temperatures to see how much the spectrum can change without adding more of the element.',
        ),
        t(
          '원소의 총량을 그대로 두어도 원자의 상태는 크게 바뀔 수 있다. 다음에는 별도의 조건을 가진 모형으로 옮겨, 남아 있는 중성 원자 중 실제 선을 만드는 원자가 얼마나 되는지 본다.',
          'Atomic states can shift greatly while the total abundance stays fixed. Move to a separate model with its own conditions and ask how many neutral atoms can participate in the chosen line.',
        ),
      ),
      act(
        t(
          '중성 원자라고 모두 같은 에너지 상태에 있지는 않다. 층이 있는 건물처럼 원자의 준위를 그려 본다. 특정 선을 만들려면 어느 층에 원자가 있어야 하는지부터 확인하자.',
          'Neutral atoms do not all occupy the same energy state. Sketch their levels like floors in a building. First identify why a particular line requires atoms on a particular floor.',
        ),
        t(
          '온도는 높은 준위로 올라갈 기회를 바꾸지만, 중성 원자 자체의 수와는 또 다른 조건이다. 전체 원자에서 중성을 고르고, 그 안에서 필요한 준위를 고르는 순서를 따라가 보자.',
          'Temperature changes the chance of occupying an excited level, a separate factor from how many atoms remain neutral. Follow the two selections: neutral atoms first, then the required level within them.',
        ),
        t(
          '이번 자료의 중성 분율과 준위 점유율을 함께 사용한다. 앞 장의 고정 전자 밀도 비교와는 다른 조건이다. 전체 수소 중 선택한 선에 참여할 수 있는 비율을 계산하자.',
          'Use this dataset’s neutral fraction together with its level population. These conditions differ from the previous fixed-density comparison. Calculate the fraction of all hydrogen able to participate in the selected line.',
        ),
        t(
          '스펙트럼이 보여 주는 것은 전체 원자 중 조건에 맞는 일부였다. 이제 진한 선과 옅은 선을 다시 바라보자. 존재량을 말하려면 이 선택 과정을 거꾸로 풀어야 한다.',
          'The spectrum reveals a selected part of the atomic population. Look again at strong and weak lines. Inferring abundance means working back through that selection.',
        ),
      ),
      act(
        t(
          '두 스펙트럼의 수소선 진하기가 다르다. 원소의 양, 온도, 원자가 놓인 상태 중 무엇이 달라졌는지 선 하나만으로 단정할 수 있을까? 가능한 원인을 먼저 펼쳐 놓자.',
          'Two spectra have different hydrogen line strengths. Can one line alone tell whether abundance, temperature, or atomic state changed? Lay out the possible causes before choosing one.',
        ),
        t(
          '별의 빛은 대기를 지나며 흡수되고 다시 방출된다. 원자 수를 센 것만으로 최종 선의 모양까지 정해지지는 않는다. 우리가 그린 원자 모형과 실제로 나온 빛 사이의 고리를 살피자.',
          'Starlight is absorbed and emitted while crossing the atmosphere. Counting atoms alone does not fix the final line profile. Examine the link between the atomic model and the emerging light.',
        ),
        t(
          '분석 보고서에 별의 조성을 적을 차례다. 강한 선 하나를 원소의 양으로 곧장 바꾸는 대신, 온도·이온화·준위·빛의 전달을 함께 설명할 방법을 골라 보자.',
          'It is time to write the star’s composition into the report. Rather than translating one strong line directly into abundance, choose a method that accounts for temperature, ionization, levels, and light transfer together.',
        ),
        t(
          '검은 선은 원소의 이름표이면서, 별 대기에서 무슨 일이 일어나는지 묻는 단서였다. 페인의 발견을 따라온 길은 보이는 진하기와 실제 존재량을 분리하는 데 닿았다.',
          'A dark line identifies an element, but also asks what is happening in the atmosphere. Following Payne’s approach has brought you to the distinction between visible strength and actual abundance.',
        ),
      ),
    ],
    ending: t(
      '처음 보았던 검은 선은 그대로다. 달라진 것은 읽는 법이다. 별에 무엇이 얼마나 있는지 알려면, 빛에 드러나지 않은 원자들까지 모형으로 헤아려야 한다. 스펙트럼을 읽는 일이 별의 재료를 묻는 이야기로 깊어졌다.',
      'The dark lines are unchanged. What changed is how you read them. To ask what a star contains, you must also account for atoms that the selected line does not reveal. Reading a spectrum has become a deeper investigation of stellar matter.',
    ),
  },
  'einstein-eclipse': {
    setting: t(
      '1919년 · 소브랄과 프린시페, 일식 원정',
      '1919 · Sobral and Príncipe, eclipse expeditions',
    ),
    opening: t(
      '달이 태양을 가리는 짧은 시간, 평소 햇빛에 묻히던 별들이 사진에 남는다. 두 원정대는 이 별들의 위치를 비교할 자료를 모았다. 중력이 빛의 길을 휜다면, 그 흔적은 얼마나 작게 나타날까?',
      'During the brief eclipse, stars normally lost in sunlight can be photographed. Two expeditions collected material for comparing their positions. If gravity bends light, how small a trace would it leave?',
    ),
    question: t(
      '별 사진의 작은 위치 차이에서, 중력의 흔적을 가려낼 수 있을까?',
      'Can a tiny difference in star positions reveal gravity’s effect on light?',
    ),
    chapters: [
      act(
        t(
          '태양 옆을 지나는 빛의 경로를 그려 본다. 광선과 태양 중심 사이의 가장 가까운 간격이 식에 들어간다. 사진의 별까지 거리가 아니라 어떤 길이를 재는지 먼저 정하자.',
          'Sketch a ray passing the Sun. The formula uses its closest approach to the solar center. First identify this length, rather than confusing it with the distance to the photographed star.',
        ),
        t(
          '이론은 작은 각도를 라디안으로 내놓고, 관측자는 초각으로 위치를 비교한다. 같은 흔적을 서로 다른 자로 읽는 셈이다. 두 눈금을 잇는 변환을 확인하자.',
          'The theory gives a small angle in radians; observers compare positions in arcseconds. They are reading the same trace with different rulers. Establish the conversion between them.',
        ),
        t(
          '교육용 계산에서는 태양 가장자리를 스치는 빛을 택한다. 질량과 통과 거리를 넣어 사진에서 찾아야 할 각도를 구하자. 얼마만큼의 정밀도가 필요한지 숫자로 드러난다.',
          'For this teaching calculation, choose a ray grazing the Sun. Use mass and closest approach to find the angle to look for in the photograph. The number sets the scale of the required precision.',
        ),
        t(
          '사진에서 찾을 흔적의 크기를 정했다. 이제 서로 조금 다른 측정값 두 개가 놓였다. 어느 쪽도 완벽하지 않을 때, 한 결과로 어떻게 모을까?',
          'You have the scale of the expected trace. Now two slightly different measurements lie before you. Neither is perfect; how should they become one result?',
        ),
      ),
      act(
        t(
          '이번에는 실제 원정 수치가 아닌 두 교육용 측정값을 비교한다. 하나는 더 촘촘한 불확도 범위를 갖는다. 두 값에 같은 발언권을 주는 것이 공평한지 생각해 보자.',
          'Compare two teaching measurements, not the original expedition values. One has a narrower uncertainty. Consider whether giving them equal influence is appropriate.',
        ),
        t(
          '측정값 옆의 오차막대를 살핀다. 정밀한 관측이 더 큰 무게를 갖도록 평균을 만들되, 불확도와 가중치를 거꾸로 연결해야 한다. 그 관계를 찾아보자.',
          'Look at the error bars beside the measurements. Build an average in which a more precise observation carries more weight. Work out how uncertainty and weight must be related.',
        ),
        t(
          '독립인 두 측정과 각각의 표준불확도를 준비했다. 가중 평균과 그 불확도를 함께 계산하자. 관측을 합친다는 것은 값을 섞는 것뿐 아니라 근거의 무게를 정하는 일이다.',
          'Two independent measurements and their standard uncertainties are ready. Calculate the weighted mean and its uncertainty. Combining observations means weighting their evidence, not merely mixing their values.',
        ),
        t(
          '독립인 측정을 모으니 결과를 더 좁힐 수 있었다. 하지만 같은 건판의 보정이 틀렸다면 별을 더 많이 재도 그 실수가 함께 따라온다. 마지막에는 바로 그 공통 오차를 점검한다.',
          'Independent measurements can narrow the result. But if one plate’s calibration is wrong, measuring more stars carries that error along. The last task examines this shared error.',
        ),
      ),
      act(
        t(
          '같은 사진에서 별의 수를 늘려 다시 측정한다. 각 별의 위치를 읽는 흔들림과 사진 전체의 축척 오류는 다른 종류다. 어떤 것은 평균으로 줄고, 어떤 것은 함께 남을까?',
          'Measure more stars on the same photograph. Scatter in reading each position differs from an error in the whole plate’s scale. Which kind averages down, and which travels with every measurement?',
        ),
        t(
          '관측점이 늘어나 오차막대가 짧아져도 사진 전체가 같은 방향으로 밀릴 수 있다. 서로 독립인 흔들림과 공통된 치우침을 나누어, 정밀함이 곧 정확함인지 따져 보자.',
          'More points can shorten an error bar while the whole photograph remains displaced in one direction. Separate independent scatter from shared bias: is precision the same as accuracy?',
        ),
        t(
          '최종 보고서 앞에서 멈춘다. 같은 건판의 별을 계속 추가하면 불확도가 끝없이 작아질까? 공통 보정 오차가 남는 조건에서 어떤 결론까지 허용되는지 골라 보자.',
          'Pause before the final report. Can adding stars from the same plate reduce uncertainty without limit? Decide what is justified when a shared calibration error remains.',
        ),
        t(
          '일식 사진은 이론과 관측이 만나는 자리였다. 예상 각도를 계산하고, 측정을 합치고, 함께 남는 오차까지 살펴야 작은 위치 차이에 의미를 부여할 수 있었다.',
          'The eclipse photograph became a meeting point for theory and observation. Predicting an angle, combining measurements, and checking shared errors were all needed to interpret a tiny shift.',
        ),
      ),
    ],
    ending: t(
      '다시 사진 속 태양 가장자리를 본다. 작은 별의 위치 차이는 혼자서 결론을 말하지 않는다. 어떤 값을 예상했고, 어떻게 측정했고, 무엇이 함께 틀릴 수 있는지까지 묻고 나서야 빛이 지나온 길을 이야기할 수 있다.',
      'Return to the Sun’s edge in the photograph. A tiny star-position difference cannot speak for itself. Only after asking what was predicted, how it was measured, and what could be wrong together can you tell a story about the light’s path.',
    ),
  },
  'chandrasekhar-limit': {
    setting: t('1930년대 · 별의 마지막을 계산하다', '1930s · Calculating a star’s possible ending'),
    opening: t(
      '연료가 바닥난 뒤에도 별의 잔해가 모두 무너지는 것은 아니다. 전자들이 만드는 압력이 백색왜성을 지탱할 수 있다. 찬드라세카르가 마주한 질문은 그 지탱에 끝이 있느냐는 것이었다.',
      'Running out of fuel does not make every stellar remnant collapse. Pressure from electrons can support a white dwarf. Chandrasekhar’s question was whether that support has a limit.',
    ),
    question: t(
      '더 무거운 별의 잔해도, 더 작아지기만 하면 버틸 수 있을까?',
      'Can a heavier stellar remnant always survive by becoming smaller?',
    ),
    chapters: [
      act(
        t(
          '백색왜성 내부의 물질을 전자와 원자핵으로 나누어 그린다. 질량의 대부분을 맡는 쪽과 압력을 만드는 쪽이 다르다. 같은 질량에 전자가 몇 개 들어 있는지가 왜 중요할까?',
          'Sketch the material inside a white dwarf as electrons and nuclei. Most mass and most supporting pressure come from different components. Why should the number of electrons per unit mass matter?',
        ),
        t(
          '원자핵의 조성을 바꾸면 전자 한 개가 떠받칠 평균 질량도 달라진다. 별의 출생 때 질량이 아니라, 지금 잔해를 이루는 물질의 비율을 비교하고 있다는 점을 기억하자.',
          'Changing nuclear composition changes the average mass carried per electron. Keep the comparison on the material in the remnant, rather than the star’s mass at birth.',
        ),
        t(
          '차갑고 회전하지 않는 이상화된 백색왜성 모형을 택했다. 주어진 조성의 전자당 평균 질량으로 한계질량을 계산한다. 물질의 구성이 별의 마지막 선택지를 어떻게 바꾸는지 보자.',
          'Use an idealized cold, non-rotating white dwarf. Calculate its limiting mass from the supplied composition’s mass per electron. See how material composition affects a remnant’s possible future.',
        ),
        t(
          '한계는 조성과 함께 달라진다. 이제 한계보다 충분히 가벼운 별들을 비교해 보자. 질량을 더 가진 백색왜성의 크기는 직관처럼 커질까?',
          'The limit depends on composition. Now compare models well below it. Does the more massive white dwarf become larger, as intuition might suggest?',
        ),
      ),
      act(
        t(
          '한 별의 성장 장면이 아니라 서로 다른 평형 모형 두 개를 나란히 둔다. 중력이 강해질 때 물질이 더 빽빽해지며 버틴다. 이때 질량과 반지름이 향하는 방향을 살펴보자.',
          'Place two separate equilibrium models side by side, rather than stages in one star’s growth. Matter becomes denser to balance stronger gravity. Examine how mass and radius move relative to each other.',
        ),
        t(
          '모형 사이 관계는 거듭제곱으로 적혀 있다. 질량을 배로 했을 때 반지름도 단순히 배나 절반이 되는 것은 아니다. 지수가 크기의 변화를 어떻게 조절하는지 읽어 보자.',
          'A power law relates the models. Doubling mass need not simply double or halve the radius. Read how the exponent controls the change in size.',
        ),
        t(
          '같은 조성을 가진 비상대론적 근사의 두 평형 모형을 비교한다. 기준 모형의 반지름에서 새 모형의 반지름을 추정하자. 이 식을 한계질량 근처까지 그대로 늘려 쓰지는 않는다.',
          'Compare two equilibrium models of the same composition in the non-relativistic approximation. Estimate a radius from the reference model, without extending this relation unchanged up to the mass limit.',
        ),
        t(
          '더 무거운 모형이 더 작아지는 까닭을 읽었다. 그러나 압축을 계속 상상하면 전자의 운동을 다루는 법 자체가 달라진다. 마지막 장에서는 이 근사가 끝나는 곳을 살핀다.',
          'You have seen why the heavier model can be smaller. But further compression changes how electron motion must be treated. The last act examines where the approximation reaches its limit.',
        ),
      ),
      act(
        t(
          '물질을 점점 더 조밀하게 놓는다고 상상해 보자. 전자의 운동이 상대론적인 영역에 가까워지면 압력의 증가 법칙도 바뀐다. 이전 장의 식을 그대로 가져올 수 없는 이유를 찾자.',
          'Imagine increasingly dense matter. As electron motion becomes relativistic, the pressure law changes. Find why the relation from the previous act can no longer be carried over unchanged.',
        ),
        t(
          '중력이 요구하는 압력과 전자가 제공하는 압력을 같은 반지름의 거듭제곱으로 적어 본다. 크기를 줄일 때 두 항이 같은 비율로 커지면, 압축이 한쪽에 유리한 탈출구가 될까?',
          'Write gravitational demand and electron support as powers of the same radius. If shrinking boosts both by the same factor, can compression still provide an escape in favour of support?',
        ),
        t(
          '이상화한 상대론적 한계에서 두 항은 같은 반지름 의존성을 보인다. 반지름을 더 줄이는 선택으로 모든 질량을 지탱할 수 있는지, 이제 식의 구조만으로 결론을 내려 보자.',
          'In the idealized relativistic limit, both terms share the same radius dependence. Use that structure to decide whether choosing a still smaller radius can support any mass whatsoever.',
        ),
        t(
          '작아지는 것은 만능 해결책이 아니었다. 압력과 중력의 크기 의존성이 같아지는 곳에서, 반지름을 바꾸는 대신 질량 자체가 허용 범위를 결정한다.',
          'Becoming smaller was not a universal solution. Where support and gravity share the same size dependence, changing radius gives way to a restriction on mass itself.',
        ),
      ),
    ],
    ending: t(
      '처음의 별의 잔해로 돌아온다. 조성은 지탱할 전자의 수를 정하고, 압축은 크기를 바꾸지만, 끝없이 무거운 잔해를 구해 주지는 못한다. 별의 마지막을 가르는 경계는 작아지는 과정의 끝에서 식의 구조로 드러났다.',
      'Return to the remnant at the beginning. Composition sets the electrons available for support, and compression changes size, but neither rescues an arbitrarily massive remnant. The boundary of a possible stellar ending has emerged from the structure of the equations.',
    ),
  },
  'hubble-expansion': {
    setting: t(
      '1920년대 · 은하의 거리표와 속도표를 겹치다',
      '1920s · Bringing galaxy distances and velocities together',
    ),
    opening: t(
      '은하의 거리표 옆에 시선속도 기록을 놓는다. 서로 따로 있던 두 숫자를 한 그래프에 찍자 관계가 보이기 시작한다. 르메트르의 해석과 허블의 거리 연구, 슬라이퍼 등의 속도 관측이 만나는 질문이다.',
      'Put galaxy distances beside radial-velocity records. Plotting the two columns together reveals a relation. The question connects Lemaître’s interpretation, Hubble’s distance work, and velocities measured by Slipher and others.',
    ),
    question: t(
      '은하들이 멀어지는 모습에서, 우주의 시간까지 읽을 수 있을까?',
      'Can the recession of galaxies tell us something about cosmic time?',
    ),
    chapters: [
      act(
        t(
          '먼저 교육용 관측표를 좌표 위에 옮긴다. 가로축에는 거리, 세로축에는 후퇴 속도를 둔다. 그림의 기울기가 어느 양을 어느 양으로 나눈 것인지 읽어 보자.',
          'Move the teaching table onto a graph: distance horizontally, recession speed vertically. Read which quantity divided by which is represented by the slope.',
        ),
        t(
          '세 점이 한 직선 위에 꼭 맞지는 않는다. 이번 모형은 원점을 지나는 선을 사용하고 속도 측정의 불확도를 같게 둔다. 여러 기울기 중 자료와의 어긋남이 가장 작은 것을 찾아야 한다.',
          'The three points do not lie exactly on one line. This model uses a line through the origin with equal velocity uncertainties. Find the slope that minimizes the mismatch with the data.',
        ),
        t(
          '주어진 거리들은 정확하다고 놓고, 세 속도에는 같은 무게를 준다. 이 교육용 자료에서 원점을 지나는 최적 직선을 구하자. 역사 속 원자료를 그대로 재현한 숫자는 아니다.',
          'Treat the supplied distances as exact and weight the three velocities equally. Fit the best line through the origin for this teaching dataset, rather than a reproduction of the historical measurements.',
        ),
        t(
          '거리와 속도를 하나의 기울기로 묶었다. 그런데 단위를 뒤집으면 시간이 나타난다. 이것을 곧바로 우주의 나이라고 불러도 되는지 다음 장에서 따져 보자.',
          'Distance and speed have become one slope. Inverting its units produces a time. Next, examine whether that time can immediately be called the age of the universe.',
        ),
      ),
      act(
        t(
          '지도 위 은하들이 멀어지는 장면을 거꾸로 돌려 본다. 거리를 현재 속도로 나누면 하나의 시간 척도가 나온다. 단위가 시간으로 바뀌는 과정을 먼저 따라가자.',
          'Imagine reversing the recession shown on the map. Dividing distance by the present speed gives a timescale. First follow how the units become time.',
        ),
        t(
          '지금 재는 팽창률은 오늘의 속도계다. 과거에도 같은 방식으로 팽창했다고 보장하지는 않는다. 속도계 하나와 전체 여행 시간이 왜 다른 정보인지 생각해 보자.',
          'The present expansion rate is today’s speedometer. It does not guarantee the same expansion history in the past. Consider why one speedometer reading differs from a complete travel time.',
        ),
        t(
          '여기서는 앞 장의 적합 결과 대신 별도로 주어진 현대적 허블 계수를 사용한다. 역수를 시간 단위로 바꾸어 허블 시간을 구하자. 결과가 무엇을 말하고, 무엇은 아직 말하지 않는지도 기억하자.',
          'Use a separately supplied modern Hubble parameter, not the fit from the previous act. Convert its inverse into a Hubble time, keeping track of what that result does and does not establish.',
        ),
        t(
          '팽창률에서 시간 척도를 얻었지만 우주의 실제 나이에는 팽창 이력이 필요하다. 마지막으로, 처음 사용한 거리의 자가 통째로 달라졌을 때 이 두 숫자가 어떻게 움직일지 본다.',
          'Expansion rate gives a timescale, while actual cosmic age requires an expansion history. Finally, see what happens when the distance ruler itself changes.',
        ),
      ),
      act(
        t(
          '같은 은하 사진을 새 거리 보정으로 다시 읽는다. 시선속도는 그대로인데 거리표가 바뀌었다. 그래프의 점들이 어느 방향으로 옮겨 가는지 먼저 살펴보자.',
          'Reinterpret the same galaxies with a new distance calibration. Radial velocities stay unchanged while the distance table shifts. First follow the points across the graph.',
        ),
        t(
          '거리의 자를 늘려 잡으면 같은 후퇴 속도에 더 긴 거리가 대응한다. 직선의 기울기와 그 역수인 시간 척도가 함께 같은 방향으로 움직일까?',
          'A longer distance scale assigns more distance to the same recession speed. Do the line’s slope and its inverse timescale move in the same direction?',
        ),
        t(
          '보고서의 모든 거리에 같은 배율의 보정이 들어왔다. 속도 관측은 보존한다. 허블 계수와 허블 시간에 필요한 수정 방향을 함께 골라 보자.',
          'Every distance in the report receives the same scale correction, while the velocity observations remain. Choose the linked corrections to the Hubble parameter and Hubble time.',
        ),
        t(
          '거리의 눈금은 그래프의 기울기와 시간 척도까지 연결되어 있었다. 우주의 큰 이야기를 쓰려면, 출발점인 거리 보정도 끝까지 따라와야 했다.',
          'The distance scale was connected to both the graph’s slope and its timescale. A story on cosmic scales still depends on carrying the initial calibration through to the end.',
        ),
      ),
    ],
    ending: t(
      '처음 나란히 놓았던 거리표와 속도표가 우주의 팽창을 묻는 그래프가 됐다. 그 기울기에서 시간을 읽되, 거리 보정과 팽창의 과거를 빠뜨리지 않는 법도 익혔다. 멀어지는 은하들은 답 하나보다 더 넓은 질문을 남긴다.',
      'The two tables have become a graph asking about cosmic expansion. You read a timescale from its slope while keeping distance calibration and past expansion in view. The receding galaxies leave a question wider than any single number.',
    ),
  },
  'zwicky-cluster': {
    setting: t('1933년 · 머리털자리 은하단의 움직임', '1933 · Motion in the Coma cluster'),
    opening: t(
      '사진에는 은하들이 한 무리로 모여 있다. 하지만 속도를 읽어 보니, 빛으로 짐작한 질량만으로 이 무리를 붙잡을 수 있을지 의문이 생긴다. 츠비키의 계산을 따라, 사진에 보이는 것과 움직임이 요구하는 것을 비교한다.',
      'A photograph shows galaxies gathered into a cluster. Their velocities raise a question: can the mass suggested by their light hold the group together? Follow Zwicky’s line of inquiry by comparing visible light with the demands of motion.',
    ),
    question: t(
      '사진에 보이는 질량만으로, 이 은하들을 한데 붙잡을 수 있을까?',
      'Can the mass suggested by the photograph hold these galaxies together?',
    ),
    chapters: [
      act(
        t(
          '관측표에는 우리 쪽으로 오거나 멀어지는 속도만 적혀 있다. 은하들은 옆으로도 움직일 수 있다. 모든 방향의 움직임이 비슷하다는 가정이 어떤 빈칸을 채우는지 살펴보자.',
          'The table records only motion toward or away from us. Galaxies can also move sideways. See which missing information is supplied by assuming similar motions in all directions.',
        ),
        t(
          '은하단을 오래 유지되는 평형 상태의 구로 근사한다. 운동에너지와 중력에너지를 잇는 관계를 쓰려면 이 가정이 필요하다. 한 장의 사진이 평형 자체를 보장하지는 않는다는 점도 짚자.',
          'Approximate the cluster as a long-lived sphere in equilibrium. That assumption lets kinetic and gravitational energies be related. A photograph alone does not guarantee equilibrium.',
        ),
        t(
          '이번 교육용 모형은 균일한 구와 등방적인 속도 분포다. 주어진 반지름과 시선속도 분산으로 질량을 추정하자. 식의 계수는 이 모형에서 온 것이며 모든 은하단의 고정값은 아니다.',
          'This teaching model is a uniform sphere with isotropic velocities. Estimate mass from its radius and line-of-sight velocity dispersion. The coefficient belongs to this model, not to every cluster universally.',
        ),
        t(
          '움직임을 붙잡는 데 필요한 질량이 나왔다. 그러나 관측 기기도 속도표를 조금씩 흔든다. 그 흔들림까지 은하의 운동으로 셌다면 질량을 얼마나 부풀렸을까?',
          'You have a mass needed to bind the motion. But the instrument also adds scatter to the velocity table. How much would counting that scatter as galactic motion inflate the estimate?',
        ),
      ),
      act(
        t(
          '관측된 속도 분포 옆에 기기의 측정 오차를 적는다. 서로 독립인 두 흔들림은 표준편차를 그대로 빼는 방식으로 분리하지 않는다. 어떤 양에서 더해졌는지 거슬러 가자.',
          'Write the instrument’s measurement error beside the observed velocity spread. Independent scatter is not separated by directly subtracting standard deviations. Trace back to the quantity in which it was added.',
        ),
        t(
          '기기의 몫을 걷어 낸 뒤 속도 분산이 줄었다. 질량식은 그 속도 척도의 제곱을 사용한다. 작은 보정이 질량 추정에 어떤 비율로 전달되는지 확인하자.',
          'Removing instrumental scatter reduces the velocity dispersion. The mass relation uses the square of that velocity scale. Track the correction into the mass estimate.',
        ),
        t(
          '교육용 관측값과 독립적인 기기 오차가 주어졌다. 분산에서 기기의 몫을 제거한 뒤, 보정 전후의 질량을 비교한다. 실제 은하의 운동으로 남는 부분만 사용하자.',
          'The teaching record supplies observed scatter and independent instrumental error. Remove the instrument’s contribution in variance, then compare masses before and after correction. Keep only the scatter attributed to galactic motion.',
        ),
        t(
          '기기 오차를 걷어 내도 빛과 운동의 비교는 끝나지 않는다. 평형 가정이 맞는지, 질량을 다른 방법으로 재도 같은 결론인지 확인해야 한다. 마지막에는 다음 관측을 설계한다.',
          'Correcting the instrument does not finish the comparison of light and motion. Equilibrium and independent mass measurements still matter. The final act designs a further observation.',
        ),
      ),
      act(
        t(
          '빛으로 계산한 질량과 운동으로 계산한 질량이 다르다고 하자. 차이를 발견한 일과 보이지 않는 물질의 정체를 알아낸 일은 서로 다르다. 지금 손에 든 증거의 범위를 먼저 정하자.',
          'Suppose luminous and dynamical mass estimates disagree. Finding a discrepancy differs from identifying unseen matter. First define the reach of the evidence in hand.',
        ),
        t(
          '움직임만으로 생긴 착시인지 확인하려면 다른 방식의 저울이 필요하다. 은하단의 가스나 배경 빛의 휘어짐처럼, 같은 중력을 다른 현상으로 읽을 방법을 떠올려 보자.',
          'To test whether the discrepancy is peculiar to the motion model, find another kind of balance. Consider reading the same gravity through cluster gas or the bending of background light.',
        ),
        t(
          '관측 제안서의 마지막 문장을 고른다. 은하단 질량의 차이를 검증하는 데 도움이 되면서도, 자료가 아직 말하지 않은 입자의 정체까지 단정하지 않는 계획이어야 한다.',
          'Choose the last sentence of the observing proposal. It should test the mass discrepancy without claiming that the data already identify a particular particle.',
        ),
        t(
          '속도의 흩어짐은 질량의 단서가 되었고, 그 단서는 독립적인 관측을 요청하는 근거가 됐다. 보이지 않는 몫을 묻는 일은 가정과 기기를 함께 점검하는 일에서 출발했다.',
          'A velocity spread became a clue to mass, and that clue became a reason for independent observations. Asking about unseen mass began with checking assumptions and instruments together.',
        ),
      ),
    ],
    ending: t(
      '처음의 은하단 사진은 조용해 보인다. 하지만 그 안의 움직임은 빛만으로 다 읽히지 않는 질문을 남겼다. 질량을 계산하고, 기기의 흔들림을 걷어 내고, 다음 저울을 고르는 동안 사진 밖의 증거까지 함께 보게 되었다.',
      'The original cluster photograph looks quiet. Motion within it has left a question that light alone may not answer. Calculating mass, removing instrumental scatter, and choosing another balance have taught you to look beyond the photograph for evidence.',
    ),
  },
  'rubin-rotation': {
    setting: t('1970년대 · 은하 가장자리의 별빛', '1970s · Starlight at the edge of a galaxy'),
    opening: t(
      '은하 중심에서 바깥쪽으로 측정 위치를 옮긴다. 빛은 옅어지는데 회전 속력은 예상처럼 떨어지지 않는다. 베라 루빈과 켄트 포드의 관측이 선명하게 드러낸 이 차이를, 한 줄의 회전 곡선에서 따라가 본다.',
      'Move the measurement outward from a galaxy’s center. The light fades, but rotation speed does not fall as expected. Follow the discrepancy made clear by observations from Vera Rubin and Kent Ford through a rotation curve.',
    ),
    question: t(
      '빛이 희미해진 은하 바깥에서도, 무엇이 빠른 회전을 붙잡고 있을까?',
      'What sustains fast orbital motion where the galaxy’s light has faded?',
    ),
    chapters: [
      act(
        t(
          '사진 속 은하는 비스듬히 놓여 있다. 스펙트럼은 우리 시선 방향의 속도만 읽는다. 은하를 정면에서 볼 때와 옆에서 볼 때, 같은 회전이 어떻게 달라 보이는지 살펴보자.',
          'The galaxy is tilted in the photograph. Its spectrum reads only the velocity along our line of sight. Examine how the same rotation looks face-on and edge-on.',
        ),
        t(
          '기울어진 원반에서 관측한 속도를 실제 회전 속력으로 되돌린다. 그다음 원운동을 붙잡는 중력과 연결한다. 기울기 보정과 질량 계산을 한 번에 섞지 말고 차례로 잇자.',
          'Recover rotation speed from the tilted disk’s observed velocity, then connect it to gravity supporting circular motion. Keep inclination correction and mass inference as two linked steps.',
        ),
        t(
          '기울기와 시선속도, 관측 반지름이 준비됐다. 실제 원반을 구대칭 질량으로 근사하는 교육용 계산이다. 기울기를 보정한 속력으로 이 반지름 안의 질량을 추정해 보자.',
          'Inclination, line-of-sight velocity, and radius are ready. This teaching calculation approximates the disk with a spherical mass distribution. Correct the speed, then estimate mass within the chosen radius.',
        ),
        t(
          '한 반지름 안의 질량을 얻었다. 이제 관측점을 더 바깥으로 옮겨 본다. 속력이 계속 비슷하다면, 안쪽에 포함되는 질량은 반지름과 함께 어떻게 늘어나야 할까?',
          'You have the mass within one radius. Move the observation outward. If speed stays similar, how must enclosed mass grow with radius?',
        ),
      ),
      act(
        t(
          '관측된 바깥 구간에 수평에 가까운 회전 곡선을 그린다. 속력이 일정하다는 말은 질량이 일정하다는 말과 같지 않다. 반지름을 옮길 때 질량식에 남는 변화를 찾아보자.',
          'Trace the nearly level rotation curve over the observed outer region. Constant speed does not mean constant enclosed mass. Find what still changes in the mass relation as radius grows.',
        ),
        t(
          '반지름을 조금 늘려 얇은 구껍질을 하나 덧댄다고 생각한다. 새로 포함된 질량을 그 껍질의 부피로 나누면 국소적인 밀도를 읽을 수 있다. 전체 평균과 껍질의 밀도를 구별하자.',
          'Increase the radius slightly, adding a thin spherical shell. New enclosed mass divided by shell volume gives a local density. Distinguish it from the average density of the whole sphere.',
        ),
        t(
          '구대칭 근사와 평탄한 회전 속력을 사용해 밀도의 반지름 의존성을 고른다. 이 결론은 관측한 구간에 대한 모형이다. 은하 중심이나 무한히 먼 곳까지 같은 법칙을 늘려 쓰지는 않는다.',
          'Use spherical symmetry and a flat rotation speed to choose the radial density relation. This models the observed region; do not extend it unchanged to the center or to infinite radius.',
        ),
        t(
          '빛이 옅어지는 곳에서도 운동은 바깥쪽 질량의 분포를 묻는다. 마지막에는 같은 반지름에서 보이는 물질만의 회전 예측과 실제 관측을 나란히 놓는다.',
          'Where the light fades, motion still asks about mass at larger radii. Finally, compare the observed speed with the prediction from visible matter at the same radius.',
        ),
      ),
      act(
        t(
          '두 곡선을 겹쳐 본다. 하나는 별과 가스 등 보통 물질로 계산한 속력이고, 다른 하나는 관측한 속력이다. 속력의 차이를 그대로 질량의 차이라고 읽어도 될까?',
          'Overlay two curves: speed predicted from ordinary matter such as stars and gas, and observed speed. Can their speed difference be read directly as a mass difference?',
        ),
        t(
          '질량은 속력의 제곱에 연결된다. 같은 반지름에서 비교해야 공통 인자가 사라진다. 보이는 몫이 차지하는 비율을 먼저 구한 뒤, 남은 몫으로 넘어가 보자.',
          'Mass relates to speed squared. Compare at the same radius so common factors cancel. Find the fraction supplied by visible matter before turning to the remainder.',
        ),
        t(
          '같은 반지름에서 얻은 두 속력을 사용한다. 구대칭 근사 안에서 보통 물질만으로 설명되지 않는 질량 비율을 계산하자. 차이를 정량화하는 일과 그 물질의 정체를 밝히는 일은 구별한다.',
          'Use the two speeds measured at the same radius. Within the spherical approximation, calculate the mass fraction unexplained by ordinary matter. Quantifying a discrepancy does not identify the matter responsible.',
        ),
        t(
          '속력의 차이가 질량의 비율로 바뀌었다. 회전 곡선은 보이지 않는 질량을 묻는 강력한 단서였지만, 그 정체는 다른 관측과 이론이 이어서 풀어야 할 질문으로 남았다.',
          'A speed difference has become a mass fraction. The rotation curve is a powerful clue to unseen mass, while its identity remains a question for further observations and theory.',
        ),
      ),
    ],
    ending: t(
      '처음의 은하 가장자리로 돌아온다. 희미한 빛은 그대로인데 이제 그 속의 움직임이 보인다. 기울기를 풀고, 반지름을 따라 질량을 읽고, 보이는 물질의 몫을 덜어 냈다. 빛이 끝나는 듯한 자리에서도 은하의 이야기는 끝나지 않았다.',
      'Return to the galaxy’s edge. Its light is still faint, but you can now read the motion within it: correcting tilt, tracing mass with radius, and accounting for visible matter. Where the light seemed to end, the galaxy’s story continued.',
    ),
  },
};

// 결말 읽기는 정답·보상과 별개다. 각 장의 계산/판단을 한 번 제출해야 열리고 오답은 복습 대상으로 남는다.
export function canReadHistoryEnding(
  quest: HistoryQuest,
  progress: ReadonlyMap<string, { readonly attempts: readonly unknown[] }>,
): boolean {
  return quest.questions.every((question) => (progress.get(question.id)?.attempts.length ?? 0) > 0);
}
