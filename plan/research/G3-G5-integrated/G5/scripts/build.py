#!/usr/bin/env python3
"""Rebuild authored G5 data from the immutable, attached G3 pack and archived G5 draft.
No network access. Does not grant publication or certify external astronomy claims.
"""
from __future__ import annotations
import csv, hashlib, json, random, re, zipfile
from collections import Counter
from copy import deepcopy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'G5'
def save(path,obj):
    path=ROOT/path;path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def txt(s):return {'ko':s}
G3=json.loads((ROOT/'G3/G3-content-cumulative-121.json').read_text())
C={x['id']:x for x in G3}
CAT={x['id']:x for x in csv.DictReader((ROOT/'shared/inputs/catalog-values.v1.csv').open(encoding='utf-8-sig'))}
with zipfile.ZipFile(ROOT/'archive/G5-prep-package.zip') as z:
    def old(name):return json.loads(z.read('G5-prep-package/'+name))
    Q=old('G5-learn-quiz.json'); OLDQ=deepcopy(Q)
    M0=old('G5-learn-missions.json'); P0=old('G5-learn-paths.json'); B=old('G5-learn-badges.json')
    OLD_E=old('evidence-ledger.json')
    GATES0={g['missionId']:g for g in old('mission-runtime-gates.json')}
E=[]
def pointer_value(obj,p):
    for t in p.strip('/').split('/'):
        if not t:continue
        t=t.replace('~1','/').replace('~0','~')
        obj=obj[int(t)] if isinstance(obj,list) else obj[t]
    return obj

def evidence(q,oid,fields,reason,additional_ids=()):
    entries=[]
    for ident in [oid,*additional_ids]:
        assert ident in C,ident
        for p in fields:
            v=pointer_value(C[ident],p)
            # Exact supplied content, not an invented quote from an external site.
            entries.append({'contentId':ident,'pointer':p,'suppliedText':v,
              'textSha256':hashlib.sha256(json.dumps(v,ensure_ascii=False,sort_keys=True).encode()).hexdigest()})
    urls=sorted({u.rstrip('.,)') for ident in [oid,*additional_ids] for s in C[ident]['sources'] for u in re.findall(r'https?://[^\s|]+',s)})
    E.append({'quizId':q['id'],'basis':'attached-G3-content','contentFile':'G3/G3-content-cumulative-121.json',
      'evidence':entries,'rationale':reason,'upstreamSourceUrls':urls,
      'upstreamVerification':'G3에 기록된 출처를 계승함. 이번 G5 작성에서 전수 재열람·수치 승인을 한 것은 아님.',
      'excludedClaims':['검토 중인 거리 수치','대역 미확인 겉보기등급 수치','분광형 충돌 수치','미승인 물리적 결합 단정'],
      'editorialApproval':'pending-T6-T7','sourceReviewNotesInherited':{i:C[i]['meta'].get('needsReview',[]) for i in [oid,*additional_ids]}})

# Preserve the meaning of the previous 100 items. Fix only Korean particles.
for q in Q:
    q['question']['ko']=q['question']['ko'].replace('리겔가 속한','리겔이 속한').replace('알데바란가 속한','알데바란이 속한')
    # Exact content witnesses; these attest provenance, not automatic entailment.
    fields=['/summary/ko','/story/ko','/howToFind/ko']
    if q['id'].endswith('constellation') or q['id']=='q-polaris-in-ursa-minor':fields+=['/facts']
    for f in ['nakedEye','binoculars','telescope']:
        if f in C[q['objectId']]['observing']:fields.append('/observing/'+f)
    if 'koreanTradition' in C[q['objectId']]:fields.append('/koreanTradition')
    evidence(q,q['objectId'],fields,'기존 G5 의미 보존. 정답 근거는 첨부 G3의 명시 문장 및 관측 안내이며 논쟁적 수치를 묻지 않음.')

NEW=[]
def mc(suffix,oid,question,correct,wrong,explanation,diff,fields=('/summary/ko',),tags=('분류',),extra=()):
    assert len(wrong)==3 and correct not in wrong
    q={'id':'q-'+suffix,'objectId':oid,'type':'mc','question':txt(question),
       'choices':[txt(correct),*[txt(x) for x in wrong]],'answer':0,'explanation':txt(explanation),'difficulty':diff,'tags':list(tags)}
    if CAT[oid]['con'] and len(CAT[oid]['con'])==3:q['constellation']=CAT[oid]['con']
    Q.append(q);NEW.append(q);evidence(q,oid,list(fields),'첨부 문장의 종류·찾기·관측 범위를 재서술. 숫자 충돌 필드는 정답에 사용하지 않음.',extra)
def tf(suffix,oid,question,answer,explanation,diff,fields=('/summary/ko',),tags=('개념 구별',)):
    q={'id':'q-'+suffix,'objectId':oid,'type':'trueFalse','question':txt(question),'answer':answer,
       'explanation':txt(explanation),'difficulty':diff,'tags':list(tags)}
    if CAT[oid]['con'] and len(CAT[oid]['con'])==3:q['constellation']=CAT[oid]['con']
    Q.append(q);NEW.append(q);evidence(q,oid,list(fields),'첨부 콘텐츠의 참·거짓 구별. 과장된 관측 성공이나 공간 관계를 경계하도록 구성.')
def sky(suffix,oid,question,explanation,diff,fields=('/summary/ko',)):
    q={'id':'q-pick-'+suffix,'objectId':oid,'constellation':CAT[oid]['con'],'type':'skyPick','question':txt(question),
       'answer':oid,'explanation':txt(explanation),'difficulty':diff,'tags':['하늘 선택','길잡이별']}
    Q.append(q);NEW.append(q);evidence(q,oid,list(fields),'별의 이름·소속·역할을 연결하는 문항. 3° 판정 및 전체 표시 객체 격리 통과 장면에서만 실행.')

