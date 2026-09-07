"""Rebuild the two final G3 draft batches from authored records and preserved inputs.
Only the Python standard library is required for generation; validate.py uses jsonschema.
"""
from pathlib import Path
import csv, json, math, hashlib
ROOT=Path(__file__).resolve().parent
DATE='2026-09-07'
def read_csv(name):
    with (ROOT/'inputs'/name).open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
CAT={r['id']:r for r in read_csv('catalog-values.v1.csv')}
TARGETS=read_csv('content-targets.v1.csv')
REMAIN=read_csv('previous-remaining-41.csv')
CONS={r['iau_abbr']:r for r in read_csv('constellations_ko.csv')}
PREVIOUS=json.loads((ROOT/'inputs/previous-cumulative-80.json').read_text())
REG={}
def src(key,title,url,support,access='web-page-text',date=None):
    REG[key]={'title':title,'url':url,'accessedAt':DATE,'publicationDate':date,'access':access,'support':support,'primarySource':True}
    return key
NASA='https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/'
for n,support in {
32:'M31의 위성 타원은하; 약 250만 광년; 르 장티의 1749년 발견; 중심부 별 연구.',
110:'M31 위성 타원은하; 머리말 약 270만 광년; 대부분 매끈하지만 젊은 별과 먼지도 존재.',
33:'삼각형자리 나선은하, 국부은하군; 약 300만 광년; 별 탄생 영역과 허블 모자이크.',
43:'M42 옆 먼지 띠로 분리되어 보이는 별 탄생 성운; 약 1600광년; 드 메랑의 관측.',
92:'허큘리스자리 오래된 금속 부족 구상성단; 약 27000광년; Bode 1777.',
101:'큰곰자리 정면 나선은하; 약 2500만 광년이라는 이 소개문의 추정; 모자이크와 별 탄생 영역.',
104:'처녀자리 은하의 밝은 중심 팽대부와 먼지 띠; 약 2800만 광년; 메생 발견. 본문 중 은하단 소속 주장은 채택하지 않음.',
8:'궁수자리 발광 성운·별 탄생; NGC6530과 구분. 같은 페이지의 5200/4350광년은 대상 범위가 달라 단일 거리로 합치지 않음.',
20:'먼지 띠로 나뉜 별 탄생 성운, 약 5000광년·등급 6.3 소개값. 첨부와 다른 값은 검토용.',
17:'오메가/백조 성운; 젊은 별의 복사와 기체 침식; 약 5500광년·등급 6.0 소개값.',
16:'NGC6611 성단과 IC4703 성운; 창조의 기둥은 전체의 일부; 기둥과 성단의 관측 난이도 구분.',
22:'궁수자리 구상성단; 약 10000광년·등급 5.1 소개값; 먼지에 의한 감광.',
11:'방패자리 조밀한 산개성단; V자 배열과 야생오리 별칭; 장기적인 성단 해체.',
7:'전갈자리 산개성단; 프톨레마이오스의 고대 기록; 별들이 같은 구름에서 탄생; 약 980광년 소개값.',
46:'고물자리 산개성단 약 5400광년; 겹쳐 보이는 NGC2438은 앞쪽의 행성상성운으로 구분. 10등급 설명을 성단 전체 등급으로 사용하지 않음.',
2:'물병자리 구상성단; 약 37000광년; Maraldi 1746 혜성 관측 중 발견.',
4:'안타레스 근처 전갈자리 구상성단; 약 5500광년 소개값; 백색왜성 냉각 연구.',
10:'뱀주인자리 구상성단; 약 15000광년·등급 6.4 소개값; 청색낙오성과 쌍성 상호작용/충돌 설명.',
12:'뱀주인자리 구상성단; 약 23000광년·등급 7.7 소개값; 저질량 별 부족과 중력적 손실 해석.',
78:'오리온자리 반사성운; 약 1600광년; 먼지의 별빛 산란과 적외선 관측.'
}.items():src(f'm{n}',f'NASA — Messier {n}',NASA+f'messier-{n}/',support)
for key,slug,support in [
('cma','canismajor','큰개라는 라틴어 이름, 오리온을 따르는 개의 전통과 시리우스.'),
('cmi','canisminor','작은개, 프로키온과 고메이사의 간단한 주요 별 배열.'),
('her','hercules','로마 헤르쿨레스와 그리스 헤라클레스라는 문화적 이름, 북쪽 별자리.'),
('boo','bootes','목동을 나타내는 오래된 별자리, 아르크투루스.'),
('dra','draco','북쪽의 용 형상; 세차에 따른 투반과 천구 북극의 과거 관계.'),
('cet','cetus','고래로 번역되지만 고대 그리스 케토스는 바다 괴물을 뜻하는 이야기.'),
('cru','crux','남쪽 하늘의 십자가 배열.'),
('cas','cassiopeia','M52와 M103 산개성단, NGC457의 ET/Owl/Dragonfly 별칭.')]:
 src(key,'NSF NOIRLab — '+slug,'https://noirlab.edu/public/education/constellations/'+slug+'/',support,'search-index-excerpts; direct-page-interstitial')
