#!/usr/bin/env python3
"""Run G3/G5 authored-data checks and the reference geometry tests.
Exit 0: draft data passed. Exit 1: a check failed. Exit 2 with --release: gated.
No app, browser, device or astronomy-service integration is executed.
"""
from __future__ import annotations
import argparse,csv,hashlib,json,subprocess,sys
from collections import Counter
from pathlib import Path
from jsonschema import Draft202012Validator
ROOT=Path(__file__).resolve().parents[1]

def read(p):return json.loads((ROOT/p).read_text(encoding='utf-8'))
def save(p,d):
    f=ROOT/p;f.parent.mkdir(parents=True,exist_ok=True)
    f.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--release',action='store_true');args=ap.parse_args()
    runs=[]
    commands=[('G3',['G3/validate.py','--report','../G5/qa/g3-revalidation.json']),
              ('G5',['G5/scripts/validate.py']),
              ('skyPick-reference',['G5/scripts/test_skypick_reference.py'])]
    for label,command in commands:
        try:
            proc=subprocess.run([sys.executable,*command],cwd=ROOT,text=True,capture_output=True,timeout=120)
            runs.append({'suite':label,'command':['python',*command],'returnCode':proc.returncode,
                         'stdout':proc.stdout.strip(),'stderr':proc.stderr.strip(),'passed':proc.returncode==0})
        except (OSError,subprocess.TimeoutExpired) as exc:
            runs.append({'suite':label,'command':['python',*command],'returnCode':None,'passed':False,'error':str(exc)})
        print(label+': '+('passed' if runs[-1]['passed'] else 'FAILED'))
    checks=[]
    def ck(name,fn):
        try: ok,detail=bool(fn()),None
        except Exception as exc:ok,detail=False,f'{type(exc).__name__}: {exc}'
        checks.append({'name':name,'passed':ok,'details':detail})
    mf=read('manifest.json');g3=read(mf['canonicalImportFiles']['G3']);ci={c['id']:c for c in g3}
    q=read(mf['canonicalImportFiles']['G5-quiz']);m=read(mf['canonicalImportFiles']['G5-missions'])
    p=read(mf['canonicalImportFiles']['G5-paths']);b=read(mf['canonicalImportFiles']['G5-badges'])
    ck('five-canonical-import-files',lambda:len(mf['canonicalImportFiles'])==5 and all((ROOT/f).is_file() for f in mf['canonicalImportFiles'].values()))
    ck('no-archived-imports',lambda:all(not f.startswith('archive/') for f in mf['canonicalImportFiles'].values()))
    ck('manifest-counts-exact',lambda:mf['counts']=={'G3':len(g3),'paths':len(p),'missions':len(m),'badges':len(b),'quiz':len(q),'skyPick':sum(x['type']=='skyPick' for x in q),'distinctSkyPickTargets':len({x['answer'] for x in q if x['type']=='skyPick'})})
    ck('g3-top-level-sha256-unchanged',lambda:hashlib.sha256((ROOT/mf['canonicalImportFiles']['G3']).read_bytes()).hexdigest()==mf['g3ContentSha256'])
    baseline=read('integration/g3-source-preservation.json')
    ck('g3-original-source-all-members-unchanged',lambda:baseline['filesCompared']==len(baseline['files']) and all(hashlib.sha256((ROOT/x['path']).read_bytes()).hexdigest()==x['sourceSha256'] for x in baseline['files']))
    schema=read('G3/content.schema.json')
    ck('g3-all-121-exact-schema',lambda:Draft202012Validator(schema).is_valid(g3))
    ck('g3-all-121-text-lengths',lambda:all(len(c['oneLiner']['ko'])<=60 and 200<=len(c['summary']['ko'])<=400 and 300<=len(c['story']['ko'])<=600 for c in g3))
    ck('g3-all-121-fact-counts-and-sources',lambda:all(5<=len(c['facts'])<=8 and c['sources'] for c in g3))
    ck('g3-existing-review-preserved',lambda:all('confidence' in c['meta'] and 'generatedAt' in c['meta'] for c in g3) and (ROOT/'G3/review-items-all-121.json').is_file())
    ck('g3-remaining-targets-empty',lambda:read('G3/remaining-targets.json')==[])
    for f in ['catalog-values.v1.csv','content-targets.v1.csv','constellations_ko.csv']:
        ck('shared-input-byte-match-'+f,lambda f=f:(ROOT/'shared/inputs'/f).read_bytes()==(ROOT/'G3/inputs'/f).read_bytes())
    usage=read('integration/content-usage.json');ui={u['id']:u for u in usage};mi={x['id']:x for x in m};qi={x['id']:x for x in q}
    ck('usage-covers-121-once',lambda:len(usage)==121 and set(ui)==set(ci))
    ck('usage-references-resolve',lambda:all(all(i in qi for i in u['quizIds']) and all(i in mi for i in u['missionIds']) for u in usage))
    ck('usage-targets-match-quiz-objects',lambda:all(all(qi[i].get('objectId')==u['id'] for i in u['quizIds']) for u in usage))
    ck('usage-62-g3-objects',lambda:sum(bool(u['quizIds'] or u['missionIds']) for u in usage)==62)
    index=read('integration/draft-content-index.json')
    ck('draft-index-not-claimed-published',lambda:'draft' in json.dumps(index).lower() and mf['appReleaseReady'] is False)
    release=read('integration/release-gates.json')
    ck('release-gates-seven-explicit',lambda:release['releaseReady'] is False and len(release['blockers'])==7)
    ck('required-documentation-present',lambda:all((ROOT/f).is_file() for f in ['README.md','Claude-T6-T7-handoff.md','G5/implementation-contract.md','G5/review-items.md','G5/evidence/quiz-evidence.json','G5/evidence/mission-evidence.json','G5/G5-learn-codeblocks.md','archive/G5-prep-package.zip']))
    passed=sum(x['passed'] for x in checks)
    success=all(r['passed'] for r in runs) and passed==len(checks)
    suites={}
    for label,path in [('G3','G5/qa/g3-revalidation.json'),('G5','G5/validation.json'),('reference','G5/qa/skypick-reference-tests.json')]:
        try:
            d=read(path)
            suites[label]={'checksTotal':d.get('checksTotal',d.get('testsRun')),'checksPassed':d.get('checksPassed',d.get('passed')),'scope':d.get('scope','Original G3 authored-data validator; publication not approved.')}
        except (OSError,ValueError):suites[label]={'reportMissing':True}
    report={'generatedAt':'2026-09-07','draftValidationPassed':success,'dataAuthoringComplete':success,'appReleaseReady':False,
      'checksTotal':len(checks),'checksPassed':passed,'checksFailed':len(checks)-passed,
      'componentSuites':suites,'counts':mf['counts'],'runs':runs,'checks':checks,
      'limitations':['출처 문장 계보와 제한적인 형식·계산 검사이지 G3 전수 사실 검증이 아님.','정식 앱 인덱스·UI·렌더러·센서·실제 장비 미검증.','skyPick 36개는 전체 현재 장면 검증 전 비활성화.'],
      'releaseBlockers':release['blockers']}
    save('integration/validation.json',report)
    if args.release:
        save('integration/release-validation.json',{'generatedAt':'2026-09-07','draftValidationPassed':success,'releaseReady':False,'status':'blocked','exitCode':2 if success else 1,'blockers':release['blockers'],'note':'사용자 승인·구현·현장 검증이 제공되지 않은 상태를 데이터 검사 통과로 덮어쓰지 않음.'})
    print(f'Integration checks: {passed}/{len(checks)} passed. App release: BLOCKED (7 external gates).')
    for x in checks:
        if not x['passed']:print('FAILED:',x['name'],x['details'])
    return 1 if not success else 2 if args.release else 0
if __name__=='__main__':sys.exit(main())