# 20 beginner multiple choice questions.
mc('m45-kind','dso:M45','플레이아데스 M45의 기본 종류는 무엇인가요?','산개성단',['나선은하','태양계 행성','행성상성운'],'M45는 황소자리의 산개성단입니다. 많은 별이 모인 대상이지 하나의 별이나 은하가 아닙니다.',1)
mc('m44-kind','dso:M44','프레세페 M44가 맨눈에 흐린 구름처럼 보여도 실제로는 무엇인가요?','여러 별이 모인 산개성단',['빛나는 단일 행성','우리은하 밖 나선은하','물방울로 된 지구 대기 구름'],'M44의 흐릿한 빛은 여러 별빛이 합쳐진 모습입니다. 쌍안경에서는 별무리로 나뉩니다.',1)
mc('m13-kind','dso:M13','M13처럼 많은 별이 공 모양으로 조밀하게 모인 집단은 무엇이라고 하나요?','구상성단',['행성상성운','반사성운','나선은하'],'M13은 구상성단입니다. 흐릿한 둥근 모습이 단일 별이나 가스 덩어리를 뜻하지는 않습니다.',1)
mc('m3-kind','dso:M3','봄철 아르크투루스를 기준으로 찾아가는 M3의 종류는 무엇인가요?','구상성단',['태양계 행성','산개성단','암흑성운'],'M3는 사냥개자리 방향의 구상성단입니다. 작은 장비에서는 많은 별빛이 합쳐진 얼룩으로 보입니다.',1)
mc('m31-kind','dso:M31','안드로메다은하 M31은 어떤 대상인가요?','우리은하 밖의 나선은하',['태양계의 위성','지구 대기의 구름','안드로메다자리를 이루는 한 별'],'M31은 별·가스·먼지를 포함한 나선은하입니다. 같은 방향의 앞쪽 별들과 동일한 물체가 아닙니다.',1)
mc('m81-kind','dso:M81','보데은하 M81의 종류로 알맞은 것은 무엇인가요?','나선은하',['구상성단','태양계 행성','행성상성운'],'G3는 M81을 큰곰자리 방향의 나선은하로 설명합니다. 작은 장비에서 나선팔을 반드시 본다는 뜻은 아닙니다.',1)
mc('m82-kind','dso:M82','시가은하 M82는 이름 속 시가처럼 타는 물체가 아니라 무엇인가요?','별 형성이 활발한 은하',['지구 대기의 불덩이','하나의 산개성단','토성의 고리 일부'],'M82는 별 형성이 활발한 은하입니다. 시가라는 별명은 길쭉한 외형에 대한 비유입니다.',1)
mc('m57-kind','dso:M57','고리성운 M57은 어떤 종류의 성운인가요?','행성상성운',['태양계 행성의 고리','지구 대기의 달무리','우리은하 전체'],'M57은 별이 내보낸 가스가 빛나는 행성상성운입니다. 이름에 행성이 들어가도 행성의 고리가 아닙니다.',1)
mc('m27-kind','dso:M27','아령성운 M27의 분류로 알맞은 것은 무엇인가요?','행성상성운',['산개성단','구상성단','나선은하'],'M27은 별이 진화 과정에서 내보낸 가스가 빛나는 행성상성운입니다.',1)
mc('m78-light','dso:M78','M78을 설명하는 반사성운에서 빛의 주된 설명은 무엇인가요?','주변 별빛을 먼지가 산란시켜 보인다',['지구의 도시 조명이 직접 반사된다','먼지가 모두 작은 태양처럼 핵융합한다','토성의 얼음 고리가 뭉쳐 빛난다'],'M78은 주변 별빛을 먼지가 산란시켜 보이는 반사성운으로 소개됩니다.',1)
mc('m42-birth','dso:M42','오리온대성운 M42의 가스와 먼지 속에서는 무엇을 연구하나요?','젊은 별이 태어나는 과정',['태양계 행성의 고리 충돌만','지구의 비구름 이동만','한 별자리의 모든 별이 같은 거리에 있는 현상'],'G3는 M42를 별 탄생 영역으로 설명합니다. 중심 별무리와 성운광은 구별해서 관측합니다.',1,tags=('별의 탄생','성운'))
mc('m33-kind','dso:M33','삼각형자리은하 M33의 종류는 무엇인가요?','나선은하',['산개성단','달의 분화구','태양계 혜성'],'M33은 국부은하군에 속한 나선은하입니다. 넓게 퍼진 빛 때문에 도시에서는 검출이 어려울 수 있습니다.',1)
mc('m35-kind','dso:M35','쌍둥이자리 발 부근의 M35는 어떤 집단인가요?','산개성단',['행성상성운','나선은하','태양계 소행성 무리'],'M35는 별들이 모인 산개성단입니다. 전체 별을 세는 것보다 주변보다 별이 모인 영역을 확인합니다.',1)
mc('double-cluster-meaning','dso:NGC869','페르세우스자리의 이중성단이라는 이름은 무엇을 묶어 부르나요?','두 산개성단',['가까이 보이는 별 두 개만','한 행성과 그 위성','서로 다른 두 별자리 전체'],'이중성단은 NGC869와 NGC884라는 두 산개성단입니다. 이중성과 같은 뜻이 아닙니다.',1)
mc('saturn-nebula-kind','dso:NGC7009','토성성운 NGC7009와 행성 토성의 관계를 바르게 설명한 것은 무엇인가요?','외형 별칭이 비슷할 뿐 서로 다른 종류의 천체다',['토성의 고리를 확대한 같은 천체다','토성의 위성이다','토성이 밤마다 내뿜는 가스다'],'NGC7009는 행성상성운이고 토성은 태양계 행성입니다. 별칭으로 물리적 정체를 판단하지 않습니다.',1)
mc('albireo-visual','star:HIP95947','알비레오의 입문 망원경 관측에서 살펴볼 특징은 무엇인가요?','색이 다르게 느껴지는 두 밝은 점',['별 표면의 대륙','곁 행성의 고리','은하의 나선팔'],'알비레오는 소형 망원경에서 두 성분을 구별하는 연습 대상입니다. 보이는 색 인상은 조건에 따라 달라집니다.',1)
mc('spica-membership','star:HIP65474','스피카의 현대 별자리 소속은 어디인가요?','처녀자리',['목동자리','사자자리','작은개자리'],'스피카는 처녀자리의 밝은 길잡이별입니다.',1,tags=('별자리',))
mc('alpheratz-membership','star:HIP677','가을 대사각형의 꼭짓점 알페라츠는 현대의 어느 별자리에 속하나요?','안드로메다자리',['페가수스자리','페르세우스자리','백조자리'],'알페라츠는 안드로메다자리에 속합니다. 익숙한 도형 이름과 개별 별의 소속을 구별합니다.',1,tags=('별자리',))
mc('regulus-membership','star:HIP49669','레굴루스가 속한 별자리는 어디인가요?','사자자리',['처녀자리','게자리','큰곰자리'],'레굴루스는 사자자리의 낫 모양 아래쪽을 찾는 길잡이입니다.',1,tags=('별자리',))
mc('procyon-membership','star:HIP37279','프로키온이 속한 별자리는 어디인가요?','작은개자리',['큰개자리','쌍둥이자리','작은곰자리'],'프로키온은 작은개자리의 밝은 별입니다. 큰개자리의 시리우스와 구별합니다.',1,tags=('별자리',))