for key,support in {
'm36':'M36은 마차부자리의 밝은 산개성단 세 개 M36/M37/M38 중 하나.',
'm38':'마차부자리 산개성단; 약 2억 년으로 소개하나 본문에는 나이 수치를 채택하지 않음.',
'm41':'큰개자리 산개성단, 여러 적색거성 포함.',
'm39':'백조자리에서 넓게 흩어진 산개성단.',
'm103':'카시오페이아자리의 작게 보이는 먼 산개성단; 사진의 북서쪽 밝은 쌍성은 구성원이 아님; 나이 논쟁 수치는 채택하지 않음.',
'm29':'백조자리의 혼잡한 별밭 안 산개성단; 사이 먼지가 빛을 약하게 함.',
'm34':'페르세우스자리 산개성단; 약 100개 별과 관측 안내. 첨부 거리 우선.',
'm52':'카시오페이아자리 산개성단; 사진의 눈에 띄는 붉은 별은 구성원이 아님.'
}.items():src(key,'NSF NOIRLab — '+key.upper(),'https://noirlab.edu/public/images/noao-'+key+'/',support,'search-index-excerpts; direct-page-interstitial')
src('m6','NASA APOD — Messier 6','https://science.nasa.gov/image-article/apod-2025-july-19-messier-6/','전갈자리 나비성단; 산개성단, 약 1600광년의 소개값.','web-search-page-text','2025-07-19')
src('m47','ESO — The Hot Blue Stars of Messier 47','https://www.eso.org/public/news/eso1441/','산개성단, 약 1600광년; Messier의 좌표 오기로 잃어버린 대상이 1959년 확인됨; M46과 실제 거리가 다른 두 성단.','web-page-text','2014-12-17')
src('m67','ESO — First Planet Found Around Solar Twin in Star Cluster','https://www.eso.org/public/news/eso1402/','태양과 비슷한 나이·조성의 별이 있는 오래된 산개성단, 시선속도를 통한 행성 연구. 태양의 출생지라고 하지 않음.','web-page-text','2014-01-15')
src('n7000','NASA — Caldwell 20','https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-caldwell-catalog/caldwell-20/','백조자리 북아메리카 발광 성운; 대륙 비슷한 윤곽; 1800광년 소개값, 허블은 작은 부분만 관측.')
src('n7000apod','NASA APOD — The North America Nebula','https://science.nasa.gov/image-article/apod-2025-january-22-the-north-america-nebula/','1500광년 소개값; Caldwell 소개값과 달라 단일 거리 미채택.','web-search-page-text','2025-01-22')
src('n457','NSF NOIRLab — NGC 457','https://noirlab.edu/public/images/noao-02464/','카시오페이아자리 젊은 산개성단. 사진 설명의 약 1000만 년은 본문 숫자로 미채택.','search-index-excerpts; direct-page-interstitial')
src('n7009','NASA — Caldwell 55','https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-caldwell-catalog/caldwell-55/','물병자리 행성상성운; 1400광년 소개값, 죽어가는 별의 가스 껍질.')
src('n7009eso','ESO — The Strange Structures of the Saturn Nebula','https://www.eso.org/public/news/eso1731/','약 5000광년 소개값; 별의 외피 방출, 이온화된 껍질·돌출부; MUSE 분광지도와 먼지 구조.','web-page-text','2017-09-27')
src('iau','IAU — The Constellations','https://iauarchive.eso.org/public/themes/constellations/','현대 별자리는 별을 잇는 그림만이 아니라 좌표 경계로 정한 영역.')
src('crumap','IAU Office of Astronomy for Education — Crux Constellation Map','https://astro4edu.org/resources/diagram/Hj32Ua273O7/','남십자자리는 남쪽·적도 지역에서 관측하는 별자리. 도식의 경계선과 연결선은 실제 하늘에 그어져 있지 않음.','web-search-page-text')
src('crunav','NSF NOIRLab — Southern Celestial Wayfinder','https://noirlab.edu/public/images/iotw2411a/','남십자자리 무늬가 천구 남극을 대략 가리키는 길잡이 역할.','search-index-excerpts; direct-page-interstitial','2024-03-13')
src('dark','NASA — How to Find Good Places to Stargaze','https://science.nasa.gov/solar-system/how-to-find-good-places-to-stargaze/','광해·달빛·장애물 등 관측지 조건. 특정 90mm 장비의 검출 보장이 아님.')
REC=[]
def add(id,liner,summary,story,guide,hop,season,months,difficulty,naked,bino,scope,sources,notes=None,cultures=None,pattern=None,alt=None):
    REC.append(dict(id=id,liner=liner,summary=summary,story=story,guide=guide,hop=hop,season=season,months=months,difficulty=difficulty,naked=naked,bino=bino,scope=scope,sourceKeys=sources,notes=notes or [],cultures=cultures or ['기타'],pattern=pattern,alt=alt or []))
