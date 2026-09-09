# 천체 사진 v1 — 출처·권리·과학적 표현

확인일: **2026-09-09**. 유명 행성 5개, 달 1개, 밝은 별 2개, 성운 5개, 성단 2개, 은하 5개를 대상으로 실제 관측 사진 **20개**를 수록했다. 태양·수성·금성이나 나머지 천체에는 이 묶음의 대체 사진을 연결하지 않는다.

## 권리 판단

- [ESA/Hubble 이용 정책](https://esahubble.org/copyright/)과 [ESO 이용 정책](https://www.eso.org/public/outreach/copyright/)은 별도 고지가 없는 해당 공개 이미지의 복제·편집을 CC BY 4.0으로 허용한다. 기관은 크레딧의 모든 이름을 그대로, 사진과 연결된 위치에서 읽을 수 있게 표시하도록 요구한다. 온라인 크레딧에 링크가 있으면 유지한다.
- [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)은 상업적 재배포와 편집을 허용하지만 출처·라이선스 링크·변경 고지가 필요하다. 원본 사진에 추가적인 독점 이용 제한을 걸지 않는다. 앱 코드의 MIT와 사진의 CC BY 4.0은 구분한다.
- **NASA가 이름에 있다는 이유로 퍼블릭 도메인으로 분류하지 않았다.** 아래 각 사진이 ESA/Hubble 또는 ESO 공식 아카이브에 게시된 사실과 그 기관의 적용 정책을 근거로 CC BY 4.0을 사용했다. NASA·ESA 외 연구자·대학·STScI·AURA와 Acknowledgement 문구도 생략하지 않았다.
- 각 개별 이미지 페이지의 크레딧·설명·분류·추가 권리 고지를 확인했다. 선택한 20개에는 별도 재사용 금지 고지가 발견되지 않았다. 식별 가능한 인물·기관 로고·상상도·시뮬레이션·사용자 제출 동영상은 선택하지 않았다. 기관이나 연구자가 앱을 보증하는 것처럼 표현하지 않는다.
- ESA/Hubble의 로고·음악·논문·코드는 이미지 일반 허용에 포함되지 않는다. ESO의 로고와 별도 권리를 가진 옛 금성 통과 교육 자료도 사용하지 않았다. 후보 중 상상도인 Sirius heic0516b와 Neptune heic1904a, 일부 클립에 별도 승인이 필요한 Eyes on the Skies 영상은 제외했다.

## 파일과 변형

- 배포 위치: `public/object-photos/v1/`. 최종 40개 WebP 합계 **1,295,446 bytes**, 약 **1.30 MB**. hero는 긴 변 최대 960px, thumb는 최대 160px이다.
- 공식 페이지가 제공하는 JPEG 다운로드를 입력으로 사용했다. 원출처 해상도가 작은 시리우스·해왕성 등은 확대하지 않았고, 매우 큰 모자이크는 공식 Screensize JPEG를 이용했다. `imageURL`은 실제 변환 입력 URL이므로 수 GB 원본 과학 자료와 혼동하지 않는다.
- 종횡비를 유지하는 contain 축소, WebP 압축, sRGB 출력만 적용했다. **hero·thumb 모두 크롭·픽셀 확대·천체 합성·색 재배정은 하지 않았다.** 관측 기관이 이미 수행한 파장별 색 합성·모자이크는 아래 캡션에 별도로 설명한다. 이미지 생성 도구는 사용하지 않았다.
- 앱의 야간 보호는 파일을 바꾸지 않는 적색 표시 필터다. 사용자가 원래 색 보기를 선택하면 필터를 해제한다. 이 표시 변형도 각 항목의 `modifications`와 내장 XMP에 명시했다.
- 각 WebP에는 sourceURL, imageURL, 전체 credit, licenseURL, rightsURL, verifiedAt, sourceSha256, 영어 caption·modifications를 XMP로 내장했다. **출력 파일 자신의 SHA-256은 자기 자신 안에 내장할 수 없으므로** 아래 표, 공개 manifest와 TS에 기록한다. 원출처 입력의 SHA-256은 파일 안에도 있다.
- 온라인 크레딧의 과거 HTTP 링크는 같은 기관의 HTTPS로 바꿨다. 옛 spacetelescope.org 링크는 현행 esahubble.org로 연결했다. M1 원출처 크레딧에서 ESA 글자에 잘못 연결되어 있던 esa.org는 공식 esa.int로 정정했다. 크레딧의 이름과 문구는 보존했다.

## 관측 자료 해석

- 모두 과거의 관측이다. 현재 위치·시간의 실시간 하늘, 맨눈·쌍안경·접안렌즈에서 보이는 크기와 색을 뜻하지 않는다.
- 700nm 부근 이상의 I 필터를 관례상 Optical로 적은 원출처도 있지만, 775/814/845/850nm가 포함된 항목은 앱에서 근적외선을 포함한 여러 파장 합성으로 구분했다. 화성의 275nm는 자외선으로 구분했다.
- M27의 원문은 B·O III·Hα의 3색 합성을 설명하고, 현재 필터표는 추가로 u(361nm)·He II·R도 열거한다. 이를 임의로 눈에 보이는 자연색이라고 확정하지 않고, 원출처에 근자외선·가시광 필터가 기재된 처리 영상임을 안내한다.
- M31은 한쪽 원반의 일부, M8은 내부 별 탄생 영역, M13은 중심부, 달은 Tycho 주변이다. 전체 천체 사진으로 표시하지 않는다. 시리우스의 십자·고리는 기기 회절이며 별의 표면 모양이 아니다. 베텔게우스는 645nm 관측의 밝기 표현이며 자연색 사진으로 부르지 않는다.

## 재현·검증

```sh
node scripts/data/prepare-object-photos.mjs
node scripts/data/prepare-object-photos.mjs --check
pnpm exec vitest run tests/unit/objectPhotos.test.ts
```

manifest가 큐레이션 입력이며 스크립트가 WebP와 `src/catalog/objectPhotos.ts`를 동기화한다. 최초 검토된 입력은 `artifacts/object-photos-research/originals/`에 캐시한다. 새 PC에서는 공개 URL로 다시 받아 해시를 비교한다. 이미 기록된 입력 해시가 달라지면 중단하므로, 변경된 사진을 자동 승인하거나 확인 날짜를 자동으로 갱신하지 않는다. `--check`와 단위 검사는 네트워크 없이 40개 파일의 해시·형식·크기·XMP·용량을 확인한다.

단위 검사 3개 및 대상 ESLint가 통과했다. 실제 배포된 UI·오프라인 캐시는 별도 통합 검증 대상이다. 연구용 원출처 HTML·다운로드·연락판은 `artifacts/object-photos-research/`에 보관했다. 연락판을 직접 열어 전체 20개에서 천체와 캡션 대응, 잘림과 상상도 혼입 여부를 확인했다.

## 개별 사진 권리표

모든 항목의 licenseURL은 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)이며 verifiedAt은 **2026-09-09**다. 아래 전체 크레딧은 썸네일·큰 사진 근처에도 그대로 표시한다. 각 항목의 별도 권리 예외는 미발견이며, 적용 근거는 해당 sourceURL과 rightsURL의 결합이다.