# 20 intermediate multiple choice questions.
mc('m45-wide-field','dso:M45','플레이아데스 전체를 비교하려면 처음에 어떤 시야가 유리한가요?','쌍안경이나 낮은 배율의 넓은 시야',['무조건 가장 높은 배율','시야를 가장 좁게 자른 화면','별 하나만 가득 차는 초점 밖 영상'],'M45는 넓게 퍼진 별무리여서 넓은 시야가 전체 배열을 비교하기 좋습니다.',2,fields=('/observing/binoculars','/observing/telescope'),tags=('시야','장비'))
mc('m45-blue-dust','dso:M45','플레이아데스 사진의 푸른 안개를 설명한 것은 무엇인가요?','별빛을 반사하는 먼지',['푸른 액체로 된 성단 바다','지구 대기의 낮 하늘','푸른별마다 붙은 행성의 고리'],'사진 속 푸른 안개는 별빛을 반사하는 먼지입니다. 도시 접안 시야에서 같은 색이 보인다고 기대하지 않습니다.',2)
mc('m44-route','dso:M44','프레세페를 찾기 위해 게자리 양옆에서 먼저 잡을 두 길잡이는 무엇인가요?','폴룩스와 레굴루스',['베가와 데네브','시리우스와 안타레스','폴라리스와 알페라츠'],'G3의 찾기 안내는 폴룩스와 레굴루스 사이에서 게자리 영역을 좁히도록 설명합니다.',2,fields=('/howToFind/ko',),tags=('스타 호핑',))
mc('m13-keystone','dso:M13','M13으로 시야를 좁힐 때 먼저 찾는 허큘리스자리의 무늬는 무엇인가요?','키스톤이라 부르는 찌그러진 사각형',['오리온자리 허리띠','북두칠성 손잡이 끝의 두 점만','쌍둥이자리의 두 머리'],'G3는 키스톤 서쪽 변의 두 별 사이에서 M13을 찾도록 안내합니다.',2,fields=('/howToFind/ko',),tags=('스타 호핑',))
mc('m31-start','dso:M31','가을 대사각형에서 M31로 이어가는 경로의 출발 별은 무엇인가요?','알페라츠',['리겔','레굴루스','프로키온'],'알페라츠에서 안드로메다자리의 별 사슬을 따라 M31 방향으로 이동하는 경로가 제시되어 있습니다.',2,fields=('/howToFind/ko',),tags=('스타 호핑',))
mc('m31-realistic','dso:M31','도시에서 90mm로 M31을 처음 찾을 때 현실적인 목표는 무엇인가요?','밝은 중심과 길쭉한 빛의 방향 확인',['개별 세페이드 변광성의 분해','사진의 모든 나선팔 재현','은하 전체의 별 수 세기'],'G3는 낮은 배율에서 밝은 중심과 긴 축을 확인하도록 안내합니다. 나선팔이나 개별 별을 기본 목표로 삼지 않습니다.',2,fields=('/observing/telescope','/summary/ko'),tags=('관측 한계',))
mc('m42-sword','dso:M42','오리온 허리띠를 찾은 뒤 M42를 향하려면 어디를 대조하나요?','허리띠 아래 천구 남쪽의 칼 부분',['허리띠 세 별 중 가장 바깥 별 자체','천구 북극 바로 옆','백조자리의 꼬리'],'M42는 오리온 칼 부분의 번져 보이는 영역에 있습니다. 허리띠 별 자체와 구별합니다.',2,fields=('/howToFind/ko',),tags=('스타 호핑',))
mc('m42-eyepiece','dso:M42','오리온대성운의 밝은 중심을 봤지만 사진의 분홍색은 못 봤다면 어떻게 기록하나요?','직접 본 흐린 빛과 윤곽만 기록한다',['사진의 색을 본 것으로 채운다','성운을 전혀 관측하지 못했다고 단정한다','사진과 다르면 반드시 다른 천체라고 판정한다'],'접안 관측과 긴 노출의 연구 사진은 정보가 다릅니다. 확인한 성운광과 색 인상을 분리해서 적습니다.',2,fields=('/summary/ko','/observing/binoculars'),tags=('관측 기록',))
mc('ngc869-screen-direction','dso:NGC869','이중성단에서 NGC869를 사진의 왼쪽 성단으로만 외우면 왜 헷갈리나요?','화면과 광학상이 회전하거나 반전될 수 있어서',['관측할 때 두 성단이 매번 자리를 교환해서','NGC 번호가 매일 바뀌어서','두 성단이 같은 식별자를 쓰기 때문에'],'지도의 방향과 주변 별 배열로 성단을 대조해야 합니다. 화면의 좌우만으로 식별하지 않습니다.',2,fields=('/summary/ko',),tags=('시야','식별'))
mc('ngc884-independent','dso:NGC884','이중성단을 하나의 얼룩으로만 봤을 때 두 NGC 관측을 모두 완료 처리해도 되나요?','각 성단을 따로 식별한 뒤 개별 기록한다',['한 얼룩이면 두 개를 자동 완료한다','한 성단에 별칭이 둘이므로 하나만 존재한다','사진에서 두 개를 읽었으면 모두 실제 관측이다'],'NGC869와 NGC884는 서로 다른 성단입니다. 두 중심을 각각 식별했는지를 기록해야 합니다.',2,fields=('/story/ko',),tags=('관측 기록',))
mc('m57-life-stage','dso:M57','M57과 M42를 별의 삶과 연결한 설명으로 알맞은 것은 무엇인가요?','M57은 별이 내보낸 물질, M42는 별 탄생 영역과 연결된다',['둘 다 행성의 고리다','둘 다 태양계 위성이다','M57만 지구의 비구름이다'],'G3는 M57의 진화한 별이 내보낸 가스와 M42의 별 탄생 영역을 비교합니다.',2,fields=('/story/ko',),tags=('별의 진화',))
mc('m27-shape','dso:M27','아령성운이 운동기구와 똑같이 보이지 않을 때 적절한 관측 목표는 무엇인가요?','윤곽의 긴 축과 상대적으로 밝은 부분 기록',['아령 모양이 나올 때까지 관측 기록을 만들지 않기','붉고 푸른 색을 반드시 모두 채우기','별칭을 근거로 같은 모양을 상상해 그리기'],'아령은 관측 외형의 비유입니다. 실제로 보인 윤곽과 밝기 차이를 기록하면 됩니다.',2,fields=('/story/ko','/summary/ko'),tags=('관측 기록',))
mc('m51-spiral-expectation','dso:M51','90mm로 M51을 찾는 입문 미션의 필수 성공 조건으로 적절하지 않은 것은 무엇인가요?','나선팔을 사진처럼 모두 분리해 보기',['주변 별로 위치 대조하기','실제로 검출한 중심을 기록하기','동반 은하를 따로 확인했는지 구별하기'],'G3는 작은 장비에서 중심과 희미한 얼룩을 우선 찾도록 안내합니다. 이름이 소용돌이라고 나선팔 검출을 의무화하지 않습니다.',2,fields=('/summary/ko','/story/ko'),tags=('관측 한계',))
mc('m81-m82-comparison','dso:M81','M81과 M82의 보이는 모양을 비교할 때 맞추면 좋은 조건은 무엇인가요?','같은 밤의 같은 배율과 하늘 조건',['한 대상은 사진, 다른 대상은 접안상만 사용','한 대상만 초점을 일부러 흐리기','다른 날의 투명도 차이를 무조건 무시하기'],'G3는 두 대상을 같은 배율과 하늘 조건에서 비교하도록 권합니다. 연구 사진과 직접 관측은 구별합니다.',2,fields=('/story/ko',),tags=('비교 관측',))
mc('m46-projection','dso:M46','M46 사진에 겹친 NGC2438이 성단 구성원이라고 단정하면 안 되는 이유는 무엇인가요?','같은 방향에 보이지만 앞쪽의 다른 천체이기 때문에',['모든 성운이 지구 대기에 있기 때문에','NGC 이름은 모두 별자리 이름이기 때문에','M46이 사실 태양계 행성이기 때문에'],'첨부 G3는 NGC2438을 성단 앞쪽의 별도 행성상성운으로 설명합니다. 방향상 겹침과 물리적 소속은 다릅니다.',2,fields=('/summary/ko',),tags=('공간 관계',))
mc('m101-background','dso:M101','바람개비은하가 밝은 별 옆에 있어도 도시에서 찾기 어려운 주된 이유는 무엇인가요?','은하빛이 넓게 퍼져 밝은 배경에 묻히기 때문에',['알카이드가 은하의 빛을 물리적으로 모두 가리기 때문에','은하는 망원경을 향할 때만 빛나기 때문에','메시에 번호가 세 자리라서'],'G3는 M101의 넓게 퍼진 빛과 도시 배경의 낮은 대비를 강조합니다. 가까운 길잡이의 존재가 검출을 보장하지 않습니다.',2,fields=('/summary/ko','/story/ko'),tags=('광해','표면 밝기'))
mc('ngc7000-starfield','dso:NGC7000','데네브 주변에 별이 많이 보이면 북아메리카성운도 관측한 것으로 볼 수 있나요?','성운 자체의 밝기 차이를 확인했는지 따로 판단한다',['주변 별을 하나만 봐도 성운 관측이다','데네브를 탭하면 성운 관측도 자동 완료다','콘텐츠 사진을 열면 성운을 실제로 본 것이다'],'주변 별밭과 넓은 성운광의 검출은 서로 다릅니다. 밝기 차이를 확인한 범위를 기록합니다.',2,fields=('/summary/ko',),tags=('관측 판정',))
mc('ngc457-name','dso:NGC457','ET성단이라는 이름을 관측에 적용하는 태도로 알맞은 것은 무엇인가요?','외형의 별명으로 이해하고 실제 별 배열을 대조한다',['우주 생명체가 확인됐다는 뜻으로 외운다','한 개의 행성에 붙은 공식 생물 이름으로 본다','별칭의 그림 전체가 보여야만 별이 존재한다고 본다'],'NGC457의 별칭은 별 배열에서 떠올린 모습입니다. 이름의 인상과 실제 천체의 종류를 나누어 읽습니다.',2,fields=('/summary/ko','/story/ko'),tags=('이름','별 배열'))
mc('albireo-binding','star:HIP95947','알비레오에서 두 점을 분리해 봤다는 사실만으로 알 수 없는 것은 무엇인가요?','두 별이 중력으로 묶여 함께 도는지 여부',['하늘에서 두 점으로 보였다는 것','각 점의 색 인상이 달랐는지','관측 때 쓴 배율이 무엇인지'],'시각적 이중성 확인과 물리적 결합 판정은 다릅니다. 결합 여부에는 거리와 운동 정보가 더 필요합니다.',2,fields=('/summary/ko','/story/ko'),tags=('이중성',))
mc('m45-star-count','dso:M45','플레이아데스에서 맨눈으로 센 별 수가 친구와 다를 때 알맞은 해석은 무엇인가요?','하늘 밝기와 시력에 따라 보이는 수가 달라질 수 있다',['일곱 개가 아니면 무조건 다른 천체다','별이 관측자를 따라 사라졌다','쌍안경으로 본 수를 맨눈 수로 고치면 된다'],'G3는 맨눈 별 수를 고정된 성공 기준으로 삼지 않습니다. 직접 확인한 수와 사용 장비를 기록합니다.',2,fields=('/summary/ko',),tags=('관측 기록',))

