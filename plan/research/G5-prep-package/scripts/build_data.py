#!/usr/bin/env python3
"""G5 사전 작업 데이터. 첨부 G3 초안에 근거하며 정식 콘텐츠 인덱스가 아니다."""
from pathlib import Path
import json, csv, hashlib, random, collections
ROOT=Path(__file__).resolve().parents[1]
G3=json.loads((ROOT/'inputs/g3-content-draft.json').read_text())
CONTENT={a['id']:a for a in G3}
CAT={a['id']:a for a in csv.DictReader((ROOT/'inputs/catalog-values.v1.csv').open(encoding='utf-8-sig'))}
CONST={a['iau_abbr']:a for a in csv.DictReader((ROOT/'inputs/constellations_ko.csv').open(encoding='utf-8-sig'))}
T=lambda s:{'ko':s}
S={'sirius':'star:HIP32349','arcturus':'star:HIP69673','vega':'star:HIP91262','rigel':'star:HIP24436','betelgeuse':'star:HIP27989','altair':'star:HIP97649','aldebaran':'star:HIP21421','antares':'star:HIP80763','deneb':'star:HIP102098','polaris':'star:HIP11767'}
O=lambda x:S.get(x,x if ':' in x or x in ('sun','moon') else 'planet:'+x)
QUIZ=[]; EVIDENCE=[]

def evidence(qid, obj, pointers, rationale='첨부 G3 초안의 해당 문장과 카탈로그 소속을 재구성했다.', extra=None):
    obj=O(obj); a=CONTENT[obj]
    EVIDENCE.append({'quizId':qid,'basis':'provided-content','contentId':obj,'contentFile':'inputs/g3-content-draft.json','fields':pointers,'sourceUrls':sorted(set(s.split(' | ')[-1] for s in a['sources'] if 'http' in s)),'rationale':rationale, **(extra or {})})
    EVIDENCE[-1]['sourceUrlsRole']='G3 항목의 상위 출처 목록. 해당 URL 모두를 이번에 다시 열거나 각 문장 근거로 승인한 것은 아님.'
    if qid in ['q-moon-sequence','q-moon-shadow-not-phase']:
        EVIDENCE[-1]['basis']='provided-content-plus-external-verification'
        EVIDENCE[-1]['externalSupport']=[{'title':'NASA — Moon Phases','url':'https://science.nasa.gov/moon/moon-phases/','accessedAt':'2026-09-07','supports':'주요 위상 순서와 조명 배치에 따른 변화. 지구 그림자로 인한 월식과 보통 위상을 구분.'}]


def mc(slug,obj,d,q,answers,ex,tag='개념',fields=None):
    """첫 입력 보기가 정답. 고정 시드로 보기를 섞어 answer를 함께 갱신한다."""
    qid='q-'+slug; obj=O(obj)
    order=list(range(len(answers))); random.Random(qid).shuffle(order)
    out={'id':qid,'objectId':obj,'type':'mc','question':T(q),'choices':[T(answers[i]) for i in order],'answer':order.index(0),'explanation':T(ex),'difficulty':d,'tags':[tag]}
    if obj.startswith('star:'):out['constellation']=CAT[obj]['con']
    QUIZ.append(out); evidence(qid,obj,fields or ['summary.ko','facts','observing'])

def tf(slug,obj,d,q,ans,ex,tag='개념',fields=None):
    qid='q-'+slug; obj=O(obj)
    out={'id':qid,'objectId':obj,'type':'trueFalse','question':T(q),'answer':ans,'explanation':T(ex),'difficulty':d,'tags':[tag]}
    if obj.startswith('star:'):out['constellation']=CAT[obj]['con']
    QUIZ.append(out); evidence(qid,obj,fields or ['summary.ko','story.ko','observing'])

# MC 입문 24개. 별자리 소속 10개는 첨부 카탈로그와 G2의 이름표만 사용한다.
cons=[('sirius',['큰개자리','작은곰자리','오리온자리','목동자리']),('arcturus',['목동자리','황소자리','독수리자리','작은곰자리']),('vega',['거문고자리','백조자리','독수리자리','전갈자리']),('rigel',['오리온자리','목동자리','거문고자리','큰개자리']),('betelgeuse',['오리온자리','전갈자리','황소자리','작은곰자리']),('altair',['독수리자리','백조자리','거문고자리','목동자리']),('aldebaran',['황소자리','큰개자리','목동자리','오리온자리']),('antares',['전갈자리','독수리자리','백조자리','황소자리']),('deneb',['백조자리','거문고자리','독수리자리','큰개자리']),('polaris',['작은곰자리','큰곰자리','오리온자리','목동자리'])]
for key,choices in cons:
    name=CONTENT[O(key)]['title']['ko']; con=CAT[O(key)]['con']
    mc(key+'-constellation',key,1,f'{name}가 속한 별자리는 어디인가요?',choices,f'{name}의 별자리 코드는 {con}이며 한국어 이름은 {choices[0]}입니다.','별자리',['facts','catalog.con','constellations_ko.csv'])
mc('sun-kind','sun',1,'태양은 어떤 종류의 천체인가요?',['스스로 에너지를 내는 별','지구의 자연위성','태양빛만 반사하는 행성','여러 별이 모인 은하'],'태양은 중심의 핵융합으로 에너지를 내는 별입니다.','천체 종류')
mc('moon-kind','moon',1,'달은 지구와 어떤 관계인 천체인가요?',['지구의 자연위성','지구보다 안쪽 궤도의 행성','지구를 포함하는 은하','태양과 같은 별'],'달은 지구 주위를 도는 자연위성입니다.','천체 종류')
mc('moon-light','moon',1,'달이 밝게 보이는 빛의 주된 근원은 무엇인가요?',['달에서 반사된 태양빛','달 중심의 수소 핵융합','달 표면의 열복사','달 내부의 방사성 붕괴에서 직접 나오는 가시광'],'달은 스스로 태양처럼 빛나지 않고 태양빛을 반사합니다.','달')
mc('mercury-nearest-sun','mercury',1,'태양에 가장 가까운 행성은 무엇인가요?',['수성','금성','화성','목성'],'수성은 태양에 가장 가까운 궤도를 도는 행성입니다. 지구에서 가장 가까운 행성을 묻는 문제는 아닙니다.','태양계')
mc('venus-phase','venus',1,'소형 망원경으로 금성을 볼 때 조건에 따라 확인할 수 있는 모습은 무엇인가요?',['초승달이나 반달 같은 위상','구름 아래의 산과 도로','달처럼 큰 충돌구의 세부','토성과 같은 뚜렷한 고리'],'금성은 지구보다 안쪽 궤도를 돌아 위상이 달라집니다. 구름 아래 지표면은 작은 망원경으로 볼 수 없습니다.','관측')
mc('mars-color','mars',1,'화성의 붉은빛을 설명하는 표면 물질은 무엇인가요?',['산화철이 섞인 먼지','표면 전체를 덮은 액체 용암','두꺼운 구름층의 붉은 물방울','지구의 그림자'],'화성 표면의 산화철 성분이 붉은빛과 연결됩니다. 전쟁 신의 이름은 문화적 이야기이지 색의 물리적 원인이 아닙니다.','색')
mc('jupiter-kind','jupiter',1,'목성의 분류로 알맞은 것은 무엇인가요?',['거대 가스 행성','암석 행성','백색왜성','지구의 자연위성'],'목성은 주로 수소와 헬륨으로 이루어진 거대 가스 행성입니다.','천체 종류')
mc('saturn-feature','saturn',1,'소형 망원경으로 토성을 확인할 때 대표적인 관측 특징은 무엇인가요?',['행성 원반 둘레의 고리','달과 같은 울퉁불퉁한 충돌구','별처럼 자전하는 표면 흑점','태양의 홍염'],'토성의 고리는 대표적인 관측 특징입니다. 고리가 보이는 기울기와 대기 상태에 따라 모습은 달라집니다.','관측')
mc('uranus-kind','uranus',1,'천왕성과 해왕성에 공통으로 쓰는 분류는 무엇인가요?',['거대 얼음 행성','암석 행성','갈색왜성','구상성단'],'천왕성과 해왕성은 거대 얼음 행성으로 분류합니다. 이름만으로 겉면이 단단한 얼음판이라고 생각하면 안 됩니다.','천체 종류')
mc('neptune-eye','neptune',1,'해왕성 관측을 처음 시작할 때 알맞은 기대는 무엇인가요?',['맨눈보다 광학 장비와 위치 확인이 필요하다','도시에서 맨눈으로 큰 원반이 보인다','10×50으로 구름 무늬가 늘 선명하다','90mm로 탐사선 같은 표면 사진을 본다'],'해왕성은 맨눈으로 찾기 어려운 희미한 행성입니다. 작은 장비에서는 위치와 점 또는 작은 원반 확인이 현실적인 목표입니다.','관측')
mc('vega-tradition','vega',1,'콘텐츠의 한국 칠석 안내에서 베가에 대응하는 이름은 무엇인가요?',['직녀성','견우성','천랑성','북극성'],'이 콘텐츠는 베가를 직녀성으로 연결합니다. 이는 칠석 전승의 대응 이름이며 별의 물리적 종류는 아닙니다.','전통',['koreanTradition','story.ko'])
mc('altair-tradition','altair',1,'콘텐츠의 한국 칠석 안내에서 알타이르에 대응하는 이름은 무엇인가요?',['견우성','직녀성','북극성','천랑성'],'이 콘텐츠에서는 알타이르를 견우성으로 연결합니다. 다른 전통 성군의 비슷한 명칭까지 같은 별로 합치지는 않습니다.','전통',['koreanTradition','story.ko'])
mc('deneb-triangle','deneb',1,'베가·알타이르와 함께 여름 대삼각형을 이루는 별은 무엇인가요?',['데네브','시리우스','리겔','알데바란'],'여름 대삼각형의 세 꼭짓점은 베가·알타이르·데네브입니다. 한 별자리가 아니라 여러 별자리에 걸친 길잡이 무늬입니다.','길잡이',['summary.ko'])
mc('sun-safe-choice','sun',1,'태양 관측용 안전 장비가 준비되지 않았을 때 이 앱에서 할 행동은 무엇인가요?',['직접 관측하지 않고 태양 안전 설명을 읽는다','짙은 선글라스로 망원경을 들여다본다','눈을 빨리 깜빡이며 무필터로 본다','일식 안경을 쓰고 무필터 쌍안경으로 본다'],'필터 없이 절대 보지 말아야 합니다. 일식 안경은 무필터 쌍안경이나 망원경과 함께 쓰는 보호 수단이 아닙니다.','안전',['safety','howToFind.ko'])

