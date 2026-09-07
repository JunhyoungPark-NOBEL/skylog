from pathlib import Path
import json, hashlib
R=Path(__file__).resolve().parent
j=lambda n:json.loads((R/n).read_text())
w=lambda n,t:(R/n).write_text(t,encoding='utf-8')
m=j('manifest.json');v=j('validation.json') if (R/'validation.json').exists() else None
n=j('G3-content-expansion-40-2.json')+j('G3-content-final-1.json');reg=j('source-registry.json')
passed=f"{v['checksPassed']}/{v['checksTotal']}개 통과" if v else '검사 실행 전'
ranges={k:(min(len(x[k]['ko']) for x in n),max(len(x[k]['ko']) for x in n)) for k in ['oneLiner','summary','story']}
README=f'''# G3 마지막 확충 — 잔여 40개 + 마지막 1개

**2026-09-07 | 전체 121개 대상의 콘텐츠 초안 작성 완료, 미작성 0개.**

이 패키지는 G3의 실제 첨부 대상 121개 중 기존 80개를 보존하고 남은 별자리 7개·DSO 34개를 추가했다. 앞선 요청의 40개 단위를 유지해 **40개와 마지막 NGC7009 1개를 분리**했다. 본문 작성 완료는 게시 승인·카탈로그 검증 완료·앱 반영 완료와 다르다.

## 바로 사용할 파일

| 파일 | 항목 수 | 용도 |
|---|---:|---|
| `G3-content-expansion-40-2.json` | 40 | 큰개자리부터 NGC457까지, 원래 잔여 순서 |
| `G3-content-final-1.json` | 1 | 마지막 토성성운 NGC7009 |
| `G3-content-cumulative-121.json` | 121 | 기존80 + 신규40 + 마지막1. 기존 항목 수정 없음 |
| 위 두 신규 배치의 `.md` | 40 / 1 | JSON 배열을 담은 단일 코드 블록, 파일 내용과 일치 |
| `review-items.md` | 신규41 | 게시 전 검토; 원본과 외부 연구 구분 |
| `review-items-all-121.json` | 121 | 이전 보류 사항까지 보존한 통합 검토 목록 |
| `draft-content-index.json` | 121 | 초안 참고 인덱스. 실제 `content/v1/index.json`이 아님 |
| `remaining-targets.csv` / `.json` | 0 | 헤더만 있는 CSV / 빈 배열 |

전체 구성은 태양계 9개·항성31개·별자리30개·DSO51개이다. 원래 프롬프트의 약120개 또는 DSO50개라는 예상보다 실제 첨부 목록이 1개 많다. 대상 ID 집합과 대조하여 **실제121개**를 기준으로 했다.

## 검증과 원본 보존

현재 초안 검사: **{passed}**. 새 요약 {ranges['summary'][0]}–{ranges['summary'][1]}자, 이야기 {ranges['story'][0]}–{ranges['story'][1]}자, 한 줄 소개 {ranges['oneLiner'][0]}–{ranges['oneLiner'][1]}자. 모든 새 항목에 사실표6개, 세 장비별 관측 안내와 출처·검토 메모가 있다. Python 문자 수 기준이다.

새41행×12열의 **492개 원본 셀**, 빈칸을 포함한 문자열을 `raw-selected-values.json`에 보존했다. 원본 입력 파일의 SHA-256은 `input-checksums.json`에 있다. 기존80개는 합본 앞부분과 입력 JSON을 깊은 비교하여 동일함을 검사한다. 찾기 각거리16개는 독립적인 벡터식으로 재검산한다.

```bash
python -m pip install -r requirements.txt
python validate.py
# 게시 차단이 정상인지 확인 — 정상적으로 종료 코드 2
python validate.py --release --report release-validation.json
# 본문을 수정한 후 파일 재생성
python build_content.py
python make_docs.py
python validate.py
```

검사 통과는 JSON 구조·길이·원본 보존·참조·선별 좌표 계산에 한정된다. 모든 천문학적 사실의 독립 검증, 실기기 관측 또는 앱 화면 검증이 아니다. `--release`는 승인 자료가 없으므로 의도적으로 차단된다. 검토 플래그를 지워 자동 배포하지 않는다.

## 먼저 볼 보류 사항

M92·M2·M10·NGC7009의 거리, M20·M17·M22·M10·M12의 등급은 숫자 표시를 보류했다. 원본의 잘못을 확정한 것이 아니라 외부 소개값과의 차이 또는 측광 대역 미확인 때문이다. `catalog-correction-proposals.json`은 정정 적용 파일이 아니라 검토 제안서이며 자동 치환하지 않는다.

M8·NGC7000의 빈 거리도 서로 다른 값·대상 범위를 하나로 합치지 않았다. 다른 빈 거리7개는 해당 외부 소개값임을 사실표에 명시하되 원본 CSV를 채우지 않았다. 모든 DSO `mag`는 V 대역 확인 전이다. 영어 이름이 빈17개 행은 새 고유명을 짓지 않고 `title.en`에 목록 ID를 사용했다.

M16은 성단NGC6611과 성운IC4703, 입력 `Se2`→표시 `Ser` 대응을 검토 대상으로 분리했다. M46은 앞쪽 NGC2438을 성단 구성원으로 설명하지 않는다. 남십자자리는 여행용이며 M6·M7은 북위36.35°에서 고도25°에 도달하지 못하는 대상으로 G5에서 제외한다. 최고 고도 계산은 실시간 가시성 판정이 아니다.

## 근거와 파일 해석

새41개를 대상으로 NASA·ESO·NSF NOIRLab·IAU 교육/별자리 자료를 확인했다. **{len(reg)}개 출처**의 URL·읽은 범위·확인한 주장은 `source-registry.json` / `sources.md`, 항목별 연결은 `source-ledger.json`에 있다. NOIRLab 일부는 직접 페이지가 제한되어 공식 검색 색인 발췌만 사용했다. 출처 접근 범위를 전문 열람으로 과장하지 않았다.

`observing-policy.md`는 출처에 근거한 과학 설명, 첨부 원값, 직접 좌표 계산, 편집한 관측 제안의 경계를 설명한다. 과거80개의 본문과 보류 사항은 수정하지 않았으며 이번에 모든 과거 출처를 다시 조사하지 않았다. `inherited/`는 이전 보고서 사본이다. 그 안의 상대경로는 원래 배치 패키지를 기준으로 하므로 기존 산출물도 함께 보관한다. 그 패키지의 이미지나 외부 문서가 본 ZIP에 내장됐다는 뜻은 아니다.

`meta.generatedBy='gpt-5-pro'`는 사용자 제공 스키마가 요구한 호환 태그를 유지한 것이다. 이번 실행 모델의 식별을 새로 주장하는 값으로 해석하지 않는다.

실제 장비 관측, 저장소 병합·커밋, 앱 게시, G5 미션·퀴즈 파일 수정은 수행하지 않았다. T6 전달 지침은 `Claude-T6-handoff.md`를 참조한다.
'''
w('README.md',README)
review='''# 게시 전 검토 — G3 마지막41개

초안 전체가 작성되어도 모든 수치와 앱 게시가 승인된 것은 아니다. 아래 항목은 자동 수정하지 않는다. 출처별 외부 소개값은 카탈로그 정정의 확정값이 아니다.

## 우선순위 높은 값·대상 범위 검토

| 대상/필드 | 첨부값 | 외부 자료 또는 검토 사유 | 현재 처리 |
|---|---|---|---|
| M92 거리 | 58036광년 | NASA 약27000광년 | 본문 숫자 보류, 원값 보존 |
| M2 거리 | 53294광년 | NASA 약37000광년 | 본문 숫자 보류, 원값 보존 |
| M10 거리 | 21643광년 | NASA 약15000광년 | 본문 숫자 보류, 원값 보존 |
| NGC7009 거리 | 3764광년 | NASA 약1400, ESO 약5000광년 | 출처끼리도 불일치; 하나를 정답으로 채택하지 않음 |
| M20/M17/M22/M10/M12 등급 | 8.5 / 7 / 6.17 / 4.98 / 6.07 | NASA 소개값6.3 / 6.0 / 5.1 / 6.4 / 7.7; 대역·측정 범위 불일치 가능 | 숫자 표시·비교 퀴즈 보류 |
| M8 거리 | 빈칸 | 같은 NASA 페이지의 성운·성단 관련 거리 범위 차이 | 빈칸 유지, 단일 거리 미채택 |
| NGC7000 거리/등급 | 빈칸/빈칸 | 거리 NASA1800/APOD1500광년 차이; V등급 미검증 | 빈칸 유지, 숫자 미채택 |
| M16 코드·종류 | Se2 / Neb (nebula) | 표시용Ser 대응, 성단NGC6611·성운IC4703의 객체 경계 | 원본 유지; 승인된 정규화 필요 |
| M46의 NGC2438 | reason: 행성상성운 포함 | NASA는 성단 앞쪽의 다른 천체로 설명 | 시선상 겹침으로 재서술; 성단 구성원 아님 |
| 허큘리스자리 제목 | 헤르쿨레스자리 | 첨부G2 표준은 허큘리스자리 | 원본·별칭 보존, 표시 이름만 명시적으로 정규화 |
| 남십자자리 | 남반구 여행 안내용 | 국내 관측 성공 상태로 사용할 수 없음 | 장소 조건 분리; difficulty=5의 의미 주의 |

거리/등급 대조의 각 출처 URL은 아래 해당 항목의 출처 또는 `catalog-correction-proposals.json`에 있다. M46 페이지의 10등급은 행성상성운 관련 설명이므로 성단 전체 등급으로 치환하지 않았다. NASA 소개값이 자동으로 입력값보다 우월하거나 최신이라고 가정하지 않는다.

## 공통 검토

모든 새 DSO의 입력 측광 대역은 미확인이다. 별자리 대표 좌표를 전역 경계로 확장하지 않는다. 추천 월·장비 안내는 실측이 아니며 G5의 계절별21~24시·고도25° 기준은 별도 천체력 검증이 필요하다. M6·M7은 최고 고도만으로도25°조건을 통과하지 못한다. 숫자를 보류한 항목의 핵심 종류·위치 학습과 수치 퀴즈는 게시 정책을 분리해야 한다.

일부 출처는 공식 검색 색인 발췌만 확인했다. 빈 영어 이름은 식별자 표시로 처리했고 새로운 고유명을 추측하지 않았다. 이미지 자료 자체를 패키지에 배포하지 않는다.

## 항목별 상세

'''
for x in n:
    review+=f"### {x['id']} — {x['title']['ko']} ({x['meta']['confidence']})\n\n"
    review+='\n\n'.join(x['meta']['needsReview'])+'\n\n'
    keys=next(z['scienceSources'] for z in j('source-ledger.json') if z['id']==x['id'])
    review+='관련 출처: '+' · '.join(f"[{s['title']}]({s['url']})" for s in keys)+'\n\n'