# Eight advanced questions: scope and inference, rather than disputed numbers.
mc('m31-history-method','dso:M31','안드로메다의 규모를 이해하는 데 연결된 리비트와 허블의 연구를 바르게 묶은 것은 무엇인가요?','세페이드의 주기·광도 관계와 변광성 관측으로 거리를 연구했다',['은하의 색만 눈으로 비교해 거리를 확정했다','사진 속 별 개수만으로 지구의 크기를 계산했다','행성의 위상 순서로 모든 별의 거리를 정했다'],'G3의 관측사는 리비트의 관계와 허블의 세페이드 관측을 연결합니다. 이 문제는 검토 중인 M31 거리 숫자를 정답으로 요구하지 않습니다.',3,fields=('/story/ko',),tags=('관측사','측정 원리'))
mc('m3-detection-measurement','dso:M3','M3의 전체 빛얼룩을 한 번 본 기록과 변광성 측정의 관계는 무엇인가요?','성단 검출은 유효하지만 특정 별의 변광을 측정한 것은 아니다',['성단을 찾으면 모든 변광 주기가 자동 측정된다','사진을 읽은 것만으로 직접 측정이 된다','별이 많은 성단에는 밝기 변화가 절대 없다'],'성단의 존재 확인과 개별 별의 반복 측정은 서로 다른 관측 단계입니다.',3,fields=('/story/ko',),tags=('측정 범위',))
mc('m13-resolution','dso:M13','쌍안경에서 둥근 얼룩이 보이고 사진에서는 수많은 별이 보일 때 올바른 설명은 무엇인가요?','같은 성단의 빛이 장비의 분해 능력에 따라 다르게 표현된다',['쌍안경이 별을 실제 가스로 바꿨다','사진과 눈의 대상은 반드시 서로 다르다','구상성단에는 본래 별이 없었다'],'M13의 많은 별빛은 작은 장비에서 합쳐져 보일 수 있습니다. 개별 별 분해와 성단 검출을 구분합니다.',3,fields=('/summary/ko','/story/ko'),tags=('분해 능력',))
mc('m78-m42-emission','dso:M78','M78의 반사성운과 M42의 빛나는 가스를 설명한 차이는 무엇인가요?','M78은 먼지의 별빛 산란, M42는 뜨거운 별의 에너지로 빛나는 가스를 강조한다',['둘 다 같은 행성의 고리 반사만을 뜻한다','M78만 지구의 비구름이다','M42의 빛은 입문자가 휴대폰으로 비춘 빛이다'],'두 콘텐츠는 성운빛을 만드는 과정을 구별해 설명합니다. 동일한 성운이라는 말이 같은 발광 원인을 보장하지 않습니다.',3,fields=('/summary/ko',),tags=('빛의 원리',),extra=('dso:M42',))
mc('saturn-nebula-distance-policy','dso:NGC7009','토성성운 자료의 거리 값이 서로 다를 때 이 학습팩의 처리로 맞는 것은 무엇인가요?','충돌을 남기고 숫자 암기 문제 대신 종류와 관측 특징을 배운다',['가장 큰 수를 자동 정답으로 삼는다','두 값을 평균하면 오차 없이 참값이 된다','별칭 토성만 보고 토성까지의 거리를 적용한다'],'G3는 거리 값의 불일치를 검토 사항으로 남겼습니다. 출처와 측정 근거가 정리되기 전에는 숫자를 확정하지 않습니다.',3,fields=('/summary/ko',),tags=('자료 해석',))
mc('ursa-major-extent','const:UMa','북두칠성과 큰곰자리의 범위를 데이터로 다룰 때 올바른 관계는 무엇인가요?','북두칠성은 큰곰자리 안의 일부 눈에 띄는 무늬다',['두 이름의 영역은 항상 완전히 같다','북두칠성은 큰곰자리 밖의 나선은하다','큰곰자리는 단일 별의 고유명이다'],'G3는 북두칠성이라는 성군과 더 넓은 현대 별자리 영역을 구분합니다.',3,fields=('/summary/ko','/story/ko'),tags=('성군','별자리'))
mc('andromeda-scales','const:And','알페라츠와 별 사슬만 확인했다면 안드로메다은하 관측 완료로 옮기면 안 되는 이유는 무엇인가요?','별자리 탐색과 M31의 은하빛 검출은 서로 다른 대상·행동이기 때문에',['모든 별자리가 지구 대기에 있어서','은하는 사진 속에만 존재해서','두 대상의 이름이 다른 언어라서'],'같은 안드로메다라는 이름을 쓰지만 별자리와 은하는 다른 식별자입니다. M31의 빛은 따로 확인해야 합니다.',3,fields=('/summary/ko','/story/ko'),tags=('대상 구별','관측 기록'))
mc('hercules-story-scope','const:Her','허큘리스자리 영웅 이야기와 M13·M92의 관계를 어떻게 읽어야 하나요?','그림은 기억의 실마리이며 두 성단과 영웅의 물리적 연결을 뜻하지 않는다',['영웅 그림은 우주에 실제 빛나는 선으로 존재한다','이야기를 읽으면 두 성단을 직접 관측한 것이다','로마 이름을 알면 성단의 거리가 확정된다'],'G3는 그리스·로마 이름과 현대의 하늘 영역, 실제 성단 검출을 구별합니다.',3,fields=('/story/ko',),tags=('문화','물리적 해석'))