# MC 중급 24개: 관측 판단과 안정적인 개념.
mc('moon-sequence','moon',2,'달의 주요 위상이 한 주기를 도는 순서로 알맞은 것은 무엇인가요?',['삭 → 상현 → 보름 → 하현','상현 → 삭 → 보름 → 하현','보름 → 상현 → 삭 → 하현','삭 → 하현 → 보름 → 상현'],'주요 위상은 삭에서 상현·보름·하현을 거쳐 다시 삭으로 이어집니다. 원반의 화면 회전 방향과는 다른 개념입니다.','달',['facts','sources'])
mc('moon-terminator','moon',2,'달의 크레이터와 산 그림자를 살펴보기 좋은 위치는 어디인가요?',['밝은 면과 어두운 면의 경계 부근','달에서 멀리 떨어진 빈 하늘','항상 원반 중심 한 점만','밝은 면만 꽉 찬 보름의 중심만'],'명암 경계에서는 지형의 그림자가 길어져 형태를 구별하기 쉽습니다. 보름이 항상 지형 관측에 가장 유리한 것은 아닙니다.','달')
mc('moon-maria','moon',2,'달에서 바다라고 부르는 어두운 무늬는 주로 무엇인가요?',['용암이 굳은 평원','현재 액체 물로 가득 찬 바다','두꺼운 달 구름이 만든 그림자','태양빛이 전혀 닿지 않는 영구 구멍'],'달의 바다는 주로 오래된 용암이 굳은 어두운 평원입니다. 바다라는 이름이 실제 액체 물을 뜻하지는 않습니다.','달')
mc('moon-support','moon',2,'10×50 쌍안경의 흔들림 때문에 달 지형을 보기 어렵다면 무엇을 먼저 바꾸나요?',['팔받침이나 삼각대로 시야를 안정시킨다','배율을 무조건 더 높인다','태양 가까이로 시야를 옮긴다','보이지 않은 지형도 보였다고 기록한다'],'10배 쌍안경은 지지하면 달의 큰 지형을 살피기 수월합니다. 관측 기록에는 직접 확인한 범위만 남깁니다.','관측')
mc('venus-two-names','venus',2,'샛별과 개밥바라기의 관계를 가장 잘 설명한 것은 무엇인가요?',['보이는 때에 따라 부르는 같은 금성이다','서로 다른 두 별이다','금성의 위성 두 개이다','목성과 토성의 다른 이름이다'],'한국어 하늘 안내에서 새벽 금성은 샛별, 저녁 금성은 개밥바라기라고 부릅니다. 둘은 같은 행성입니다.','전통',['koreanTradition','story.ko'])
mc('venus-surface','venus',2,'90mm 망원경으로 금성의 지표면을 자세히 볼 수 없는 주된 이유는 무엇인가요?',['두꺼운 구름이 지표를 가리고 있다','금성이 빛을 전혀 반사하지 않는다','금성에는 낮이 존재하지 않는다','금성이 태양계 밖에 있기 때문이다'],'금성은 두꺼운 구름으로 덮여 있어 가시광의 작은 망원경으로 지표면을 볼 수 없습니다. 대신 위상을 관측합니다.','관측')
mc('mercury-horizon','mercury',2,'수성을 찾을 때 계절 이름 외에 특히 확인해야 하는 조건은 무엇인가요?',['태양과의 각거리와 지평선·박명 상태','달의 위상만 단독으로 확인하기','별자리 이름에 붙은 계절만 확인하기','관측지의 경도를 빼고 위도만 확인하기'],'수성은 태양에서 크게 떨어지지 않아 낮은 하늘과 박명의 영향을 많이 받습니다. 계절이나 고정 시각만으로 관측 가능하다고 판단하지 않습니다.','관측')
mc('mars-size','mars',2,'화성이 망원경에서 크게 보이는 정도에 큰 영향을 주는 것은 무엇인가요?',['그때의 지구와 화성 사이 거리','화성의 자전 주기 자체','화성의 위성 개수','하늘 지도에 그려진 행성 아이콘 크기'],'지구와 화성의 거리가 달라지면 겉보기 원반 크기도 달라집니다. 같은 장비여도 관측 시기에 따라 성과가 다를 수 있습니다.','관측')
mc('jupiter-moons','jupiter',2,'목성을 10×50으로 관측할 때 현실적인 목표는 무엇인가요?',['조건이 맞을 때 가까운 밝은 위성 점들을 확인한다','대적점의 미세 소용돌이를 촬영한다','위성의 크레이터를 하나씩 분리한다','위성 네 개가 항상 모두 보인다고 결론낸다'],'갈릴레이 위성은 조건이 좋으면 목성 곁의 점으로 보입니다. 가림이나 겹침 때문에 네 개가 늘 따로 보이는 것은 아닙니다.','관측')
mc('saturn-ring-tilt','saturn',2,'토성의 고리가 유난히 가늘게 보일 때 가능한 설명은 무엇인가요?',['지구에서 보는 고리의 기울기가 달라졌다','고리 물질이 전부 하루 만에 사라졌다','토성이 암석 행성으로 바뀌었다','고리 대신 달의 그림자를 보고 있다'],'토성 고리의 보이는 폭은 관측 방향의 기울기에 따라 달라집니다. 실제 모습을 시기별로 기록하는 것이 좋습니다.','관측')
mc('uranus-point','uranus',2,'도시에서 천왕성을 10×50으로 찾을 때 중요한 일은 무엇인가요?',['앱의 현재 위치와 주변 별 배치를 대조한다','푸른색처럼 보이면 어느 점이든 천왕성으로 기록한다','표면 구름부터 구별한다','겨울이면 매일 같은 자리에 있다고 가정한다'],'천왕성은 쌍안경에서 별 같은 점으로 보일 수 있어 위치 대조가 중요합니다. 행성의 위치는 날짜에 따라 달라집니다.','관측')
mc('neptune-identify','neptune',2,'작은 망원경에서 해왕성 후보를 찾았다면 무엇으로 확인하는 것이 좋나요?',['계산된 위치와 주변 별의 배치를 함께 확인한다','희미한 모든 별을 해왕성으로 간주한다','파란 번짐만으로 확정한다','항상 가장 밝은 점을 고른다'],'해왕성은 작고 희미해 작은 장비로 확인할 때 위치 정보가 중요합니다. 색 인상만으로 확정하지 않습니다.','관측')
mc('arcturus-guide','arcturus',2,'아르크투루스를 찾을 때 이어 볼 수 있는 길잡이는 무엇인가요?',['북두칠성 손잡이의 곡선','오리온 허리띠에서 시리우스로 향하는 연장선','폴라리스에서 천정으로 가는 고정 수직선','달의 뿔 끝을 항상 잇는 선'],'북두칠성 손잡이의 곡선을 이어 아르크투루스를 찾는 방법을 콘텐츠에서 안내합니다. 시각에 따라 화면 방향은 회전할 수 있습니다.','길잡이')
mc('sirius-guide','sirius',2,'겨울 하늘에서 시리우스를 찾을 때 먼저 확인할 무늬는 무엇인가요?',['오리온자리의 허리띠 세 별','북십자의 꼬리 한 점','북극성 주변의 작은 원','여름 대삼각형의 가운데'],'오리온 허리띠를 이어 큰개자리의 밝은 시리우스로 접근할 수 있습니다. 실제 위치는 앱의 날짜·장소와 맞춰 확인합니다.','길잡이',['howToFind.ko'])
mc('rigel-color','rigel',2,'오리온자리에서 리겔과 베텔게우스의 색 대비로 알맞은 것은 무엇인가요?',['리겔은 청백색, 베텔게우스는 붉거나 주황빛','리겔은 초록색, 베텔게우스는 보라색','두 별은 반드시 똑같은 진홍색','리겔은 검은색, 베텔게우스는 무색'],'콘텐츠는 리겔을 청백색, 베텔게우스를 붉은 초거성으로 설명합니다. 실제 색 인상은 하늘 상태와 시력에도 영향을 받습니다.','색')
mc('betelgeuse-report','betelgeuse',2,'베텔게우스가 평소보다 어두워 보였다면 먼저 어떻게 기록하나요?',['구름·고도·주변 조명과 비교 별을 함께 적는다','초신성 폭발 날짜를 확정한다','다른 날의 기록을 지운다','한 번의 인상으로 정확한 광도를 결정한다'],'밝기 인상에는 별의 변화 외에 관측 조건도 영향을 줍니다. 한 번 어둡게 보였다는 이유로 폭발을 예고할 수 없습니다.','관측')
mc('altair-shape','altair',2,'90mm, 20~80배에서 알타이르를 볼 때 기본 모습은 무엇인가요?',['점처럼 보이는 별','자전으로 찌그러진 표면이 넓게 펼쳐진 원반','주변에 뚜렷한 토성형 고리가 있는 행성','꼬리가 길게 늘어진 혜성'],'알타이르의 부푼 적도는 전문 간섭 관측으로 연구한 구조입니다. 입문용 망원경으로 그 모양을 직접 확인하는 목표는 아닙니다.','관측')
mc('aldebaran-membership','aldebaran',2,'알데바란이 히아데스와 같은 방향에 보인다는 사실에서 바로 결론낼 수 없는 것은 무엇인가요?',['알데바란이 히아데스 성단의 구성원이라는 것','두 대상이 하늘에서 가까운 방향에 보인다는 것','알데바란이 주변 별무리와 한 장면에 보일 수 있다는 것','알데바란의 위치를 길잡이로 삼을 수 있다는 것'],'알데바란은 히아데스보다 앞쪽에 놓인 별로 설명됩니다. 같은 방향에 보인다는 사실과 같은 집단이라는 판단은 다릅니다.','공간',['summary.ko','story.ko'])
mc('antares-city','antares',2,'대전 근교에서 안타레스 관측을 특히 방해하기 쉬운 것은 무엇인가요?',['남쪽 산·건물과 낮은 고도의 연무','안타레스가 항상 천정에 있다는 점','북쪽 지평선만 가린다는 점','여름에는 태양빛을 반사하지 않는다는 점'],'안타레스는 한국 중위도에서 남쪽에 낮게 뜹니다. 남쪽 시야와 그 시각의 고도를 먼저 확인해야 합니다.','관측')
mc('deneb-body','deneb',2,'별자리 그림에서 데네브가 놓인 백조의 부위는 어디인가요?',['꼬리','부리','한쪽 발톱','배 아래의 고리'],'콘텐츠는 데네브를 백조의 꼬리에 놓인 별로 설명합니다. 여기서 별자리 그림은 별의 실제 물리 구조가 아닙니다.','별자리')
mc('polaris-brightest','polaris',2,'폴라리스가 북쪽 길잡이로 유용한 주된 이유는 무엇인가요?',['천구 북극 가까이 있어 밤 동안 위치 변화가 작다','모든 별 중 가장 밝기 때문이다','지구와 정확히 같은 거리에 머무르기 때문이다','지구의 자연위성이기 때문이다'],'폴라리스는 천구 북극 부근에 있어 위치 변화가 작습니다. 밤하늘에서 가장 밝은 별은 아닙니다.','방향')
mc('vega-disk','vega',2,'베가 주변 먼지 원반 사진을 읽은 뒤 10×50 관측에서 기대할 모습은 무엇인가요?',['밝은 점과 주변 별 배치','사진과 같은 먼지 원반의 세부','별 표면의 얼룩','원반 위에서 움직이는 밝은 행성 무리'],'베가 주변 먼지 원반은 연구 장비로 관측한 구조입니다. 10×50으로는 베가와 주변 별 배열을 봅니다.','관측')
mc('sunspot-kind','sun',2,'태양 설명에서 흑점을 어둡게 보이게 하는 이유는 무엇인가요?',['주변보다 온도가 낮은 영역이기 때문이다','표면에 뚫린 빈 구멍이기 때문이다','태양 앞을 지난 행성의 그림자이기 때문이다','일시적으로 핵융합이 완전히 멈춘 구역이기 때문이다'],'흑점은 주변보다 상대적으로 서늘해 어둡게 보입니다. 이 문항은 설명 읽기용이며 직접 태양 관측을 요구하지 않습니다.','태양')
mc('mercury-venus-temperature','mercury',2,'태양에 더 가까운 수성보다 금성의 표면이 더 뜨거운 이유로 알맞은 것은 무엇인가요?',['금성의 두꺼운 대기가 열을 가두기 때문이다','금성이 스스로 핵융합하기 때문이다','수성이 지구의 위성이기 때문이다','태양이 금성 쪽으로만 빛을 내기 때문이다'],'콘텐츠는 금성의 두꺼운 대기가 열을 붙잡는다고 설명합니다. 태양까지의 거리만으로 표면 온도를 정할 수 없습니다.','비교',['story.ko'])

