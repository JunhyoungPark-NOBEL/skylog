#!/usr/bin/env python3
"""Offline planning screen only. Not an ephemeris or a live visibility guarantee.
Uses supplied, epoch-unspecified RA/Dec unchanged and USNO approximate formulae.
"""
from __future__ import annotations
from pathlib import Path
from datetime import datetime,date,timedelta,timezone
from collections import Counter
import csv,json,math
ROOT=Path(__file__).resolve().parents[2]; G=ROOT/'G5'; RAD=math.pi/180
CAT={r['id']:r for r in csv.DictReader((ROOT/'shared/inputs/catalog-values.v1.csv').open(encoding='utf-8-sig'))}
M=json.loads((G/'G5-learn-missions.json').read_text()); GATES={x['missionId']:x for x in json.loads((G/'mission-runtime-gates.json').read_text())}
Q=json.loads((G/'G5-learn-quiz.json').read_text()); KST=timezone(timedelta(hours=9)); LAT=36.35;LON=127.38
SEASONS={'spring':[3,4,5],'summer':[6,7,8],'autumn':[9,10,11],'winter':[12,1,2]}
LIMITS={'spring-orion-color-pair':[3],'autumn-aldebaran-arrival':[10,11]}
def altitude(ra,dec,lst,lat=LAT):
    z=math.sin(lat*RAD)*math.sin(dec*RAD)+math.cos(lat*RAD)*math.cos(dec*RAD)*math.cos((lst-ra)*RAD)
    return math.degrees(math.asin(max(-1,min(1,z))))
def solar_lst(t):
    jd=t.timestamp()/86400+2440587.5; jd0=math.floor(jd-0.5)+0.5; d0=jd0-2451545; h=(jd-jd0)*24; T=(jd-2451545)/36525
    lst=((6.697375+0.065709824279*d0+1.0027379*h+0.0000258*T*T)%24*15+LON)%360
    D=jd-2451545;g=(357.529+0.98560028*D)*RAD;q=280.459+0.98564736*D
    L=(q+1.915*math.sin(g)+0.020*math.sin(2*g))*RAD;e=(23.439-0.00000036*D)*RAD
    ra=math.degrees(math.atan2(math.cos(e)*math.sin(L),math.cos(L)))%360; dec=math.degrees(math.asin(math.sin(e)*math.sin(L)))
    return lst,altitude(ra,dec,lst)
def sep(a,b):
    r1,d1,r2,d2=[float(v)*RAD for v in [a['ra_deg'],a['dec_deg'],b['ra_deg'],b['dec_deg']]]
    # atan2 of cross/dot is robust at 0 and 180 degrees.
    u=(math.cos(d1)*math.cos(r1),math.cos(d1)*math.sin(r1),math.sin(d1))
    v=(math.cos(d2)*math.cos(r2),math.cos(d2)*math.sin(r2),math.sin(d2))
    cr=(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])
    return math.degrees(math.atan2(math.sqrt(sum(x*x for x in cr)),sum(x*y for x,y in zip(u,v))))
