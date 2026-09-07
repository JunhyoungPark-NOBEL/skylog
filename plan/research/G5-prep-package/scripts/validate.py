#!/usr/bin/env python3
"""python scripts/validate.py [--release]
기본: 초안 구조/참조 검사. --release: 미완료 요건을 실패로 표시(현재 의도된 exit 2).
실제 앱/저장소 테스트가 아니며 정식 index를 만들어 낸 것으로 취급하지 않는다.
"""
from pathlib import Path
import json,csv,sys,re,collections,hashlib,unicodedata,importlib.metadata
try:
    from jsonschema import Draft202012Validator
except ImportError:
    raise SystemExit('jsonschema 패키지가 필요합니다. requirements.txt를 확인하세요.')
ROOT=Path(__file__).resolve().parents[1]
load=lambda p:json.loads((ROOT/p).read_text(encoding='utf-8'))
DATA={k:load(f'G5-learn-{k}.json') for k in ['paths','missions','badges','quiz']}
SCHEMAS={k:load(f'{k}.schema.json') for k in DATA}
G3=load('inputs/g3-content-draft.json'); ALLOWED={x['id'] for x in G3 if x['id']!='star:HIP24608'}
CAT={r['id']:r for r in csv.DictReader((ROOT/'inputs/catalog-values.v1.csv').open(encoding='utf-8-sig'))}
CONS={r['iau_abbr'] for r in csv.DictReader((ROOT/'inputs/constellations_ko.csv').open(encoding='utf-8-sig'))}
CHECKS=[]
def check(name,passed,details=None):CHECKS.append({'name':name,'passed':bool(passed),'details':details})

def validate_schema(kind,arr):
    Draft202012Validator.check_schema(SCHEMAS[kind])
    return [{'path':'/'.join(map(str,e.absolute_path)),'message':e.message} for e in Draft202012Validator(SCHEMAS[kind]).iter_errors(arr)]

for k,arr in DATA.items():
    errors=validate_schema(k,arr);check(k+' schema',not errors,errors)
    ids=[a['id'] for a in arr];check(k+' unique ids',len(ids)==len(set(ids)))
    serialized=json.dumps(arr,ensure_ascii=False);check(k+' NFC normalization',serialized==unicodedata.normalize('NFC',serialized))
allids=[a['id'] for arr in DATA.values() for a in arr];check('global ids unique',len(allids)==len(set(allids)))
P,M,B,Q=[DATA[k] for k in ['paths','missions','badges','quiz']]
mi={x['id']:x for x in M};bi={x['id']:x for x in B};qi={x['id']:x for x in Q}
refs=[];bad=[]
for m in M:
    refs+=m.get('contentIds',[])
    if m.get('rewardBadgeId') and m['rewardBadgeId'] not in bi:bad.append(m['id']+':badge')
    for p in m.get('requires',{}).get('prerequisiteMissionIds',[]):
        if p not in mi:bad.append(m['id']+':prerequisite')
    for s in m['steps']:
        if 'objectId' in s:refs.append(s['objectId'])
        if 'contentId' in s:refs.append(s['contentId'])
        for q in s.get('quizIds',[]):
            if q not in qi:bad.append(m['id']+':quiz:'+q)
for q in Q:
    if 'objectId' in q:refs.append(q['objectId'])
    if q['type']=='skyPick':refs.append(q['answer'])
