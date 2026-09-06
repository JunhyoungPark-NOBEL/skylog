# 데이터 출처와 라이선스 (DATA-LICENSES)

> 이 문서는 앱의 "정보/라이선스" 화면에 그대로 표시된다. 파일 단위로 출처·버전(해시)·라이선스·고지 문구를 기록한다.
> 원본 해시와 레코드 수는 `public/data/manifest.v1.json`에도 기록된다. (표는 T0b에서 채운다.)

## 프로젝트 라이선스 (D-008)

- 코드: MIT (`/LICENSE`)
- 데이터 팩 `public/data/`: CC BY-SA 4.0 (`/public/data/LICENSE`) — HYG·OpenNGC 파생

## 데이터 팩 원본 (파일 단위)

| 원본 파일                          | 출처 URL                                                | 버전 / SHA-256 | 라이선스                                | 사용처                                         | 비고                        |
| ---------------------------------- | ------------------------------------------------------- | -------------- | --------------------------------------- | ---------------------------------------------- | --------------------------- |
| (T0b) `hyg_v4*.csv.gz`             | https://codeberg.org/astronexus/hyg (data/hyg/CURRENT/) |                | CC BY-SA 4.0                            | stars-bright/deep.v1.bin, stars-bright.v1.json | 태양(id 0) 제외             |
| (T0b) `NGC.csv`                    | https://github.com/mattiaverga/OpenNGC                  |                | CC BY-SA 4.0                            | dso.v1.json                                    | 세미콜론 구분               |
| (T0b) `addendum.csv`               | https://github.com/mattiaverga/OpenNGC                  |                | CC BY-SA 4.0                            | dso.v1.json                                    | M40·M45 포함                |
| (T0b) `constellations.json`        | https://github.com/ofrohn/d3-celestial (data/)          |                | 파일별 확인                             | constellations.v1.json                         | 이름·라벨 위치              |
| (T0b) `constellations.lines.json`  | https://github.com/ofrohn/d3-celestial (data/)          |                | 파일별 확인                             | constellations.v1.json                         | 선                          |
| (T0b) `constellations.bounds.json` | https://github.com/ofrohn/d3-celestial (data/)          |                | 파일별 확인 (IAU / Davenhall & Leggett) | constellations.v1.json                         | 경계                        |
| (선택) 은하수 이미지               | https://svs.gsfc.nasa.gov/4851                          |                | 퍼블릭 도메인                           | 은하수 레이어(T1)                              | 별 제거된 milkyway_* 변형만 |

## 큐레이션 데이터 (이 프로젝트에서 작성, CC BY-SA 4.0)

| 파일                                     | 내용                   | 출처/근거                                                           |
| ---------------------------------------- | ---------------------- | ------------------------------------------------------------------- |
| `data-src/curated/star-names-ko.csv`     | 별 한글 이름·전통 이름 | IAU WGSN 공식 이름 + 한국천문학회 표기 + GPT Pro G2(검토 필요 표시) |
| `data-src/curated/constellations-ko.csv` | 별자리 88개 한글 이름  | 한국천문학회 천문학 용어                                            |
| `data-src/curated/dso-names-ko.csv`      | DSO 한글 이름          | 통용 명칭                                                           |
| `data-src/curated/caldwell.csv`          | 콜드웰 109             | 공개 목록                                                           |
| `data-src/curated/meteors.csv`           | 주요 유성우            | IMO 연간 달력(공개 사실)                                            |

## 실시간 외부 API (앱 내 고지 필요)

- **Open-Meteo** — 날씨·구름 예보. 라이선스 CC BY 4.0. 고지: "Weather data by Open-Meteo.com (CC BY 4.0)". https://open-meteo.com
- **7Timer!** — 천문 시상·투명도 예보. 고지: "Astronomical seeing forecast by 7Timer! (http://www.7timer.info)".

## 계산 라이브러리

- **astronomy-engine** (MIT) — 행성·달·태양 위치, 출몰, 회전행렬. https://github.com/cosinekitty/astronomy

## 사용하지 않는 것 (라이선스 사유)

- Stellarium 소스코드(GPL)·Stellarium Web Engine(AGPL): 알고리즘 참고만, 코드·데이터 복사 금지.
- 라이선스가 불명확한 별자리 그림(art), 광해 지도 타일.
