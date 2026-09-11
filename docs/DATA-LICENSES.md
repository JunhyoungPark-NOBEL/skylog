# 데이터 출처와 라이선스 (DATA-LICENSES)

> 이 문서는 앱의 "정보/라이선스" 화면에 그대로 표시된다. 파일 단위로 출처·버전(해시)·라이선스·고지 문구를 기록한다.
> 원본 해시와 레코드 수는 `public/data/manifest.v1.json`에도 기록된다(`pnpm data:fetch`가 `data-src/raw/sources.json`에 씀).

## 프로젝트 라이선스 (D-008)

- 코드: MIT (`/LICENSE`)
- 데이터 팩 `public/data/`: CC BY-SA 4.0 (`/public/data/LICENSE`) — HYG·OpenNGC 파생

## 데이터 팩 원본 (파일 단위, 2026-09-06 확보)

| 원본 파일                    | 출처 URL                                                                                    | 크기 / SHA-256                   | 라이선스                                                                    | 사용처                                                                                                      | 비고                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `hyg_v44.csv.gz`             | https://codeberg.org/astronexus/hyg — `data/hyg/CURRENT/` (Git LFS → `media/branch/main/…`) | 13,636,362 B / `00b34989…82197d` | CC BY-SA 4.0 (David Nash, astronexus.com)                                   | `stars-bright.v1.bin`(mag ≤ 6.5, 8,920개), `stars-deep.v1.bin`(mag ≤ 9.0, 83,476개), `stars-bright.v1.json` | 태양(id 0) 제외. 총 119,613행, HIP 117,951                          |
| `NGC.csv`                    | https://github.com/mattiaverga/OpenNGC — `database_files/NGC.csv`                           | 3,876,622 B / `be150bda…c6fae`   | CC BY-SA 4.0 (Mattia Verga)                                                 | `dso.v1.json`                                                                                               | 세미콜론 구분, 14,034행 → 661 포함                                  |
| `addendum.csv`               | https://github.com/mattiaverga/OpenNGC — `database_files/addendum.csv`                      | 17,484 B / `1d8f0914…b11983`     | CC BY-SA 4.0                                                                | `dso.v1.json`                                                                                               | M40·M45(Mel22)·C9·C14·C41·C99·B33 등 비-NGC 천체                    |
| `constellations.json`        | https://github.com/ofrohn/d3-celestial — `data/constellations.json`                         | 50,581 B / `ab4ae692…4d8b2`      | BSD-3-Clause (Olaf Frohn). 이름: IAU 공식 목록, 다국어 이름: Wikipedia      | `constellations.v1.json` (en, 라벨 위치, 한글 이름 교차 확인)                                               | 한글 이름은 큐레이션 표가 우선(백조자리·헤르쿨레스자리는 표기 차이) |
| `constellations.lines.json`  | https://github.com/ofrohn/d3-celestial — `data/constellations.lines.json`                   | 27,136 B / `294f66be…73e13c`     | BSD-3-Clause. 선: IAU Constellation page 기반 + 저자 수정                   | `constellations.v1.json` `lines`                                                                            | Stellarium 데이터 아님                                              |
| `constellations.bounds.json` | https://github.com/ofrohn/d3-celestial — `data/constellations.bounds.json`                  | 40,714 B / `f2e2687a…1cc196`     | BSD-3-Clause. 경계: Davenhall & Leggett (1989) VizieR VI/49 (IAU 1930 경계) | `constellations.v1.json` `bounds`                                                                           | 뱀자리는 두 조각(`boundsExtra`)                                     |
| (미사용) 은하수 이미지       | https://svs.gsfc.nasa.gov/4851 (NASA SVS Deep Star Maps 2020)                               | —                                | 퍼블릭 도메인                                                               | 은하수 레이어(T1에서 결정)                                                                                  | 별 제거된 milkyway_* 변형만 사용 가능. 대안: d3-celestial `mw.json` |

전체 해시는 `data-src/raw/sources.json`과 `public/data/manifest.v1.json`의 `sources` 배열에 있다.

## 큐레이션 데이터 (이 프로젝트에서 작성, CC BY-SA 4.0, `data-src/curated/`)

| 파일                     | 내용                                                                              | 출처/근거                                                                                            | 검토 상태                             |
| ------------------------ | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `star-names-ko.csv`      | 별 240개 한글 이름·전통 이름·별칭(직녀성·견우성·북극성·천랑성·노인성·28수 역할명) | IAU WGSN 공식 이름(IAU-CSN 2022 + 2026 공지) + 통용 표기 + Stellarium ko 번역(별칭) — G2 병합(D-016) | low·빈칸만 `needs_review`             |
| `constellations-ko.csv`  | 별자리 88개 한글 이름·소유격·계절                                                 | 한국천문학회 천문학용어표(kas.org dictionary 15) — G2 병합                                           | 검토 완료(high)                       |
| `dso-names-ko.csv`       | DSO 108개 한글 이름·별칭(좀생이별·묘성·프레세페…)                                 | 위키백과 ko 메시에/콜드웰 목록, 한국천문연구원 사진 갤러리 — G2 병합                                 | low만 `needs_review`                  |
| `caldwell.csv`           | 콜드웰 109개 ↔ NGC/IC                                                             | Caldwell catalogue (Moore 1995), 위키백과 en/ko — T0·G2 두 출처 109개 전부 일치                      | 번호 검증 완료, 한글 이름 77개 미확인 |
| `meteors.csv`            | 주요 유성우 13개(활동 기간·극대·ZHR·복사점·모천체)                                | IMO Meteor Shower Calendar                                                                           | 매년 극대일 갱신                      |
| `content-targets.v1.csv` | T6 콘텐츠 대상 121개(우선순위 1~3)                                                | task-06 §3.2                                                                                         | —                                     |