check('references inside 19 permitted G3 drafts',set(refs)<=ALLOWED,sorted(set(refs)-ALLOWED))
check('mission quiz badge prerequisites resolved',not bad,bad)
check('path mission refs resolved',all(i in mi for p in P for i in p['missionIds']))
pathuses=collections.Counter(i for p in P for i in p['missionIds'])
check('every mission assigned to exactly one path',set(pathuses)==set(mi) and all(n==1 for n in pathuses.values()))
check('path levels match missions',all(mi[i]['level']==p['level'] for p in P for i in p['missionIds']))
check('6 paths 2 per equipment level',len(P)==6 and collections.Counter(p['level'] for p in P)=={'naked':2,'binoculars':2,'telescope':2})
check('24 missions 8 per equipment level',len(M)==24 and collections.Counter(m['level'] for m in M)=={'naked':8,'binoculars':8,'telescope':8})
check('season balance five each plus four any',collections.Counter(m['season'] for m in M)=={'spring':5,'summer':5,'autumn':5,'winter':5,'any':4})
check('3 to 6 steps each',all(3<=len(m['steps'])<=6 for m in M))
check('16 badges',len(B)==16)
check('100 quizzes 60mc 20tf 20skyPick',len(Q)==100 and collections.Counter(q['type'] for q in Q)=={'mc':60,'trueFalse':20,'skyPick':20})
check('difficulty 40/40/20',collections.Counter(q['difficulty'] for q in Q)=={1:40,2:40,3:20})
check('mc integer index not boolean and within choices',all(type(q['answer']) is int and 0<=q['answer']<len(q['choices']) for q in Q if q['type']=='mc'))
check('mc choices distinct',all(len({c['ko'] for c in q['choices']})==len(q['choices']) for q in Q if q['type']=='mc'))
check('tf bool only',all(type(q['answer']) is bool for q in Q if q['type']=='trueFalse'))
check('tf ten true ten false',collections.Counter(q['answer'] for q in Q if q['type']=='trueFalse')=={True:10,False:10})
check('skyPick answer agrees with objectId',all(q['answer']==q['objectId'] for q in Q if q['type']=='skyPick'))
check('constellation valid and matches catalog',all(q.get('constellation') in CONS and q['constellation']==CAT[q['objectId']]['con'] for q in Q if q['objectId'].startswith('star:')))
# 자기 자신을 참조하거나 간접적으로 순환하는 선수 미션을 검사한다.
def has_cycle(missions):
    graph={x['id']:x.get('requires',{}).get('prerequisiteMissionIds',[]) for x in missions};seen=set();active=set()
    def visit(x):
        if x in active:return True
        if x in seen:return False
        active.add(x)
        if any(visit(y) for y in graph.get(x,[])):return True
        active.remove(x);seen.add(x);return False
    return any(visit(x) for x in graph)
check('prerequisite graph acyclic',not has_cycle(M))
check('questions have no exact duplicates',len({q['question']['ko'].strip() for q in Q})==len(Q))
check('all explanations nonempty',all(q['explanation']['ko'].strip() for q in Q))
check('no unreviewed capella target',all('star:HIP24608' not in json.dumps(a) for arr in DATA.values() for a in arr))
check('no sun mercury venus direct observation mission',all(s.get('objectId') not in {'sun','planet:mercury','planet:venus'} for m in M for s in m['steps']))
check('no solar system skyPick',all(q['answer'].startswith('star:') for q in Q if q['type']=='skyPick'))
check('no quality rating forced for completion',all('minRating' not in s for m in M for s in m['steps'] if s['type']=='observe'))
check('sun learning only and safety references exist',all(q['type']!='skyPick' for q in Q if q['objectId']=='sun') and any('필터 없이 절대' in q['explanation']['ko'] for q in Q if q['objectId']=='sun'))
ledger=load('evidence-ledger.json');check('one evidence entry for every quiz',collections.Counter(x['quizId'] for x in ledger)==collections.Counter(q['id'] for q in Q))
check('ledger content references resolve',all(x['contentId'] in ALLOWED and x['sourceUrls'] for x in ledger))
mg=load('mission-runtime-gates.json');bg=load('badge-readiness.json')
check('all missions have runtime gate records',{x['missionId'] for x in mg}==set(mi))
check('all badges have readiness records',{x['badgeId'] for x in bg}==set(bi))
check('three tutorial drafts, fourth explicitly pending',sum(x['tutorial'] is not None for x in mg)==3 and load('readiness-manifest.json')['coverageGaps']['tutorialsAuthored']==3)
v=load('visibility-screening.json'); vr=v['missions'];check('20 fixed-star missions have approximate windows',sum(r['status']=='approximate-planning-window-found' for r in vr)==20)
check('4 dynamic missions explicitly unverified',sum(r['status']=='runtime-ephemeris-required' for r in vr)==4)
check('visibility examples meet margin and solar limits',all(min(e['minimumAltitudeDeg'].values())>=26 and e['highestSolarAltitudeDeg']<=-12 for r in vr for e in r.get('examples',[])))
sky=load('skypick-screening.json');check('distinct skyPick target circles do not overlap in input',sky['pairwiseAnswerDistanceMinimumDeg']>6)
check('full-sky isolation not misreported as verified',all(not r['fullSkyIsolationVerified'] for r in sky['nearestProvidedNeighbors']))
summer=mi['summer-triangle-three']; obs={s['objectId'] for s in summer['steps'] if s['type']=='observe'}
check('summer badge mission has 3 real observe steps',obs=={'star:HIP91262','star:HIP97649','star:HIP102098'})
check('draft data has no sources or extra metadata fields added to schema',all('sources' not in q and 'meta' not in q for q in Q))
# 표준 JSON round-trip + exact UTF8 parse.
check('JSON roundtrip stable',all(json.loads(json.dumps(a,ensure_ascii=False))==a for a in DATA.values()))
# 아이콘: regex가 있으면 Unicode extended grapheme cluster로 단일 이모지 시퀀스 검사.
try:
    import regex
    check('badge icons are one grapheme and contain emoji',all(len(regex.findall(r'\X',b['icon']))==1 and regex.search(r'\p{Emoji}',b['icon']) for b in B))
