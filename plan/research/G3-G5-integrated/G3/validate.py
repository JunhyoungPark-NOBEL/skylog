#!/usr/bin/env python3
"""Validate G3 completion drafts. Does NOT certify astronomy or publication readiness.
Usage: python validate.py [--release] [--report validation.json]
--release intentionally fails until an external editorial/scientific approval workflow exists.
"""
from __future__ import annotations
import argparse, csv, hashlib, json, math, re, sys
from collections import Counter
from pathlib import Path
try:
    from jsonschema import Draft202012Validator
except ImportError:
    raise SystemExit('jsonschema is required. Install the dependency listed in requirements.txt.')
R=Path(__file__).resolve().parent

def j(name:str):return json.loads((R/name).read_text(encoding='utf-8'))
def csvread(name:str):
    with (R/name).open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
def sha(p:Path)->str:return hashlib.sha256(p.read_bytes()).hexdigest()
def main()->int:
    ap=argparse.ArgumentParser();ap.add_argument('--release',action='store_true');ap.add_argument('--report',default='validation.json');args=ap.parse_args()
    tests=[]
    def check(name,condition,details=None):
        tests.append({'name':name,'passed':bool(condition),'details':details})
    try:
        b40=j('G3-content-expansion-40-2.json');b1=j('G3-content-final-1.json');new=b40+b1;cum=j('G3-content-cumulative-121.json')
        prev=j('inputs/previous-cumulative-80.json');catrows=csvread('inputs/catalog-values.v1.csv');cat={r['id']:r for r in catrows}
        targets=csvread('inputs/content-targets.v1.csv');rem=csvread('inputs/previous-remaining-41.csv');raw=j('raw-selected-values.json')
        schema=j('content.schema.json');reg=j('source-registry.json');props=j('catalog-correction-proposals.json');idx=j('draft-content-index.json');m=j('manifest.json');g=j('guide-checks.json')
    except (OSError,ValueError,KeyError) as exc:
        print(f'Cannot load required artifact: {exc}',file=sys.stderr);return 2
    check('new-40-count',len(b40)==40)
    check('final-1-count',len(b1)==1)
    check('new-total-41',len(new)==41)
    check('previous-count-80',len(prev)==80)
    check('cumulative-count-121',len(cum)==121)
    check('raw-catalog-has-121-unique-ids',len(catrows)==len(cat)==121)
    check('target-list-has-121-unique-ids',len(targets)==len({r['id'] for r in targets})==121)
    check('new-preserves-remaining-order',[x['id'] for x in new]==[x['id'] for x in rem])
    check('batch40-has-7-constellations-33-dso',sum(x['id'].startswith('const:') for x in b40)==7 and sum(x['id'].startswith('dso:') for x in b40)==33)
    check('final-singleton-is-NGC7009',b1[0]['id']=='dso:NGC7009')
    check('previous80-deep-equality-preserved',cum[:80]==prev)
    check('cumulative-is-previous-plus-new',cum==prev+new)
    ids=[x['id'] for x in cum];ns={x['id'] for x in new};ps={x['id'] for x in prev}
    check('no-duplicate-cumulative-ids',len(ids)==len(set(ids)))
    check('no-new-old-overlap',not (ns&ps))
    check('exact-coverage-of-target-list',set(ids)=={r['id'] for r in targets})
    check('exact-coverage-of-raw-catalog',set(ids)==set(cat))
    check('remaining-json-empty',j('remaining-targets.json')==[])
    check('remaining-csv-header-only',csvread('remaining-targets.csv')==[] and (R/'remaining-targets.csv').read_text(encoding='utf-8-sig').strip()=='id,priority,reason')
    check('selected-targets-csv-preserves-source-rows',csvread('selected-targets.csv')==rem)
    check('raw-selected-preserves-every-cell',raw==[cat[r['id']] for r in rem],{'rows':len(raw),'columns':len(catrows[0]),'cells':len(raw)*len(catrows[0])})
    check('raw-string-values-retained',all(isinstance(v,str) for r in raw for v in r.values()))
    check('raw-blank-english-name-retained',all(r['name_en']==cat[r['id']]['name_en'] for r in raw))
    check('source-inputs-sha256-manifest',all(sha(R/n)==h for n,h in j('input-checksums.json').items()))
    for name,items in [('new40',b40),('final1',b1),('cumulative121',cum)]:
        errors=[{'path':list(e.absolute_path),'message':e.message} for e in Draft202012Validator(schema).iter_errors(items)]
        check('schema-'+name,not errors,errors[:5])
    ranges={k:{'min':min(len(x[k]['ko']) for x in new),'max':max(len(x[k]['ko']) for x in new)} for k in ['oneLiner','summary','story']}
    check('oneLiner-at-most-60',all(len(x['oneLiner']['ko'])<=60 for x in new),ranges['oneLiner'])
    check('summary-200-to-400',all(200<=len(x['summary']['ko'])<=400 for x in new),ranges['summary'])
    check('story-300-to-600',all(300<=len(x['story']['ko'])<=600 for x in new),ranges['story'])
    check('facts-5-to-8',all(5<=len(x['facts'])<=8 for x in new))
    check('new-every-object-six-facts',all(len(x['facts'])==6 for x in new))
    check('all-new-facts-have-source',all(f.get('source') for x in new for f in x['facts']))
    check('fact-sources-are-in-item-sources',all(f['source'] in x['sources'] for x in new for f in x['facts']))
    check('story-sources-are-in-item-sources',all(s in x['sources'] for x in new for s in x['story']['sources']))
    check('all-new-items-have-external-source',all(any('https://' in s for s in x['sources']) for x in new))
    regurls={s['url'] for s in reg.values()}
    found={u for x in new for s in x['sources'] for u in re.findall(r'https://[^\s;]+',s)}
    check('all-new-external-urls-registered',found<=regurls,{'registered':len(regurls),'used':len(found)})
    check('source-ledger-has-every-new-id',{x['id'] for x in j('source-ledger.json')}==ns)
    check('source-access-limitations-present',all(s['access'] and s['support'] for s in reg.values()))
    check('new-summaries-distinct',len({x['summary']['ko'] for x in new})==41)
    check('new-stories-distinct',len({x['story']['ko'] for x in new})==41)
    check('all-hop-references-in-cumulative',all(h in set(ids) for x in new for h in x['howToFind'].get('hopFrom',[])))
    check('all-hop-references-in-catalog',all(h in cat for x in new for h in x['howToFind'].get('hopFrom',[])))
    check('no-self-hop-references',all(h!=x['id'] for x in new for h in x['howToFind'].get('hopFrom',[])))
    check('all-three-equipment-descriptions',all(all(x['observing'].get(k) for k in ['nakedEye','binoculars','telescope']) for x in new))
    check('editorial-observing-caveat-per-item',all(any('실제 기기' in s for s in x['meta']['needsReview']) for x in new))
    check('legacy-generator-enum-preserved',all(x['meta']['generatedBy']=='gpt-5-pro' for x in new))
    check('new-date-september-7-2026',all(x['meta']['generatedAt']=='2026-09-07' for x in new))
    check('draft-not-approved',idx['publicationApproved'] is False and m['publicationApproved'] is False)
    check('draft-index-exact-coverage',{x['id'] for x in idx['items']}==set(ids) and len(idx['items'])==121)
    check('all-draft-index-items-require-review',all(x['status']=='needs-review' for x in idx['items']))
    check('new-and-inherited-review-lists-cover-all',len(j('review-items.json'))==41 and len(j('review-items-all-121.json'))==121)
    byid={x['id']:x for x in new}
    def ff(id,label):return next(f['value'] for f in byid[id]['facts'] if f['label']==label)
    check('four-distance-conflicts-held',all('보류' in ff(id,'거리') and not re.search(r'\d',ff(id,'거리')) for id in ['dso:M92','dso:M2','dso:M10','dso:NGC7009']))
    check('five-magnitude-conflicts-held',all('보류' in ff(id,'겉보기등급') and not re.search(r'\d',ff(id,'겉보기등급')) for id in ['dso:M20','dso:M17','dso:M22','dso:M10','dso:M12']))
    check('all-dso-band-uncertainty-declared',all(any('측광 대역' in n for n in x['meta']['needsReview']) for x in new if x['id'].startswith('dso:')))
    check('catalog-correction-proposals-not-auto-applied',all('no-automatic-replacement' in p['action'] for p in props) and m['inputValuesOverwritten']==0)
    check('proposal-raw-values-match-input',all(p['raw']==cat[p['id']][p['field']] for p in props))
    check('saturn-nebula-distance-has-two-primary-candidates',len(next(p for p in props if p['id']=='dso:NGC7009')['candidates'])==2)
    check('M16-original-code-and-type-retained',next(x for x in raw if x['id']=='dso:M16')==cat['dso:M16'] and cat['dso:M16']['con']=='Se2' and 'IC4703' in ff('dso:M16','종류'))
    check('M46-projected-nebula-not-cluster-member', '앞쪽에 놓인 다른 대상' in byid['dso:M46']['summary']['ko'])
    check('Hercules-standard-name-and-alias','허큘리스자리'==byid['const:Her']['title']['ko'] and '헤르쿨레스자리' in byid['const:Her']['title']['alt'])
    check('no-invented-constellation-distance-mag-size',all(not any(any(t in f['label'] for t in ['거리','등급','각크기']) for f in x['facts']) for x in new if x['id'].startswith('const:')))
    check('Crux-travel-caveat-no-local-months','bestMonths' not in byid['const:Cru']['observing'] and any('여행' in s for s in byid['const:Cru']['meta']['needsReview']))
    check('NGC7000-input-blanks-preserved',cat['dso:NGC7000']['dist_ly']==cat['dso:NGC7000']['mag']=='')
    check('blank-input-distances-explicit-external-label',all('외부 소개값' in next(f['label'] for f in x['facts'] if f['label'].startswith('거리')) or not any(re.search(r'\d',f['value']) for f in x['facts'] if f['label'].startswith('거리')) for x in new if x['id'].startswith('dso:') and not cat[x['id']]['dist_ly']))
    check('English-label-fallback-is-only-id',all(x['title']['en']==x['id'].split(':')[1] for x in new if not cat[x['id']]['name_en']))
    check('exactly-16-guide-pairs',len(g['pairChecks'])==16)
    # Independent vector formulation to avoid just trusting stored acos calculations.
    def vec(id):
        ra=math.radians(float(cat[id]['ra_deg']));d=math.radians(float(cat[id]['dec_deg']))
        return [math.cos(d)*math.cos(ra),math.cos(d)*math.sin(ra),math.sin(d)]
    diff=[]
    for p in g['pairChecks']:
        a,b=vec(p['fromId']),vec(p['toId'])
        cr=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
        angle=math.degrees(math.atan2(math.sqrt(sum(v*v for v in cr)),sum(u*v for u,v in zip(a,b))))
        diff.append(abs(angle-p['separationDeg']))
    check('guide-angle-independent-vector-check',max(diff)<1e-7,{'maxDifferenceDeg':max(diff)})
    check('guide-rounding-error-less-than-point-zero-six',all(p['absRoundingErrorDeg']<.06 for p in g['pairChecks']))
    check('all-41-altitude-ceilings-recomputed',all(abs(p['maximumGeometricAltitudeDeg']-(90-abs(36.35-float(cat[p['id']]['dec_deg']))))<1e-6 for p in g['maximumAltitudeChecks']) and len(g['maximumAltitudeChecks'])==41)
    check('constellation-altitude-limits-marked-representative',all(p['representativeOnly'] and p['canEverReach25DegAtThisLatitude'] is None for p in g['maximumAltitudeChecks'] if p['id'].startswith('const:')))
    hc={p['id']:p for p in g['maximumAltitudeChecks']}
    check('M6-and-M7-fail-25-degree-ceiling',all(hc[id]['maximumGeometricAltitudeDeg']<25 and hc[id]['canEverReach25DegAtThisLatitude'] is False for id in ['dso:M6','dso:M7']))
    check('Crux-representative-below-geometric-horizon',hc['const:Cru']['maximumGeometricAltitudeDeg']<0)
    check('cumulative-kind-counts-9-31-30-51',m['typeCounts']=={'solar-system':9,'star':31,'constellation':30,'dso':51})
    for base,data in [('G3-content-expansion-40-2',b40),('G3-content-final-1',b1)]:
        txt=(R/(base+'.md')).read_text();check('single-copyable-json-block-'+base,txt.startswith('```json\n') and txt.endswith('\n```\n') and txt.count('```')==2 and json.loads(txt[8:-5])==data)
    # Offline structural checks only: do not pretend URLs were live-tested by this validator.
    check('registry-uses-primary-institution-domains',all(re.match(r'https://(?:science\.nasa\.gov|www\.eso\.org|noirlab\.edu|astro4edu\.org|iauarchive\.eso\.org)/',s['url']) for s in reg.values()))
    check('required-companion-files-exist',all((R/n).is_file() for n in ['README.md','Claude-T6-handoff.md','review-items.md','sources.md','observing-policy.md','G5-content-readiness.md']))
    failed=[x for x in tests if not x['passed']]
    report={'generatedAt':'2026-09-07','draftValidationPassed':not failed,'checksTotal':len(tests),'checksPassed':len(tests)-len(failed),'checksFailed':len(failed),'publicationApproved':False,'releaseGate':'blocked: editorial, measurement-band and conflicting-catalog review; actual app integration and device observations not performed','releaseModeRequested':args.release,'limits':['Schema, identity, provenance links, preservation and selected coordinate calculations only.','No claim that every scientific statement is independently proven.','No live URL availability validation in this script.','No image, app rendering, telescope field test or repository commit.'],'newContentLengths':ranges,'counts':{'previous':80,'newBatch':40,'finalBatch':1,'cumulative':121,'remaining':0},'checks':tests}
    (R/args.report).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(f"Draft checks: {report['checksPassed']}/{len(tests)} passed; publication: blocked")
    for f in failed:print('FAIL:',f['name'],f['details'])
    return 1 if failed else 2 if args.release else 0
if __name__=='__main__':raise SystemExit(main())