## 실시간 외부 API (앱 내 고지 필요)

- **Open-Meteo** — 날씨·구름 예보. 라이선스 CC BY 4.0. 고지: "Weather data by Open-Meteo.com (CC BY 4.0)". https://open-meteo.com
- **7Timer!** — 천문 시상·투명도 예보. 고지: "Astronomical seeing forecast by 7Timer! (http://www.7timer.info)".

## 계산 라이브러리·검증 데이터

- **astronomy-engine** 2.1.19 (MIT, Don Cross) — 행성·달·태양 위치, 출몰, 회전행렬. https://github.com/cosinekitty/astronomy
- **JPL Horizons** — `tests/fixtures/reference-altaz.json`의 기준 위치(대전 2026-09-06 21:00 KST, 토성·목성·달·화성). 공개 서비스, 출처 표기. https://ssd.jpl.nasa.gov/horizons/

## 사용하지 않는 것 (라이선스 사유)

- Stellarium 소스코드(GPL)·Stellarium Web Engine(AGPL)·Stellarium 별자리 선/그림 데이터: 알고리즘 참고만, 코드·데이터 복사 금지.
- 라이선스가 불명확한 별자리 그림(art), 광해 지도 타일.

## 천체 관측 사진 (2026-09-09)

`public/object-photos/v1/`의 사진은 개별 원문과 배포 정책을 확인한 실제 관측 자료다. IPAC 2MASS의 명시적인 퍼블릭 도메인 갤러리를 기본으로, 별도 이용 조건을 확인한 사진을 함께 제공한다. 각 사진의 조건은 아래 카탈로그의 `license`·`rightsURL`·`rightsEvidence`에 기록한다. 사진에 카탈로그 데이터 팩의 CC BY-SA나 코드의 MIT 라이선스를 일괄 적용하지 않는다. 로고·삽화·권리가 불명확한 자료는 포함하지 않는다.

선택 카드와 검색 결과에는 작은 사진을 표시하며, 해당 천체의 ‘자세히’를 열면 큰 사진 가까이에 전체 크레딧·출처·이용 조건·변환 내역을 볼 수 있다. 앱의 ‘정보/라이선스’에도 활성 링크가 있는 전체 목록을 제공한다. 이 구성에 맞도록 기존 ESA/Hubble·ESO 자료는 교체했으며, 세부 조건을 숨겨도 된다고 일괄 해석하지 않는다. WebP 변환·종횡비 유지 축소와 야간 보호의 적색 표시를 알리고, 적외선 등 합성 파장·대상 일부/넓은 영역 여부를 설명한다. 현재 실시간 모습이나 실제 접안 시야를 재현한 사진으로 안내하지 않는다.

원본에 큰 제목·기관 로고·비교 도해가 포함된 경우 검토한 관측 영상의 직사각형 영역 전체만 추출한다. 원본 해상도·추출 좌표·이유를 개별 메타데이터와 XMP에 보존하며, 관측 영역 안에 천체를 만들거나 색을 재배정하지 않는다.

개별 사진·원본 URL·전체 크레딧·권리 확인일·가공 내역·파일 해시는 [천체 사진 이용 기록](OBJECT-PHOTOS.md) 및 `public/object-photos/v1/manifest.json`에 기록한다. 사진은 앱에 포함되어 외부 이미지 서버에 조회를 보내지 않으며, 웹앱은 서비스 워커 설치가 끝난 뒤 오프라인에서도 표시된다. 사진 이용은 기관의 앱 승인·후원을 의미하지 않는다.

## 장식 풍경 (2026-09-08)

- 현재 사용: public/landscapes/meadow-v2.webp. 내장 image_gen 새 생성, 실제1774×887, WebP805,980bytes. 별도 사진/코드/경쟁사 풍경 미사용. 투명 sky cutout 대신 식물로 가득한 RGB 표면을 지면 셰이더에서 혼합한다. [실제 프롬프트·제약·검증](LANDSCAPE-REFINEMENT.md). 아래 v1은 Git 이력의 이전 자료다.

- public/landscapes/meadow-v1.webp: 내장 image_gen으로 이 프로젝트용 새 잔디·꽃 이미지를 생성했다. 외부 사진·Stellarium 풍경을 가져오지 않았다. 실제 지형이 아닌 장식용 가상 풍경이며 생성 PNG를 alpha 보존 WebP로 압축했다. 프롬프트·해상도·생성 방식은 [개선 기록](TONIGHT-REFRESH.md)에 남긴다.

## 수식 조판과 글꼴 · KaTeX 0.18.7

역사 천체물리의 수식은 KaTeX와 동봉된 글꼴로 기기 안에서 조판합니다. 외부 CDN으로 문제나 입력을 전송하지 않습니다. https://katex.org / https://github.com/KaTeX/KaTeX

The MIT License (MIT)

Copyright (c) 2013-2020 Khan Academy and other contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
