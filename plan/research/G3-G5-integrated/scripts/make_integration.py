#!/usr/bin/env python3
from pathlib import Path
from collections import Counter
import csv,json,hashlib,re
ROOT=Path(__file__).resolve().parents[1]
def load(p):return json.loads((ROOT/p).read_text())
def save(p,x):
    out=ROOT/p;out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def text(p,s):(ROOT/p).write_text(s,encoding='utf-8')
def sha(p):return hashlib.sha256((ROOT/p).read_bytes()).hexdigest()
C=load('G3/G3-content-cumulative-121.json');CI={c['id']:c for c in C}
P,M,B,Q=[load('G5/G5-learn-'+x+'.json') for x in ['paths','missions','badges','quiz']]
G=load('G5/mission-runtime-gates.json')
usage={i:{'quizIds':[],'missionIds':[]} for i in CI}
for q in Q:usage[q['objectId']]['quizIds'].append(q['id'])
for m in M:
    refs=set(m.get('contentIds',[]))|{s[k] for s in m['steps'] for k in ['objectId','contentId'] if k in s}
    for i in refs:usage[i]['missionIds'].append(m['id'])
save('integration/content-usage.json',[{'id':i,'titleKo':CI[i]['title']['ko'],**x} for i,x in usage.items()])
save('integration/draft-content-index.json',{'kind':'integration-draft-not-content-v1-schema','published':False,
 'source':'G3/G3-content-cumulative-121.json','sha256':sha('G3/G3-content-cumulative-121.json'),
 'entries':[{'id':c['id'],'titleKo':c['title']['ko'],'arrayIndex':j,'confidence':c['meta']['confidence'],'hasReviewNotes':bool(c['meta'].get('needsReview'))} for j,c in enumerate(C)],
 'note':'정식 content/v1/index.json을 만들거나 승인한 것으로 취급하지 않음. T6 실제 스키마로 생성 후 교차 검증.'})
# Field-use ledger preserves review flags without globally pretending all low-confidence values are fixed.
scopes=[]
for i,v in usage.items():
    if not v['quizIds'] and not v['missionIds']:continue
    scopes.append({'id':i,**v,'contentConfidenceInherited':CI[i]['meta']['confidence'],'reviewNotesInherited':CI[i]['meta'].get('needsReview',[]),
      'G5ClaimPolicy':'문항별 evidence의 명시된 설명·종류·소속·관측 범위만 사용. 보류된 수치/분광형/물리적 결합은 정답으로 출제하지 않음.',
      'requiredApproval':'T6 콘텐츠 게시 및 T7 문항별 주장 검토. 검토 중 수치를 숨기는 최종 표시 정책은 앱에서 적용.'})
save('integration/content-claim-review.json',scopes)
# Uniform per-mission provenance: source-derived text versus designed activity.
save('G5/evidence/mission-evidence.json',[{'missionId':m['id'],'activityBasis':'Task7의 단계 타입을 조합한 교육 설계 제안. 실제 앱 기능 존재는 별도 확인 필요.',
 'contentIds':m['contentIds'],'sourceFields':[{'contentId':i,'fields':['howToFind.ko','observing','summary.ko'],'sources':CI[i]['sources']} for i in m['contentIds']],
 'planningGateFile':'G5/qa/visibility-screening.json','runtimeGateFile':'G5/mission-runtime-gates.json'} for m in M])
# All 18 rule semantics are explicit, including free observation badges.
rule_text={
 'firstObservation':'직접 관측·대상 식별을 확인한 저장 로그 1개. 지도 선택·콘텐츠 열람·미확인 시도는 제외.',
 'firstSketch':'관련 천체와 연결된 내용 있는 스케치의 저장 성공. 편집기 진입이나 빈 파일 제외.',
 'firstStarHop':'스타 호핑 경로 확인 이벤트와 목표의 실제 관측 저장이 같은 시도에 연결됨. 검색 이동만으로 수여 금지.',
 'align2Success':'T5 두 별 정렬이 실제 성공하고 별 식별·잔차·정렬 유효성이 검증된 이벤트. G4 코드 검토 전 활성화 보류.',
 'missionsCompleted':'모든 필수 단계가 실제 완료된 서로 다른 missionId 수. 재실행·중복 이벤트는 중복 집계하지 않음.',
 'quizStreak':'서로 다른 quizId의 최초 응답 연속 정답 수. 오답이면 끊기며 재시도 정답으로 과거 오답을 소거하지 않음.',
 'constellationCount':'서로 다른 const: ID에 연결한 실제 별자리 주요 배열의 자유 관측 기록 수. 길잡이별 하나의 소속, 검색·지도 탭으로 대리 집계 금지.',
 'seasonSignature':'summerTriangle의 베가·알타이르·데네브 각각의 실제 관측 저장. find 세 번 또는 read로 수여하지 않음.',
 'messierCount':'실제로 식별한 서로 다른 정규 메시에 천체 ID 수. 별칭·NGC 대응·반복 로그를 중복 집계하지 않음.'}
