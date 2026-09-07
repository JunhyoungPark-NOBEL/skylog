#!/usr/bin/env python3
"""콘텐츠 기획용 고도 선별. 정밀 천체력이나 실시간 관측 가능 판정기가 아니다.
USNO 근사 항성시/태양 위치 공식을 이용한다. 입력 고정별 좌표의 epoch가 미기재되어
원값을 그대로 사용하며 세차·장동·고유운동·시차·굴절을 적용하지 않는다.
"""
from pathlib import Path
from datetime import datetime,timedelta,timezone,date
import csv,json,math,collections
ROOT=Path(__file__).resolve().parents[1]
KST=timezone(timedelta(hours=9)); LAT=36.35; LON=127.38
RAD=math.pi/180
CAT={a['id']:a for a in csv.DictReader((ROOT/'inputs/catalog-values.v1.csv').open(encoding='utf-8-sig'))}
MISSIONS=json.loads((ROOT/'G5-learn-missions.json').read_text())
Q=json.loads((ROOT/'G5-learn-quiz.json').read_text())
SEASONS={'spring':[3,4,5],'summer':[6,7,8],'autumn':[9,10,11],'winter':[12,1,2]}
LIMITS={'spring-orion-color-pair':[3],'autumn-aldebaran-arrival':[10,11],'autumn-altair-line':[9,10]}

def julian(t):return t.timestamp()/86400+2440587.5

def lst(jd):
    jd0=math.floor(jd-0.5)+0.5; d0=jd0-2451545.; h=(jd-jd0)*24; t=(jd-2451545.)/36525
    gmst=(6.697375+0.065709824279*d0+1.0027379*h+0.0000258*t*t)%24
    return (gmst*15+LON)%360

def altitude(ra,dec,lstdeg,lat=LAT):
    v=math.sin(lat*RAD)*math.sin(dec*RAD)+math.cos(lat*RAD)*math.cos(dec*RAD)*math.cos((lstdeg-ra)*RAD)
    return math.asin(max(-1,min(1,v)))/RAD

def sun_radec(jd):
    d=jd-2451545.;g=(357.529+0.98560028*d)*RAD;q=280.459+0.98564736*d
    l=(q+1.915*math.sin(g)+0.020*math.sin(2*g))*RAD;e=(23.439-0.00000036*d)*RAD
    return math.atan2(math.cos(e)*math.sin(l),math.cos(l))/RAD%360,math.asin(math.sin(e)*math.sin(l))/RAD

def sep(a,b):
    r1,d1=float(a['ra_deg'])*RAD,float(a['dec_deg'])*RAD;r2,d2=float(b['ra_deg'])*RAD,float(b['dec_deg'])*RAD
    c=math.sin(d1)*math.sin(d2)+math.cos(d1)*math.cos(d2)*math.cos(r1-r2)
    return math.acos(max(-1,min(1,c)))/RAD

# 2026년 매일의 KST 21:00~24:00을 1분 간격으로 선별. 26°와 -12°로 여유를 둔다.
allids=sorted({s['objectId'] for m in MISSIONS for s in m['steps'] if s.get('objectId','').startswith('star:')})
CACHE={}; d=date(2026,1,1)
while d.year==2026:
    start=datetime(d.year,d.month,d.day,21,tzinfo=KST); vals={o:[] for o in allids}; solar=[]
    for minute in range(181):
        jd=julian(start+timedelta(minutes=minute)); l=lst(jd); sr,sd=sun_radec(jd); solar.append(altitude(sr,sd,l))
        for o in allids:vals[o].append(altitude(float(CAT[o]['ra_deg']),float(CAT[o]['dec_deg']),l))
    CACHE[d]=(start,vals,solar);d+=timedelta(days=1)

rows=[]
for m in MISSIONS:
    ids=sorted({s['objectId'] for s in m['steps'] if 'objectId' in s})
    if any(not o.startswith('star:') for o in ids):
        rows.append({'missionId':m['id'],'season':m['season'],'objectIds':ids,'status':'runtime-ephemeris-required','note':'달/행성의 현재 위치·위상·박명을 실제 천체력으로 재계산해야 하며 이번 근사 선별에서는 검증하지 않았다.'});continue
    months=LIMITS.get(m['id'],SEASONS[m['season']]);days=[]; examples=[]; eligible=collections.Counter();dur=m['estimatedMinutes']
    for dt,(start,vals,solar) in CACHE.items():
        if dt.month not in months:continue
        mask=[min(vals[o][i] for o in ids)>=26 and solar[i]<=-12 for i in range(181)]
        # 시작부터 estimatedMinutes 경과까지 모든 분을 검사한다.
        starts=[i for i in range(181-dur) if all(mask[i:i+dur+1])]
        if not starts:continue
        days.append(dt.isoformat());eligible[dt.month]+=1
        # 각 달의 중순에 가까운 대표 구간을 나중에 한 개 선정한다.
        idx=max(starts,key=lambda i:min(min(vals[o][i:i+dur+1]) for o in ids))
        examples.append({'dateKst':dt.isoformat(),'startKst':(start+timedelta(minutes=idx)).isoformat(),'endKst':(start+timedelta(minutes=idx+dur)).isoformat(),'minimumAltitudeDeg':{o:round(min(vals[o][idx:idx+dur+1]),3) for o in ids},'highestSolarAltitudeDeg':round(max(solar[idx:idx+dur+1]),3),'midmonthDistance':abs(dt.day-15)})
    bymonth={}
    for e in examples:
        mo=e['dateKst'][5:7]
        if mo not in bymonth or e['midmonthDistance']<bymonth[mo]['midmonthDistance']:bymonth[mo]=e
    for e in bymonth.values():del e['midmonthDistance']
    rows.append({'missionId':m['id'],'season':m['season'],'objectIds':ids,'status':'approximate-planning-window-found' if days else 'no-window-found','screeningMonths':months,'screeningAltitudeThresholdDeg':26,'requiredRuntimeThresholdDeg':25,'durationMinutes':dur,'eligibleDayCountsByMonth':dict(eligible),'eligibleDatesKst':days,'examples':list(bymonth.values())})