# Authored text below intentionally contains no silently substituted catalog measurements.
for module in ['authored_constellations.py','authored_dso_a.py','authored_dso_b.py','authored_dso_c.py']:
    exec(compile((ROOT/module).read_text(),str(ROOT/module),'exec'),globals())
assert [r['id'] for r in REC]==[r['id'] for r in REMAIN], 'Authored records must preserve the remaining input order'

def dump(name,obj):
    (ROOT/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def csvout(name,rows,keys):
    with (ROOT/name).open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=keys);w.writeheader();w.writerows(rows)
def source_text(key):
    s=REG[key];return f"{s['title']} — {s['url']}"
OBS='편집 제안 — observing-policy.md; 북위36.35°·10×50·90mm 20~80배, 실측 아님'
G2='첨부 G2 constellations_ko.csv — inputs/constellations_ko.csv; 한국어명·IAU 약어·속격'
COMMON='장비별 관측 안내·추천 월·난이도는 보수적인 편집 제안입니다. 실제 기기·날씨·광해에서 관측 성공을 보장하지 않습니다.'
BAND='입력 mag 열의 측광 대역이 확인되지 않았습니다. V등급으로 재명명하거나 검증 전 밝기 비교 퀴즈에 사용하지 않습니다.'
SIZENOTE='첨부 각크기는 해당 카탈로그의 측정/선택 범위로 보존했습니다. 사진 전체 윤곽·성단 구성원 전부·도시에서 보이는 경계와 동일하다고 보장하지 않습니다.'
DIST_BLOCK={'dso:M92': [('27000','m92')], 'dso:M2':[('37000','m2')], 'dso:M10':[('15000','m10')], 'dso:NGC7009':[('1400','n7009'),('5000','n7009eso')]}
MAG_BLOCK={'dso:M20':('6.3','m20'),'dso:M17':('6.0','m17'),'dso:M22':('5.1','m22'),'dso:M10':('6.4','m10'),'dso:M12':('7.7','m12')}
EXT_DIST={'dso:M32':('약 250만 광년','m32'),'dso:M110':('약 270만 광년','m110'),'dso:M33':('약 300만 광년','m33'),'dso:M43':('약 1,600광년','m43'),'dso:M101':('약 2,500만 광년','m101'),'dso:M104':('약 2,800만 광년','m104'),'dso:M78':('약 1,600광년','m78')}
TYPES={'G':'은하','GCl':'구상성단','OCl':'산개성단','Neb':'성운','HII':'전리수소 영역의 발광 성운','RfN':'반사성운','PN':'행성상성운'}
DIST_COMPARE={'dso:M20':('5000','m20'),'dso:M17':('5500','m17'),'dso:M16':('7000','m16'),'dso:M22':('10000','m22'),'dso:M11':('6200','m11'),'dso:M6':('1600','m6'),'dso:M7':('980','m7'),'dso:M46':('5400','m46'),'dso:M47':('1600','m47'),'dso:M4':('5500','m4'),'dso:M12':('23000','m12')}
CONTENT=[];AUDIT=[];PROPOSALS=[];LEDGER=[]
for r in REC:
    id=r['id']; raw=CAT[id]; isconst=id.startswith('const:')
    inputsource=f'첨부 catalog-values.v1.csv — {id}; inputs/catalog-values.v1.csv의 원본 행'
    external=[source_text(k) for k in r['sourceKeys']]
    notes=list(r['notes']); notes.append(COMMON)
    if any('interstitial' in REG[k]['access'] for k in r['sourceKeys']):
        notes.append('일부 NOIRLab 자료는 직접 페이지가 접근 제한되어 공식 도메인의 검색 색인 발췌문만 확인했습니다. 지원 범위는 source-registry.json에 명시했으며 전문을 읽었다고 간주하지 않습니다.')
    facts=[]
    def fact(label,value,source):facts.append(dict(label=label,value=value,source=source))
    if isconst:
        ab=id.split(':')[1]; co=CONS[ab]
        title={'ko':co['name_ko'],'en':raw['name_en']}
        fact('종류','IAU 별자리 — 경계로 정한 하늘의 영역; 단일 천체가 아님',source_text('iau'))
        fact('IAU 약어',ab,G2)
        fact('라틴어 속격',co['genitive_en'],G2)
        fact('대표 그림·길잡이 무늬',r['pattern'],external[0]+'; '+OBS)
        fact('찾기의 기준','남쪽 관측지·현지 시간의 가시성 확인' if ab=='Cru' else ' / '.join(CAT[h]['name_ko'] for h in r['hop'][:2]),OBS+'; 첨부 catalog-values.v1.csv — 연계 행: '+', '.join(r['hop']) if r['hop'] else OBS)
        seasonko={'spring':'봄','summer':'여름','autumn':'가을','winter':'겨울','any':'관측지별 확인'}[r['season']]
        fact('관측 계절 안내',seasonko+' — 편집 분류, 실시간 가시성 보장 아님',OBS+'; '+G2)
        notes.append('첨부 RA/Dec는 대표 좌표입니다. 별자리 전체의 가시성·거리·등급·각크기를 이 한 점으로 판단하거나 누락 숫자를 만들어 넣지 않았습니다.')
    else:
        title={'ko':raw['name_ko'],'en':raw['name_en'] or id.split(':')[1]}
        if not raw['name_en']:notes.append('첨부 영어 이름은 빈칸으로 보존했습니다. title.en에는 새 고유명을 만들지 않고 목록 식별자를 표시용으로 사용했습니다.')
        typ=TYPES[raw['type'].split()[0]]
        if id=='dso:M16':typ='성단 NGC6611과 성운 IC4703을 구분해 설명; 원본 종류는 Neb'
        elif id in ['dso:M8','dso:M20','dso:M17']:typ='발광 성운 — 원본 종류 '+raw['type']
        fact('종류',typ,inputsource+'; '+external[0])
        con='Ser' if raw['con']=='Se2' else raw['con']
        cn=CONS[con]['name_ko']
        fact('별자리',cn+' ('+con+')'+(' — 원본 Se2, 꼬리 영역 대응 검토' if raw['con']=='Se2' else ''),inputsource+'; '+G2+('; '+source_text('m16') if raw['con']=='Se2' else ''))
        if id in MAG_BLOCK:
            candidate,key=MAG_BLOCK[id]
            fact('겉보기등급','게시 보류 — 첨부 대역 미확인·외부 소개값 차이',inputsource+'; '+source_text(key))
            notes.append(f'입력 mag={raw["mag"]}, 외부 소개값={candidate}의 차이가 큽니다. 측광 대역·대상 범위를 일치시켜 재검토하기 전 숫자 표시와 밝기 비교 퀴즈를 보류합니다. 어느 값이 정답인지 확정하지 않았습니다.')
            PROPOSALS.append(dict(id=id,field='mag',raw=raw['mag'],candidates=[dict(value=candidate,source=source_text(key))],action='hold-display; no-automatic-replacement',reason='Band and aperture/object-scope not harmonized; discrepancy is not proof of a catalog error.'))
        elif raw['mag']:
            fact('겉보기등급(첨부·대역 미확인)',raw['mag']+'등급 — V 대역 확정 전',inputsource)
        else:fact('겉보기등급','미확인 — 첨부 빈칸, V 대역 값 미채택',inputsource)
        fact('각크기(첨부)',raw['size_arcmin'].replace('x','′ × ')+'′ — 카탈로그 범위',inputsource)
        if id in DIST_BLOCK:
            vals=DIST_BLOCK[id]
            fact('거리','게시 보류 — 원본과 외부 소개값 불일치',inputsource+'; '+'; '.join(source_text(k) for v,k in vals))
            notes.append('입력 거리 '+raw['dist_ly']+'광년과 외부 소개값 '+', '.join(v+'광년' for v,k in vals)+'을 대조했으나 단일값을 확정하지 않았습니다. 원본은 보존하고 숫자 표시는 보류합니다.')
            PROPOSALS.append(dict(id=id,field='dist_ly',raw=raw['dist_ly'],candidates=[dict(value=v,source=source_text(k)) for v,k in vals],action='hold-display; no-automatic-replacement',reason='Substantial or inter-source discrepancy; requires source-catalog provenance and measurement review.'))
        elif raw['dist_ly']:
            fact('거리(첨부)',f"{int(raw['dist_ly']):,}광년 — 원본값, 외부 검증 완료 아님",inputsource)
            if id in DIST_COMPARE:
                val,key=DIST_COMPARE[id]
                notes.append(f'참고 대조: 입력 거리 {raw["dist_ly"]}광년, {REG[key]["title"]} 소개값 약 {val}광년. 본문 숫자는 입력 우선으로 보존했으며 차이의 원인을 측정법·자료 시점까지 확인한 것은 아닙니다.')
        elif id in EXT_DIST:
            val,key=EXT_DIST[id]
            fact('거리(외부 소개값)',val+' — 첨부 빈칸; 해당 출처의 추정',source_text(key))
            notes.append('원본 거리 빈칸은 유지했습니다. 사실표의 거리는 외부 소개값임을 명시했으며 최신 단일 정답으로 취급하지 않습니다.')
        else:
            fact('거리','미확정 — 첨부 빈칸·외부 소개값 또는 대상 범위 차이',inputsource+'; '+'; '.join(external))
        fact('목록 식별자',id.split(':')[1],inputsource)
        notes.extend([BAND,SIZENOTE])
    if r['alt']:title['alt']=r['alt']
    low=id in DIST_BLOCK or id in MAG_BLOCK or id in ['dso:M16','const:Cru','dso:NGC7000']
    how={'ko':r['guide'],'season':r['season']}
    if r['hop']:how['hopFrom']=r['hop']
    ob={'nakedEye':r['naked'],'binoculars':r['bino'],'telescope':r['scope'],'difficulty':r['difficulty']}
    if r['months']:ob['bestMonths']=r['months']
    related='첨부 catalog-values.v1.csv — 길잡이 연계 행: '+', '.join(r['hop'])+'; inputs/catalog-values.v1.csv' if r['hop'] else OBS
    allsources=list(dict.fromkeys([inputsource,G2,OBS,related,source_text('dark')]+external+[f['source'] for f in facts]))
    entry={'id':id,'version':1,'title':title,'oneLiner':{'ko':r['liner']},'summary':{'ko':r['summary']},'facts':facts,'story':{'ko':r['story'],'cultures':r['cultures'],'sources':external},'howToFind':how,'observing':ob,'sources':allsources,'meta':{'generatedBy':'gpt-5-pro','generatedAt':DATE,'confidence':'low' if low else 'medium','needsReview':notes}}
    CONTENT.append(entry)
    AUDIT.append(dict(id=id,input=raw,displayConfidence=entry['meta']['confidence'],distanceDisplayHeld=id in DIST_BLOCK or (not isconst and not raw['dist_ly'] and id not in EXT_DIST),magnitudeDisplayHeld=id in MAG_BLOCK or (not isconst and not raw['mag']),inputBand='unknown' if not isconst else 'not-applicable',autoCorrectionsApplied=False))
    LEDGER.append(dict(id=id,rawSource='inputs/catalog-values.v1.csv',scienceSources=[dict(key=k,**REG[k]) for k in r['sourceKeys']],editorialSections=['howToFind','observing','interpretive parts of story'],editorialBasis='observing-policy.md; guide-checks.json; input positions and object class',scope='Field-level facts cite their own provenance. Story combines paraphrased source-supported science/history with explicitly editorial observation suggestions.'))
