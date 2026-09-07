#!/usr/bin/env python3
"""Validate the delivered draft, not astronomical correctness or app integration.
Usage: python validate.py [--release]
Dependency: jsonschema. --release intentionally exits 2 until human approvals exist.
"""
from pathlib import Path
import argparse, collections, csv, hashlib, json, math, re, sys, unicodedata
from jsonschema import Draft202012Validator, FormatChecker
B=Path(__file__).resolve().parent

def load(name):return json.loads((B/name).read_text(encoding='utf-8'))
def csvrows(name):return list(csv.DictReader((B/name).open(encoding='utf-8-sig')))
def save(name,value):(B/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def strings(v):
 if isinstance(v,str):yield v
 elif isinstance(v,list):
  for x in v:yield from strings(x)
 elif isinstance(v,dict):
  for x in v.values():yield from strings(x)
def sep_pa(a,b):
 r1,d1,r2,d2=map(math.radians,[float(a['ra_deg']),float(a['dec_deg']),float(b['ra_deg']),float(b['dec_deg'])]);dr=r2-r1
 c=math.sin(d1)*math.sin(d2)+math.cos(d1)*math.cos(d2)*math.cos(dr)
 separation=math.degrees(math.acos(max(-1,min(1,c))))
 pa=math.degrees(math.atan2(math.sin(dr)*math.cos(d2),math.cos(d1)*math.sin(d2)-math.sin(d1)*math.cos(d2)*math.cos(dr)))%360
 return separation,pa

def main(release=False):
 data=load('G3-content-priority-1.json');prev=load('inputs/G3-content-batch-1.json');combined=load('G3-content-cumulative-40.json')
 rows=csvrows('inputs/catalog-values.v1.csv');cat={r['id']:r for r in rows};targets=csvrows('inputs/content-targets.v1.csv')
 targetids={r['id'] for r in targets};ids=[i['id'] for i in data];oldids={i['id'] for i in prev};allids=set(ids)|oldids
 raw=load('raw-selected-values.json');manifest=load('manifest.json');reviews=load('review-items.json')
 corrections=load('catalog-correction-proposals.json')['items'];reg=load('source-registry.json');urls={r['url'] for r in reg}
 quarantine={r['id'] for r in corrections if r['field']=='dist_ly'}
 checks=[]
 def check(name,ok,detail=''):
  checks.append({'name':name,'passed':bool(ok),'detail':detail})
 schema=load('content.schema.json');errors=list(Draft202012Validator(schema,format_checker=FormatChecker()).iter_errors(data))
 check('schema-exact-keys-types-enums-and-lengths',not errors,[{'path':list(e.path),'message':e.message} for e in errors])
 check('new-array-count-20',len(data)==20)
 check('new-ids-unique',len(ids)==len(set(ids)))
 check('no-overlap-with-original-batch-1',not set(ids)&oldids)
 check('all-new-ids-in-original-targets',set(ids)<=targetids)
 check('new-category-counts',collections.Counter(i.split(':')[0] for i in ids)=={'dso':17,'star':3})
 check('input-targets-121-unique',len(targets)==121==len(targetids))
 check('catalog-121-unique',len(rows)==121==len(cat))
 check('targets-and-catalog-id-sets-match',targetids==set(cat))
 check('all-selected-raw-cells-preserved',raw==[cat[i] for i in ids],{'rows':len(raw),'columns':len(rows[0]),'cells':len(raw)*len(rows[0])})
 check('all-input-sha256-match-manifest',all(hashlib.sha256((B/'inputs'/p).read_bytes()).hexdigest()==h for p,h in manifest['inputSha256'].items()))
 check('nonempty-input-titles-preserved',all(i['title']['ko']==cat[i['id']]['name_ko'] and (not cat[i['id']]['name_en'] or i['title']['en']==cat[i['id']]['name_en']) for i in data))
 check('magnitudes-preserved-not-labelled-verified-V',all(any(f['label']=='겉보기등급(첨부·대역 미확인)' and f['value']==cat[i['id']]['mag']+'등급' for f in i['facts']) and any('측광 대역' in s for s in i['meta']['needsReview']) for i in data))
 retained=[i for i in data if cat[i['id']]['dist_ly'] and i['id'] not in quarantine]
 check('nonquarantined-distance-strings-preserved',all(any(f['label']=='거리(첨부 목록 기준)' and f['value']==cat[i['id']]['dist_ly']+'광년' for f in i['facts']) for i in retained),{'count':len(retained)})
 blank=[i for i in data if not cat[i['id']]['dist_ly']]
 check('blank-distances-not-filled',all(not any(f['label'].startswith('거리') for f in i['facts']) for i in blank),{'count':len(blank)})
 check('five-distance-quarantines-explicit',quarantine=={'dso:M31','dso:M13','dso:M3','dso:M15','dso:M51'})
 check('bad-distance-not-taught-as-fact',all(i['meta']['confidence']=='low' and any(f['label']=='거리' and f['value']=='검토 보류 — 첨부 값과 외부 자료가 크게 다릅니다.' for f in i['facts']) and not any(cat[i['id']]['dist_ly']+'광년'==f['value'] for f in i['facts']) for i in data if i['id'] in quarantine))
 check('distance-candidates-not-auto-applied',all(c['appliedToInput'] is False and c['appliedCandidateToContent'] is False for c in corrections if c['field']=='dist_ly'))
 stars=[i for i in data if i['id'].startswith('star:')]
 check('star-spectral-strings-preserved',all(any(f['label']=='분광형(첨부 표기)' and f['value']==cat[i['id']]['spect'] for f in i['facts']) for i in stars),{'count':len(stars)})
 dsos=[i for i in data if i['id'].startswith('dso:')]
 check('dso-angular-size-numbers-preserved',all(any(f['label']=='각크기(첨부 목록 기준)' and f['value']==' × '.join(x+'′' for x in cat[i['id']]['size_arcmin'].split('x')) for f in i['facts']) for i in dsos),{'count':len(dsos)})
 check('M42-composite-type-not-silently-overwritten',cat['dso:M42']['type']=='Cl+N (openCluster)' and any(c['id']=='dso:M42' and c['appliedToInput'] is False for c in corrections))
 check('M5-Se1-normalization-explicit',cat['dso:M5']['con']=='Se1' and any('첨부 코드 Se1' in f['value'] for i in data if i['id']=='dso:M5' for f in i['facts']))
 check('every-fact-has-source',all(f.get('source') for i in data for f in i['facts']))
 check('all-story-sources-in-object-sources',all(set(i['story']['sources'])<=set(i['sources']) for i in data))
 check('all-tradition-sources-in-object-sources',all(set(i.get('koreanTradition',{}).get('sources',[]))<=set(i['sources']) for i in data))
 foundurls=set(re.findall(r'https?://[^\s;]+','\n'.join(strings(data))))
 check('all-content-external-urls-in-registry',foundurls<=urls,{'unregistered':sorted(foundurls-urls)})
 check('source-registry-has-access-limitations',all(r.get('title') and r.get('url') and r.get('access') and r.get('accessedAt') for r in reg))
 check('all-hop-ids-in-catalog',all(h in cat for i in data for h in i['howToFind']['hopFrom']))
 check('no-self-hop-or-duplicate-hop',all(i['id'] not in i['howToFind']['hopFrom'] and len(i['howToFind']['hopFrom'])==len(set(i['howToFind']['hopFrom'])) for i in data))
 check('all-three-equipment-guides-present',all(all(i['observing'].get(k) for k in ('nakedEye','binoculars','telescope')) for i in data))
 check('all-objects-have-review-flags',all(i['meta'].get('needsReview') for i in data))
 check('raw-low-objects-are-listed-in-review',{i['id'] for i in reviews if i['distanceQuarantined']}==quarantine)
 check('cumulative-array-keeps-previous-items-exact',combined[:len(prev)]==prev and combined[len(prev):]==data)
 check('cumulative-40-unique',len(combined)==40==len(allids))
 remaining=load('remaining-targets.json')
 check('remaining-81-exact-priority-order',remaining==[r for r in targets if r['id'] not in allids] and len(remaining)==81)
 check('remaining-csv-json-equivalent',csvrows('remaining-targets.csv')==remaining)
 index=load('draft-content-index.json')
 check('draft-index-cannot-claim-published',index['approvedForPublication'] is False and all(x['approved'] is False for x in index['items']) and {x['id'] for x in index['items']}==allids)
 md=(B/'G3-content-priority-1.md').read_text(encoding='utf-8')
 check('single-codeblock-json-equals-json-artifact',md.count('```')==2 and md.startswith('```json\n') and json.loads(md.split('```json\n',1)[1].rsplit('```',1)[0])==data)
 check('all-content-strings-NFC-normalized',all(unicodedata.normalize('NFC',s)==s for s in strings(data)))
 check('no-internal-citation-tokens-or-placeholders',not any('' in s or 'turn996' in s or 'TODO' in s or '{{' in s for s in strings(data)))
 angles=[]
 for a,b,display,tol,pa_range in [('star:HIP21421','dso:M45',14,.6,(270,360)),('star:HIP69673','dso:M3',12,.2,(270,360)),('star:HIP67301','dso:M51',3.6,.15,(180,270)),('dso:M81','dso:M82',.6,.05,(0,15)),('dso:NGC869','dso:NGC884',.5,.05,(75,105))]:
  sep,pa=sep_pa(cat[a],cat[b]);ok=abs(sep-display)<=tol and pa_range[0]<=pa<=pa_range[1]
  angles.append({'from':a,'to':b,'calculatedSeparationDeg':round(sep,6),'proseApproximationDeg':display,'positionAngleNorth0East90Deg':round(pa,6),'passed':ok})
 check('five-stated-hop-angle-and-direction-checks',all(r['passed'] for r in angles),angles)
 check('quarantine-counts-match-manifest',set(manifest['distanceQuarantineIds'])==quarantine and manifest['remainingCount']==len(remaining))
 low={i['id'] for i in data if i['meta']['confidence']=='low'}
 check('confidence-summary-5-low-15-medium',collections.Counter(i['meta']['confidence'] for i in data)=={'low':5,'medium':15})
 lengths={k:{'min':min(len(i[k]['ko']) for i in data),'max':max(len(i[k]['ko']) for i in data)} for k in ['oneLiner','summary','story']}
 unresolved_refs=sorted({h for i in data for h in i['howToFind']['hopFrom'] if h not in allids})
 save('guide-checks.json',{'status':'limited-coordinate-consistency-check','source':'inputs/catalog-values.v1.csv: original RA/Dec','angleConvention':'position angle: celestial north=0, east=90; not screen direction','checks':angles,'limitations':['5개 명시 각거리만 수치 검사. 전체 중간별 경로의 현장 검증은 아님.','첨부 RA/Dec의 epoch·세차·고유운동은 확인·보정하지 않음.','bestMonths는 한국 중위도 저녁의 편집 제안이며 날짜별 고도·박명·달빛·날씨를 계산한 결과가 아님.','hopFrom의 카탈로그 존재와 설명 콘텐츠 게시 여부는 별개.'],'hopFromCatalogValidButNoDraftContent':unresolved_refs})
 report={'package':'G3-content-priority-1','generatedAt':manifest['generatedAt'],'validationScope':'본 패키지의 형식·원값 보존 정책·ID 참조·5개 각거리 일관성만 검증','mode':'draft','checkCount':len(checks),'passedCount':sum(c['passed'] for c in checks),'failedCount':sum(not c['passed'] for c in checks),'checks':checks,'contentCounts':{'new':20,'previous':20,'cumulative':40,'remaining':81},'lengthsUnicodeCodePoints':lengths,'factsPerObject':{'min':min(len(i['facts']) for i in data),'max':max(len(i['facts']) for i in data)},'rawPreservation':{'rows':20,'columns':len(rows[0]),'cells':20*len(rows[0]),'magnitudesDisplayedWithBandWarning':20,'distancesDisplayedUnchanged':len(retained),'distancesQuarantined':5,'blankDistancesKeptBlank':len(blank),'spectralStringsUnchanged':len(stars),'angularSizesUnitFormattedOnly':len(dsos)},'release':{'status':'blocked-pending-human-review','approvedItems':0,'automatedStructuralPassIsPublicationApproval':False,'blockers':['거리 충돌 5개 항목의 T0b 원천 재검증','전체 mag 측광 대역·판본 확인 및 숫자 학습 정책 승인','M42 앱 종류 매핑 및 M5 Se1→Ser 키 정규화 승인','부분 열람 연구 및 전통 명칭 대응의 편집 검토','T6 실제 검증·콘텐츠 인덱스 게시 미수행','장비 관측 안내·달별 가시성의 현장/천체력 검증 미수행']}}
 save('validation.json',report)
 print(json.dumps({'checks':len(checks),'passed':report['passedCount'],'failed':report['failedCount'],'lengths':lengths,'release':report['release']['status']},ensure_ascii=False,indent=2))
 if report['failedCount']:return 1
 return 2 if release else 0
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--release',action='store_true');args=p.parse_args();sys.exit(main(args.release))