# 16 true/false items, balanced eight true and eight false.
tf('m45-single-star','dso:M45','플레이아데스 M45는 별이 하나뿐인 단일 항성의 이름이다.',False,'M45는 많은 별이 모인 산개성단입니다.',1)
tf('m44-blended-light','dso:M44','프레세페가 맨눈에 흐린 구름처럼 보이는 것은 여러 별빛이 합쳐져 보이는 모습이다.',True,'G3는 M44를 실제 가스구름이 아닌 별무리로 설명합니다.',1)
tf('m31-foreground-star','dso:M31','안드로메다은하 M31은 안드로메다자리를 이루는 밝은 별 하나와 같은 대상이다.',False,'M31은 우리은하 밖 은하이며 앞쪽의 별들과 구별합니다.',1)
tf('m13-globular','dso:M13','M13은 많은 별이 조밀하게 모인 구상성단이다.',True,'G3의 M13 소개는 산개성단과 다른 조밀한 별 집단을 설명합니다.',1)
tf('ngc457-open-cluster','dso:NGC457','ET성단 NGC457은 별들이 모인 산개성단이다.',True,'ET는 외형의 별명이며 실제 종류는 산개성단입니다.',1)
tf('alpheratz-all-pegasus','star:HIP677','페가수스 대사각형이라는 이름 때문에 알페라츠의 현대 소속도 페가수스자리이다.',False,'알페라츠의 현대 소속은 안드로메다자리입니다.',1)
tf('m33-total-light','dso:M33','은하의 전체 빛을 합친 등급만 알면 도시에서 얼마나 쉽게 보일지 언제나 결정할 수 있다.',False,'M33처럼 빛이 넓게 퍼진 대상은 배경 대비와 시야도 중요합니다.',2,fields=('/summary/ko','/story/ko'))
tf('m46-front-nebula','dso:M46','첨부 콘텐츠는 NGC2438을 M46 앞쪽에 겹쳐 보이는 별도 행성상성운으로 구분한다.',True,'같은 방향에 보인다는 사실이 성단 소속을 뜻하지는 않습니다.',2)
tf('m81-m82-two-objects','dso:M81','M81과 M82는 가까운 하늘에서 비교할 수 있는 서로 다른 은하이다.',True,'같은 배율과 하늘 조건으로 두 은하의 외형을 비교할 수 있습니다.',2,fields=('/summary/ko','/story/ko'))
tf('m45-photo-color','dso:M45','도시의 10×50 관측에서도 플레이아데스 사진의 푸른 안개를 같은 색과 넓이로 반드시 보아야 한다.',False,'사진의 반사성운과 눈으로 확인한 별무리는 같은 관측 정보가 아닙니다.',2)
tf('m57-planet-ring','dso:M57','행성상성운이라는 말은 M57이 태양계 행성의 고리임을 뜻한다.',False,'M57은 별이 내보낸 가스가 빛나는 성운입니다.',2)
tf('m78-reflection','dso:M78','M78의 반사성운 설명에는 주변 별빛을 먼지가 산란시키는 과정이 포함된다.',True,'성운빛의 원인을 종류와 함께 구별해서 읽습니다.',2)
tf('albireo-bound-proof','star:HIP95947','알비레오를 두 점으로 분리한 것만으로 두 성분이 중력으로 묶였음이 증명된다.',False,'물리적인 결합을 판단하려면 거리와 운동 같은 추가 측정이 필요합니다.',3,fields=('/story/ko',))
tf('regulus-research-image','star:HIP49669','레굴루스의 간섭계 연구 영상과 90mm 접안 시야의 번짐은 같은 측정 결과라고 볼 수 없다.',True,'G3는 전문 관측에서 밝혀진 구조와 접안 기록을 분리하도록 설명합니다.',3,fields=('/story/ko',))
tf('ursa-major-always-up','const:UMa','큰곰자리는 북쪽 별자리이므로 모든 부분이 한국에서 늘 지평선 위에 있다.',False,'G3는 계절·시각에 따라 낮게 내려가거나 일부가 가려질 수 있음을 명시합니다.',3)
tf('andromeda-separate-ids','const:And','안드로메다자리 탐색과 M31의 은하빛 검출은 다른 대상의 기록으로 구별해야 한다.',True,'이름을 공유해도 현대 별자리 영역과 은하는 같은 천체가 아닙니다.',3,fields=('/summary/ko','/story/ko'))