CUMUL=PREVIOUS+CONTENT
batches={'G3-content-expansion-40-2.json':CONTENT[:40],'G3-content-final-1.json':CONTENT[40:],'G3-content-cumulative-121.json':CUMUL}
for name,data in batches.items():
    dump(name,data)
    if name!='G3-content-cumulative-121.json':
        (ROOT/name.replace('.json','.md')).write_text('```json\n'+json.dumps(data,ensure_ascii=False,indent=2)+'\n```\n')
dump('raw-selected-values.json',[CAT[r['id']] for r in REMAIN])
dump('selected-targets.json',REMAIN);csvout('selected-targets.csv',REMAIN,list(REMAIN[0]))
dump('remaining-targets.json',[]);csvout('remaining-targets.csv',[],list(REMAIN[0]))
dump('source-registry.json',REG);dump('source-ledger.json',LEDGER)
dump('catalog-audit.json',AUDIT);dump('catalog-correction-proposals.json',PROPOSALS)
dump('review-items-all-121.json',[{'id':x['id'],'origin':'inherited-80' if i<80 else 'new-41','confidence':x['meta']['confidence'],'issues':x['meta'].get('needsReview',[])} for i,x in enumerate(CUMUL)])
dump('review-items.json',[{'id':x['id'],'confidence':x['meta']['confidence'],'issues':x['meta']['needsReview']} for x in CONTENT])
dump('draft-content-index.json',{'version':1,'generatedAt':DATE,'status':'draft-only; not content/v1/index.json','publicationApproved':False,'items':[{'id':x['id'],'title':x['title'],'status':'needs-review','batch':'inherited-80' if i<80 else 'expansion-40-2' if i<120 else 'final-1'} for i,x in enumerate(CUMUL)]})