# MC 심화 12개. 논쟁적인 수치·최신 위성 수 대신 근거 해석을 묻는다.
mc('sirius-companion','sirius',3,'시리우스 B의 설명과 관측 기대를 바르게 묶은 것은 무엇인가요?',['백색왜성이며 밝은 A 때문에 입문 장비의 쉬운 대상은 아니다','가스 행성이며 10×50으로 고리가 선명하다','적색거성이며 맨눈으로 두 별이 넓게 떨어져 보인다','지구 위성이며 매일 위상이 바뀐다'],'시리우스 B는 백색왜성입니다. 주성과의 큰 밝기 차이 때문에 이 장비 범위에서는 분리를 기본 성과로 요구하지 않습니다.','별의 성질')
mc('arcturus-temperature','arcturus',3,'적색거성 아르크투루스를 통해 알 수 있는 온도와 밝기의 관계는 무엇인가요?',['표면이 더 서늘해도 넓은 표면 때문에 전체적으로 밝을 수 있다','서늘한 별은 반드시 맨눈으로 보이지 않는다','붉은 별은 모두 지구에서 같은 거리에 있다','별의 색 하나로 정확한 거리를 정할 수 있다'],'별의 전체 밝기는 표면 온도뿐 아니라 크기에도 영향을 받습니다. 주황빛이라는 이유만으로 어둡거나 가까운 별이라고 단정하지 않습니다.','별의 성질',['story.ko'])
mc('vega-myth-reality','vega',3,'칠석의 오작교 전승을 천문 관측과 구별한 설명은 무엇인가요?',['문화적 이야기이며 두 별이 매년 실제로 만난다는 뜻은 아니다','두 별이 음력 7월 7일마다 충돌한다는 관측 기록이다','도시에서 은하수가 안 보이면 두 별도 사라진다는 뜻이다','직녀성이 다른 은하로 이동한다는 계산식이다'],'전승은 문화권의 이야기로 읽습니다. 베가와 알타이르의 실제 위치·운동은 천문학적 설명으로 따로 확인합니다.','전통',['story.ko','koreanTradition'])
mc('rigel-occultation','rigel',3,'카시니가 토성 대기 뒤로 가려지는 리겔의 빛을 관측한 목적은 무엇인가요?',['별빛의 변화를 이용해 토성 대기 구조를 연구하기 위해','리겔 표면의 지형을 직접 확대 촬영하기 위해','리겔이 달처럼 변하는 위상 주기를 재기 위해','지구 대기의 구름 분포를 측정하기 위해'],'행성 대기를 통과하는 배경 별빛의 변화는 대기 연구에 쓰일 수 있습니다. 콘텐츠의 리겔 이야기는 이런 관측 사례입니다.','관측 원리',['story.ko'])
mc('betelgeuse-dimming','betelgeuse',3,'콘텐츠에서 소개한 베텔게우스의 큰 어두워짐에 대한 연구 설명은 무엇인가요?',['분출 물질이 식어 만든 먼지가 별빛 일부를 가렸다는 설명','지구의 밤이 길어져 별이 꺼졌다는 설명','별이 즉시 초신성으로 폭발했다는 확정','모든 원인이 소형 망원경으로 직접 보였다는 설명'],'콘텐츠는 허블 관측 분석에서 먼지가 빛 일부를 가렸다는 설명을 소개합니다. 이 사례만으로 미래 폭발 시점을 정할 수 없습니다.','과학 해석',['story.ko'])
mc('altair-method','altair',3,'알타이르의 부푼 적도와 표면 밝기 차이를 연구한 관측 방법은 무엇인가요?',['여러 망원경의 빛을 합치는 간섭 관측','90mm 망원경의 단순 초점 흐리기','맨눈에서 손가락 폭만 재기','폰 나침반의 숫자만 읽기'],'콘텐츠의 알타이르 표면 연구는 여러 망원경의 빛을 결합한 관측입니다. 보통 접안 관측의 점 모양과 연구 영상을 구별해야 합니다.','관측 원리',['story.ko'])
mc('aldebaran-depth','aldebaran',3,'알데바란과 히아데스 사례가 보여 주는 지도 해석의 주의점은 무엇인가요?',['하늘의 각거리만으로 실제 공간 거리를 알 수 없다','한 화면에 보이면 모두 같은 성단이다','색이 비슷하면 거리가 정확히 같다','가까워 보이는 두 점은 항상 쌍성이다'],'하늘 지도는 방향을 평면에 표현하지만 천체는 서로 다른 거리에 놓입니다. 같은 방향의 무늬만으로 물리적 집단을 확정하지 않습니다.','공간',['story.ko'])
mc('antares-atmosphere','antares',3,'작은 망원경에서 안타레스가 번져 보일 때 알맞은 해석은 무엇인가요?',['지구 대기와 초점 등의 영향부터 살핀다','안타레스의 거대한 대기를 직접 분해했다고 확정한다','동반성 개수를 번짐의 점 개수로 정한다','별의 실제 지름을 번짐 크기만으로 결정한다'],'안타레스의 표면·대기 구조 연구는 전문 관측 장비의 결과입니다. 낮게 뜬 별의 번짐을 같은 관측으로 해석하지 않습니다.','과학 해석',['story.ko'])
mc('deneb-distance-uncertainty','deneb',3,'자료마다 데네브의 거리가 다를 때 적절한 학습 태도는 무엇인가요?',['추정법과 출처·불확도를 확인한다','소수점이 가장 긴 값을 무조건 정답으로 정한다','베가와 같은 삼각형이므로 같은 거리로 바꾼다','가장 오래된 값만 현재의 정확한 거리로 단정한다'],'콘텐츠는 데네브 거리의 자료별 차이를 검토 사항으로 남깁니다. 불확실한 대표 값을 유일하게 정확한 거리로 외우지 않습니다.','과학 해석',['summary.ko','meta.needsReview'])
mc('polaris-two-companions','polaris',3,'폴라리스의 동반성 B와 Ab에 대한 이 장비 범위의 설명은 무엇인가요?',['멀리 떨어진 B는 시도 대상일 수 있지만 가까운 Ab는 같은 장비로 기대하지 않는다','B와 Ab 모두 맨눈으로 쉽게 나뉜다','Ab만 10×50으로 늘 선명하고 B는 존재하지 않는다','둘은 모두 달의 다른 위상 이름이다'],'콘텐츠는 넓게 떨어진 B와 매우 가까운 Ab를 구별합니다. 동반성의 존재와 입문 장비에서의 분리 가능성은 같은 뜻이 아닙니다.','관측',['story.ko','observing.telescope'])
mc('mars-retrograde','mars',3,'화성이 배경 별에 대해 잠시 반대로 움직여 보이는 역행을 설명한 것은 무엇인가요?',['지구와 화성의 공전과 시선 방향 변화로 생기는 겉보기 운동','화성이 실제 궤도를 갑자기 거꾸로 도는 운동','지구가 며칠간 자전을 멈춘 결과','달이 화성의 표면을 끌어당겨 미는 운동'],'더 안쪽 궤도의 지구가 화성을 추월하면 배경 별에 대한 시선 방향이 달라집니다. 행성이 궤도에서 뒤로 달린다는 뜻은 아닙니다.','운동',['story.ko'])
mc('moon-shadow-not-phase','moon',3,'달의 보통 위상 변화와 월식의 차이를 바르게 설명한 것은 무엇인가요?',['위상은 밝은 면이 보이는 비율의 변화이고 월식은 지구의 그림자와 관련된다','모든 반달은 지구의 그림자가 달 절반을 가린 월식이다','위상은 지구의 자전 속도가 주기적으로 달라져 생긴다','월식은 달이 태양 앞을 지나 태양을 가리는 현상이다'],'보통 위상은 태양이 비춘 면을 보는 배치가 달라져 생깁니다. 지구의 그림자가 달을 가리는 월식과 구별합니다.','달',['summary.ko','sources'])