# 16 extra skyPick prompts, using eight new bright-star targets.
sky('spica-name','star:HIP65474','하늘 화면에서 스피카를 찾아 탭하세요.','스피카는 처녀자리의 봄철 길잡이별입니다.',1)
sky('alpheratz-name','star:HIP677','하늘 화면에서 알페라츠를 찾아 탭하세요.','알페라츠는 안드로메다자리에 속하는 가을 대사각형의 꼭짓점입니다.',1)
sky('procyon-name','star:HIP37279','하늘 화면에서 프로키온을 찾아 탭하세요.','프로키온은 작은개자리의 밝은 별입니다.',1)
sky('regulus-name','star:HIP49669','하늘 화면에서 레굴루스를 찾아 탭하세요.','레굴루스는 사자자리의 밝은 길잡이별입니다.',1)
sky('hamal-name','star:HIP9884','하늘 화면에서 하말을 찾아 탭하세요.','하말은 양자리의 밝은 길잡이별입니다.',1)
sky('pollux-name','star:HIP37826','하늘 화면에서 폴룩스를 찾아 탭하세요.','폴룩스는 쌍둥이자리의 두 머리 중 하나입니다.',1)
sky('alkaid-handle','star:HIP67301','북두칠성의 굽은 손잡이 맨 끝에 있는 밝은 별을 탭하세요.','손잡이 끝의 별은 알카이드입니다. 미자르와 구별합니다.',2)
sky('kochab-bowl','star:HIP72607','작은국자의 몸통 쪽 길잡이로 소개된 코카브를 탭하세요.','코카브는 작은곰자리의 별이며 폴라리스와 같은 점이 아닙니다.',2)
sky('spica-arc-continuation','star:HIP65474','아르크투루스를 지난 봄철 큰 곡선을 이어 도착하는 처녀자리 별을 탭하세요.','G3는 북두칠성 손잡이에서 아르크투루스를 지나 스피카로 이어지는 경로를 설명합니다.',2)
sky('regulus-sickle','star:HIP49669','사자자리의 낫이나 뒤집힌 물음표 무늬 아래쪽 길잡이별을 탭하세요.','그 무늬의 밝은 기준은 레굴루스입니다.',2)
sky('hamal-short-pattern','star:HIP9884','가을에 황소자리와 물고기자리 사이 구역의 짧은 배열에서 찾는 양자리 길잡이별을 탭하세요.','하말은 양자리의 짧은 배열을 찾는 밝은 기준별입니다.',2)
sky('procyon-winter-triangle','star:HIP37279','시리우스·베텔게우스와 겨울 대삼각형을 이루는 작은개자리 별을 탭하세요.','세 번째 꼭짓점은 프로키온입니다.',2)
sky('alpheratz-boundary','star:HIP677','대사각형 이름은 페가수스와 연결되지만 현대 소속은 안드로메다인 꼭짓점을 탭하세요.','성군의 도형과 별자리 경계는 다른 분류이며 정답은 알페라츠입니다.',3,fields=('/summary/ko','/story/ko'))
sky('pollux-planet-not-companion','star:HIP37826','쌍둥이자리 두 머리 중 외계행성을 연구한 주황빛 거성으로 소개된 별을 탭하세요.','정답은 폴룩스입니다. 행성을 화면에서 분리해 고르는 문제는 아닙니다.',3,fields=('/summary/ko','/story/ko'))
sky('alkaid-galaxy-route','star:HIP67301','M51을 찾는 출발점이 되지만 그 별을 찾는 것만으로 은하 관측은 끝나지 않는 북두 손잡이 끝 별을 탭하세요.','알카이드를 기준으로 M51 구역을 좁힐 수 있습니다. 길잡이와 은하는 별도 대상입니다.',3,fields=('/story/ko',))
sky('kochab-not-pole','star:HIP72607','작은국자 몸통의 밝은 기준이지만 그 위치를 정북으로 읽으면 안 된다고 배운 별을 탭하세요.','코카브는 천구 북극 자체가 아닙니다. 정답 위치와 북극의 방향을 구별합니다.',3,fields=('/summary/ko','/story/ko'))
assert len(NEW)==80, len(NEW)
assert Counter(q['type'] for q in NEW)=={'mc':48,'trueFalse':16,'skyPick':16}
assert Counter(q['difficulty'] for q in NEW)=={1:32,2:32,3:16}
# Shuffle correct-answer slots without changing question/answer semantics; 27 per slot.
slots=[0,1,2,3]*27;random.Random(20260907).shuffle(slots)
for q,slot in zip([x for x in Q if x['type']=='mc'],slots):
    correct=q['choices'].pop(q['answer']);q['choices'].insert(slot,correct);q['answer']=slot

# Mission builders. All limits outside Task7 schema go into sidecars.
DANGER='고도 25° 이상이고 안전하게 관측 가능한 저녁에 진행합니다. 보이지 않으면 실제 관측 완료로 기록하지 않고 보류합니다.'
def read(i):return {'type':'read','contentId':i}
def find(i,s):return {'type':'find','objectId':i,'hint':txt(s)}
def observe(i):return {'type':'observe','objectId':i}
def skill(s):return {'type':'skill','skill':s}
def check(*items):return {'type':'checklist','items':[txt(x) for x in items]}
def quiz(*ids):return {'type':'quiz','quizIds':list(ids),'passRatio':1}
def mission(i,title,description,level,season,minutes,steps,content,dark=False,badge=None):
    m={'id':i,'title':txt(title),'description':txt(description+' '+DANGER),'level':level,'season':season,'estimatedMinutes':minutes,
       'requires':{'equipment':[level],'darkSky':dark},'steps':steps,'contentIds':content}
    if badge:m['rewardBadgeId']=badge
    return m
