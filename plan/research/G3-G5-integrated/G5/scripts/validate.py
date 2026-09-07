#!/usr/bin/env python3
"""Validate this authored G5 pack. Does not certify astronomy or app behavior.
Run from any working directory. --release intentionally blocks pending external gates.
"""
from __future__ import annotations
import argparse, csv, hashlib, json, re, sys, zipfile
from collections import Counter
from copy import deepcopy
from datetime import datetime
from pathlib import Path
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'G5'

def load(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))

def digest_value(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True).encode()).hexdigest()

def pointer_value(value, pointer):
    for part in pointer.strip('/').split('/'):
        if not part:
            continue
        part = part.replace('~1', '/').replace('~0', '~')
        value = value[int(part)] if isinstance(value, list) else value[part]
    return value

def is_acyclic(graph):
    active, done = set(), set()
    def visit(node):
        if node in active:
            return False
        if node in done:
            return True
        active.add(node)
        for parent in graph.get(node, []):
            if parent not in graph or not visit(parent):
                return False
        active.remove(node)
        done.add(node)
        return True
    return all(visit(node) for node in graph)

def valid_answer(q):
    t, a = q['type'], q['answer']
    if t == 'mc':
        return type(a) is int and 0 <= a < len(q.get('choices', []))
    if t == 'trueFalse':
        return type(a) is bool and 'choices' not in q
    if t == 'skyPick':
        return type(a) is str and a == q.get('objectId') and 'choices' not in q
    return False