# 참/거짓 20개: 입문8, 중급8, 심화4. 거짓과 참을 각각 10개로 설계한다.
tf('sun-sunglasses','sun',1,'보통 선글라스는 망원경으로 태양을 볼 때 전용 태양 필터를 대신할 수 있다.',False,'선글라스는 태양 관측용 필터를 대신할 수 없습니다. 필터 없이 절대 보지 말아야 합니다.','안전',['safety'])
tf('moon-not-star','moon',1,'달은 태양처럼 중심의 수소 핵융합으로 빛나는 별이다.',False,'달은 지구의 자연위성이며 태양빛을 반사합니다.','천체 종류')
tf('mercury-rocky','mercury',1,'수성은 암석 행성으로 분류된다.',True,'수성은 태양에 가까운 암석 행성입니다.','천체 종류')
tf('venus-two-objects','venus',1,'샛별과 개밥바라기는 서로 다른 두 천체의 이름이다.',False,'이 콘텐츠에서는 둘 다 금성을 가리키며 보이는 때가 다릅니다.','전통',['koreanTradition'])
tf('mars-orange','mars',1,'화성은 관측 조건이 좋을 때 맨눈에서도 붉거나 주황빛 도는 점으로 보일 수 있다.',True,'콘텐츠는 맨눈 관측 목표를 색과 위치 확인으로 제시합니다. 표면 지형을 맨눈으로 본다는 뜻은 아닙니다.','색')
tf('summer-members','vega',1,'베가·알타이르·데네브는 여름 대삼각형의 세 별이다.',True,'세 별은 거문고자리·독수리자리·백조자리에 각각 속합니다.','길잡이')
tf('polaris-in-ursa-minor','polaris',1,'폴라리스는 작은곰자리에 속한다.',True,'첨부 카탈로그의 별자리 코드 UMi는 작은곰자리입니다.','별자리',['facts','catalog.con'])
tf('neptune-easy-eye','neptune',1,'해왕성은 도시에서 맨눈으로 크게 보이는 대표 행성이다.',False,'해왕성은 희미해 광학 장비와 위치 확인이 필요한 대상입니다.','관측')
tf('moon-full-best-always','moon',2,'크레이터 그림자를 보기에는 보름이 언제나 가장 좋다.',False,'명암 경계가 있는 위상에서 그림자가 지형을 드러냅니다. 보름만을 고집할 필요는 없습니다.','달')
tf('jupiter-always-four','jupiter',2,'목성의 갈릴레이 위성 네 개는 어떤 시각에도 모두 떨어진 점으로 보인다.',False,'가림이나 겹침 때문에 네 위성이 늘 따로 보이지는 않습니다. 실제로 본 수를 기록합니다.','관측')
tf('saturn-angle','saturn',2,'토성의 고리가 벌어져 보이는 정도는 관측 시기에 따라 달라진다.',True,'지구에서 보는 고리의 기울기가 달라져 겉모습이 변합니다.','관측')
tf('aldebaran-foreground','aldebaran',2,'알데바란은 히아데스와 같은 방향에 보이지만 성단보다 앞쪽에 놓인 별이다.',True,'콘텐츠는 두 대상의 방향상 겹침과 실제 거리 차이를 구별합니다.','공간')
tf('sirius-flicker','sirius',2,'낮게 뜬 시리우스의 빠른 색 깜빡임은 별 자체의 급격한 변화로 바로 확정할 수 있다.',False,'낮은 고도에서 대기의 영향이 크게 작용할 수 있습니다. 한 번의 깜빡임만으로 별의 변화를 확정하지 않습니다.','관측')
tf('arcturus-point','arcturus',2,'아르크투루스는 거성이지만 90mm, 20~80배에서는 별 표면이 넓게 펼쳐져 보이지 않는다.',True,'이 장비 범위의 기본 관측은 점처럼 보이는 별의 색과 위치입니다.','관측')
tf('deneb-not-single-constellation','deneb',2,'여름 대삼각형의 세 별은 모두 백조자리 안에 있다.',False,'데네브만 백조자리에 속하고 베가는 거문고자리, 알타이르는 독수리자리에 속합니다.','별자리')
tf('uranus-chart','uranus',2,'천왕성을 찾을 때 별 같은 점의 색만보다 현재 계산 위치와 주변 별 배치가 중요하다.',True,'작은 장비에서 별과 구별하기 어려워 위치 대조가 필요합니다.','관측')
tf('polaris-exact-pole','polaris',3,'폴라리스는 천구 북극과 정확히 같은 점이므로 시간·장소 계산 없이 정밀 정렬 기준으로 쓸 수 있다.',False,'폴라리스는 천구 북극 가까이에 있지만 완전히 같은 점은 아닙니다. 정밀 정렬은 계산된 별 위치를 사용합니다.','정렬')
tf('betelgeuse-date','betelgeuse',3,'베텔게우스가 한 번 어두워 보이면 초신성 폭발 날짜를 정할 수 있다.',False,'관측 조건과 별의 변화 원인을 따져야 하며 한 번의 인상으로 폭발 시점을 예고할 수 없습니다.','과학 해석')
tf('altair-interferometry','altair',3,'알타이르의 표면 영상 연구와 소형 망원경에서 보는 점 모양은 서로 다른 관측 수준이다.',True,'연구에는 여러 망원경의 빛을 결합하는 방법이 쓰였습니다. 그 구조를 입문 장비에서 직접 본 것으로 기록하지 않습니다.','관측 원리',['story.ko'])
tf('vega-tradition-separate','vega',3,'칠석 전승의 내용과 실제 두 별의 거리·운동은 구별해서 배워야 한다.',True,'전승은 문화적 이야기이며 별의 실제 운동을 대체하는 설명이 아닙니다.','전통',['story.ko','koreanTradition'])