readiness=[]
for b in B:
    key=b['rule']['key'];readiness.append({'badgeId':b['id'],'rule':b['rule'],'definition':rule_text[key],
      'authoringStatus':'complete','enabledByDefault':False,
      'unlockRequirements':['T6 관련 콘텐츠 게시','T7 이벤트·중복·삭제 후 재집계 검증']+(['G4/T5 정렬 검증'] if key=='align2Success' else [])+(['별자리 자유 관측 UI와 주요 배열 판정 검증; 30개 미션의 길잡이별로 대신 채우지 않음'] if key=='constellationCount' else []),
      'note':'배지는 제안 데이터다. 문구가 이미 달성한 사실을 증명하거나 즉시 수여를 지시하지 않음.'})
save('G5/badge-runtime-contract.json',readiness)
# Distinguish present data-completion from app release blockers.
blockers=[
 {'id':'published-content-index','scope':'all','reason':'T6의 정식 게시 인덱스와 로딩 결과가 미제공. 이 ZIP의 인덱스는 초안 참조용.'},
 {'id':'editorial-claim-signoff','scope':'per-content/per-quiz','reason':'G3의 거리·등급·분광형 등 검토 상태를 보존. T6의 표시 정책과 T7의 문항별 근거 검토 필요.'},
 {'id':'app-handler-integration','scope':'per-mission/per-badge','reason':'실제 find/observe/read/quiz/skill/checklist 핸들러 및 스케치·시야원·백업·스타 호핑 성공 이벤트를 테스트하지 못함.'},
 {'id':'orientation-alignment','scope':'alignment-skills-and-badges','reason':'G4 대상 코드가 미제공. 센서/정렬 참조 문구는 코드 통과 판정이 아님.'},
 {'id':'runtime-visibility','scope':'all-observing-missions','reason':'정확한 현행 천체력·좌표 epoch·보조 별 경로·실제 장애물 및 관측 가능 여부 확인 필요. 26개 근사 구간은 현장 보장이 아님.'},
 {'id':'skypick-full-scene','scope':'36-skypick-items','reason':'전체 밝은별 수치 목록·측광 대역 및 렌더러의 3° 판정과 달/행성 근접 검증 미완료. 기본 비활성화.'},
 {'id':'free-constellation-observation','scope':'3-constellation-count-badges','reason':'별자리 자유 관측을 실제 배열 식별로 판정하는 UI와 이벤트가 검증되기 전에는 배지 보류.'}
]
save('integration/release-gates.json',{'dataAuthoringComplete':True,'releaseReady':False,'blockers':blockers,
 'policy':'외부 검증으로 해소한 범위만 선택적으로 활성화. 수량 충족이나 Python 참조 시험을 실제 앱 승인으로 대체하지 않음.'})
save('G5/evidence/external-verification.json',{'date':'2026-09-07','basisPolicy':'학습 문항은 첨부 G3에서 작성. 다음 외부 검토는 좌표·격리 검증 보조이며 G3 수치를 바꾸지 않음.',
 'sources':[
 {'title':'USNO Computing Altitude and Azimuth','url':'https://aa.usno.navy.mil/faq/alt_az','access':'본문 확인','use':'고도식과 동경 부호'},
 {'title':'USNO Computing Approximate Solar Coordinates','url':'https://aa.usno.navy.mil/faq/sun_approx','access':'본문 확인','use':'태양 고도 근사 선별'},
 {'title':'USNO Approximate Sidereal Time','url':'https://aa.usno.navy.mil/faq/GAST','access':'이번 직접 열람 timeout; 기존 G5 제공 스크립트의 근사식 계승','use':'항성시 기획 근사; 새 정밀 검증 주장 금지'},
 {'title':'NASA HEASARC Hipparcos Main Catalog','url':'https://heasarc.gsfc.nasa.gov/W3Browse/catalog/hipparcos.html','access':'본문 확인','use':'Johnson V와 ICRS epoch J1991.25 정의 확인; 원본 수치 파일 확보 아님'},
 {'title':'ESA 1997 / CDS I/239 ReadMe','url':'https://cdsarc.cds.unistra.fr/viz-bin/ReadMe/I/239?format=html&tex=true','access':'본문 확인','use':'Hipparcos 118218행과 Vmag/RAdeg/DEdeg 필드 정의 확인; 전천 수치 수집 아님'},
 {'title':'NASA Spot the Young Stars of the Hyades and Pleiades','url':'https://science.nasa.gov/solar-system/skywatching/night-sky-network/spot-the-young-stars-of-the-hyades-and-pleiades/','access':'본문 확인','use':'성단 찾기 보조 확인. 거리 숫자 신규 출제·대입 없음'}],
 'failedAcquisition':'VizieR TSV와 CDS 원본 다운로드는 수행 완료되지 않음. Python 직접 네트워크 DNS와 다운로드 도구/URL 제약을 만남.',
 'result':'전천 격리 검증 미완료를 유지하며 수치 데이터가 첨부된 것으로 주장하지 않음.'})
