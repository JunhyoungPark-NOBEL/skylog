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


## 장식 풍경 (2026-09-08)

- 현재 사용: public/landscapes/meadow-v2.webp. 내장 image_gen 새 생성, 실제1774×887, WebP805,980bytes. 별도 사진/코드/경쟁사 풍경 미사용. 투명 sky cutout 대신 식물로 가득한 RGB 표면을 지면 셰이더에서 혼합한다. [실제 프롬프트·제약·검증](LANDSCAPE-REFINEMENT.md). 아래 v1은 Git 이력의 이전 자료다.

- public/landscapes/meadow-v1.webp: 내장 image_gen으로 이 프로젝트용 새 잔디·꽃 이미지를 생성했다. 외부 사진·Stellarium 풍경을 가져오지 않았다. 실제 지형이 아닌 장식용 가상 풍경이며 생성 PNG를 alpha 보존 WebP로 압축했다. 프롬프트·해상도·생성 방식은 [개선 기록](TONIGHT-REFRESH.md)에 남긴다.