# 하늘 선택 20개. 7개 고정별을 대상으로 이름/별자리/의미를 다른 목표로 평가.
# 전체 밝은별 근접 검사는 자료 미수신으로 미확인. runtime gate 전부 적용 전 게시 금지.
sky_specs=[
('pick-sirius-name','sirius',1,'하늘 화면에서 시리우스를 찾아 탭하세요.','시리우스는 큰개자리의 밝은 길잡이별입니다.'),
('pick-arcturus-name','arcturus',1,'하늘 화면에서 아르크투루스를 찾아 탭하세요.','아르크투루스는 목동자리의 밝은 주황빛 별입니다.'),
('pick-vega-name','vega',1,'하늘 화면에서 베가를 찾아 탭하세요.','베가는 거문고자리의 밝은 별입니다.'),
('pick-rigel-name','rigel',1,'하늘 화면에서 리겔을 찾아 탭하세요.','리겔은 오리온자리의 발 쪽에 놓인 청백색 별입니다.'),
('pick-betelgeuse-name','betelgeuse',1,'하늘 화면에서 베텔게우스를 찾아 탭하세요.','베텔게우스는 오리온자리 어깨 쪽의 붉은 별입니다.'),
('pick-deneb-name','deneb',1,'하늘 화면에서 데네브를 찾아 탭하세요.','데네브는 백조자리의 꼬리에 놓인 밝은 별입니다.'),
('pick-polaris-name','polaris',1,'하늘 화면에서 폴라리스를 찾아 탭하세요.','폴라리스는 현재 북극성 역할을 하는 작은곰자리의 별입니다.'),
('pick-vega-weaver','vega',1,'한국 칠석 안내에서 직녀성으로 부르는 별을 하늘 화면에서 탭하세요.','이 콘텐츠에서 직녀성은 베가에 대응합니다.'),
('pick-sirius-constellation','sirius',2,'하늘 화면에서 큰개자리의 가장 밝은 길잡이별을 탭하세요.','큰개자리의 밝은 길잡이별은 시리우스입니다.'),
('pick-arcturus-arc','arcturus',2,'북두칠성 손잡이의 곡선을 이어 도착하는 목동자리의 별을 탭하세요.','콘텐츠는 그 곡선의 길잡이별을 아르크투루스로 안내합니다.'),
('pick-vega-lyra','vega',2,'여름 대삼각형 중 거문고자리에 속한 꼭짓점을 탭하세요.','거문고자리에 속한 꼭짓점은 베가입니다.'),
('pick-rigel-foot','rigel',2,'오리온자리에서 붉은 어깨별과 대비되는 청백색 발 쪽 별을 탭하세요.','리겔은 청백색 발 쪽 별이고 베텔게우스는 붉은 어깨 쪽 별입니다.'),
('pick-betelgeuse-shoulder','betelgeuse',2,'오리온자리에서 붉거나 주황빛을 띠는 어깨 쪽 별을 탭하세요.','오리온자리의 붉은 어깨 쪽 별은 베텔게우스입니다.'),
('pick-deneb-tail','deneb',2,'백조자리의 꼬리를 표시하는 밝은 별을 탭하세요.','백조의 꼬리 쪽 별은 데네브입니다.'),
('pick-polaris-north','polaris',2,'작은곰자리에서 북쪽 방향의 길잡이 역할을 하는 별을 탭하세요.','폴라리스는 천구 북극 가까이에 있어 북쪽 길잡이로 쓰입니다.'),
('pick-deneb-triangle','deneb',2,'여름 대삼각형 중 베가도 알타이르도 아닌 꼭짓점을 탭하세요.','남은 꼭짓점은 백조자리의 데네브입니다.'),
('pick-sirius-remnant','sirius',3,'백색왜성 동반성 B가 있다는 설명을 읽은 큰개자리의 밝은 주성 방향을 탭하세요.','시리우스 계의 밝은 빛점 방향을 고릅니다. 이 문항은 희미한 B 자체를 화면에서 분리해 고르는 문제가 아닙니다.'),
('pick-arcturus-giant','arcturus',3,'표면이 비교적 서늘해도 넓은 표면 덕분에 밝을 수 있음을 배운 목동자리 적색거성을 탭하세요.','해당 콘텐츠의 사례는 아르크투루스입니다.'),
('pick-betelgeuse-dust','betelgeuse',3,'큰 어두워짐을 먼지와 연결한 연구 사례로 소개된 오리온자리 별을 탭하세요.','콘텐츠가 소개한 별은 베텔게우스입니다. 밝기 변화만으로 폭발 시점을 예고할 수는 없습니다.'),
('pick-polaris-role','polaris',3,'물리적 별 종류가 아니라 현재의 북쪽 길잡이 역할명으로도 불리는 작은곰자리 별을 탭하세요.','현재 북극성 역할을 하는 폴라리스입니다. 북극성이라는 말과 별의 물리적 종류는 구별합니다.')]
for slug,key,d,q,ex in sky_specs:
    obj=O(key); qid='q-'+slug
    QUIZ.append({'id':qid,'objectId':obj,'constellation':CAT[obj]['con'],'type':'skyPick','question':T(q),'answer':obj,'explanation':T(ex),'difficulty':d,'tags':['하늘 선택','고정별','실행 전 가시성 확인']})
    evidence(qid,obj,['summary.ko','story.ko','facts'],extra={'publicationGate':'skyPick-full-field-isolation-and-runtime-hit-test','acceptanceRadiusDeg':3,'isolationStatus':'not-verified-against-full-sky-catalog'})
assert len(QUIZ)==100, len(QUIZ)
assert collections.Counter(x['difficulty'] for x in QUIZ)=={1:40,2:40,3:20}
assert collections.Counter(x['type'] for x in QUIZ)=={'mc':60,'trueFalse':20,'skyPick':20}