replacements={
'spring-arcturus-binocular':mission('spring-m44-binocular','봄 · 프레세페의 별무리','폴룩스와 레굴루스 사이에서 게자리의 성단을 찾아, 별빛의 밀집과 흐린 가스구름을 구별합니다.','binoculars','spring',25,[read('dso:M44'),check('폴룩스·레굴루스·M44가 모두 관측 가능한 고도인지 앱에서 확인합니다.','10×50을 안정되게 지지하고 맨눈 검출은 의무로 삼지 않습니다.'),find('star:HIP37826','폴룩스를 짚고 레굴루스 방향의 게자리 영역을 지도에서 좁히세요.'),find('dso:M44','두 기준별 사이를 쌍안경으로 나누어 훑고 주변보다 별이 모인 배열을 지도와 대조하세요.'),observe('dso:M44'),quiz('q-m44-kind','q-m44-route')],['star:HIP37826','star:HIP49669','dso:M44','const:Cnc']),
'autumn-altair-line':mission('autumn-double-cluster','가을 · 이중성단의 두 중심','NGC869와 NGC884를 각각 식별해 두 성단과 하나의 얼룩을 구분합니다.','binoculars','autumn',30,[read('dso:NGC869'),read('dso:NGC884'),find('dso:NGC869','카시오페이아자리와 페르세우스자리 사이를 지도와 맞추고 첫 성단 중심과 주변 배열을 대조하세요. 사진의 좌우만으로 정하지 않습니다.'),observe('dso:NGC869'),find('dso:NGC884','이웃한 두 번째 성단을 주변 별과 대조하세요. 한 덩어리만 확인됐다면 두 번째 기록은 보류합니다.'),observe('dso:NGC884')],['dso:NGC869','dso:NGC884','const:Cas','const:Per']),
'winter-sirius-steady':mission('winter-m45-starhop','튜토리얼 · 별을 이어 플레이아데스로','알데바란에서 지도를 단계적으로 대조하며 플레이아데스까지 이동하는 스타 호핑을 익힙니다.','binoculars','winter',30,[read('dso:M45'),check('알데바란과 M45 모두 고도 25° 이상인지 확인합니다.','실제 쌍안경 시야를 앱에 맞추고, 이동 경로를 겹치는 시야로 나누어 확인합니다.'),find('star:HIP21421','알데바란과 주변 V자 배열을 짚으세요. 이어 천구의 서북쪽 M45 방향으로 약 14°를 한 번에 뛰지 않고, 앱의 경로를 겹치는 시야로 나누어 대조합니다.'),skill('starhop'),observe('dso:M45'),quiz('q-m45-kind','q-m45-wide-field','q-m45-star-count')],['star:HIP21421','dso:M45','const:Tau'],badge='badge-first-hop'),
'autumn-deneb-point':mission('autumn-m31-core','가을 · 은하의 밝은 중심','알페라츠에서 별 사슬을 따라 안드로메다은하 중심을 찾습니다. 가능하면 달빛이 적은 어두운 관측지에서 진행합니다.','telescope','autumn',30,[read('dso:M31'),check('90mm의 낮은 배율과 넓은 시야를 사용하며 사진의 나선팔은 필수 목표로 삼지 않습니다.','알페라츠와 은하 중심의 현재 고도 및 지도 방향을 확인합니다.'),find('star:HIP677','대사각형 꼭짓점에서 미라크·뮤별 방향의 사슬을 앱과 실제 시야에서 순서대로 맞추세요.'),find('dso:M31','주변 별을 대조해 길쭉한 중심의 흐린 빛을 찾습니다. 검출하지 못하면 시도 기록만 남기세요.'),observe('dso:M31'),quiz('q-m31-realistic','q-m31-start')],['star:HIP677','dso:M31','const:And'],dark=True),
}
M=[replacements.get(m['id'],deepcopy(m)) for m in M0]
M.extend([
mission('spring-spica-bridge','봄 · 곡선을 이어 스피카로','아르크투루스에서 스피카로 이어지는 봄철 길을 익히고 두 별자리의 소속을 구분합니다.','naked','spring',20,[read('star:HIP65474'),find('star:HIP69673','북두칠성 손잡이의 곡선을 따라 아르크투루스를 확인합니다.'),find('star:HIP65474','그 흐름을 이어 처녀자리의 스피카를 앱의 실제 고도·방향과 맞추세요.'),observe('star:HIP65474'),quiz('q-spica-membership')],['star:HIP69673','star:HIP65474','const:Vir']),
mission('autumn-alpheratz-anchor','가을 · 대사각형의 소속 찾기','도형의 이름과 별의 현대 별자리 소속이 다를 수 있음을 알페라츠에서 배웁니다.','naked','autumn',20,[read('star:HIP677'),find('star:HIP677','현재 지도에서 가을 대사각형을 짚고 안드로메다 쪽 사슬이 시작하는 꼭짓점을 대조하세요.'),observe('star:HIP677'),quiz('q-alpheratz-membership','q-alpheratz-all-pegasus')],['star:HIP677','const:Peg','const:And']),
mission('summer-m13-binocular','여름 · 둥근 성단의 빛','어두운 관측지에서 허큘리스자리의 M13을 작은 둥근 얼룩으로 확인합니다.','binoculars','summer',30,[read('dso:M13'),check('달빛이 적고 충분히 어두운, 안전한 관측지인지 확인합니다.','별 하나하나의 분해 대신 중심과 주변의 흐린 빛을 찾습니다.'),find('star:HIP91262','베가에서 아르크투루스 사이를 앱과 대조해 허큘리스자리 키스톤 구역을 좁히세요.'),find('dso:M13','키스톤 서쪽 변에서 G3 경로를 따라 별과 다른 둥근 얼룩을 확인하세요.'),observe('dso:M13'),quiz('q-m13-kind','q-m13-keystone')],['star:HIP91262','star:HIP69673','const:Her','dso:M13'],dark=True),
mission('winter-m42-binocular','겨울 · 오리온의 별 탄생 구름','허리띠와 칼 부분을 구별하고, 성운 중심의 빛을 별무리와 대조합니다.','binoculars','winter',25,[read('dso:M42'),find('star:HIP26311','오리온 허리띠 가운데 알닐람을 기준으로 칼이 늘어진 천구 남쪽을 지도에서 확인하세요.'),find('dso:M42','칼 가운데의 흐린 중심을 10×50으로 대조합니다. 분홍색이 보이는 것을 성공 조건으로 삼지 않습니다.'),observe('dso:M42'),quiz('q-m42-sword','q-m42-eyepiece')],['star:HIP26311','const:Ori','dso:M42']),
mission('spring-m3-globular','봄 · M3의 둥근 윤곽','아르크투루스에서 성단까지 구역을 좁히고 중심과 가장자리의 인상을 기록합니다.','telescope','spring',30,[read('dso:M3'),check('달빛이 적은 어두운 하늘에서 낮은 배율부터 시작합니다.','구성별 분리나 변광성 측정을 완료 기준으로 삼지 않습니다.'),find('star:HIP69673','아르크투루스에서 코르카롤리 방향으로 이어지는 G3의 경로를 앱에서 확인하세요.'),find('dso:M3','약 12° 규모의 이동을 겹치는 시야로 나누고, 마지막에 성단 주변 별을 다시 맞춥니다.'),observe('dso:M3'),quiz('q-m3-kind','q-m3-detection-measurement')],['star:HIP69673','dso:M3','const:Boo'],dark=True),
mission('summer-albireo-double','여름 · 한 점에서 두 점으로','백조자리의 알비레오를 두 밝은 성분으로 나누어 보고 실제 색 인상을 기록합니다.','telescope','summer',25,[read('star:HIP95947'),find('star:HIP102098','데네브의 꼬리에서 북십자 반대편 끝을 앱의 백조자리 배열과 맞추세요.'),find('star:HIP95947','낮은 배율로 대상을 넣고 조건에 맞춰 20~80배 범위에서 두 점을 구별해 보세요.'),observe('star:HIP95947'),check('두 점을 구별하지 못했다면 분리 성공 메모는 남기지 않습니다.','나란히 보인다는 사실만으로 물리적 결합이 증명됐다고 쓰지 않습니다.'),quiz('q-albireo-visual','q-albireo-binding')],['star:HIP102098','star:HIP95947','const:Cyg'])
])
# Keep six stable path IDs, replacing retired missions explicitly and adding one per path.
remap={i:m['id'] for i,m in replacements.items()}
P=deepcopy(P0)
additions={
 'naked-first-directions':'spring-spica-bridge',
 'naked-season-bridges':'autumn-alpheratz-anchor',
}
# Determine old path IDs for binocular/telescope; assign one new mission to each.
other_add={'binoculars':['summer-m13-binocular','winter-m42-binocular'],'telescope':['spring-m3-globular','summer-albireo-double']}
for p in P:
    p['missionIds']=[remap.get(i,i) for i in p['missionIds']]
    extra=additions.get(p['id'])
    if extra is None:extra=other_add[p['level']].pop(0)
    p['missionIds'].append(extra)
    p['description']=txt({'naked':'밝은 길잡이·별자리·달을 연결해 실제 관측과 지도의 이름을 구분합니다.',
                         'binoculars':'10×50의 실제 시야를 활용해 별무리·성운과 길잡이별을 단계적으로 비교합니다.',
                         'telescope':'90mm의 낮은 배율부터 실제 관측·정렬·기록을 연습하고 사진과 접안 시야를 구분합니다.'}[p['level']]+' 목록은 강제 순서가 아닙니다. 오늘의 고도·박명·장비 조건을 통과한 미션부터 고릅니다.')
# Remove misleading constellationCount semantics; now count explicit constellation observations.
for b in B:
    if b['rule']['key']=='constellationCount':
        n=b['rule']['n'];b['description']=txt(f'서로 다른 별자리 {n}개의 주요 배열을 직접 확인한 기록입니다. 다음에는 그 별자리 안의 성단이나 별을 따로 찾아보세요.')
    if b['id']=='badge-missions-24':
        b['description']=txt('서로 다른 미션 스물네 개를 마쳤습니다. 다음에는 남은 미션 중 오늘 조건에 맞는 대상을 골라 보세요.')