review+='## 기존80개의 보류 사항\n\n기존80개는 합본에서 수정하지 않았다. 카펠라·두베 분광형, 거리 보류DSO, 변광성·대역 미확인, 전통 명칭 해석 등의 과거 검토 상태는 `review-items-all-121.json` 및 `inherited/` 사본에 남겼다. 이번 검토가 기존 항목의 승인을 대체하지 않는다.\n'
w('review-items.md',review)
sources='# 출처 목록과 실제 확인 범위\n\n확인일 2026-09-07. 발행일을 확인하지 못한 갱신형 페이지는 날짜를 추측하지 않았다. 아래 목록은 새41개의 작성 근거이며 과거80개의 출처 전체를 재확인한 목록이 아니다. 사진·논문 전문 파일을 내장하지 않았다.\n\n'
for k,s in reg.items():
    sources+=f"## {k} — {s['title']}\n\n[{s['title']}]({s['url']})\n\n발행일: {s['publicationDate'] or '별도 확정하지 않음'} | 확인일: {s['accessedAt']} | 접근: `{s['access']}`\n\n확인하여 사용한 범위: {s['support']}\n\n"
sources+='## 검색·확인 방법과 종료 범위\n\n대상 이름·식별자와 공식기관 도메인을 조합해 개별 항목의 종류·구성·명명·역사를 확인했다. 숫자 차이가 큰 항목, M16·M46 객체 범위, 남쪽 관측 대상에 후속 검색을 집중했다. NASA 개별 소개 페이지, ESO 연구 발표, NOIRLab 교육/이미지 설명, IAU 별자리 정의를 이용했다. NOIRLab의 접근 제한은 반복 우회하지 않고 색인에서 실제 확인한 문장만 사용했다. 새 항목별 핵심 설명의 출처가 확보되거나 미확인 범위가 명시되었을 때 검색을 종료했다. 출처 전체의 수치 체계·측광 대역·최신 연구를 통일하는 별도 카탈로그 검증까지 수행하지 않았다.\n'
w('sources.md',sources)
w('Claude-T6-handoff.md','''# Claude T6 전달 지침 — G3 마지막41개

검토할 신규 파일은 `G3-content-expansion-40-2.json`(40개), `G3-content-final-1.json`(1개)이다. 전체 초안은 `G3-content-cumulative-121.json`이다. 전체121개와 두 신규 배치를 중복해서 append하지 않는다. 기존80개는 그대로 보존되어 있다.

## 처리 순서
1. `python validate.py`로 구조·길이·참조·원본 보존 검사를 재실행한다. 실제 저장소의 T6 검증도 별도로 실행한다.
2. `review-items.md`, `review-items-all-121.json`, `catalog-correction-proposals.json`을 확인하고 원본 입력의 자료 출처·측광 대역·천체 식별 범위를 검증한다. 제안값으로 자동 덮어쓰지 않는다.
3. `meta.needsReview`와 숫자 보류 상태를 존중한다. 앱이 메모를 표시하지 않는다면 검토 중인 숫자가 우회 노출되지 않도록 사실표의 표시 정책을 구현한다. 자유문자열에서 숫자를 추출해 바로 학습 정답으로 사용하지 않는다.
4. M16의 객체 타입·Se2→Ser, M46/NGC2438의 별도 대상, 별자리 대표 좌표, 남십자자리의 장소 조건을 앱 모델에 맞게 처리한다. `hopFrom`은 탐색 링크이지 선수 미션 그래프가 아니므로 상호 참조를 학습 순환 오류로 오해하지 않는다.
5. G2 표시 이름·별칭을 확인한다. 허큘리스자리 제목 정규화는 raw 행 수정과 구분한다. 영어 빈칸에 쓰인 M번호는 표시용 ID이지 새 공식 고유명이 아니다.
6. 검토가 승인된 항목만 실제 `content/v1/index.json`에 포함한다. `draft-content-index.json`을 통째로 게시 인덱스로 복사하지 않는다.
7. 승인/기각과 근거를 기록하고 수정된 항목만 별도 버전·검증 보고서로 남긴다. 이 패키지는 저장소를 수정하거나 커밋하지 않았다.

## G5 연결
새 성단·성운·은하 콘텐츠가 초안으로 준비되었지만 퀴즈/미션을 수정하지 않았다. M6·M7은 고도25° 조건에서 제외하고 남십자자리는 여행용으로 분리한다. 보류된 거리·등급 비교 문제를 만들지 않는다. 승인 콘텐츠 인덱스와 실제 앱 기능을 확인한 뒤 G5의 부족한 문제·성단 튜토리얼을 확장한다.

## 검증 범위
`--release` 검사는 의도적으로 종료코드2로 차단된다. 실제 앱 렌더링, 기기 센서·망원경 테스트, 모든 천체의 날짜별 가시성, 원본 수치 전체의 과학적 검증은 이 파일들의 통과 결과에 포함되지 않는다.
''')
w('G5-content-readiness.md','''# G5 후속 작성용 상태

121개는 **콘텐츠 초안이 존재하는 대상 집합**이지 게시 완료 집합이 아니다. G5 준비팩을 이번 작업에서 수정하지 않았다. 기존 100문항에서 목표 최소150문항으로 확장하고 성단 스타 호핑 튜토리얼을 보완할 재료가 늘었지만, 실제 승인 인덱스·앱 기능 확인은 여전히 필요하다.

안전한 초안 활용 방향은 M41·M34·M36/M38 등에서 기준 별·위치·성단 검출을 학습하고, M78의 반사와 M17의 발광, NGC7009의 행성상성운과 토성 행성, M46의 성단과 앞쪽 성운, M16의 성단과 성운을 구분하는 것이다. 실제 미션 대상 사용은 해당 콘텐츠 승인과 관측 시각별 가시성 확인 후 결정한다.

거리·밝기 순서 문제는 원본 대역과 값 충돌이 해결되기 전 사용하지 않는다. 특히 새 거리4개·등급5개의 표시 보류와 기존의 M31 등 거리 보류 사항이 남아 있다. `review-items-all-121.json`을 함께 읽는다.

M6·M7은 북위36.35°의 최고 고도가 각각 약21.40°·18.86°여서 G5의25° 조건에 부적합하다. 남십자자리는 남쪽 여행 전용이며 대전의 저녁 미션이 아니다. 나머지도 고도 상한을 통과했다고 실제 계절 저녁 조건이 검증된 것은 아니다.

3° 정답 반경을 사용하는 skyPick은 이 콘텐츠 목록에 있다는 이유만으로 대상이 적합해지지 않는다. 전체 별 카탈로그의 주변 경쟁 천체·화면 투영·현재 가시성을 별도로 시험한다. 넓은 성운·성단의 중심 선택과 전체 구조 검출을 같은 완료 조건으로 합치지 않는다.
''')
# Derived status inventory is deliberately separate from the user's catalogs.
from csv import DictWriter
with (R/'content-status-121.csv').open('w',encoding='utf-8-sig',newline='') as f:
    ww=DictWriter(f,fieldnames=['id','name_ko','origin','confidence','draft_written','publication_approved','review_note_count']);ww.writeheader()
    for i,x in enumerate(j('G3-content-cumulative-121.json')):
        ww.writerow({'id':x['id'],'name_ko':x['title']['ko'],'origin':'inherited-80' if i<80 else 'expansion-40-2' if i<120 else 'final-1','confidence':x['meta']['confidence'],'draft_written':'true','publication_approved':'false','review_note_count':len(x['meta'].get('needsReview',[]))})
checks={str(p.relative_to(R)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((R/'inputs').iterdir()) if p.is_file()}
w('input-checksums.json',json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
print('Documentation created; recorded validation:',passed)