# 미션: 관측 여부는 실제 observe 이벤트. 별의 표면/동반성 분리는 필수 성과로 삼지 않는다.
MISSIONS=[]; RULES=[]
def ck(*a):return {'type':'checklist','items':[T(x) for x in a]}
def find(obj,h):return {'type':'find','objectId':O(obj),'hint':T(h)}
def observe(obj):return {'type':'observe','objectId':O(obj)}
def read(obj):return {'type':'read','contentId':O(obj)}
def quiz(*slugs):return {'type':'quiz','quizIds':['q-'+s for s in slugs],'passRatio':1}
def skill(s):return {'type':'skill','skill':s}

def mission(slug,title,desc,level,season,minutes,steps,ids,tutorial=None,notes=None):
    ids=[O(i) for i in ids]
    a={'id':slug,'title':T(title),'description':T(desc+' 고도 25° 이상이고 안전하게 관측 가능한 때 진행합니다. 보이지 않으면 완료로 기록하지 말고 보류합니다.'),'level':level,'season':season,'estimatedMinutes':minutes,'requires':{'equipment':[level],'darkSky':False},'steps':steps,'contentIds':ids}
    MISSIONS.append(a)
    RULES.append({'missionId':slug,'state':'authoring-draft','directObjectIds':sorted(set(s.get('objectId') for s in steps if s.get('objectId'))),'minimumAltitudeDeg':25,'eveningKst':[21,24],'solarAltitudeMaxDeg':-12,'gateMode':'all-direct-targets-valid-during-required-observing-window','actualContentIndexVerified':False,'appStepHandlersVerified':False,'tutorial':tutorial,'notes':notes or []})