def answer_meaning(q):
    return q['choices'][q['answer']]['ko'] if q['type'] == 'mc' else q['answer']

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--release', action='store_true')
    parser.add_argument('--report', default='G5/validation.json')
    args = parser.parse_args()
    checks = []
    def check(name, fn, detail=None):
        try:
            result = bool(fn())
            msg = detail
        except Exception as exc:
            result, msg = False, f'{type(exc).__name__}: {exc}'
        checks.append({'name': name, 'passed': result, 'details': msg})
    data = {k: load(f'G5/G5-learn-{k}.json') for k in ['paths','missions','badges','quiz']}
    P,M,B,Q = (data[k] for k in ['paths','missions','badges','quiz'])
    C = {x['id']: x for x in load('G3/G3-content-cumulative-121.json')}
    mi,bi,qi = ({x['id']:x for x in data[k]} for k in ['missions','badges','quiz'])
    cat = {x['id']:x for x in csv.DictReader((ROOT/'shared/inputs/catalog-values.v1.csv').open(encoding='utf-8-sig'))}
    const = {x['iau_abbr'] for x in csv.DictReader((ROOT/'shared/inputs/constellations_ko.csv').open(encoding='utf-8-sig'))}
    schemas={k:load(f'G5/schemas/{k}.schema.json') for k in data}
    validators={k:Draft202012Validator(schemas[k]) for k in data}
    for k in data:
        errors=list(validators[k].iter_errors(data[k]))
        check(f'{k}-exact-schema',lambda e=errors:not e,
              [f'{list(e.absolute_path)}: {e.message}' for e in errors[:4]] or None)
        check(f'{k}-unique-ids',lambda k=k:len(data[k])==len({x['id'] for x in data[k]}))
        check(f'{k}-kebab-case-ids',lambda k=k:all(re.fullmatch(r'[a-z][a-z0-9]*(?:-[a-z0-9]+)*',x['id']) for x in data[k]))
    allids=[x['id'] for a in data.values() for x in a]
    check('cross-type-id-uniqueness',lambda:len(allids)==len(set(allids)))
    check('g3-count-121',lambda:len(C)==121)
    check('g3-exact-catalog-id-coverage',lambda:set(C)==set(cat))
    check('paths-count-6',lambda:len(P)==6)
    check('paths-two-per-level',lambda:Counter(p['level'] for p in P)=={'naked':2,'binoculars':2,'telescope':2})
    check('paths-five-missions-each',lambda:all(len(p['missionIds'])==5 for p in P))
    check('path-mission-references-exist',lambda:all(i in mi for p in P for i in p['missionIds']))
    check('path-mission-level-match',lambda:all(mi[i]['level']==p['level'] for p in P for i in p['missionIds']))
    check('all-missions-assigned-once',lambda:Counter(i for p in P for i in p['missionIds'])==Counter(mi.keys()))
    check('missions-count-30',lambda:len(M)==30)
    check('missions-ten-per-level',lambda:Counter(m['level'] for m in M)=={'naked':10,'binoculars':10,'telescope':10})
    seasons=Counter(m['season'] for m in M)
    check('mission-seasons-7-7-6-6-4',lambda:seasons=={'spring':7,'summer':7,'autumn':6,'winter':6,'any':4})
    check('season-minimums-met',lambda:all(seasons[s]>=5 for s in ['spring','summer','autumn','winter']) and seasons['any']>=4)
    check('mission-steps-3-to-6',lambda:all(3<=len(m['steps'])<=6 for m in M))
    check('estimated-minutes-positive-integers',lambda:all(type(m['estimatedMinutes']) is int and 0<m['estimatedMinutes']<=180 for m in M))
    check('only-defined-step-types',lambda:all(s['type'] in {'find','observe','observeAny','read','quiz','skill','checklist'} for m in M for s in m['steps']))
    direct={s['objectId'] for m in M for s in m['steps'] if 'objectId' in s}
    check('mission-direct-objects-in-g3',lambda:direct<=set(C))
    check('mission-read-objects-in-g3',lambda:all(s['contentId'] in C for m in M for s in m['steps'] if s['type']=='read'))
    check('mission-content-list-in-g3',lambda:all(i in C for m in M for i in m.get('contentIds',[])))
    check('mission-quiz-references-exist',lambda:all(i in qi for m in M for s in m['steps'] if s['type']=='quiz' for i in s['quizIds']))
    check('mission-quiz-pass-ratio',lambda:all(0<s['passRatio']<=1 for m in M for s in m['steps'] if s['type']=='quiz'))
    check('mission-badge-references-exist',lambda:all(m.get('rewardBadgeId') is None or m['rewardBadgeId'] in bi for m in M))
    graph={m['id']:m.get('requires',{}).get('prerequisiteMissionIds',[]) for m in M}
    check('prerequisites-exist',lambda:all(i in mi for edges in graph.values() for i in edges))
    check('prerequisites-acyclic',lambda:is_acyclic(graph))
    check('real-equipment-consistent',lambda:all(m['level'] in m.get('requires',{}).get('equipment',[m['level']]) for m in M))
    check('no-forced-observation-rating',lambda:all('minRating' not in s for m in M for s in m['steps'] if s['type']=='observe'))
    check('no-solar-or-inner-planet-pointing-mission',lambda:not({'sun','planet:mercury','planet:venus'}&direct))
    check('disputed-capella-dubhe-not-direct-targets',lambda:not({'star:HIP24608','star:HIP54061'}&direct))
    check('all-any-missions-use-moon-or-planet',lambda:all(any(s.get('objectId')=='moon' or s.get('objectId','').startswith('planet:') for s in m['steps']) for m in M if m['season']=='any'))
    tutorials=load('G5/tutorials.json')
    check('four-tutorials-complete',lambda:len(tutorials)==4 and {t['tutorial'] for t in tutorials}=={'fovSetup','arMode+align1','sketch','starhop-openCluster'})
    check('tutorial-skills-present',lambda:all(set(t['requiredSkills'])<={s['skill'] for s in mi[t['missionId']]['steps'] if s['type']=='skill'} for t in tutorials))
    check('tutorial-real-observe-step-present',lambda:all(any(s['type']=='observe' for s in mi[t['missionId']]['steps']) for t in tutorials))
    check('starhop-tutorial-targets-open-cluster-M45',lambda:any(s['type']=='observe' and s['objectId']=='dso:M45' for s in mi['winter-m45-starhop']['steps']))
    check('summer-triangle-three-actual-observations',lambda:{s['objectId'] for s in mi['summer-triangle-three']['steps'] if s['type']=='observe'}=={'star:HIP91262','star:HIP97649','star:HIP102098'})
    check('double-cluster-two-explicit-records',lambda:{s['objectId'] for s in mi['autumn-double-cluster']['steps'] if s['type']=='observe'}=={'dso:NGC869','dso:NGC884'})
    check('galaxy-dark-sky-requirement',lambda:mi['autumn-m31-core']['requires']['darkSky'] is True)
    check('badges-count-18',lambda:len(B)==18)
    check('badges-next-goal-language',lambda:all('다음' in b['description']['ko'] for b in B))
    check('badge-rule-n-positive',lambda:all(type(b['rule']['n']) is int and b['rule']['n']>0 for b in B if 'n' in b['rule']))
    check('mission-count-badges-achievable-within-30',lambda:all(b['rule'].get('n',0)<=30 for b in B if b['rule']['key']=='missionsCompleted'))
    check('no-weather-pressure-streak-badges',lambda:not any(b['rule']['key'] in {'streakNights','planetsAll','moonPhasesAll'} for b in B))
    check('quiz-count-180',lambda:len(Q)==180)
    check('quiz-type-counts-108-36-36',lambda:Counter(q['type'] for q in Q)=={'mc':108,'trueFalse':36,'skyPick':36})
    check('quiz-difficulty-72-72-36',lambda:Counter(q['difficulty'] for q in Q)=={1:72,2:72,3:36})
    check('quiz-answer-type-and-range',lambda:all(valid_answer(q) for q in Q))
    check('mc-four-distinct-choices',lambda:all(len(q['choices'])==4 and len({x['ko'] for x in q['choices']})==4 for q in Q if q['type']=='mc'))
    check('mc-correct-position-balance',lambda:Counter(q['answer'] for q in Q if q['type']=='mc')=={0:27,1:27,2:27,3:27})
    check('true-false-answer-balance',lambda:Counter(q['answer'] for q in Q if q['type']=='trueFalse')=={True:18,False:18})
    check('quiz-questions-nonduplicate',lambda:len({q['question']['ko'] for q in Q})==len(Q))
    check('quiz-object-references-in-g3',lambda:all(q.get('objectId') is None or q['objectId'] in C for q in Q))
    check('quiz-constellation-codes-in-g2',lambda:all(q.get('constellation') is None or q['constellation'] in const for q in Q))
    check('quiz-direct-capella-dubhe-excluded',lambda:all(q.get('objectId') not in {'star:HIP24608','star:HIP54061'} for q in Q))
    check('quiz-no-distance-value-as-answer',lambda:all(not re.search(r'\d[\d,.]*\s*(?:광년|파섹|AU|등급)',str(answer_meaning(q))) for q in Q), '정답 문자열의 제한적 패턴 검사이며 모든 의미 오류를 검출하는 것은 아님.')
    check('korean-question-and-explanation',lambda:all(re.search('[가-힣]',q['question']['ko']) and re.search('[가-힣]',q['explanation']['ko']) for q in Q))
    sky=[q for q in Q if q['type']=='skyPick']
    targets={q['answer'] for q in sky}
    check('skypick-fifteen-distinct-stars',lambda:len(targets)==15 and all(x.startswith('star:HIP') for x in targets))
    check('sky-answer-id-equals-object-id',lambda:all(q['answer']==q['objectId'] and q['answer'] in C for q in sky))
    check('no-solar-skypick',lambda:'sun' not in targets)
    policy=load('G5/quiz-sampling-policy.json')
    check('skypick-variants-limited-per-session',lambda:policy['sameSkyPickTargetMaxPerSession']==1)
    check('quiz-never-creates-observation',lambda:policy['quizNeverCreatesObservation'] is True)
    ev=load('G5/evidence/quiz-evidence.json')
    check('quiz-evidence-exact-coverage',lambda:Counter(e['quizId'] for e in ev)==Counter(qi.keys()))
    check('quiz-evidence-nonempty',lambda:all(e['evidence'] and e['rationale'] for e in ev))
    check('quiz-evidence-g3-pointers-exact',lambda:all(pointer_value(C[v['contentId']],v['pointer'])==v['suppliedText'] for e in ev for v in e['evidence']))
    check('quiz-evidence-snapshot-hashes',lambda:all(digest_value(v['suppliedText'])==v['textSha256'] for e in ev for v in e['evidence']))
    check('quiz-evidence-inherits-review-notes',lambda:all(notes==C[i]['meta'].get('needsReview',[]) for e in ev for i,notes in e['sourceReviewNotesInherited'].items()))
    check('quiz-evidence-editorial-pending',lambda:all(e['editorialApproval']=='pending-T6-T7' for e in ev))
    check('quiz-evidence-primary-object-covered',lambda:all(qi[e['quizId']]['objectId'] in {v['contentId'] for v in e['evidence']} for e in ev))
    def urls_match(e):
        ids={v['contentId'] for v in e['evidence']}
        expected={u.rstrip('.,)') for i in ids for s in C[i]['sources'] for u in re.findall(r'https?://[^\s|]+',s)}
        return set(e['upstreamSourceUrls'])==expected
    check('upstream-urls-exactly-inherit-g3-sources',lambda:all(urls_match(e) for e in ev), 'URL 문자열 계승 검사. 원문 사이트의 현재 접근 가능성이나 각 문장 함의를 증명하지 않음.')
    me=load('G5/evidence/mission-evidence.json')
    check('mission-evidence-coverage',lambda:Counter(e['missionId'] for e in me)==Counter(mi.keys()))
    check('mission-evidence-content-ids-resolve',lambda:all(i in C for e in me for i in e['contentIds']))
    gates=load('G5/mission-runtime-gates.json'); gi={g['missionId']:g for g in gates}
    check('runtime-gates-cover-thirty-missions',lambda:Counter(g['missionId'] for g in gates)==Counter(mi.keys()))
    check('runtime-direct-targets-match',lambda:all(set(g['directObjectIds'])=={s['objectId'] for s in mi[g['missionId']]['steps'] if 'objectId' in s} for g in gates))
    check('runtime-observe-targets-match',lambda:all(set(g['observeObjectIds'])=={s['objectId'] for s in mi[g['missionId']]['steps'] if s['type']=='observe'} for g in gates))
    check('runtime-planning-positions-resolve',lambda:all(i in C for g in gates for i in g['planningPositionIds']))
    check('runtime-gates-altitude-night-published-handlers',lambda:all(g['minimumAltitudeDeg']==25 and g['eveningKst']==[21,24] and g['solarAltitudeMaxDeg']==-12 and g['requiresPublishedContent'] is True and g['requiresImplementedHandlers'] is True for g in gates))
    bc=load('G5/badge-runtime-contract.json')
    check('badge-contract-exact-coverage',lambda:Counter(x['badgeId'] for x in bc)==Counter(bi.keys()))
    check('badge-contract-rule-match',lambda:all(x['rule']==bi[x['badgeId']]['rule'] for x in bc))
    check('badges-default-off-until-handler-verification',lambda:all(x['enabledByDefault'] is False for x in bc))
    check('three-constellation-count-badges-explicit',lambda:sum(b['rule']['key']=='constellationCount' for b in B)==3)
    vis=load('G5/qa/visibility-screening.json'); vr={v['missionId']:v for v in vis['missions']}
    check('visibility-coverage-thirty',lambda:set(vr)==set(mi) and len(vis['missions'])==30)
    check('visibility-26-fixed-4-dynamic',lambda:Counter(v['status'] for v in vr.values())=={'approximate-window-found':26,'runtime-ephemeris-required':4})
    check('visibility-target-set-current',lambda:all(set(v['positionIds'])==set(gi[i]['planningPositionIds']) for i,v in vr.items()))
    fixed=[v for v in vr.values() if v['status']=='approximate-window-found']
    check('fixed-missions-example-and-date-present',lambda:all(v['examples'] and v['eligibleDatesKst'] for v in fixed))
    check('fixed-mission-duration-match',lambda:all(v['durationMinutes']==mi[v['missionId']]['estimatedMinutes'] for v in fixed))
    check('fixed-example-altitude-margin',lambda:all(all(x>=26-1e-4 for x in e['minimumAltitudeDeg'].values()) for v in fixed for e in v['examples']))
    check('fixed-example-twilight',lambda:all(e['highestSolarAltitudeDeg']<=-12+1e-4 for v in fixed for e in v['examples']))
    def example_time_ok(v,e):
        a,b=datetime.fromisoformat(e['startKst']),datetime.fromisoformat(e['endKst'])
        end_limit=datetime.fromisoformat(e['dateKst']+'T00:00:00+09:00').timestamp()+86400
        return a.hour>=21 and b.timestamp()<=end_limit and (b-a).total_seconds()==v['durationMinutes']*60 and e['dateKst'] in v['eligibleDatesKst']
    check('fixed-example-duration-and-kst-window',lambda:all(example_time_ok(v,e) for v in fixed for e in v['examples']))
    check('fixed-example-position-coverage',lambda:all(set(e['minimumAltitudeDeg'])==set(v['positionIds']) for v in fixed for e in v['examples']))
    check('fixed-dates-inside-declared-months',lambda:all(int(d[5:7]) in v['screeningMonths'] for v in fixed for d in v['eligibleDatesKst']))
    check('dynamic-missions-still-require-ephemeris',lambda:all(mi[v['missionId']]['season']=='any' and not v.get('examples') for v in vr.values() if v['status']=='runtime-ephemeris-required'))
    ss=load('G5/qa/skypick-screening.json')
    check('sky-screening-matches-current-bank',lambda:ss['quizCount']==len(sky) and ss['distinctTargetCount']==len(targets) and {t['objectId'] for t in ss['nearestProvidedNeighbors']}==targets)
    check('sky-answer-disks-nonoverlap-within-candidates',lambda:ss['minimumAnswerPairDistanceDeg']>6)
    check('sky-provided-31-neighbor-clearance',lambda:all(t['separationDeg']>3 for t in ss['nearestProvidedNeighbors']), '31개 제공 별에 한한 기하학 검사. 전천 검증 아님.')
    check('sky-no-false-full-catalog-approval',lambda:ss['allSkyIsolationVerified'] is False and ss['fullCatalogStaticScreen']=='not-completed' and ss['runtimeEnabledByDefault'] is False)
    check('sky-unverified-vmag-not-coerced',lambda:all(t['verifiedVmag'] is None and t['fullSkyIsolationVerified'] is False for t in ss['nearestProvidedNeighbors']))
    check('sky-runtime-complete-scene-and-dynamic-required',lambda:ss['requiredRuntimePolicy']['requireCompleteRenderedSnapshot'] is True and ss['requiredRuntimePolicy']['requireDynamicMoonPlanetScreen'] is True and ss['requiredRuntimePolicy']['unknownStatus']=='disable-question')
    gc=load('G5/qa/guide-checks.json')['routes']
    check('two-starhop-guide-routes',lambda:len(gc)==2)
    check('guide-independent-angle-calculations-agree',lambda:all(abs(r['vectorSeparationDeg']-r['independentCosineLawDeg'])<1e-10 for r in gc))
    check('guide-authored-rounded-angles-supported',lambda:all(abs(r['authoredApproxDeg']-r['vectorSeparationDeg'])<=0.5 for r in gc))
    blocks=re.findall(r'```json\s*\n(.*?)\n```',(OUT/'G5-learn-codeblocks.md').read_text(encoding='utf-8'),re.S)
    check('markdown-four-json-codeblocks',lambda:len(blocks)==4)
    check('markdown-codeblocks-match-canonical-arrays',lambda:[json.loads(x) for x in blocks]==[P,M,B,Q])
    with zipfile.ZipFile(ROOT/'archive/G5-prep-package.zip') as z:
        def old(k):return json.loads(z.read('G5-prep-package/G5-learn-'+k+'.json'))
        oldq,oldm,oldp=old('quiz'),old('missions'),old('paths')
    check('legacy-one-hundred-quiz-ids-preserved',lambda:len(oldq)==100 and all(q['id'] in qi for q in oldq))
    check('legacy-quiz-answer-meaning-preserved',lambda:all(answer_meaning(q)==answer_meaning(qi[q['id']]) for q in oldq))
    check('legacy-quiz-type-target-explanation-preserved',lambda:all(all(q.get(k)==qi[q['id']].get(k) for k in ['type','objectId','explanation','difficulty']) for q in oldq))
    migration=load('G5/id-migration.json')['missionReplacements']
    check('four-mission-replacements-no-auto-transfer',lambda:len(migration)==4 and all(x['oldId'] not in mi and x['newId'] in mi and x['progressPolicy']=='no-auto-completion-transfer' for x in migration))
    check('legacy-six-path-ids-preserved',lambda:{p['id'] for p in oldp}=={p['id'] for p in P})
    check('exactly-six-additional-missions-plus-four-swaps',lambda:len(set(mi)-{m['id'] for m in oldm})==10 and len({m['id'] for m in oldm}-set(mi))==4)
    changes=load('G5/changes-from-prep.json')
    check('eighty-additions-list-exact',lambda:len(changes['addedQuizIds'])==80 and set(changes['addedQuizIds'])==set(qi)-{q['id'] for q in oldq})
    # Negative controls prove that selected invalid fixtures are rejected.
    for k in data:
        bad=deepcopy(data[k]);bad[0]['unsupportedField']=True
        check(f'negative-control-{k}-extra-key-rejected',lambda k=k,bad=bad:not validators[k].is_valid(bad))
    bad=deepcopy(Q[0]);bad['answer']=True
    check('negative-control-mc-boolean-rejected',lambda:not validators['quiz'].is_valid([bad]) and not valid_answer(bad))
    bad_range=deepcopy(Q[0]);bad_range['answer']=len(bad_range['choices'])
    check('negative-control-answer-out-of-range-rejected',lambda:not valid_answer(bad_range))
    bad_sky=deepcopy(sky[0]);bad_sky['answer']='star:HIP999999'
    check('negative-control-wrong-sky-id-rejected',lambda:not valid_answer(bad_sky))
    check('negative-control-cycle-rejected',lambda:not is_acyclic({'a':['b'],'b':['a']}))
    check('negative-control-missing-prerequisite-rejected',lambda:not is_acyclic({'a':['missing']}))
    tampered=deepcopy(ev[0]['evidence'][0]);tampered['suppliedText']='변조된 텍스트'
    check('negative-control-evidence-tamper-rejected',lambda:digest_value(tampered['suppliedText'])!=tampered['textSha256'])
    release=load('integration/release-gates.json')
    check('release-state-not-mislabeled-approved',lambda:release['dataAuthoringComplete'] is True and release['releaseReady'] is False and len(release['blockers'])==7)
    passed=sum(x['passed'] for x in checks)
    report={'generatedAt':'2026-09-07','scope':'G5 작성 데이터의 스키마·수량·참조·근거 계보·보조 보고서 일관성 및 음성 대조 시험. 천문학 전수 팩트체크/실제 앱 검증 아님.',
      'draftValidationPassed':passed==len(checks),'checksTotal':len(checks),'checksPassed':passed,'checksFailed':len(checks)-passed,
      'dataAuthoringComplete':passed==len(checks),'publicationApproved':False,'releaseModeRequested':args.release,
      'counts':{k:len(v) for k,v in data.items()},'quizTypes':dict(Counter(q['type'] for q in Q)),
      'difficulty':dict(Counter(q['difficulty'] for q in Q)),'missionSeasons':dict(seasons),
      'skyPick':{'authored':len(sky),'distinctTargets':len(targets),'fullSkyApproved':False,'enabledByDefault':False},
      'releaseBlockers':release['blockers'],'checks':checks}
    path=ROOT/args.report;path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'G5 draft checks: {passed}/{len(checks)} passed. Release: blocked pending external verification.')
    for x in checks:
        if not x['passed']:print('FAILED:',x['name'],x['details'])
    return 1 if passed<len(checks) else 2 if args.release else 0

if __name__=='__main__':
    sys.exit(main())