report={'purpose':'기획용 근사 선별; 실기기·실시간 가시성 검증 아님','observerAssumption':{'latitudeDeg':LAT,'longitudeDegEast':LON,'timezone':'Asia/Seoul','year':2026,'timeRangeKst':'21:00–24:00'},'method':{'siderealTime':'USNO GMST 근사식, UTC를 UT1 근사로 사용','sun':'USNO 근사 태양 위치','fixedStars':'첨부 RA/Dec 원값, epoch 미기재; 세차·장동·고유운동·굴절 생략','sampleStepMinutes':1,'planningMarginDeg':1,'conditions':'모든 직접 대상이 전체 estimatedMinutes 동안 26° 이상, 태양 중심 -12° 이하','exclusions':['월령·달빛','구름·투명도·시상','실제 지평선/건물','광해·장비 실측','지구 세차와 항성 고유운동','달/행성 자체의 고도']},'sources':['https://aa.usno.navy.mil/faq/GAST','https://aa.usno.navy.mil/faq/alt_az','https://aa.usno.navy.mil/faq/sun_approx'],'missions':rows}
(ROOT/'visibility-screening.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')

# 제한된 입력 목록끼리의 이격 검사. 전천 격리 검사의 대체가 아니다.
answers=sorted({x['answer'] for x in Q if x['type']=='skyPick'}); stars=[r for r in CAT.values() if r['id'].startswith('star:')]
pairs=[]
for i,a in enumerate(answers):
    for b in answers[i+1:]:pairs.append({'a':a,'b':b,'separationDeg':round(sep(CAT[a],CAT[b]),6)})
near=[]
for a in answers:
    r=min((r for r in stars if r['id']!=a),key=lambda r:sep(CAT[a],r))
    near.append({'objectId':a,'nearestOtherInProvided31Stars':r['id'],'separationDeg':round(sep(CAT[a],r),6),'fullSkyIsolationVerified':False})
sky={'quizCount':20,'distinctAnswerObjects':len(answers),'acceptanceRadiusDeg':3,'pairwiseAnswerDistanceMinimumDeg':min(x['separationDeg'] for x in pairs),'providedStarRows':len(stars),'nearestProvidedNeighbors':near,'pairs':pairs,'status':'blocked-until-full-catalog-and-renderer-validation','limitations':['첨부31별은 전천 밝은별 목록이 아니므로 가까운 누락별이 있을 수 있다.','첨부 mag의 측광 대역이 미확인이므로 V등급 컷의 근거로 사용하지 않았다.','HEASARC BSC5P 문서를 확인했으나 전체 수치 테이블 다운로드가 실패하여 전천 검사는 수행하지 못했다.','동적 달·행성의 근접과 실제 시야의 선택 가능 별을 출제 시 다시 검사해야 한다.'],'requiredRuntimePolicy':{'minimumAltitudeDeg':25,'solarAltitudeMaxDeg':-12,'acceptanceRadiusDeg':3,'fullCatalogBrightnessBand':'verified V','candidateBrightnessLimitV':4,'minDistanceToOtherRenderedBrightObjectsDeg':3,'minDistanceBetweenAlternativeAnswerCentersDeg':6,'disambiguation':'가까운 다른 표시 객체가 있으면 문항을 보류; 다른 객체를 탭했는데 정답 원 안이라는 이유만으로 통과시키지 않음','practiceMode':'시간 여행·실내 지도 연습은 실제 observe 이벤트나 관측 배지를 발생시키지 않음','repeatPolicy':'같은 대상의 문항 변형은 같은 출제 묶음에 중복 배치하지 않음'}}
(ROOT/'skypick-screening.json').write_text(json.dumps(sky,ensure_ascii=False,indent=2)+'\n')
print('visibility',dict(collections.Counter(r['status'] for r in rows)))
print('skyPick',len(answers),'objects; minimum answer-pair separation',sky['pairwiseAnswerDistanceMinimumDeg'])
for r in rows:
 if r.get('examples'):
  e=r['examples'][0];print(r['missionId'],r['eligibleDayCountsByMonth'],e['startKst'],e['minimumAltitudeDeg'])
