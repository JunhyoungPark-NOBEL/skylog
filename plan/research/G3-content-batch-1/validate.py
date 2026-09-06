#!/usr/bin/env python3
"""G3 v1 structure + attachment consistency checks. Python 3.9+, stdlib only.
This does NOT verify astronomical truth, live URLs, or real telescope performance.
Run: python validate.py [G3-content-batch-1.json]
"""
from __future__ import annotations
import csv
import hashlib
import json
import re
import sys
from collections import Counter
from datetime import date
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
ERRORS: list[str] = []

def check(condition: bool, path: str, message: str) -> None:
    if not condition:
        ERRORS.append(f'{path}: {message}')

def obj(value: Any, path: str, required: set[str], optional: set[str] = set()) -> bool:
    if not isinstance(value, dict):
        check(False, path, 'must be an object')
        return False
    check(required <= set(value), path, 'missing keys: ' + ', '.join(sorted(required-set(value))))
    check(set(value) <= required|optional, path, 'unknown keys: ' + ', '.join(sorted(set(value)-required-optional)))
    return True

def text(value: Any, path: str, lo: int = 1, hi: int | None = None) -> None:
    check(isinstance(value, str), path, 'must be a string')
    if isinstance(value, str):
        check(len(value) >= lo, path, f'length must be >= {lo}')
        if hi is not None:
            check(len(value) <= hi, path, f'length must be <= {hi}')
        check(value == value.strip(), path, 'must not have leading/trailing whitespace')

def localized(value: Any, path: str, lo: int, hi: int | None, en: bool = False) -> None:
    if obj(value, path, {'ko'}, {'en'} if en else set()):
        text(value.get('ko'), path+'.ko', lo, hi)
        if 'en' in value:
            text(value['en'], path+'.en')

def strings(value: Any, path: str, allow_empty: bool = False) -> list[str]:
    check(isinstance(value, list), path, 'must be an array')
    if not isinstance(value, list):
        return []
    if not allow_empty:
        check(bool(value), path, 'must not be empty')
    for i, s in enumerate(value):
        text(s, f'{path}[{i}]')
    return [s for s in value if isinstance(s, str)]

def load_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))