# 봄 5: 맨눈 2 / 쌍안경 2 / 망원경 1
mission('spring-arcturus-first','봄의 주황빛 길잡이','아르크투루스의 이름·색·위치를 연결하고 첫 기록을 남깁니다.','naked','spring',15,[read('arcturus'),find('arcturus','북두칠성 손잡이의 곡선을 이어 목동자리의 밝은 주황빛 별을 찾으세요. 지도와 실제 하늘을 대조합니다.'),observe('arcturus'),quiz('arcturus-constellation','arcturus-guide')],['arcturus'])
mission('spring-polaris-direction','북쪽을 별로 확인하기','폴라리스가 가장 밝아서가 아니라 북극 가까이 있어서 길잡이가 됨을 익힙니다.','naked','spring',15,[read('polaris'),find('polaris','앱의 북쪽 하늘에서 작은곰자리의 폴라리스를 확인하세요. 주변 별이 가려지면 화면으로만 찾았다고 실제 관측을 기록하지 않습니다.'),observe('polaris'),quiz('polaris-brightest','polaris-exact-pole')],['polaris'])
mission('spring-orion-color-pair','초봄에 남은 오리온의 두 색','3월의 이른 저녁에 리겔과 베텔게우스를 번갈아 보며 색을 비교합니다.','binoculars','spring',20,[ck('두 별이 모두 고도 25° 이상인 3월 저녁인지 앱에서 확인합니다.','두 별 전체를 한 쌍안경 시야에 넣으려 하지 않고 따로 봅니다.'),find('rigel','오리온의 허리띠에서 청백색 발 쪽 꼭짓점 리겔을 찾으세요.'),observe('rigel'),find('betelgeuse','오리온의 반대쪽 어깨에 놓인 붉은 베텔게우스를 찾으세요.'),observe('betelgeuse'),quiz('rigel-color')],['rigel','betelgeuse'],notes=['봄 전체가 아닌 3월 중심의 제한 미션. 두 별의 동시 관측 가능 구간 검사.'])
mission('spring-arcturus-binocular','흔들림을 줄여 색 살피기','10×50을 안정시키고 아르크투루스와 주변 별의 점 모양을 살펴봅니다.','binoculars','spring',15,[read('arcturus'),ck('앱의 장비 설정이 실제 10×50과 맞는지 확인합니다.','팔을 받치거나 안전한 지지대를 써서 흔들림을 줄입니다.'),find('arcturus','앱에서 확인한 목동자리의 밝은 별을 쌍안경 중심에 넣으세요.'),observe('arcturus'),quiz('arcturus-point')],['arcturus'])
mission('spring-polaris-center','북쪽 별을 접안 중심에','폴라리스 주성의 위치를 낮은 배율로 확인합니다. 동반성 분리는 완료 조건이 아닙니다.','telescope','spring',20,[read('polaris'),ck('실제 90mm 망원경의 낮은 배율부터 시작합니다.','북극성과 천구 북극이 같은 점이라고 가정하지 않습니다.'),find('polaris','앱의 폴라리스 위치와 접안 시야를 대조해 주성을 중심에 놓으세요.'),observe('polaris'),quiz('polaris-two-companions')],['polaris'])
# 여름 5: 맨눈 2 / 쌍안경 2 / 망원경 1
mission('summer-triangle-three','여름의 세 꼭짓점','베가·알타이르·데네브를 각각 찾고 실제로 본 세 별을 기록합니다. 은하수 관측은 필수가 아닙니다.','naked','summer',25,[find('vega','거문고자리의 베가를 앱 위치와 비교해 찾으세요.'),observe('vega'),find('altair','독수리자리의 알타이르와 양옆 별의 줄을 확인하세요.'),observe('altair'),find('deneb','백조자리 꼬리의 데네브를 찾아 삼각형을 완성하세요.'),observe('deneb')],['vega','altair','deneb'])
MISSIONS[-1]['rewardBadgeId']='badge-summer-guide'
mission('summer-antares-window','낮게 뜨는 안타레스의 시간','남쪽 시야가 트이고 안타레스가 충분히 높아지는 짧은 구간을 골라 색을 관측합니다.','naked','summer',15,[read('antares'),ck('앱에서 지금의 고도 25° 이상과 남쪽 장애물을 확인합니다.','25° 미만이면 근처 장소나 위험한 지형으로 이동하지 말고 다른 날로 보류합니다.'),find('antares','전갈자리의 붉은 중심별을 찾으세요. 붉은 행성과 혼동하지 않도록 주변 별 배열을 대조합니다.'),observe('antares'),quiz('antares-city')],['antares'],notes=['위도 36.35°에서 카탈로그 적위로 계산한 남중고도 약 27.22°. 여름 내내 21~24시에 가능하다는 뜻이 아님.'])
mission('summer-vega-fov','튜토리얼 · 내 쌍안경 시야원','실제 장비의 시야각을 설정하고 베가 주변에서 앱의 시야원과 보이는 범위를 비교합니다.','binoculars','summer',20,[ck('10×50이라는 배율·구경만으로 실제 시야각을 정하지 않습니다.','장비 표기나 이미 저장한 장비 정보의 실제 시야각을 앱에 입력합니다.'),skill('fovSetup'),find('vega','베가를 중심에 놓고 앱의 시야원과 주변 별 배치를 비교하세요.'),observe('vega'),quiz('vega-disk')],['vega'],tutorial='fovSetup',notes=['장비 정보가 없으면 임의의 시야각으로 튜토리얼 성공을 기록하지 않음.'])
mission('summer-deneb-starfield','데네브 주변 별밭 보기','10×50으로 데네브 주변에서 실제로 보이는 별을 살핍니다. 성운 색이나 은하수는 요구하지 않습니다.','binoculars','summer',20,[read('deneb'),find('deneb','북십자 꼬리의 데네브를 중심에 넣고 시야 가장자리까지 천천히 살피세요.'),observe('deneb'),ck('사진에서 본 성운 색을 직접 본 것으로 적지 않습니다.','광해 때문에 별이 적게 보이면 그 상태를 관측 메모에 적습니다.'),quiz('deneb-body','deneb-not-single-constellation')],['deneb'])
mission('summer-vega-align-one','튜토리얼 · 센서와 1별 정렬','센서 하늘 보기와 베가 1별 정렬을 별개의 단계로 실행합니다. 센서 허용과 정렬 성공을 혼동하지 않습니다.','telescope','summer',25,[ck('앱의 날짜·위치와 실제 장비 장착 상태를 확인합니다.','센서 기능이 없거나 권한을 거부하면 이 튜토리얼은 보류하고 다른 수동 미션을 고릅니다.'),skill('arMode'),find('vega','낮은 배율로 베가를 실제 접안 중심에 놓으세요. 천정 가까이여서 조작이 불편하면 다른 시간으로 보류합니다.'),skill('align1'),observe('vega'),quiz('vega-disk')],['vega'],tutorial='arMode+align1',notes=['T2/T5 실구현·G4 검토 후에만 활성화. 이 미션의 AR는 arMode 스킬 식별자이며 실제 카메라 합성 지원을 가정하지 않음.','장착 변경·센서 재시작 후 이전 정렬 자동 재사용 금지.'])
# 가을 5: 맨눈 2 / 쌍안경 1 / 망원경 2
mission('autumn-deneb-bridge','가을에도 이어지는 여름 길잡이','초가을 저녁의 데네브를 찾아 계절 별이 하루아침에 사라지는 것이 아님을 확인합니다.','naked','autumn',15,[read('deneb'),find('deneb','앱의 현재 하늘에서 백조자리의 데네브를 찾아보세요. 가을이라고 여름 길잡이를 모두 숨기지 않습니다.'),observe('deneb'),quiz('deneb-constellation')],['deneb'])
mission('autumn-aldebaran-arrival','늦가을에 만나는 황소의 눈','10~11월 저녁 충분히 높아진 알데바란을 찾아 겨울 하늘로 이어지는 길잡이를 익힙니다.','naked','autumn',15,[read('aldebaran'),find('aldebaran','황소자리 V자 방향의 밝은 주황빛 별을 확인하세요. 저녁 동쪽에서 낮게 뜬 동안은 기다립니다.'),observe('aldebaran'),quiz('aldebaran-constellation','aldebaran-membership')],['aldebaran'],notes=['가을 모든 달·모든 시각이 아니라 10~11월 가시성 구간에 배정.'])
mission('autumn-altair-line','초가을 독수리자리의 짧은 줄','10×50으로 알타이르와 주변 별 배열을 비교합니다. 희미한 이웃별 확인은 완료 조건이 아닙니다.','binoculars','autumn',20,[read('altair'),find('altair','초가을 저녁의 알타이르를 찾고 양옆에 보이는 별 배치를 살펴보세요.'),observe('altair'),ck('주변 별이 흐리면 알타이르만 확인한 것으로 메모합니다.','알타이르의 납작한 표면을 직접 봤다고 기록하지 않습니다.'),quiz('altair-shape')],['altair'],notes=['skyPick 정답으로는 사용하지 않음. 주변 별이 가까운 관측 대상과 3° 탭 채점 대상은 구분.'])
mission('autumn-polaris-backup','북쪽 관측 기록과 백업','폴라리스를 관측한 뒤 앱 안에서 저장한 기록을 확인하고 백업 기능을 연습합니다.','telescope','autumn',20,[find('polaris','앱의 작은곰자리 위치를 대조해 폴라리스 주성을 낮은 배율로 확인하세요.'),observe('polaris'),ck('앱의 관측 기록에서 방금 저장한 천체·시각·장비를 확인합니다.','백업은 성공 안내를 확인하며, 연습을 위해 원본 기록을 삭제하지 않습니다.'),skill('backup'),quiz('polaris-brightest')],['polaris'],notes=['backup 스킬의 실제 핸들러·성공 이벤트 확인 필요. OS 공유창 취소를 성공으로 처리하지 않음.'])
mission('autumn-deneb-point','초거성도 접안경에서는 점','데네브의 설명과 실제 낮은 배율의 모습을 비교해 연구 정보와 관측 기록을 구별합니다.','telescope','autumn',20,[read('deneb'),find('deneb','데네브를 낮은 배율의 접안 중심에 놓고 초점을 맞추세요.'),observe('deneb'),ck('번짐을 별의 실제 표면 크기라고 기록하지 않습니다.'),quiz('deneb-distance-uncertainty')],['deneb'])
# 겨울 5: 맨눈 1 / 쌍안경 2 / 망원경 2
mission('winter-sirius-beacon','겨울의 밝은 등대','오리온에서 시리우스로 이어지는 길과 큰개자리 소속을 익힙니다.','naked','winter',15,[read('sirius'),find('sirius','오리온 허리띠를 이어 남동쪽의 밝은 시리우스로 접근하세요. 화면이 돌아가 있으면 실제 방향 표시를 확인합니다.'),observe('sirius'),quiz('sirius-constellation','sirius-guide')],['sirius'])
mission('winter-aldebaran-depth','같이 보인다고 같은 집단은 아니다','알데바란을 중심으로 V자 별무리 방향을 보되 물리적 성단 소속과 구별합니다.','binoculars','winter',20,[read('aldebaran'),find('aldebaran','황소자리의 알데바란을 찾고 주변 V자 배치를 살펴보세요. 보이지 않는 별을 억지로 채우지 않습니다.'),observe('aldebaran'),quiz('aldebaran-membership','aldebaran-depth')],['aldebaran'])
mission('winter-sirius-steady','밝은 별과 흔들리는 공기','10×50을 안정시켜 시리우스의 위치를 확인하고 낮은 고도에서의 깜빡임 해석을 연습합니다.','binoculars','winter',15,[read('sirius'),ck('고도 25° 이상인지 확인하고 안정된 자세로 쌍안경을 지지합니다.','시리우스 B를 반드시 분리하는 과제로 삼지 않습니다.'),find('sirius','큰개자리의 밝은 시리우스를 시야 중심에 놓으세요.'),observe('sirius'),quiz('sirius-flicker')],['sirius'])
mission('winter-rigel-scale','리겔의 색과 관측 규모','90mm 망원경으로 리겔의 점 모양을 확인하고 전문 연구 영상과 구분합니다.','telescope','winter',20,[read('rigel'),find('rigel','오리온 발 쪽의 리겔을 낮은 배율로 중심에 놓고 색을 살피세요.'),observe('rigel'),ck('동반성이나 표면 분리를 완료 기준으로 삼지 않습니다.'),quiz('rigel-color','rigel-occultation')],['rigel'])
mission('winter-betelgeuse-record','붉은 별을 과장 없이 기록','베텔게우스의 색을 보고 당일 상태를 남깁니다. 한 번의 관측을 폭발 예측으로 바꾸지 않습니다.','telescope','winter',20,[read('betelgeuse'),find('betelgeuse','오리온 어깨 쪽의 붉은 베텔게우스를 확인하세요.'),observe('betelgeuse'),ck('관측 메모에 구름·고도·배율과 직접 본 색만 적습니다.'),quiz('betelgeuse-report','betelgeuse-date')],['betelgeuse'])
# 연중 4: 맨눈1 / 쌍안경1 / 망원경2. any는 매일·밤새 보인다는 뜻이 아님.
mission('any-moon-phase','오늘 보인 달의 모양','현재 위치에서 저녁 관측 가능한 달을 찾아 위상과 큰 명암 무늬를 기록합니다.','naked','any',15,[read('moon'),ck('현재 시각에 달이 고도 25° 이상인지 확인합니다.','달이 보이지 않는 밤에는 실내 퀴즈만 풀고 실제 관측 미션은 보류합니다.'),find('moon','앱의 실제 달 위치와 눈앞의 달을 대조하세요.'),observe('moon'),quiz('moon-light','moon-sequence')],['moon'])
mission('any-moon-binocular','달의 명암 경계 따라 보기','10×50으로 달의 큰 지형을 살펴봅니다. 반달 무렵의 그림자는 권장 조건이며 날마다 모습이 다릅니다.','binoculars','any',20,[read('moon'),ck('달이 저녁 하늘에 충분히 높고 태양이 지평선 아래인지 확인합니다.','쌍안경을 지지해 흔들림을 줄입니다.'),find('moon','달의 밝은 면과 어두운 면의 경계를 천천히 살펴보세요. 경계가 뚜렷하지 않은 날에는 보이는 큰 무늬만 기록합니다.'),observe('moon'),quiz('moon-terminator','moon-maria')],['moon'])
mission('any-moon-first-sketch','튜토리얼 · 달의 첫 스케치','앱의 스케치 기능에 직접 보이는 달 윤곽과 큰 무늬를 남깁니다. 잘 그리는 것은 완료 조건이 아닙니다.','telescope','any',25,[read('moon'),find('moon','낮은 배율로 달을 확인하고 한 부분만 선택해도 좋습니다.'),observe('moon'),skill('sketch'),ck('앱에 저장한 스케치에 실제로 본 범위만 담겼는지 확인합니다.'),quiz('moon-full-best-always')],['moon'],tutorial='sketch')
mission('any-jupiter-visit','목성의 오늘 모습','관측 가능한 저녁에 목성과 보이는 위성 점을 살핍니다. 줄무늬나 위성 네 개를 필수 성과로 요구하지 않습니다.','telescope','any',25,[read('jupiter'),ck('앱이 계산한 지금의 목성 고도와 태양 아래 조건을 확인합니다.','목성이 저녁에 보이지 않는 시기에는 이 미션을 보류합니다.'),find('jupiter','앱의 행성 위치를 보고 낮은 배율부터 목성을 중심에 넣으세요.'),observe('jupiter'),quiz('jupiter-moons','jupiter-always-four')],['jupiter'])
assert len(MISSIONS)==24
assert collections.Counter(m['season'] for m in MISSIONS)=={'spring':5,'summer':5,'autumn':5,'winter':5,'any':4}
assert collections.Counter(m['level'] for m in MISSIONS)=={'naked':8,'binoculars':8,'telescope':8}