### planet:jupiter · 목성과 유로파

- sourceURL: [공식 개별 이미지 페이지](https://esahubble.org/images/heic2017a/)
- imageURL: [실제 입력 JPEG](https://cdn.esahubble.org/archives/images/screen/heic2017a.jpg)
- rightsURL: [해당 기관 이용 정책](https://esahubble.org/copyright/) · licenseURL: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- credit: NASA, ESA, A. Simon (Goddard Space Flight Center), and M. H. Wong (University of California, Berkeley) and the OPAL team.
- 분류: 가시광 · 주요 천체 전체.
- 설명: 2020년 허블이 촬영한 목성과 위성 유로파. 여러 가시광 필터의 관측을 합친 사진이며, 지금 하늘의 모습은 아니에요.
- 변형: 별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.
- 확인일: 2026-09-09. 개별 추가 재사용 제한 고지 미발견.
- 입력 SHA-256: `99b4d90c87355000a33422a799be8e65bc167705bea32c11790549cabf74f1ac`

| 파일                                       | 크기      | bytes | SHA-256                                                            |
| ------------------------------------------ | --------- | ----: | ------------------------------------------------------------------ |
| object-photos/v1/planet-jupiter-hero.webp  | 960 × 794 | 29990 | `f1b2641e454f6a8c4260bcc882fb360412f155488901e3b7bfe755aac42d2efa` |
| object-photos/v1/planet-jupiter-thumb.webp | 160 × 132 |  2994 | `4d7ce114b352feedc7bfcbcddb2ac973e9340c2731b8b12164a8b326e65aeafc` |

### planet:saturn · 토성과 고리

- sourceURL: [공식 개별 이미지 페이지](https://esahubble.org/images/heic1917a/)
- imageURL: [실제 입력 JPEG](https://cdn.esahubble.org/archives/images/screen/heic1917a.jpg)
- rightsURL: [해당 기관 이용 정책](https://esahubble.org/copyright/) · licenseURL: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- credit: NASA, ESA, A. Simon (Goddard Space Flight Center), and M.H. Wong (University of California, Berkeley)
- 분류: 가시광 · 주요 천체 전체.
- 설명: 2019년 허블의 가시광 필터 합성 사진. 고리가 기울어진 모습과 구름 띠를 보여 주며, 현재의 고리 각도와는 달라요.
- 변형: 별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.
- 확인일: 2026-09-09. 개별 추가 재사용 제한 고지 미발견.
- 입력 SHA-256: `7c5ed9588561d115783eb00aeeb3a308e416aaa746251f7bcc20965e81ac0537`

| 파일                                      | 크기      | bytes | SHA-256                                                            |
| ----------------------------------------- | --------- | ----: | ------------------------------------------------------------------ |
| object-photos/v1/planet-saturn-hero.webp  | 960 × 610 | 13592 | `218235bd253a16421355d9a7b405fcdc16a050a934273a631ccb9d1e020fb552` |
| object-photos/v1/planet-saturn-thumb.webp | 160 × 102 |  2570 | `3a45065d50e4bbd515d2f9b56e679b30a0fca72e8f0efcea0d6a20afa32bb32e` |

### planet:mars · 허블이 본 화성

- sourceURL: [공식 개별 이미지 페이지](https://esahubble.org/images/heic1609a/)
- imageURL: [실제 입력 JPEG](https://cdn.esahubble.org/archives/images/screen/heic1609a.jpg)
- rightsURL: [해당 기관 이용 정책](https://esahubble.org/copyright/) · licenseURL: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- credit: NASA, ESA, the Hubble Heritage Team (STScI/AURA), J. Bell (ASU), and M. Wolff (Space Science Institute)
- 분류: 여러 파장 합성(본문에 가시광 외 필터 명시) · 주요 천체 전체.
- 설명: 2016년 충 부근에 허블이 촬영한 화성. 원출처의 필터에는 자외선과 가시광이 포함된 색 합성으로, 맨눈이나 접안렌즈의 모습과 같지 않아요.
- 변형: 별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.
- 확인일: 2026-09-09. 개별 추가 재사용 제한 고지 미발견.
- 입력 SHA-256: `290698f282675ccb095244ad941dea986f06e267daf75a9788a829f0cc7e905f`

| 파일                                    | 크기      | bytes | SHA-256                                                            |
| --------------------------------------- | --------- | ----: | ------------------------------------------------------------------ |
| object-photos/v1/planet-mars-hero.webp  | 960 × 960 | 16234 | `4f4756f0f9196a0d37b7e8109a17e01cffe7ece967e7c661b55c2d4427c68a17` |
| object-photos/v1/planet-mars-thumb.webp | 160 × 160 |  3008 | `2f764a62d526569d46b5390448d487b168295abbf69aaee97f538c98b506bd28` |

### planet:uranus · 허블이 본 천왕성

- sourceURL: [공식 개별 이미지 페이지](https://esahubble.org/images/potw1906a/)
- imageURL: [실제 입력 JPEG](https://cdn.esahubble.org/archives/images/large/potw1906a.jpg)
- rightsURL: [해당 기관 이용 정책](https://esahubble.org/copyright/) · licenseURL: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- credit: NASA, ESA, A.A. Simon (NASA Goddard), and M.H. Wong and A.I. Hsu (University of California, Berkeley)
- 분류: 여러 파장 합성(본문에 가시광 외 필터 명시) · 주요 천체 전체.
- 설명: 허블 OPAL 관측의 천왕성. 가시광과 근적외선 필터를 사용한 색 합성으로, 밝은 극지 구름과 대기를 보여 줘요.
- 변형: 별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.
- 확인일: 2026-09-09. 개별 추가 재사용 제한 고지 미발견.
- 입력 SHA-256: `a91f1dbbe1db4d12f0df3385777dcb698e6b02cafc53dd98089a8d743c6e1c9f`

| 파일                                      | 크기      | bytes | SHA-256                                                            |
| ----------------------------------------- | --------- | ----: | ------------------------------------------------------------------ |
| object-photos/v1/planet-uranus-hero.webp  | 903 × 960 |  8402 | `cac5e59815e33c245a57c3413d8cda51546fff8741d84c2524b3efa554ddf7f6` |
| object-photos/v1/planet-uranus-thumb.webp | 151 × 160 |  2266 | `3a84ef6b0c7f9dbbad1a183c875f2b07710e1e9b23def6515d5ece0fa74f213b` |

### planet:neptune · 해왕성의 구름과 어두운 폭풍

- sourceURL: [공식 개별 이미지 페이지](https://esahubble.org/images/potw1907a/)
- imageURL: [실제 입력 JPEG](https://cdn.esahubble.org/archives/images/large/potw1907a.jpg)
- rightsURL: [해당 기관 이용 정책](https://esahubble.org/copyright/) · licenseURL: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- credit: NASA, ESA, A.A. Simon (NASA Goddard), and M.H. Wong and A.I. Hsu (University of California, Berkeley)
- 분류: 여러 파장 합성(본문에 가시광 외 필터 명시) · 주요 천체 전체.
- 설명: 2018년 허블 OPAL 관측으로 본 해왕성. 가시광·근적외선 필터의 색 합성이며, 당시의 어두운 폭풍과 구름을 보여 줘요.
- 변형: 별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.
- 확인일: 2026-09-09. 개별 추가 재사용 제한 고지 미발견.
- 입력 SHA-256: `eac485e5301d78495d5ef59c887f411062434eeab0939b15ce5811359957ba71`

| 파일                                       | 크기      | bytes | SHA-256                                                            |
| ------------------------------------------ | --------- | ----: | ------------------------------------------------------------------ |
| object-photos/v1/planet-neptune-hero.webp  | 514 × 543 |  4728 | `99fd76731f1e29b99d81bb72f0881cadaf7e7837eb443e04fa2f0d99a7630171` |
| object-photos/v1/planet-neptune-thumb.webp | 152 × 160 |  2266 | `7b4ef672c17eef8eb7ffe5e7c79cc193a3588f57edabfaf18c63fcc9892de67d` |

### moon · 달의 티코 충돌구 부근

- sourceURL: [공식 개별 이미지 페이지](https://esahubble.org/images/potw1219a/)
- imageURL: [실제 입력 JPEG](https://cdn.esahubble.org/archives/images/screen/potw1219a.jpg)
- rightsURL: [해당 기관 이용 정책](https://esahubble.org/copyright/) · licenseURL: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- credit: NASA, ESA, D. Ehrenreich (Institut de Planétologie et d’Astrophysique de Grenoble (IPAG)/CNRS/Université Joseph Fourier)
- 분류: 가시광 · 천체 일부 확대.
- 설명: 달 전체가 아닌 티코 충돌구 주변 약 700km 영역의 확대 사진. 2012년 허블의 가시광 관측에 비어 있던 일부 영역은 지상 사진으로 보충했어요.
- 변형: 별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.
- 확인일: 2026-09-09. 개별 추가 재사용 제한 고지 미발견.
- 입력 SHA-256: `1c8456cb40afeb15ee25e8b66ed4b86492dcbaa2c706a195044559f736cd4803`

| 파일                             | 크기      |  bytes | SHA-256                                                            |
| -------------------------------- | --------- | -----: | ------------------------------------------------------------------ |
| object-photos/v1/moon-hero.webp  | 926 × 960 | 167084 | `56498182fd5d6049032a17a467a7603b0b4ae5b1e46ced59b0d193413da38834` |
| object-photos/v1/moon-thumb.webp | 155 × 160 |   7154 | `0de75babaa225c5c9538c3685cc47275a57fc92341e283aad8fa53948d79150c` |

### star:HIP32349 · 시리우스 A와 작은 동반성

- sourceURL: [공식 개별 이미지 페이지](https://esahubble.org/images/heic0516a/)
- imageURL: [실제 입력 JPEG](https://cdn.esahubble.org/archives/images/large/heic0516a.jpg)
- rightsURL: [해당 기관 이용 정책](https://esahubble.org/copyright/) · licenseURL: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- credit: [NASA](https://www.nasa.gov/), [ESA](https://www.esa.int/), H. Bond ([STScI](https://www.stsci.edu/)), and M. Barstow (University of Leicester)
- 분류: 여러 파장 합성(본문에 가시광 외 필터 명시) · 주변 영역을 포함한 사진.
- 설명: 시리우스 A와 작은 동반성 B의 허블 사진. 밝은 별을 과노출해 동반성을 드러냈으며, 십자와 동심원은 별의 실제 모양이 아닌 망원경 회절이에요. 가시광·근적외선 관측을 사용했어요.
- 변형: 별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.
- 확인일: 2026-09-09. 개별 추가 재사용 제한 고지 미발견.
- 입력 SHA-256: `231e45edae763a43b6062648b1df190663eac7cbb9d12e7ef7f5d73876654c01`

| 파일                                      | 크기      | bytes | SHA-256                                                            |
| ----------------------------------------- | --------- | ----: | ------------------------------------------------------------------ |
| object-photos/v1/star-hip32349-hero.webp  | 369 × 403 |  8470 | `724ff900c48ac74da87813e28b9e9ae15cfc82a5828ae0c0e80eb2670e90b38a` |
| object-photos/v1/star-hip32349-thumb.webp | 147 × 160 |  3062 | `a6b727e42f7302207b029949f6328a3e578d4bc53b51852455f4498312378099` |

### star:HIP27989 · 베텔게우스 표면 관측

- sourceURL: [공식 개별 이미지 페이지](https://www.eso.org/public/images/eso2003b/)
- imageURL: [실제 입력 JPEG](https://cdn.eso.org/images/large/eso2003b.jpg)
- rightsURL: [해당 기관 이용 정책](https://www.eso.org/public/outreach/copyright/) · licenseURL: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- credit: ESO/M. Montargès et al.
- 분류: 가시광 · 주요 천체 전체.
- 설명: 2019년 1월 VLT/SPHERE로 분해해 본 베텔게우스의 표면. 645nm 가시광 관측의 밝기를 색으로 표현했으며, 눈으로 본 별의 색이나 크기를 뜻하지 않아요.
- 변형: 별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.
- 확인일: 2026-09-09. 개별 추가 재사용 제한 고지 미발견.
- 입력 SHA-256: `1db7b61da7605d91911b5de1084f321f1f8b9a8fa23edd401301025385822239`

| 파일                                      | 크기      | bytes | SHA-256                                                            |
| ----------------------------------------- | --------- | ----: | ------------------------------------------------------------------ |
| object-photos/v1/star-hip27989-hero.webp  | 816 × 816 |  5024 | `c34bdaea0871e233b96091de4d5904efc49e30c3f44624f126e6373c06e61e6e` |
| object-photos/v1/star-hip27989-thumb.webp | 160 × 160 |  1916 | `4ebdd5ff7d2d5db1472abe6de64820dfe01e4b8dcb2997bab82c56bccfc5bf7f` |

### dso:M1 · 게성운 M1

- sourceURL: [공식 개별 이미지 페이지](https://esahubble.org/images/heic0515a/)
- imageURL: [실제 입력 JPEG](https://cdn.esahubble.org/archives/images/screen/heic0515a.jpg)
- rightsURL: [해당 기관 이용 정책](https://esahubble.org/copyright/) · licenseURL: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- credit: [NASA](https://www.nasa.gov/), [ESA](https://www.esa.int/) and Allison Loll/Jeff Hester (Arizona State University). Acknowledgement: Davide De Martin ([ESA](https://www.esa.int/)/[Hubble](https://esahubble.org/))
- 분류: 가시광 · 주요 천체 전체.
- 설명: 허블의 24개 노출을 이어 만든 게성운 사진. 가시광의 산소·황 방출선 관측을 색으로 합쳐 초신성 잔해의 가스 구조를 드러냈어요.
- 변형: 별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.
- 확인일: 2026-09-09. 개별 추가 재사용 제한 고지 미발견.
- 입력 SHA-256: `9b9162b9a679c04fe9224dd3338691fa1eb56599e111ebd750f6eafe9d028bdc`

| 파일                               | 크기      |  bytes | SHA-256                                                            |
| ---------------------------------- | --------- | -----: | ------------------------------------------------------------------ |
| object-photos/v1/dso-m1-hero.webp  | 960 × 960 | 125664 | `4975930ab6ce1f40c43969b6a9a75d44bde1a978a70d4488fbf975959b791304` |
| object-photos/v1/dso-m1-thumb.webp | 160 × 160 |   6352 | `72ae15764e6456013bd65f85670fdc2e6a0cb6bec08223d94dc757ea9aa78546` |

### dso:M8 · 석호성운 M8의 별 탄생 영역

- sourceURL: [공식 개별 이미지 페이지](https://esahubble.org/images/heic1808a/)
- imageURL: [실제 입력 JPEG](https://cdn.esahubble.org/archives/images/screen/heic1808a.jpg)
- rightsURL: [해당 기관 이용 정책](https://esahubble.org/copyright/) · licenseURL: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- credit: NASA, ESA, STScI
- 분류: 가시광 · 천체 일부 확대.
- 설명: 석호성운 전체가 아닌 내부의 약 4광년 영역을 확대한 허블 사진. 여러 가시광 방출선과 필터 관측을 색으로 합친 모습이에요.
- 변형: 별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.
- 확인일: 2026-09-09. 개별 추가 재사용 제한 고지 미발견.
- 입력 SHA-256: `43cb96804e1b09c3bb3dbe00770719838f90eac34557971636a709ff8eddff6e`

| 파일                               | 크기      | bytes | SHA-256                                                            |
| ---------------------------------- | --------- | ----: | ------------------------------------------------------------------ |
| object-photos/v1/dso-m8-hero.webp  | 761 × 960 | 37462 | `155b013b9df814b0b8d97d79d06248a7e4fca01faf20769c62c35cc84fbc965e` |
| object-photos/v1/dso-m8-thumb.webp | 127 × 160 |  4010 | `e4be574e1ff58db554ca28f6f465fbcb15de2b9af649aac9c2d97c0bd9741a1c` |

### dso:M13 · 헤라클레스 구상성단 M13의 중심

- sourceURL: [공식 개별 이미지 페이지](https://esahubble.org/images/potw1011a/)
- imageURL: [실제 입력 JPEG](https://cdn.esahubble.org/archives/images/screen/potw1011a.jpg)
- rightsURL: [해당 기관 이용 정책](https://esahubble.org/copyright/) · licenseURL: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- credit: ESA/Hubble and NASA
- 분류: 여러 파장 합성(본문에 가시광 외 필터 명시) · 천체 일부 확대.
- 설명: M13의 중심부를 확대한 허블 사진. 파랑·빨강 가시광과 근적외선 관측을 각각 화면의 파랑·초록·빨강으로 배정한 색 합성이에요.
- 변형: 별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.
- 확인일: 2026-09-09. 개별 추가 재사용 제한 고지 미발견.
- 입력 SHA-256: `d785f69137bb216c9beb36d962fd1840d79ed90fae8c0ab62d131bf14ac69bae`

| 파일                                | 크기      |  bytes | SHA-256                                                            |
| ----------------------------------- | --------- | -----: | ------------------------------------------------------------------ |
| object-photos/v1/dso-m13-hero.webp  | 960 × 960 | 396548 | `2bb43087fdebdc49efa98f15d5fc2542b60aeab7f8ec261edcda3f6c4001867e` |
| object-photos/v1/dso-m13-thumb.webp | 160 × 160 |  10948 | `b60e52b768ab1ce2064108276289b9d9ee08b7d15ce14304ede49d4831048999` |

### dso:M27 · 아령성운 M27

- sourceURL: [공식 개별 이미지 페이지](https://www.eso.org/public/images/eso9846a/)
- imageURL: [실제 입력 JPEG](https://cdn.eso.org/images/screen/eso9846a.jpg)
- rightsURL: [해당 기관 이용 정책](https://www.eso.org/public/outreach/copyright/) · licenseURL: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- credit: ESO/I. Appenzeller, W. Seifert, O. Stahl, M. Zamani
- 분류: 여러 파장 합성(본문에 가시광 외 필터 명시) · 주요 천체 전체.
- 설명: VLT/FORS1의 파장별 관측을 색으로 합친 아령성운 사진. 원출처에는 가시광 방출선과 근자외선 필터가 기재되어 있으며, 가스의 구조를 드러내는 처리 영상이에요.
- 변형: 별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.
- 확인일: 2026-09-09. 개별 추가 재사용 제한 고지 미발견.
- 입력 SHA-256: `e8b7969ab150cc3b04deee70b59f5f624b26fb22724fafc393c70604f7853c2d`

| 파일                                | 크기      | bytes | SHA-256                                                            |
| ----------------------------------- | --------- | ----: | ------------------------------------------------------------------ |
| object-photos/v1/dso-m27-hero.webp  | 960 × 959 | 64824 | `497f7e562dd0f46be08de493ef1dfc9533d4faa390bafc2461220447d974f855` |
| object-photos/v1/dso-m27-thumb.webp | 160 × 160 |  5704 | `e6e418704f656fb045d16ffe7854c3948d4881d6cade5b35d7518da29b180fc6` |

### dso:M31 · 안드로메다은하 M31의 원반 일부

- sourceURL: [공식 개별 이미지 페이지](https://esahubble.org/images/heic1502a/)
- imageURL: [실제 입력 JPEG](https://cdn.esahubble.org/archives/images/screen/heic1502a.jpg)
- rightsURL: [해당 기관 이용 정책](https://esahubble.org/copyright/) · licenseURL: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- credit: [NASA](https://www.nasa.gov/), [ESA](https://esahubble.org/), J. Dalcanton (University of Washington, USA), B. F. Williams (University of Washington, USA), L. C. Johnson (University of Washington, USA), the PHAT team, and R. Gendler.
- 분류: 여러 파장 합성(본문에 가시광 외 필터 명시) · 천체 일부 확대.
- 설명: 안드로메다은하 전체가 아닌 중심에서 원반 한쪽으로 이어지는 허블 모자이크. 가시광·근적외선 합성으로 빽빽한 별과 어두운 먼지 띠를 보여 줘요.
- 변형: 별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.
- 확인일: 2026-09-09. 개별 추가 재사용 제한 고지 미발견.
- 입력 SHA-256: `3c3a09d49a2e2674d5b0dd481943a876981380e615721a85da567b5e65263505`

| 파일                                | 크기      | bytes | SHA-256                                                            |
| ----------------------------------- | --------- | ----: | ------------------------------------------------------------------ |
| object-photos/v1/dso-m31-hero.webp  | 960 × 307 | 33692 | `e872ec4f977c23a1b2090e5d1344c91563ba7be96519dd69e0ac4ce195741af9` |
| object-photos/v1/dso-m31-thumb.webp | 160 × 51  |  2574 | `23b9af5f89a4caf93b115181a0fc346679eae8cf01924a97c31ebe46bdfc2095` |

### dso:M42 · 오리온성운 M42

- sourceURL: [공식 개별 이미지 페이지](https://esahubble.org/images/heic0601a/)
- imageURL: [실제 입력 JPEG](https://cdn.esahubble.org/archives/images/screen/heic0601a.jpg)
- rightsURL: [해당 기관 이용 정책](https://esahubble.org/copyright/) · licenseURL: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- credit: [NASA](https://www.nasa.gov/), [ESA](https://www.esa.int/), M. Robberto ( [Space Telescope Science Institute](https://www.stsci.edu/)/[ESA](https://www.esa.int/)) and the Hubble Space Telescope Orion Treasury Project Team
- 분류: 여러 파장 합성(본문에 가시광 외 필터 명시) · 주변 영역을 포함한 사진.
- 설명: 허블의 여러 가시광·근적외선 필터 관측 520장을 이어 만든 오리온성운 모자이크. 주변을 채운 지상 사진도 포함된 색 합성으로, 접안렌즈에서 보이는 색과는 달라요.
- 변형: 별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.
- 확인일: 2026-09-09. 개별 추가 재사용 제한 고지 미발견.
- 입력 SHA-256: `545d43079d936bbce3ad3dac33145992b504327e74db8f30dd92b8da538d6aec`

| 파일                                | 크기      | bytes | SHA-256                                                            |
| ----------------------------------- | --------- | ----: | ------------------------------------------------------------------ |
| object-photos/v1/dso-m42-hero.webp  | 960 × 960 | 40398 | `f8ef9bb62d137562109518ebbcb5b2485515fbb53b984cea5f4f263bc62d3064` |
| object-photos/v1/dso-m42-thumb.webp | 160 × 160 |  4012 | `6137b0ebafba9023f24414bbb6f040d8c0d7d0aa1a2c2c0c1973852fc693e515` |

### dso:M45 · 플레이아데스 성단 M45

- sourceURL: [공식 개별 이미지 페이지](https://www.eso.org/public/images/b11/)
- imageURL: [실제 입력 JPEG](https://cdn.eso.org/images/screen/b11.jpg)
- rightsURL: [해당 기관 이용 정책](https://www.eso.org/public/outreach/copyright/) · licenseURL: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- credit: ESO/S. Brunier
- 분류: 가시광 · 주변 영역을 포함한 사진.
- 설명: 플레이아데스의 밝은 별과 푸른 반사성운을 담은 가시광 사진. 먼지가 산란시킨 별빛이 보이며, 장시간 노출 사진의 색과 밝기는 눈으로 보는 모습과 달라요.
- 변형: 별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.
- 확인일: 2026-09-09. 개별 추가 재사용 제한 고지 미발견.
- 입력 SHA-256: `35abf88910f258337e893cfc89712499419b74b0a059ac6f8ba0b2fe365f0714`

| 파일                                | 크기      |  bytes | SHA-256                                                            |
| ----------------------------------- | --------- | -----: | ------------------------------------------------------------------ |
| object-photos/v1/dso-m45-hero.webp  | 960 × 840 | 117778 | `c1a80b900b263e35270d19ab9fc00e43783173372f33bbba4276b2486eb12df5` |
| object-photos/v1/dso-m45-thumb.webp | 160 × 140 |   5036 | `531a3699eaf2c4a9c228313d1aa7aa38a865fe09fc9415411047e2d208b4eec1` |

### dso:M51 · 소용돌이은하 M51와 동반은하

- sourceURL: [공식 개별 이미지 페이지](https://esahubble.org/images/heic0506a/)
- imageURL: [실제 입력 JPEG](https://cdn.esahubble.org/archives/images/screen/heic0506a.jpg)
- rightsURL: [해당 기관 이용 정책](https://esahubble.org/copyright/) · licenseURL: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- credit: [NASA](https://www.nasa.gov/), [ESA](https://www.esa.int/), S. Beckwith ([STScI](https://www.stsci.edu/)), and The Hubble Heritage Team ([STScI](https://www.stsci.edu/)/[AURA](https://www.aura-astronomy.org/))
- 분류: 여러 파장 합성(본문에 가시광 외 필터 명시) · 주요 천체 전체.
- 설명: 소용돌이은하와 동반은하 NGC 5195를 담은 허블 사진. 가시광·근적외선 필터 합성으로 나선팔, 먼지 띠와 별 탄생 영역을 보여 줘요.
- 변형: 별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.
- 확인일: 2026-09-09. 개별 추가 재사용 제한 고지 미발견.
- 입력 SHA-256: `626f7d6ba30d186a87b834c089b449e3b77c8defce4fe85ab7edf2078e3633e2`

| 파일                                | 크기      | bytes | SHA-256                                                            |
| ----------------------------------- | --------- | ----: | ------------------------------------------------------------------ |
| object-photos/v1/dso-m51-hero.webp  | 960 × 666 | 46772 | `9fe824637cebf0f64dac56989da5dc80f4d724051a744abad84049ff1abaefae` |
| object-photos/v1/dso-m51-thumb.webp | 160 × 111 |  3080 | `466dd0a6081cf3a5526b4ee4ca4a79cf3fdb6b01da7a51c84c779aa1c91892cc` |

### dso:M57 · 고리성운 M57

- sourceURL: [공식 개별 이미지 페이지](https://esahubble.org/images/heic1310a/)
- imageURL: [실제 입력 JPEG](https://cdn.esahubble.org/archives/images/screen/heic1310a.jpg)
- rightsURL: [해당 기관 이용 정책](https://esahubble.org/copyright/) · licenseURL: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- credit: NASA, ESA, and C. Robert O’Dell (Vanderbilt University).
- 분류: 가시광 · 주요 천체 전체.
- 설명: 허블이 여러 가시광 방출선으로 관측한 고리성운의 색 합성 사진. 원소별로 빛나는 가스를 구별하는 색으로, 맨눈으로 본 색은 아니에요.
- 변형: 별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.
- 확인일: 2026-09-09. 개별 추가 재사용 제한 고지 미발견.
- 입력 SHA-256: `8a3003ab28b0a3a45e97d63ef879a5c55a2029ded9cb174818f09646aeb3b806`

| 파일                                | 크기      | bytes | SHA-256                                                            |
| ----------------------------------- | --------- | ----: | ------------------------------------------------------------------ |
| object-photos/v1/dso-m57-hero.webp  | 960 × 960 | 26492 | `5f882e4b5bcef54a8a3ee31aec2c7bb70ea7cb657999adcbb8d0ec4aef725966` |
| object-photos/v1/dso-m57-thumb.webp | 160 × 160 |  3098 | `2ee36e0a5392a3cce35ebbccb6c9fb8d79bfc4bc87b6d4819f5e4bb7b5539bd1` |

### dso:M81 · 나선은하 M81

- sourceURL: [공식 개별 이미지 페이지](https://esahubble.org/images/heic0710a/)
- imageURL: [실제 입력 JPEG](https://cdn.esahubble.org/archives/images/screen/heic0710a.jpg)
- rightsURL: [해당 기관 이용 정책](https://esahubble.org/copyright/) · licenseURL: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- credit: [NASA](https://www.nasa.gov/), [ESA](https://www.esa.int/) and the Hubble Heritage Team ([STScI](https://www.stsci.edu/)/[AURA](https://www.aura-astronomy.org/)). Acknowledgment: A. Zezas and J. Huchra (Harvard-Smithsonian Center for Astrophysics)
- 분류: 여러 파장 합성(본문에 가시광 외 필터 명시) · 주요 천체 전체.
- 설명: 허블의 파랑·가시광·근적외선 관측을 합친 M81 사진. 중심으로 감겨 들어가는 나선팔과 먼지 구조를 보여 줘요.
- 변형: 별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.
- 확인일: 2026-09-09. 개별 추가 재사용 제한 고지 미발견.
- 입력 SHA-256: `51d4bc130bfa616f962004702061f66c695f42c5133e7762ae8d7d3a5e245190`

| 파일                                | 크기      | bytes | SHA-256                                                            |
| ----------------------------------- | --------- | ----: | ------------------------------------------------------------------ |
| object-photos/v1/dso-m81-hero.webp  | 960 × 645 | 20626 | `fa316582fee87c8d46f78e2ff241efd8cc921703d111578eddbf26d647e0fe37` |
| object-photos/v1/dso-m81-thumb.webp | 160 × 108 |  2412 | `b54743dc3058d111ef2dde6b4c4c0a161a41117bd4924caf974b0dc69a40c14e` |

### dso:M82 · 별 탄생 은하 M82

- sourceURL: [공식 개별 이미지 페이지](https://esahubble.org/images/heic0604a/)
- imageURL: [실제 입력 JPEG](https://cdn.esahubble.org/archives/images/screen/heic0604a.jpg)
- rightsURL: [해당 기관 이용 정책](https://esahubble.org/copyright/) · licenseURL: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- credit: [NASA](https://www.nasa.gov/), [ESA](https://www.esa.int/) and the Hubble Heritage Team ([STScI](https://www.stsci.edu/)/[AURA](https://www.aura-astronomy.org/)). Acknowledgment: J. Gallagher (University of Wisconsin), M. Mountain ([STScI](https://www.stsci.edu/)) and P. Puxley (NSF).
- 분류: 여러 파장 합성(본문에 가시광 외 필터 명시) · 주요 천체 전체.
- 설명: 허블의 가시광·근적외선 필터 모자이크. 붉게 배정된 수소 방출선은 M82 중심에서 뻗어 나오는 가스를 드러내요.
- 변형: 별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.
- 확인일: 2026-09-09. 개별 추가 재사용 제한 고지 미발견.
- 입력 SHA-256: `c7b68b2083e73acdbbeb040b1f44abaeccada4e1a0adaaaceda669a50fd0f06e`

| 파일                                | 크기      | bytes | SHA-256                                                            |
| ----------------------------------- | --------- | ----: | ------------------------------------------------------------------ |
| object-photos/v1/dso-m82-hero.webp  | 960 × 748 | 36152 | `12d64f012cdabd7cc79a0c2d68147243bc39228b723cb7c9759a20211d729eeb` |
| object-photos/v1/dso-m82-thumb.webp | 160 × 125 |  2892 | `cf1467e08e9e0e2d7c0fecbcface7636ce14753c85564fe7c7e02f209d782e56` |

### dso:M104 · 솜브레로은하 M104

- sourceURL: [공식 개별 이미지 페이지](https://esahubble.org/images/opo0328a/)
- imageURL: [실제 입력 JPEG](https://cdn.esahubble.org/archives/images/screen/opo0328a.jpg)
- rightsURL: [해당 기관 이용 정책](https://esahubble.org/copyright/) · licenseURL: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- credit: [NASA](https://www.nasa.gov/)/[ESA](https://www.esa.int/) and The Hubble Heritage Team ([STScI](https://www.stsci.edu/)/[AURA](https://www.aura-astronomy.org/))
- 분류: 여러 파장 합성(본문에 가시광 외 필터 명시) · 주요 천체 전체.
- 설명: 거의 옆에서 본 솜브레로은하의 허블 모자이크. 가시광과 근적외선 필터 합성으로 밝은 팽대부와 어두운 먼지 띠를 보여 줘요.
- 변형: 별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.
- 확인일: 2026-09-09. 개별 추가 재사용 제한 고지 미발견.
- 입력 SHA-256: `f1af80a18a7d4d584ab4c58d85da035a3c4d599932e9e8566446d1e6a0345e56`

| 파일                                 | 크기      | bytes | SHA-256                                                            |
| ------------------------------------ | --------- | ----: | ------------------------------------------------------------------ |
| object-photos/v1/dso-m104-hero.webp  | 960 × 538 | 17896 | `16bd351bb7d53b7ecace9710aa3d3e6175121322e8a3cfbe7658929543afd9fc` |
| object-photos/v1/dso-m104-thumb.webp | 160 × 90  |  2264 | `7081ea74c9fc9b8e127b362eb342811ada8463f8c3473d834f578a2911bb698b` |