def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main() -> int:
    path = Path(sys.argv[1]) if len(sys.argv)>1 else HERE/'G3-content-batch-1.json'
    try:
        data = json.loads(path.read_text(encoding='utf-8'))
        cat = load_csv(HERE/'inputs/catalog-values.v1.csv')
        targets = load_csv(HERE/'inputs/content-targets.v1.csv')
    except (OSError, ValueError, UnicodeError) as e:
        print(f'Input error: {e}', file=sys.stderr)
        return 2
    check(isinstance(data, list), '$', 'top-level value must be an array')
    if not isinstance(data, list):
        return 1
    ids = [x['id'] for x in cat]
    tids = [x['id'] for x in targets]
    check(len(set(ids)) == len(ids), 'inputs.catalog', 'duplicate id')
    check(len(set(tids)) == len(tids), 'inputs.targets', 'duplicate id')
    check(set(ids) == set(tids), 'inputs', 'target/catalog id sets differ')
    cat_by = {x['id']:x for x in cat}
    priorities = {x['id']:int(x['priority']) for x in targets}
    check(all(int(r['priority']) == priorities[r['id']] for r in cat if r['id'] in priorities),
          'inputs', 'priority disagreement')
    solar = [r['id'] for r in cat if r['type'] in {'sun','moon','planet'}]
    stars = sorted([r['id'] for r in cat if r['type']=='star'], key=lambda i:priorities[i])
    expected = solar+stars[:11]
    actual_ids = [x.get('id') for x in data if isinstance(x, dict)]
    check(len(data)==20, '$', 'batch 1 must contain exactly 20 objects')
    check(actual_ids == expected, '$.ids', 'selection or order differs from documented batch 1 rule')
    check(len(set(actual_ids)) == len(actual_ids), '$.ids', 'duplicate content id')
    metrics = []
    copied_cells = 0
    moving_count = 0
    for i,d in enumerate(data):
        p=f'$[{i}]'
        if not obj(d,p,{'id','version','title','oneLiner','summary','facts','story','howToFind','observing','sources','meta'}, {'koreanTradition','funFacts','safety'}):
            continue
        ident=d.get('id')
        check(isinstance(ident,str) and bool(re.fullmatch(r'(?:sun|moon|planet:[a-z]+|star:HIP\d+|const:[A-Za-z]{3}|dso:[A-Za-z0-9]+)', str(ident))), p+'.id','invalid id syntax')
        check(ident in cat_by,p+'.id','id absent from input catalog')
        if ident not in cat_by:
            continue
        raw=cat_by[ident]
        check(type(d.get('version')) is int and d.get('version')==1,p+'.version','must be integer 1')
        if obj(d.get('title'),p+'.title',{'ko','en'},{'alt'}):
            title=d['title']
            check(title.get('ko')==raw['name_ko'],p+'.title.ko','must preserve attached primary name')
            check(title.get('en')==raw['name_en'],p+'.title.en','must preserve attached primary name')
            if 'alt' in title:strings(title['alt'],p+'.title.alt')
        localized(d.get('oneLiner'),p+'.oneLiner',1,60)
        localized(d.get('summary'),p+'.summary',200,400,en=True)
        main_sources=strings(d.get('sources'),p+'.sources')
        check(len(main_sources)==len(set(main_sources)),p+'.sources','duplicate source')
        for s in main_sources:
            check(('https://' in s) or s.startswith('T0b 첨부 카탈로그('),p+'.sources','source is neither titled HTTPS reference nor explicit local attachment')
        facts=d.get('facts')
        check(isinstance(facts,list) and 5<=len(facts)<=8,p+'.facts','must contain 5–8 facts')
        if not isinstance(facts,list):facts=[]
        for j,f in enumerate(facts):
            if obj(f,p+f'.facts[{j}]',{'label','value'},{'source'}):
                text(f.get('label'),p+f'.facts[{j}].label')
                text(f.get('value'),p+f'.facts[{j}].value')
                check(isinstance(f.get('source'),str) and f['source'] in main_sources,
                      p+f'.facts[{j}].source','each authored fact must have a source present in sources')
        if obj(d.get('story'),p+'.story',{'ko','cultures','sources'}):
            text(d['story'].get('ko'),p+'.story.ko',300,600)
            cultures=strings(d['story'].get('cultures'),p+'.story.cultures')
            check(set(cultures)<={'그리스·로마','동아시아','한국','아랍','이집트','기타'},p+'.story.cultures','unsupported cultural category')
            ss=strings(d['story'].get('sources'),p+'.story.sources')
            check(set(ss)<=set(main_sources),p+'.story.sources','source missing from main sources')
        if 'koreanTradition' in d and obj(d['koreanTradition'],p+'.koreanTradition',{'note','sources'},{'name','asterism'}):
            k=d['koreanTradition']
            for key in {'name','asterism','note'}&k.keys():text(k[key],p+'.koreanTradition.'+key)
            ks=strings(k.get('sources'),p+'.koreanTradition.sources')
            check(set(ks)<=set(main_sources),p+'.koreanTradition.sources','source missing from main sources')
        if obj(d.get('howToFind'),p+'.howToFind',{'ko'},{'season','hopFrom'}):
            h=d['howToFind']
            text(h.get('ko'),p+'.howToFind.ko')
            check(h.get('season') in {'spring','summer','autumn','winter','any'},p+'.howToFind.season','invalid season')
            hs=strings(h.get('hopFrom',[]),p+'.howToFind.hopFrom',True)
            check(set(hs)<=set(ids),p+'.howToFind.hopFrom','reference absent from full attached target/catalog set')
            check(ident not in hs,p+'.howToFind.hopFrom','self-reference')
        if obj(d.get('observing'),p+'.observing',{'difficulty'},{'nakedEye','binoculars','telescope','bestMonths'}):
            o=d['observing']
            check(type(o.get('difficulty')) is int and 1<=o['difficulty']<=5,p+'.observing.difficulty','must be integer 1–5')
            for k in ('nakedEye','binoculars','telescope'):
                text(o.get(k),p+'.observing.'+k)
            if 'bestMonths' in o:
                ms=o['bestMonths']
                check(isinstance(ms,list) and bool(ms),p+'.observing.bestMonths','must be nonempty list')
                if isinstance(ms,list):
                    check(all(type(m) is int and 1<=m<=12 for m in ms),p+'.observing.bestMonths','invalid month')
                    check(len(ms)==len(set(ms)),p+'.observing.bestMonths','duplicate month')
        if 'funFacts' in d:
            ff=strings(d['funFacts'],p+'.funFacts',True)
            check(len(ff)<=3,p+'.funFacts','must have <=3 facts')
            for j,f in enumerate(ff):text(f,p+f'.funFacts[{j}]',1,80)
        if 'safety' in d:text(d['safety'],p+'.safety')
        if obj(d.get('meta'),p+'.meta',{'generatedBy','generatedAt','confidence'},{'needsReview'}):
            m=d['meta']
            check(m.get('generatedBy')=='gpt-5-pro',p+'.meta.generatedBy','schema v1 literal required; not runtime attestation')
            try:date.fromisoformat(m.get('generatedAt',''))
            except (TypeError,ValueError):check(False,p+'.meta.generatedAt','expected ISO calendar date')
            check(m.get('confidence') in {'high','medium','low'},p+'.meta.confidence','invalid confidence')
            if 'needsReview' in m:
                strings(m['needsReview'],p+'.meta.needsReview')
                check(m.get('confidence')!='high',p+'.meta.confidence','entry with review issues must not claim high confidence')
        if ident=='sun':
            check('필터 없이 절대 보지 말 것' in d.get('safety',''),p+'.safety','required warning missing')
            first=d['summary']['ko'].split('.')[0]
            check('필터' in first and '절대' in first,p+'.summary','first sentence must warn about safety')
        fact_by={f.get('label'):f for f in facts if isinstance(f,dict)}
        if raw['type']=='star':
            pairs=[('거리','dist_ly'),('겉보기 V등급','mag'),('분광형(카탈로그 원문)','spect')]
            for label,field in pairs:
                got=fact_by.get(label,{})
                check(got.get('value','').startswith(raw[field]),p+'.facts.'+label,'attached literal value not preserved')
                check('inputs/catalog-values.v1.csv' in got.get('source',''),p+'.facts.'+label,'must cite original attached values')
                copied_cells+=1
            check('('+raw['con']+')' in fact_by.get('별자리',{}).get('value',''),p+'.facts.별자리','attached constellation code mismatch')
            copied_cells+=1
        else:
            moving_count+=1
            check('variable' in fact_by.get('겉보기 V등급',{}).get('value',''),p+'.facts','moving-body variable magnitude must be preserved')
            check(d['howToFind'].get('season')=='any',p+'.howToFind.season','moving-body observation must not imply a fixed season')
            check('bestMonths' not in d['observing'],p+'.observing.bestMonths','moving-body evergreen entry must not hardcode annual best months')
        metrics.append({'id':ident,'oneLinerChars':len(d['oneLiner']['ko']),'summaryChars':len(d['summary']['ko']),
                        'storyChars':len(d['story']['ko']),'factCount':len(facts),'sourceCount':len(main_sources),
                        'confidence':d['meta']['confidence'],'reviewCount':len(d['meta'].get('needsReview',[]))})
    all_web_sources={s.rsplit(' — ',1)[-1] for x in data for s in x.get('sources',[]) if 'https://' in s}
    review=[{'id':x['id'],'confidence':x['meta']['confidence'],'issues':x['meta'].get('needsReview',[])} for x in data if x.get('meta',{}).get('needsReview')]
    report={
      'status':'failed' if ERRORS else 'structural_pass_with_editorial_review_required',
      'validatedOn':'2026-09-07','entryCount':len(data),'inputTargetCount':len(targets),
      'inputCategoryCounts':dict(Counter(x['type'] for x in cat)),
      'pendingTargetCount':len(set(ids)-set(actual_ids)),
      'checks':{'topLevelJSONArray':isinstance(data,list),'exactBatchOrder':actual_ids==expected,
                'sourceAndReferenceChecks':'pass' if not ERRORS else 'see errors',
                'copiedStellarFieldComparisons':copied_cells,'movingBodiesWithoutFixedBestMonths':moving_count},
      'sourceURLCount':len(all_web_sources),'confidenceCounts':dict(Counter(x['meta']['confidence'] for x in data)),
      'reviewEntryCount':len(review),'releaseBlockerIds':['star:HIP24608'],
      'notVerified':['Astronomical correctness of the attached numeric values and their upstream provenance',
                     'Photometric passband/epoch metadata absent from the attachments',
                     'All URLs by an automated HTTP health check',
                     'Real-device sky rendering, live ephemerides, real observations or measured instrument limits',
                     'T6 validator compatibility beyond the provided G3 schema',
                     'Deployment, repository merge or commit'],
      'schemaProvenanceNote':'generatedBy=gpt-5-pro is preserved solely as the required G3 v1 schema literal, not a verified runtime-model identity.',
      'inputSHA256':{'catalog-values.v1.csv':sha(HERE/'inputs/catalog-values.v1.csv'),
                     'content-targets.v1.csv':sha(HERE/'inputs/content-targets.v1.csv')},
      'contentSHA256':sha(path),'metrics':metrics,'reviewItems':review,'errors':ERRORS}
    (HERE/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:report[k] for k in ['status','entryCount','inputTargetCount','pendingTargetCount','sourceURLCount','confidenceCounts','reviewEntryCount','errors']},ensure_ascii=False,indent=2))
    return 1 if ERRORS else 0

if __name__=='__main__':
    raise SystemExit(main())