# Draft completion report and import manifest.
save('manifest.json',{'version':1,'createdAt':'2026-09-07','purpose':'G3 및 G5 작성 데이터 통합 / Claude T6·T7 전달',
 'dataAuthoringComplete':True,'appReleaseReady':False,
 'canonicalImportFiles':{'G3':'G3/G3-content-cumulative-121.json',**{f'G5-{x}':'G5/G5-learn-'+x+'.json' for x in ['paths','missions','badges','quiz']}},
 'counts':{'G3':len(C),'paths':len(P),'missions':len(M),'badges':len(B),'quiz':len(Q),'skyPick':sum(q['type']=='skyPick' for q in Q),'distinctSkyPickTargets':len({q['answer'] for q in Q if q['type']=='skyPick'})},
 'g3ContentSha256':sha('G3/G3-content-cumulative-121.json'),'g3SourceUnmodified':True,
 'G5Source':'첨부 G3 누적121개 + 제공된 G5 초안100문항 + G2 별자리 표 + 원본 요청서',
 'notIncluded':['실제 앱 코드','G4 코드 리뷰 결과','정식 게시 content/v1/index.json','완료된 전천 하늘 선택 검증'],
 'archivePolicy':'archive의 기존 G5 준비팩은 비교/재생성용이며 앱 import 금지. G3 하위의 과거 배치와 누적 파일을 중복 병합하지 않음.'})