PATHS=[]
def path(slug,title,desc,lev,ids):PATHS.append({'id':slug,'title':T(title),'description':T(desc+' 목록 순서는 강제 잠금 순서가 아닙니다. 오늘 관측 가능한 미션부터 선택하세요.'),'level':lev,'season':'any','missionIds':ids})
path('naked-first-directions','맨눈 1 · 이름과 방향','밝은 길잡이와 달에서 관측 기록을 시작합니다.','naked',['spring-arcturus-first','spring-polaris-direction','winter-sirius-beacon','any-moon-phase'])
path('naked-season-bridges','맨눈 2 · 계절의 연결','여름 삼각형과 낮은 남쪽 별, 가을에 이어지는 길잡이를 비교합니다.','naked',['summer-triangle-three','summer-antares-window','autumn-deneb-bridge','autumn-aldebaran-arrival'])
path('binocular-first-field','쌍안경 1 · 시야와 안정','10×50의 실제 시야를 설정하고 별의 색과 달의 지형을 살핍니다.','binoculars',['summer-vega-fov','spring-arcturus-binocular','spring-orion-color-pair','any-moon-binocular'])
path('binocular-pattern-depth','쌍안경 2 · 배열과 공간','별밭과 짧은 줄, 투영 효과와 대기의 영향을 구별합니다.','binoculars',['summer-deneb-starfield','autumn-altair-line','winter-aldebaran-depth','winter-sirius-steady'])
path('telescope-first-record','망원경 1 · 정렬과 기록','지원이 확인된 기능으로 1별 정렬·스케치·백업을 연습합니다.','telescope',['summer-vega-align-one','any-moon-first-sketch','any-jupiter-visit','autumn-polaris-backup'])
path('telescope-honest-view','망원경 2 · 눈으로 본 범위','밝은 별의 접안 모습과 연구로 알려진 성질을 나누어 기록합니다.','telescope',['spring-polaris-center','autumn-deneb-point','winter-rigel-scale','winter-betelgeuse-record'])

BADGES=[]; BGATES=[]
def badge(slug,title,desc,icon,rule,state='requires-implementation-verification',needs=None):
    bid='badge-'+slug;BADGES.append({'id':bid,'title':T(title),'description':T(desc),'icon':icon,'rule':rule})
    BGATES.append({'badgeId':bid,'state':state,'requirements':needs or ['관측·학습 이벤트의 실제 구현 및 판정 규약 승인']})
badge('first-look','첫 관측 기록','직접 본 천체를 기록했습니다. 다음에는 관측 조건도 한 줄 남겨 보세요.','⭐',{'key':'firstObservation'})
badge('first-sketch','선으로 남긴 하늘','첫 스케치를 저장했습니다. 다음에는 같은 대상의 다른 날 모습과 비교해 보세요.','✏️',{'key':'firstSketch'},needs=['스케치 저장 성공 이벤트'])
badge('first-hop','별을 이어 가는 길','첫 스타 호핑을 마쳤습니다. 다음에는 같은 경로를 다시 찾아 보세요.','👣',{'key':'firstStarHop'},'blocked-missing-cluster-content',['성단 G3 콘텐츠','starhop 기능','성단 찾기 튜토리얼'])
badge('two-star-check','두 별로 맞춘 방향','두 별 정렬을 마쳤습니다. 다음에는 다른 방향에서 오차를 확인해 보세요.','🧭',{'key':'align2Success'},'blocked-g4-and-implementation',['T5의 align2','G4 코드 리뷰','정렬 성공과 실제 오차의 구별'])
for n,title,desc,icon in [(3,'세 번의 관측 연습','세 미션을 마쳤습니다. 다음에는 다른 종류의 관측 행동을 골라 보세요.','🌱'),(6,'관측 습관의 시작','여섯 미션을 마쳤습니다. 다음에는 같은 천체를 다른 장비로 비교해 보세요.','🌿'),(12,'넓어진 관측 경험','열두 미션을 마쳤습니다. 다음에는 아직 시도하지 않은 계절을 살펴보세요.','🌳'),(24,'첫 학습 묶음 한 바퀴','스물네 미션을 마쳤습니다. 다음에는 성단과 은하 학습으로 범위를 넓혀 보세요.','🗺️')]:badge('missions-'+str(n),title,desc,icon,{'key':'missionsCompleted','n':n})
for n,title,icon in [(3,'이어지는 세 정답','💡'),(5,'설명을 연결하는 힘','🔎'),(10,'다음 질문을 향해','📚')]:badge('quiz-'+str(n),title,f'서로 다른 문제 {n}개를 연속으로 맞혔습니다. 다음에는 답의 이유를 관측과 연결해 보세요.',icon,{'key':'quizStreak','n':n},needs=['서로 다른 문항의 최초 응답 기준 연속 정답 규약'])
for n,title,icon in [(2,'두 별자리의 길잡이','✨'),(4,'네 방향의 별자리','🌌'),(6,'더 넓은 별자리 지도','🔭')]:badge('constellations-'+str(n),title,f'서로 다른 별자리 {n}개에 속한 길잡이별을 실제로 관측했습니다. 다음에는 새 별자리의 밝은 별을 찾아보세요.',icon,{'key':'constellationCount','n':n},'blocked-rule-semantics',['별 관측의 소속 별자리 중복 제거로 셀지, 별자리 직접 관측만 셀지 T7 결정 필요'])
badge('summer-guide','여름의 길잡이','세 꼭짓점을 실제로 관측했습니다. 다음에는 각 별이 속한 별자리를 연결해 보세요.','🔺',{'key':'seasonSignature','id':'summerTriangle'},needs=['베가·알타이르·데네브의 실제 observe 3건; find 또는 skyPick만으로 수여 금지'])
badge('messier-three','성운·성단으로 첫 확장','서로 다른 메시에 천체 세 개를 관측했습니다. 다음에는 종류가 다른 대상을 비교해 보세요.','🌀',{'key':'messierCount','n':3},'blocked-missing-dso-content',['DSO 콘텐츠와 관측 미션','별칭 중복을 제거한 메시에 집계'])
assert len(BADGES)==16

FILES={'paths':PATHS,'missions':MISSIONS,'badges':BADGES,'quiz':QUIZ}
for name,arr in FILES.items():(ROOT/f'G5-learn-{name}.json').write_text(json.dumps(arr,ensure_ascii=False,indent=2)+'\n')
(ROOT/'evidence-ledger.json').write_text(json.dumps(EVIDENCE,ensure_ascii=False,indent=2)+'\n')
(ROOT/'mission-runtime-gates.json').write_text(json.dumps(RULES,ensure_ascii=False,indent=2)+'\n')
(ROOT/'badge-readiness.json').write_text(json.dumps(BGATES,ensure_ascii=False,indent=2)+'\n')
manifest={'version':1,'createdAt':'2026-09-07','status':'preparation-not-publishable','basis':'첨부 G3 배치1 초안과 G2 별자리 표; 정식 콘텐츠 인덱스 미제공','counts':{k:len(v) for k,v in FILES.items()},'availableDraftContentIds':sorted(set(CONTENT)-{'star:HIP24608'}),'excludedContentIds':{'star:HIP24608':'G3에서 low이며 분광형 충돌이 남아 있어 이번 대상·정답·미션에서 제외'},'unavailablePublishedIndex':'content/v1/index.json','coverageGaps':{'quizMinimum':150,'quizGenerated':100,'quizRemainingToMinimum':50,'skyPickMinimum':30,'skyPickGenerated':20,'skyPickRemainingToMinimum':10,'tutorialsRequired':4,'tutorialsAuthored':3,'missingTutorial':'스타 호핑으로 성단 찾기'},'sourceFiles':[]}
for p in sorted((ROOT/'inputs').glob('*')):
 if p.is_file():manifest['sourceFiles'].append({'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(ROOT/'readiness-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'counts':manifest['counts'],'difficulty':dict(collections.Counter(x['difficulty'] for x in QUIZ)),'types':dict(collections.Counter(x['type'] for x in QUIZ)),'trueFalseAnswers':dict(collections.Counter(str(x['answer']) for x in QUIZ if x['type']=='trueFalse'))},ensure_ascii=False,indent=2))