def sep_pa(a,b):
    a,b=CAT[a],CAT[b]
    r1,d1,r2,d2=map(lambda t:math.radians(float(t)),[a['ra_deg'],a['dec_deg'],b['ra_deg'],b['dec_deg']])
    cs=math.sin(d1)*math.sin(d2)+math.cos(d1)*math.cos(d2)*math.cos(r2-r1)
    sep=math.degrees(math.acos(max(-1,min(1,cs))))
    pa=math.degrees(math.atan2(math.sin(r2-r1)*math.cos(d2),math.cos(d1)*math.sin(d2)-math.sin(d1)*math.cos(d2)*math.cos(r2-r1)))%360
    return sep,pa
pairs=[('star:HIP32349','dso:M41',4.0),('dso:M31','dso:M32',.4),('dso:M31','dso:M110',.6),('dso:M42','dso:M43',.14),('dso:M13','dso:M92',9.5),('star:HIP67301','dso:M101',5.6),('star:HIP65474','dso:M104',11.1),('dso:M8','dso:M20',1.4),('dso:M17','dso:M16',2.4),('dso:M36','dso:M38',2.3),('dso:M47','dso:M46',1.3),('star:HIP80763','dso:M4',1.3),('dso:M10','dso:M12',3.3),('star:HIP102098','dso:NGC7000',3.2),('star:HIP14576','dso:M34',5.2),('star:HIP26727','dso:M78',2.5)]
G={'basis':'attached RA/Dec as-is; input frame/epoch not independently verified','separationFormula':'acos(sin(d1)sin(d2)+cos(d1)cos(d2)cos(r2-r1)); clamp[-1,1]','positionAngle':'north=0, east=90; initial great-circle bearing','altitudeFormula':'hmax = 90 - abs(latitude - declination)','latitudeDeg':36.35,'limits':['No proper motion/precession/refraction/terrain/weather/current ephemeris calculation.','Constellation rows use representative coordinates, not full IAU boundaries.','Passing an altitude ceiling does not prove 21:00–24:00 seasonal availability.'],'pairChecks':[],'maximumAltitudeChecks':[]}
for a,b,rounded in pairs:
    v,pa=sep_pa(a,b);G['pairChecks'].append(dict(fromId=a,toId=b,separationDeg=round(v,8),positionAngleDeg=round(pa,8),guideApproxDeg=rounded,absRoundingErrorDeg=round(abs(v-rounded),8)))