text('requirements.txt','jsonschema>=4.18,<5\n')
# Concise Korean documentation.
text('README.md','''# G3 + G5 통합 전달팩

작성 기준: 2026-09-07. **대상별 콘텐츠와 G5 학습 데이터 작성은 완료**했습니다. 실제 앱 게시·T6/T7 코드 병합·G4 검증을 끝냈다는 뜻은 아닙니다.

## 가져올 파일은 5개입니다

|구분|정본 파일|수량|
|---|---|---:|
|G3 콘텐츠|`G3/G3-content-cumulative-121.json`|121개|
|G5 경로|`G5/G5-learn-paths.json`|6개|
|G5 미션|`G5/G5-learn-missions.json`|30개|
|G5 배지|`G5/G5-learn-badges.json`|18개|
|G5 퀴즈|`G5/G5-learn-quiz.json`|180문항|

**G3 JSON은 첨부 누적 121개와 바이트 단위로 동일합니다.** 기존 수치 충돌·검토 메모·명칭 정책을 조용히 수정하지 않았습니다. 전체 G3 출처·검토 목록·원본 CSV·기존 검증기도 `G3/`에 보존했습니다. G3 안에 있는 과거 누적80개와 배치 파일을 정본에 다시 더하면 중복이 생깁니다.

`archive/G5-prep-package.zip`은 옛 100문항 초안을 보존한 재현 입력입니다. 앱이 이 압축파일이나 폴더 전체의 JSON을 자동 탐색해 가져오면 안 됩니다. 현재 정본은 `manifest.json`에 명시한 5개뿐입니다. `G3/`의 과거 G5 준비 안내는 역사적 기록이며, 현재 학습 데이터와 실행 조건은 루트 안내 및 `G5/`를 우선합니다.

## G5 확장 내용

6개 경로는 맨눈·쌍안경·망원경 각 2개이며 경로마다 5미션입니다. 30개 미션은 장비별 각 10개, 계절별 봄 7·여름 7·가을 6·겨울 6·연중 4개입니다. 각 미션은 3~6단계이며 앱 밖의 책 읽기나 외부 사이트 방문을 요구하지 않습니다.

180문항은 객관식 108·참거짓 36·하늘 선택 36문항입니다. 난이도는 1단계 72·2단계 72·3단계 36문항으로 40:40:20을 맞췄습니다. **하늘 선택은 15개 별의 서로 다른 학습 목표를 다룬 36문항이며, 서로 다른 별 36개가 아닙니다.** 같은 대상의 변형은 한 출제 세션에 하나만 내도록 제한했습니다.

필수 튜토리얼 4개는 센서 모드+1별 정렬, 실제 장비 시야원 설정, 달 첫 스케치, 알데바란→플레이아데스 성단 스타 호핑입니다. 반복도가 높은 기존 미션 4개를 M44·이중성단·M45·M31로 교체하고 신규 6개를 추가했습니다. 이전 미션 진행도를 새 목표에 자동 승계하지 않습니다.

## 검증 범위와 남은 앱 작업

`integration/validation.json`과 `G5/validation.json`은 실제 실행한 구조·참조·수량·보존 검사 결과입니다. `G5/qa/skypick-reference-tests.json`은 자체 작성한 Python 참조 판정기의 합성 시험이며 앱 코드 테스트가 아닙니다.

고정 천체 미션 26개는 첨부 좌표로 2026년 매일 21~24시의 근사 고도·박명을 선별했습니다. 미션 시간 전체에 26° 이상(요구 25°에 여유 1°), 태양 중심 -12° 이하인 구간을 찾았습니다. 좌표 epoch 미기재·보조 별 전체 경로·굴절·구름·달빛·장비 검출 한계는 별도입니다. 달·목성 미션 4개는 실제 천체력 확인이 필요합니다. `any`는 매일 가능하다는 뜻이 아닙니다.

**하늘 선택 36문항은 전천 밝은별·실제 표시 목록·동적 달/행성 근접·측광 대역·앱 3° 판정 검증 전에는 기본 비활성화입니다.** 첨부31별 내부 이격 검사나 Python 참조 시험을 전천 검증으로 바꾸지 않습니다. 직접 수치 목록을 확보하지 못한 사실은 `G5/evidence/external-verification.json`에 기록했습니다.

G3의 보류 거리·대역 미확인 등급·분광형 충돌을 정답 숫자로 출제하지 않았습니다. 안전한 종류·소속·본문 설명을 사용하되 실제 게시 전 T6/T7의 문항별 근거 검토는 필요합니다. G3 출처를 전수 다시 열어 팩트체크한 결과로 취급하지 마세요.

별자리 개수 배지 3개는 실제 별자리 자유 관측 기록을 요구합니다. 길잡이별 하나의 소속이나 지도 선택으로 대신 세지 않습니다. 두 별 정렬 배지는 G4/T5 검증 전 보류합니다. 나머지 기능도 실제 성공·저장 이벤트에 연결해야 합니다.

## 실행

루트에서 실행합니다. Python 3.10 이상을 가정합니다.

```bash
python -m pip install -r requirements.txt
python scripts/validate_all.py
python scripts/validate_all.py --release
```

기본 실행은 데이터 검증을 수행합니다. `--release`는 현재 앱 연동·게시 승인 공백을 표시하며 **종료 코드 2로 차단되는 것이 정상**입니다. 스크립트 실패를 숨기거나 상태 플래그만 바꿔 배포하지 마세요.

재작성에는 `python G5/scripts/build.py`, 근사 재계산에는 `python G5/scripts/screen_visibility.py`를 사용합니다. 파일을 바꾸면 manifest/checksums 및 검증 보고서도 다시 생성해야 합니다. `python scripts/make_integration.py`로 통합 메타데이터를 갱신하고, `python scripts/package.py`로 재검증·체크섬 생성·ZIP 무결성 확인을 수행할 수 있습니다. 원본 G3 수정은 이 작성기의 역할이 아닙니다.

## Claude 전달 순서

`Claude-T6-T7-handoff.md`를 먼저 읽고 T6의 G3 검토·실제 인덱스 생성 뒤 T7에서 학습 데이터를 검증·연결하세요. `integration/draft-content-index.json`은 참조용이지 앱의 정식 인덱스가 아닙니다. 모든 보조 계약은 Task7 JSON 스키마 밖에 분리했으므로, 지원 키를 임의로 데이터에 추가하지 않습니다.
''')
text('G5/README.md','''# G5 학습 데이터 — 작성 완료본

정본은 `G5-learn-{paths,missions,badges,quiz}.json` 4개입니다. 각각 JSON 배열이며 Task7의 필드·열거값을 유지했습니다. 복사용 코드 블록 4개는 `G5-learn-codeblocks.md`에 있습니다.

6경로·30미션·18배지·180문항입니다. 기존 100문항의 정답 의미를 보존하고, 한국어 조사 두 곳과 보기 순서를 조정한 뒤 80문항을 추가했습니다. 기존 인덱스형 응답은 반드시 당시 문항 버전의 보기로 판정해야 합니다.

미션은 봄 7·여름 7·가을 6·겨울 6·연중 4개이며, 장비 단계별로 10개씩입니다. 모든 경로에는 5미션이 있습니다. 미션 교체와 완료 승계 금지는 `id-migration.json`, 필수 튜토리얼은 `tutorials.json`, 문항 근거는 `evidence/quiz-evidence.json`에 정리했습니다.

180문항은 객관식 108·참거짓 36·하늘 선택 36개입니다. 난이도는 72·72·36문항으로 40:40:20을 맞췄습니다. 하늘 선택은 15개 별의 이름·소속·역할·콘텐츠 이해를 다르게 묻되, 같은 별의 변형을 한 세션에 반복하지 않습니다.

하늘 선택의 기본 비활성화와 활성화 조건은 `qa/skypick-screening.json` 및 `implementation-contract.md`를 따릅니다. 자체 참조 판정기의 합성 시험 결과는 `qa/skypick-reference-tests.json`에 있으며, 실제 앱의 전천·렌더러 시험과 구별합니다.

G3의 분광형 충돌 대상인 카펠라·두베는 문항·직접 관측 대상으로 사용하지 않았습니다. 은하·성단의 보류 거리와 대역 미확인 밝기 수치도 정답에서 제외했습니다. 종류나 관측 안내를 사용했다고 해당 천체의 모든 수치가 승인된 것은 아닙니다.

루트에서 `python scripts/validate_all.py`를 실행하면 통합 검사를 재현할 수 있습니다. 이 팩은 학습 데이터와 검증 자료이며, 실제 앱 기능·정렬·게시 여부를 확인하기 전에는 앱 배포 완료로 표시하지 않습니다.
''')
text('G5/implementation-contract.md','''# G5 완료 판정·안전·가시성 계약

이 문서는 T7에 넘기는 구현 제안이다. 실제 저장소가 이미 아래 의미로 동작한다고 주장하지 않는다. 지원하지 않는 기능은 관련 항목을 비활성화한다.

## 단계와 기록

`find`는 현재 하늘 지도에서 목표를 선택·대조한 상태다. `observe`는 사용자가 실제 하늘에서 대상 식별을 확인한 관측 저장이다. `read`, `quiz`, `skyPick`, 시간 여행 지도, AR 가리키기는 실제 관측으로 바꾸지 않는다. 보이지 않은 대상은 시도/미확인 기록으로 남길 수 있지만 성공 카운트에는 넣지 않는다. 낮은 평점과 미확인은 다르므로 강제 minRating을 넣지 않았다.

같은 이벤트 재전송은 중복 집계하지 않는다. 사용자가 기록을 삭제·수정하면 개수와 조건을 다시 계산한다. 이전 기록을 미션에 연결하려면 대상·장비·관측 범위를 확인하고 사용자가 명시적으로 연결한다. 다른 대상의 옛 완료 상태를 새 미션으로 자동 이식하지 않는다.

## 고도와 범위

`season`은 추천 계절이지 실행 허가가 아니다. 실제 위치·현재 시간·정확한 천체력으로 직접 대상과 실제로 사용할 길잡이의 고도 25° 이상, 21~24시, 태양 중심 고도 -12° 이하를 확인한다. 별자리 대표 좌표는 경계나 모든 별의 가시성을 대신하지 않는다. 날짜가 바뀌는 24시는 다음 날 0시임을 UTC/KST 변환에서 지킨다. 고정 대상의 제공 좌표 epoch는 미기재라 실앱 카탈로그에서 확인한다.

쌍안경·망원경 미션에는 현재 실제 장비가 필요하다. `darkSky:true` 대상은 안전한 어두운 관측지 조건을 사용자가 확인할 때만 진행한다. 광해 단계가 같아도 검출을 보장하지 않으며 위험한 장소로의 이동이나 악천후 관측을 보상하지 않는다. 달과 목성은 계절 고정 목록이 아니라 현재 천체력에 따라 활성화한다.

## 튜토리얼

`arMode`는 Task7 스킬명이다. 센서로 움직이는 가상 하늘과 실제 카메라 합성이 같은 기능이라고 가정하지 않는다. 권한 허용만으로 정렬 성공을 내지 않는다. `align1/align2`는 T5가 실제 장착축·천체·잔차·시각을 기록한 정렬 성공에만 연결한다. G4 코드 검토 미완료 상태를 데이터 문구로 통과시킬 수 없다.

`fovSetup`은 실제 장비 시야각을 저장한 성공이다. 10×50 표기만으로 시야각을 고정하거나 90mm 구경만으로 접안 시야를 결정하지 않는다.

`starhop`은 단순 검색 버튼이나 목표 자동 센터링이 아니다. 이 팩의 성단 튜토리얼은 알데바란에서 M45까지 G3 경로를 겹치는 실제 시야로 나누어 대조하는 기능 성공과 M45 실제 관측을 요구한다. 경로상 보조 별·시야 회전·미러 반전은 앱이 실제 카탈로그로 검증한다. 약 14°는 경로 전체의 규모이며 손폭이나 고정 시야 개수의 정확한 측정값이 아니다.

`sketch`는 천체와 연결된 내용 있는 스케치의 저장 성공이다. `backup`은 정상적인 내보내기 완료와 취소를 구별한다. 백업을 만들었다고 복원 시험까지 통과했다고 말하지 않으며, 튜토리얼에서 원본 삭제를 요구하지 않는다.

## 별자리와 이중성단

별자리 배지는 명시적인 `const:` 자유 관측 기록의 주요 배열 식별을 센다. 길잡이별 한 개의 소속으로 대리 집계하지 않는다. 실제 자유 관측 UI가 없다면 별자리 배지 3개를 비활성화한다. 본 30미션은 억지로 별자리 전체 확인을 끼워 넣지 않는다.

NGC869와 NGC884는 각각 식별한 경우만 각 로그를 저장한다. 하나의 얼룩으로만 보였다면 두 개를 모두 봤다고 자동 집계하지 않는다. 알비레오를 봤다는 것과 두 점을 분리했다는 메모도 구분하며 물리적 결합의 증명으로 사용하지 않는다.

## 하늘 선택

3°는 구면 각거리이며 센서 오차 허용치나 고정 픽셀 반경이 아니다. 전천 목록과 현재 표시된 모든 관련 객체를 정상 수집하고 별의 측광 대역·현재 달/행성 근접을 확인한 장면에서만 출제한다. 후보 별은 확인된 V등급이 4 이하일 때만 사용하며, 대역 확인과 수치 검사를 별도로 수행한다. 다른 표시 객체가 중심 3.25° 이내이면 보수적으로 보류한다. 대안 정답 중심은 6° 이상 떨어져야 한다. 0.25°는 설계 여유값이지 기기 정확도 보장이 아니다.

희미한 별을 실제로 표시·선택 가능하게 해놓고 검증에서만 빼지 않는다. 미분리 다중성은 앱의 렌더 단위와 같은 정규 시스템ID로 일관되게 다룬다. 가장 가까운 다른 객체를 탭했다면 정답 원 안이라는 이유로 통과시키지 않는다. 문제 생성과 채점의 frameId·좌표·시각을 일치시킨다. 정답 라벨·기존 선택 강조로 답을 노출하지 않는다.

`skypick_reference.py`는 이 계약의 순수 기하학 참조다. 합성 시험 40개는 실제 렌더러·센서·전천 데이터 테스트가 아니다. 참조 함수에 `verified=true`를 넘겼다는 사실도 검증을 수행했다는 증거가 아니다. 현재 36문항은 전체 장면 검증 전 기본 비활성화다.

명시적인 지도 연습 모드로 푸는 경우에도 정답이 보이고 모호하지 않은 장면을 사용한다. 점수만 기록하고 실제 관측·계절 배지는 발생시키지 않는다. 같은 정답별의 변형을 한 세션에 여러 개 내지 않는다.

## 배지

`rewardBadgeId`는 연결 정보이며 자동 수여 명령이 아니다. `badge-runtime-contract.json`의 규칙을 평가한다. 여름 대삼각형은 세 별 각각의 실제 관측이 필요하다. 메시에 별칭은 정규ID로 통합하고, 임의의 NGC 항목을 메시에 수에 포함하지 않는다. 연속 정답은 서로 다른 문항의 최초 응답만 집계한다. 연속 밤 관측, 모든 행성·모든 달 위상을 강요하는 배지는 넣지 않았다.

## 안전

태양은 이번 학습에서 읽기·퀴즈 전용이다. 태양·수성·금성 직접 조준 미션과 낮의 하늘 선택은 없다. 태양 안전 경고는 G3 원문을 보존한다. 보통 선글라스나 일식 안경을 무필터 광학 장비와 함께 쓰는 과제를 만들지 않는다. 출처: G3 태양 항목 및 https://science.nasa.gov/eclipses/safety/ .
''')
text('Claude-T6-T7-handoff.md','''# Claude T6 → T7 전달 지침

이 ZIP은 G3 121개와 G5 6경로·30미션·18배지·180문항을 묶은 작성 데이터입니다. 실제 구현과 배포가 끝났다는 보고서가 아닙니다. 먼저 루트 `README.md`와 `manifest.json`을 읽으세요.

## T6: 콘텐츠 검토와 게시 인덱스

`G3/G3-content-cumulative-121.json`만 콘텐츠 정본으로 사용합니다. 이전 배치, 과거 합본 80개, `archive`를 추가로 병합하지 않습니다. 원본 CSV와 수치 충돌·명칭 검토 사항은 보존하며, `G3/review-items-all-121.json`을 실제 UI 표시·게시 기준에 따라 심사합니다. G5에서 묻지 않았다는 이유로 G3의 보류 거리 숫자를 승인하지 않습니다.

실제 앱 스키마로 `content/v1/index.json`을 만들고 로딩·ID·표시 필터를 검증합니다. ZIP의 `integration/draft-content-index.json`을 앱의 정식 스키마라고 가정하지 않습니다. G3의 생성 메타데이터는 원문 그대로 계승했으며, 이번에 전부 새로 생성한 것으로 갱신하지 않았습니다.

## T7: 학습 데이터와 기능 연결

정본 G5 JSON 4개와 `schemas`를 실제 Task7 스키마에 교차 검증합니다. `integration/content-usage.json`의 대상이 실제 게시 인덱스에 있는지 확인합니다. 게시 보류 콘텐츠에 의존하는 미션·문항은 비활성화하고, 다른 천체로 몰래 교체하지 않습니다.

미션 단계 처리와 관측·스케치·백업·정렬·스타 호핑 이벤트를 `G5/implementation-contract.md`에 맞춰 연결하거나 차이를 `DECISIONS`에 기록합니다. 기능이 없다면 `skill`을 체크리스트로 바꿔 완료한 것처럼 처리하지 않습니다. G4 코드 검토는 별도로 필요합니다.

하늘 선택 36문항은 첨부된 31개 별 사이의 이격만 확인했습니다. 전천의 검증된 V등급 후보, 현재 표시 목록, 달·행성 근접, 3° 선택 판정을 실제 앱에서 시험하기 전에는 활성화하지 않습니다. `G5/scripts/skypick_reference.py`와 합성 시험은 이식 참고용이지 앱 통과 인증이 아닙니다. 참조 함수의 검증 상태를 `true`로 설정하는 것만으로 실제 검증이 끝나지 않습니다.

## 기존 사용자의 진행도

`G5/id-migration.json`의 미션 교체 4개는 자동 완료 승계를 금지합니다. 기존 100문항의 정답 의미는 보존했지만 보기 순서를 균형화했으므로, 저장된 과거 인덱스형 응답을 새 보기로 재채점하면 안 됩니다. 문항 버전이나 이전 스냅샷을 유지하세요.

별자리 개수 배지 3개는 실제 `const:` 자유 관측 UI를 검증한 후 활성화합니다. 관련 기능이 없으면 보류하며, 길잡이별의 소속으로 대신 집계하지 않습니다. 2별 정렬 배지도 T5·G4 결과가 준비되기 전에는 보류합니다. 배지 규칙과 설명은 함께 검토합니다.

## 재검증과 피드백

루트에서 `python scripts/validate_all.py`를 실행합니다. `--release`는 현재 확인되지 않은 게시·앱 조건 때문에 종료 코드 2로 차단됩니다. 실제 저장소의 단위·통합·실기기 시험은 별도로 실행하고, 각각 성공·실패·미실행을 구분해 보고합니다. 이 팩의 검증기는 브라우저 UI나 실장비를 실행하지 않습니다.

T6·T7 피드백에는 파일 경로, 천체·미션·문항 ID, 위반 필드, 기대값, 관측값, 근거를 적습니다. 사용자 승인 없이 카탈로그 원값을 외부 값으로 덮어쓰지 않습니다.
''')
text('G5/review-items.md','''# 게시 전 검토 목록

## 작성이 끝난 부분

원래 요청한 수량 범위와 필수 튜토리얼 4종을 모두 채웠습니다. 기존 100문항에 80문항을 추가하고 미션·배지·경로 참조를 통합했습니다. 성단 콘텐츠 미작성과 퀴즈 수 부족은 이번 확장으로 해소됐습니다.

## 콘텐츠 사실과 수치

G3 각 항목의 `needsReview`를 그대로 유지했습니다. 보류 거리, 등급 대역, 분광형 충돌을 숫자 정답으로 외우게 하지 않습니다. M42의 별 탄생 설명은 본문에 근거하며, 원본 `Cl+N(openCluster)`를 수정한 것으로 표시하지 않습니다. 알비레오의 시각적 분리와 물리적 결합은 구분합니다. 토성성운의 거리 문항은 충돌 처리 방식을 묻고 특정 숫자를 정답으로 두지 않습니다.

각 문항의 근거 문장과 상위 출처는 `evidence/quiz-evidence.json`에 있습니다. 텍스트 해시·JSON 포인터 검사는 근거가 원본에 존재하는지 확인하는 검사이며, 전문가의 내용 승인을 대신하지 않습니다. G3 출처 전체를 이번에 다시 읽어 검증한 결과도 아닙니다.

## 실제 앱 기능

정식 게시 인덱스와 실제 T7 단계 처리 코드는 제공되지 않았습니다. G4 대상 코드도 없으므로 센서·정렬 정확도를 승인하지 않았습니다. 태양은 읽기·퀴즈에만 사용하며 관측 미션에서 제외했습니다.

스케치, 시야원 설정, 스타 호핑, 백업은 각각 실제 기능의 성공 이벤트가 필요합니다. 화면이나 버튼에 진입했다는 이유로 성공 처리하지 않습니다. 지원하지 않는 기능은 관련 미션을 비활성화합니다.

## 하늘 선택 36문항

15개 별을 서로 다른 학습 목표로 다룬 36문항입니다. 첨부된 31개 별 내부의 기하학과 자체 참조 판정기의 합성 시험은 수행했지만, 전천 격리와 측광 대역은 확인하지 못했습니다. 실제 표시 상태, 달·행성 근접, 정답 라벨 노출, 시야 회전, 접근성, 3° 채점은 T7 검증이 필요합니다. 해당 문항은 이 조건을 충족하기 전까지 기본 비활성화입니다.

참조 판정기는 미확인 V등급, 4등급보다 어두운 후보, 비수치 입력, 불완전한 장면 등을 거부합니다. 그러나 앱이 전달한 검증 플래그가 실제로 참인지까지 이 함수가 입증하지는 않습니다. 최신 합성 시험 수와 결과는 `qa/skypick-reference-tests.json`을 확인하세요.

## 미션 가시성

고정 천체 26미션의 2026년 근사 시간 구간과 달·목성 4미션의 실제 천체력 요구를 구분합니다. 미션이 특정 계절에 속한다고 그 계절의 모든 날, 21~24시 전체에 가능하다는 뜻은 아닙니다. 근사 선별에 포함되지 않은 보조 별, 실제 지평선, 구름·달빛·광해·장비 검출 한계는 다시 확인해야 합니다.

어두운 곳 미션은 광해 실측이나 성공 보장이 아닙니다. 위험한 야외 이동이나 악천후 관측을 의무화하지 않습니다.

## 배지와 기록

별자리 개수 배지는 자유 관측에서 주요 배열을 실제로 식별한 기록이 필요합니다. 30개 미션의 별이 서로 다른 별자리에 속한다는 이유로 별자리 배지를 자동 수여하지 않습니다. 2별 정렬과 스타 호핑 성공도 버튼 진입으로 대체하지 않습니다. 이중성단은 두 성단을 각각 식별한 경우에만 별도 기록합니다.

작성 완료와 배포 가능 상태는 `integration/release-gates.json`에서 따로 관리합니다. 현재는 실제 앱 게시·연동 승인이 남아 있습니다.
''')
print('Integration metadata/docs written; G5 uses',sum(bool(x['quizIds'] or x['missionIds']) for x in usage.values()),'G3 objects')
if __name__=='__main__':pass