def save(p,x):(G/p).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def main():
    positions=sorted({i for g in GATES.values() for i in g['planningPositionIds'] if i.startswith(('star:','dso:'))})
    for i in positions:assert CAT[i]['ra_deg'] and CAT[i]['dec_deg'],i
    cache={};d=date(2026,1,1)
    while d.year==2026:
        start=datetime(d.year,d.month,d.day,21,tzinfo=KST);values={i:[] for i in positions};sun=[]
        for minute in range(181):
            lst,sh=solar_lst(start+timedelta(minutes=minute));sun.append(sh)
            for i in positions:values[i].append(altitude(float(CAT[i]['ra_deg']),float(CAT[i]['dec_deg']),lst))
        cache[d]=(start,values,sun);d+=timedelta(days=1)
    rows=[]
    for m in M:
        ids=GATES[m['id']]['planningPositionIds'];duration=m['estimatedMinutes']
        if any(i=='moon' or i.startswith('planet:') for i in ids):
            rows.append({'missionId':m['id'],'season':m['season'],'positionIds':ids,'status':'runtime-ephemeris-required','note':'연중은 모든 밤에 가능하다는 뜻이 아님. 현재 천체력으로 달/목성의 고도와 태양 고도를 다시 계산.'});continue
        months=LIMITS.get(m['id'],SEASONS[m['season']]);days=[];examples={};month_counts=Counter()
        for dt,(start,vals,solar) in cache.items():
            if dt.month not in months:continue
            mask=[all(vals[i][k]>=26 for i in ids) and solar[k]<=-12 for k in range(181)]
            runs=[];length=0
            for k,ok in enumerate(mask):
                length=length+1 if ok else 0
                if length>=duration+1:runs.append(k-duration)
            if not runs:continue
            days.append(dt.isoformat());month_counts[dt.month]+=1
            best=max(runs,key=lambda k:min(min(vals[i][k:k+duration+1]) for i in ids))
            ex={'dateKst':dt.isoformat(),'startKst':(start+timedelta(minutes=best)).isoformat(),'endKst':(start+timedelta(minutes=best+duration)).isoformat(),
              'minimumAltitudeDeg':{i:round(min(vals[i][best:best+duration+1]),4) for i in ids},
              'highestSolarAltitudeDeg':round(max(solar[best:best+duration+1]),4)}
            if dt.month not in examples or abs(dt.day-15)<abs(int(examples[dt.month]['dateKst'][-2:])-15):examples[dt.month]=ex
        rows.append({'missionId':m['id'],'season':m['season'],'positionIds':ids,'durationMinutes':duration,
          'status':'approximate-window-found' if days else 'no-window','screeningMonths':months,'eligibleDayCountsByMonth':dict(month_counts),
          'eligibleDatesKst':days,'examples':list(examples.values())})
    save(Path('qa/visibility-screening.json'),{'scope':'첨부 고정 천체 및 명시된 길잡이 좌표의 근사 기획 선별. 실제 가시성/지형/검출 검증 아님.',
      'observer':{'latitudeDeg':LAT,'longitudeDegEast':LON,'timezone':'Asia/Seoul','year':2026,'timeKst':'21:00–24:00'},
      'method':{'sampleStepMinutes':1,'duration':'estimatedMinutes 전체','planningMinAltitudeDeg':26,'runtimeMinAltitudeDeg':25,'sunMaxAltitudeDeg':-12,
      'fixedCoordinates':'첨부 원값; epoch 미기재. 세차·장동·고유운동·굴절·시차 생략. UTC를 UT1 근사로 사용.',
      'limit':'연간 달력의 계절별 가능 구간 확인이며 2026년의 모든 밤 또는 다음 해를 보장하지 않음.'},
      'notTested':['달/행성 현재 천체력','가이드에 말로만 등장하는 보조 별의 전체 좌표','장애물·구름·월광·투명도·시상','시야 내 희미한 천체의 실제 검출','실제 앱 좌표 변환 및 렌더러'],
      'sources':['https://aa.usno.navy.mil/faq/GAST','https://aa.usno.navy.mil/faq/alt_az','https://aa.usno.navy.mil/faq/sun_approx'],'missions':rows})
    answers=sorted({q['answer'] for q in Q if q['type']=='skyPick'});stars=[r for r in CAT.values() if r['id'].startswith('star:')]
    pairs=[{'a':a,'b':b,'separationDeg':round(sep(CAT[a],CAT[b]),6)} for j,a in enumerate(answers) for b in answers[j+1:]]
    near=[]
    for a in answers:
        n=min((x for x in stars if x['id']!=a),key=lambda x:sep(CAT[a],x))
        near.append({'objectId':a,'nearestInProvided31':n['id'],'separationDeg':round(sep(CAT[a],n),6),'fullSkyIsolationVerified':False,'verifiedVmag':None})
    save(Path('qa/skypick-screening.json'),{'quizCount':sum(q['type']=='skyPick' for q in Q),'distinctTargetCount':len(answers),'acceptanceRadiusDeg':3,
      'providedStarRows':len(stars),'minimumAnswerPairDistanceDeg':min(p['separationDeg'] for p in pairs),'pairs':pairs,'nearestProvidedNeighbors':near,
      'scope':'첨부31별 내부의 기하학만 검사. 전천·현재 표시 장면·측광 대역을 검증한 것이 아님.',
      'fullCatalogStaticScreen':'not-completed','allSkyIsolationVerified':False,'runtimeEnabledByDefault':False,
      'retrievalNotes':'ESA/HEASARC/CDS의 Hipparcos Vmag와 좌표 정의는 확인했으나 전체 수치 파일은 확보하지 못함. 네트워크·다운로드 제약을 통과로 취급하지 않음.',
      'requiredRuntimePolicy':{'verifiedCandidateMaxV':4,'minAltitudeDeg':25,'sunMaxAltitudeDeg':-12,'radiusDeg':3,'otherVisibleObjectClearanceDeg':3.25,
      'alternativeAnswerCenterSeparationDeg':6,'requireCompleteRenderedSnapshot':True,'requireDynamicMoonPlanetScreen':True,
      'unknownStatus':'disable-question','faintStars':'보이거나 선택 가능한 다른 객체를 임의로 무시하지 않음. 정규화한 미분리 성분은 같은 시스템 ID로 통합.',
      'practice':'명시된 지도 연습은 가능하지만 관측 기록과 배지는 발생시키지 않음.'}})
    # Independent cosine-law check of selected guide endpoints.
    routes=[]
    for a,b,nominal in [('star:HIP21421','dso:M45',14),('star:HIP69673','dso:M3',12)]:
        v=sep(CAT[a],CAT[b]);r1,d1,r2,d2=[float(x)*RAD for x in [CAT[a]['ra_deg'],CAT[a]['dec_deg'],CAT[b]['ra_deg'],CAT[b]['dec_deg']]]
        other=math.degrees(math.acos(max(-1,min(1,math.sin(d1)*math.sin(d2)+math.cos(d1)*math.cos(d2)*math.cos(r1-r2)))))
        routes.append({'from':a,'to':b,'authoredApproxDeg':nominal,'vectorSeparationDeg':v,'independentCosineLawDeg':other,'differenceDeg':abs(v-other)})
    save(Path('qa/guide-checks.json'),{'scope':'시작/목표 좌표 각거리; 실제 장비 시야 및 중간 별 검증 아님','routes':routes})
    print('visibility:',Counter(x['status'] for x in rows))
    print('skyPick:',len(answers),'targets; min answer pair',min(p['separationDeg'] for p in pairs),'min provided neighbor',min(x['separationDeg'] for x in near))
    for x in rows:
        if x['status']=='no-window':print('NO WINDOW',x['missionId'])
if __name__=='__main__':main()