# Two new attainable progression badges (no pressure for consecutive nights).
B.extend([
 {'id':'badge-messier-five','title':txt('다섯 가지 깊은 하늘'),'description':txt('서로 다른 메시에 천체 다섯 개를 관측했습니다. 다음에는 산개성단과 구상성단의 인상을 비교해 보세요.'),'icon':'🔬','rule':{'key':'messierCount','n':5}},
 {'id':'badge-missions-30','title':txt('첫 과정의 다음 장'),'description':txt('서로 다른 미션 서른 개를 마쳤습니다. 다음에는 같은 천체를 다른 계절·하늘 조건에서 다시 기록해 보세요.'),'icon':'🌠','rule':{'key':'missionsCompleted','n':30}},
])
# Constellation badges use explicit free-observation records, not a proxy star count.
mi={m['id']:m for m in M}
# Tutoring markers and exact physical targets are sidecars, not extra Task7 keys.
tutorials={'summer-vega-fov':'fovSetup','summer-vega-align-one':'arMode+align1','any-moon-first-sketch':'sketch','winter-m45-starhop':'starhop-openCluster'}
anchor_extra={
 'spring-m44-binocular':['star:HIP49669'],
 'summer-m13-binocular':['star:HIP69673'],
}
# Constellation trace anchors are explicitly all required, not a representative centroid.
# Some anchors are not G3 content targets: auxiliary positions only, never mission/quiz objects.
# Store only supplied-content target anchors here. A stricter full-constellation renderer review is gated.
const_anchors={
 'const:UMi':['star:HIP11767','star:HIP72607'],
 'const:CMa':['star:HIP32349'],
 'const:Tau':['star:HIP21421'],
 'const:Cyg':['star:HIP102098','star:HIP95947'],
 'const:Vir':['star:HIP65474'],
 'const:And':['star:HIP677']}
G=[]
for m in M:
    direct=sorted({s['objectId'] for s in m['steps'] if 'objectId' in s})
    obs=sorted({s['objectId'] for s in m['steps'] if s['type']=='observe'})
    positions=set(x for x in direct if not x.startswith('const:'))|set(anchor_extra.get(m['id'],[]))
    for x in direct:
        if x.startswith('const:'):positions.update(const_anchors[x])
    oldgate=GATES0.get(m['id'],{})
    G.append({'missionId':m['id'],'authoringStatus':'complete','directObjectIds':direct,'observeObjectIds':obs,
      'planningPositionIds':sorted(positions),'tutorial':tutorials.get(m['id']),
      'minimumAltitudeDeg':25,'eveningKst':[21,24],'solarAltitudeMaxDeg':-12,
      'requiredContentIds':sorted(set(m['contentIds'])|set(direct)),
      'requiredSkills':sorted({s['skill'] for s in m['steps'] if s['type']=='skill'}),
      'requiresPublishedContent':True,'requiresImplementedHandlers':True,
      'constellationTraceGate':{'required':any(x.startswith('const:') for x in obs),
       'policy':'별 하나 또는 대표 좌표만으로 별자리 관측 완료 금지. 승인된 주요 별 배열의 모든 필수 점 고도/가시성 검사와 사용자의 실제 식별 기록 필요.',
       'anchorCompleteness':'pending-full-pattern-approval' if any(x.startswith('const:') for x in obs) else 'not-applicable'},
      'notes':oldgate.get('notes',[])})
# Save authored data.
for key,data in [('paths',P),('missions',M),('badges',B),('quiz',Q)]:save('G5/G5-learn-'+key+'.json',data)
save('G5/evidence/quiz-evidence.json',E)
save('G5/mission-runtime-gates.json',G)
save('G5/tutorials.json',[{'tutorial':t,'missionId':i,'requiredSkills':[s['skill'] for s in mi[i]['steps'] if s['type']=='skill'],
  'completeCriteria':'실제 기능 성공 이벤트와 관련 관측 저장 필요. 버튼 진입·지도 선택만으로 완료하지 않음.'} for i,t in tutorials.items()])
save('G5/id-migration.json',{'schemaVersion':1,'missionReplacements':[{'oldId':a,'newId':b,'progressPolicy':'no-auto-completion-transfer','reason':'학습 목표와 관측 대상이 바뀌었음'} for a,b in remap.items()],
 'quizPolicy':'기존 정답 의미는 보존하되 보기 순서를 바꿨으므로 과거 인덱스 응답은 원래 버전의 보기로 판정해야 함.',
 'badgePolicy':'constellationCount는 실제 const: 관측만 집계. 기존 별 소속 대리 집계로 부여된 값은 재평가 전 새 별자리 배지로 승계하지 않음.'})
save('G5/quiz-sampling-policy.json',{'version':1,'difficultyProportions':{'1':0.4,'2':0.4,'3':0.2},
 'sameSkyPickTargetMaxPerSession':1,'avoidImmediateAnswerLeakage':True,
 'repeatUnit':'quizId와 concept/target를 함께 추적. 같은 대상 이름·소속 변형 연속 출제 금지.',
 'skyPickVisibilityMode':'승인된 현재 하늘 또는 명시적인 지도 연습 장면에서만',
 'quizNeverCreatesObservation':True,'readUnavailablePolicy':'해당 문항 보류',
 'wrongAnswerPolicy':'설명을 제시하고 재시도 허용; 첫 응답 연속 정답 집계와 재시도 점수 분리'})
save('G5/changes-from-prep.json',{'previousCounts':{'paths':6,'missions':24,'badges':16,'quiz':100},
 'currentCounts':{'paths':len(P),'missions':len(M),'badges':len(B),'quiz':len(Q)},'addedQuizIds':[x['id'] for x in NEW],
 'modifiedLegacyQuizIds':[q['id'] for q,o in zip(Q[:100],OLDQ) if q!=o],
 'changes':['기존 문항 의미 보존 및 리겔/알데바란 조사 수정','객관식 정답 위치를 0~3 각각 27개로 균형화','반복 미션 4개를 성단·은하 미션으로 대체','신규 미션 6개 추가','constellationCount는 실제 별자리 자유 관측 기록만 집계하도록 제안; 길잡이별의 소속으로 대리 집계하지 않음','성단 스타 호핑 튜토리얼 작성','G3 수치 원문과 검토 보류 상태는 변경하지 않음']})
blocks=[]
for k in ['paths','missions','badges','quiz']:
    blocks+=['## '+k+'.json','```json',(OUT/f'G5-learn-{k}.json').read_text().rstrip(),'```','']
(OUT/'G5-learn-codeblocks.md').write_text('\n'.join(blocks),encoding='utf-8')
print('G5',len(P),len(M),len(B),len(Q),'quiz type',Counter(q['type'] for q in Q),'difficulty',Counter(q['difficulty'] for q in Q))
print('missions season',Counter(m['season'] for m in M),'level',Counter(m['level'] for m in M))
print('path IDs',[(p['id'],p['missionIds']) for p in P])