for r in REMAIN:
    id=r['id'];dec=float(CAT[id]['dec_deg']);h=90-abs(36.35-dec)
    G['maximumAltitudeChecks'].append(dict(id=id,declinationDeg=dec,maximumGeometricAltitudeDeg=round(h,6),representativeOnly=id.startswith('const:'),canEverReach25DegAtThisLatitude=(h>=25 if not id.startswith('const:') else None)))
dump('guide-checks.json',G)
from collections import Counter
counts=Counter('constellation' if x['id'].startswith('const:') else 'star' if x['id'].startswith('star:') else 'dso' if x['id'].startswith('dso:') else 'solar-system' for x in CUMUL)
manifest={'package':'G3-content-completion','date':DATE,'previousCount':len(PREVIOUS),'newCount':len(CONTENT),'batches':{'G3-content-expansion-40-2.json':40,'G3-content-final-1.json':1},'cumulativeCount':len(CUMUL),'remainingCount':0,'typeCounts':dict(counts),'status':'All requested target drafts written; editorial/scientific review and application integration NOT complete.','publicationApproved':False,'inputValuesOverwritten':0,'legacyGeneratedByTag':'gpt-5-pro is preserved solely to satisfy the user-supplied schema; it is not a new claim about runtime model identity.','sourceScope':'New41 researched this turn. Inherited80 preserved, not globally re-researched.','rawCellsPreserved':len(CONTENT)*len(next(iter(CAT.values()))),'externalSourceCount':len(REG),'guidePairCount':len(pairs)}
dump('manifest.json',manifest)
print('BUILT',manifest)
for x in CONTENT:
    sizes={k:len(x[k]['ko']) for k in ['oneLiner','summary','story']}
    if not (sizes['oneLiner']<=60 and 200<=sizes['summary']<=400 and 300<=sizes['story']<=600):print('LENGTH CHECK',x['id'],sizes)