except ImportError:
    check('badge icons manually constrained to selected single symbols',all(b['icon'] in {'⭐','✏️','👣','🧭','🌱','🌿','🌳','🗺️','💡','🔎','📚','✨','🌌','🔭','🔺','🌀'} for b in B))
# 변형 입력이 검사를 실제로 깨는지 확인. 제품 코드 테스트가 아니라 이 검증기의 자체 시험.
from copy import deepcopy
mutations=[]
a=deepcopy(Q);a[0]['answer']=True;mutations.append(('mc boolean rejected',bool(validate_schema('quiz',a))))
a=deepcopy(Q);a[0]['extra']='wrong';mutations.append(('unknown quiz key rejected',bool(validate_schema('quiz',a))))
a=deepcopy(Q);next(q for q in a if q['type']=='trueFalse')['choices']=[{'ko':'참'},{'ko':'거짓'}];mutations.append(('tf choices rejected',bool(validate_schema('quiz',a))))
a=deepcopy(Q);next(q for q in a if q['type']=='skyPick')['answer']=0;mutations.append(('skyPick numeric answer rejected',bool(validate_schema('quiz',a))))
a=deepcopy(M);a[0]['steps'][0]={'type':'openWeb','url':'https://example.invalid'};mutations.append(('unsupported step rejected',bool(validate_schema('missions',a))))
a=deepcopy(M);a[0]['steps']*=3;mutations.append(('too many steps rejected',bool(validate_schema('missions',a))))
a=deepcopy(B);a[0]['rule']={'key':'planetsAll','n':3};mutations.append(('wrong rule payload rejected',bool(validate_schema('badges',a))))
a=deepcopy(M);a[0]['requires']['prerequisiteMissionIds']=[a[1]['id']];a[1]['requires']['prerequisiteMissionIds']=[a[0]['id']];mutations.append(('cycle detected',has_cycle(a)))
for n,ok in mutations:check('validator self-test: '+n,ok)

blockers=[
 {'id':'published-index-missing','reason':'정식 content/v1/index.json과 19개 초안의 실제 게시 상태를 확인하지 못함.'},
 {'id':'content-editorial-review','reason':'G3 초안 기반 문항을 작성했으며 원본의 승인/출처 전수 재검증을 대신하지 않음. 50개 이상 추가 문항은 이후 성단·은하·별자리 콘텐츠로 확장해야 함.'},
 {'id':'quiz-total-incomplete','reason':'최소 150 중 100 작성; 50 부족.'},
 {'id':'skyPick-total-incomplete','reason':'최소 30 중 20 작성; 10 부족. 현재 20개는 서로 다른 별 20개가 아니라 7별의 학습 목표 변형.'},
 {'id':'cluster-tutorial-missing','reason':'성단 콘텐츠가 없어 네 번째 필수 튜토리얼(스타 호핑으로 성단 찾기)은 작성/활성화 보류.'},
 {'id':'app-capabilities-unverified','reason':'Task7 실제 스텝 핸들러, T2/T5 센서·정렬·스케치·FOV·백업 기능 미검증.'},
 {'id':'runtime-visibility-unverified','reason':'현재 천체력, 정식 카탈로그 epoch, 달/행성 가시성 및 장애물·날씨 검사가 필요.'},
 {'id':'skyPick-isolation-unverified','reason':'전천 밝은별 목록과 실제 렌더러의 3° hit-test, 달/행성 근접 검사 미검증.'},
 {'id':'badge-semantics-pending','reason':'constellationCount/quizStreak/firstStarHop/align2 등 이벤트·집계 정의 승인 필요. 수여 조건을 데이터만으로 확정하지 않음.'}
]
release='--release' in sys.argv
result={'date':'2026-09-07','mode':'release' if release else 'draft','status':'blocked' if release else ('passed' if all(c['passed'] for c in CHECKS) else 'failed'),'checksPassed':sum(c['passed'] for c in CHECKS),'checksTotal':len(CHECKS),'errors':[c for c in CHECKS if not c['passed']],'checks':CHECKS,'releaseReady':False,'releaseBlockers':blockers,'environment':{'python':sys.version.split()[0],'jsonschema':importlib.metadata.version('jsonschema')},'scope':'사전 작업 데이터·검증기 검사. 앱의 TypeScript 테스트/실기기 테스트/저장소 병합이 아님.'}
name='qa/release-check.json' if release else 'validation.json';(ROOT/name).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:result[k] for k in ['mode','status','checksPassed','checksTotal','errors','releaseReady']},ensure_ascii=False,indent=2))
if release:print('Publication blocked:',len(blockers),'unresolved requirement groups')
sys.exit(2 if release else (0 if not result['errors'] else 1))
