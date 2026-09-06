# G3 배치 1 — 검토 목록

JSON의 meta.needsReview를 항목별로 추출했습니다. 아래 내용은 수정 완료 판정이 아닙니다.

## sun — 태양 (medium)

- 난이도 3은 밝기가 아니라 전용 필터 준비와 안전 절차를 포함한 편집 판단입니다. 앱에서 관측 시작 전 별도 안전 확인이 필요합니다.

근거: [NASA — Eclipse Viewing Safety](https://science.nasa.gov/eclipses/safety/)

## star:HIP32349 — 시리우스 (medium)

- 전통 명칭은 Stellarium 한국 재구성의 HIP 대응을 사용했습니다. 천랑성 등 다른 용례와의 통합은 원전 확인 후 진행하세요.

## star:HIP69673 — 아르크투루스 (medium)

- 한국어 기본 이름은 첨부의 아르크투루스를 유지했습니다. 아크투루스 표기와의 검색 별칭 병합을 확인하세요.

## star:HIP24608 — 카펠라 (low)

**출시 차단: 상위 카탈로그 검토 전 자동 게시하지 않음.**

- 중요: 첨부 spect=M1: comp는 Takeda 외(2018)의 주요 구성별 G8 III·G0 III와 불일치합니다. 원값을 보존했으며 외부 연구로 덮어쓰지 않았습니다. T0 카탈로그의 행 매핑·대상 계층·상위 출처를 확인한 뒤 출시하세요.
- 전통 명칭은 Stellarium 한국 재구성의 대응이며 역사 원전 대조가 필요합니다.

근거: [Takeda·Hashimoto·Honda (2018) — Spectroscopic Determination of Capella’s Photospheric Abundances](https://arxiv.org/html/1806.09036v1)

## star:HIP24436 — 리겔 (medium)

- 전통 명칭은 Stellarium 한국 재구성에 한정했습니다. 삼이라는 성군과 개별 항성의 별칭을 일대일로 합치지 마세요.

## star:HIP27989 — 베텔게우스 (medium)

- 첨부 거리 498광년을 보존했습니다. NASA의 별 소개에 제시된 다른 추정과 차이가 있으므로 거리의 상위 원전·불확실도를 확인하세요.
- V=0.45는 첨부 대표값입니다. 현재 밝기로 고정 표시하거나 실시간 밝기 순위에 사용하지 마세요.
- 전통 명칭은 Stellarium 한국 재구성의 대응이며 역사 원전 대조가 필요합니다.

근거: [NASA — What is Betelgeuse? Inside the Strange, Volatile Star](https://science.nasa.gov/universe/what-is-betelgeuse-inside-the-strange-volatile-star/)

## star:HIP21421 — 알데바란 (medium)

- 전통 명칭은 Stellarium 한국 재구성에 한정했습니다. 천고라는 한글 표기만으로 카펠라의 명칭과 합치지 마세요.

## star:HIP80763 — 안타레스 (medium)

- 전통 명칭은 Stellarium 한국 재구성의 대응이며 역사 원전 대조가 필요합니다.

## star:HIP102098 — 데네브 (medium)

- 첨부 거리 1411.9광년을 보존했습니다. Chesneau 외(2010)는 시차 기반과 성협 소속 가정 기반 거리의 큰 차이를 설명합니다. 거리 상위 원전·불확실도를 확인하기 전 정밀한 광도·나이 계산이나 거리 순서 퀴즈의 근거로 쓰지 마세요.

근거: [Chesneau 외 (2010) — Time, Spatial, and Spectral Resolution of the Hα Line-Formation Region of Deneb and Rigel](https://arxiv.org/html/1007.2095v1)

## star:HIP11767 — 폴라리스 (medium)

- V=1.97은 첨부 대표값입니다. 변광성을 현재 밝기 고정값으로 처리하지 마세요.

## 전 항목에 공통인 병합 전 확인

첨부의 mag 측정 대역, 거리·분광형의 상위 원전, 좌표 epoch와 불확실도는 입력에 명시되어 있지 않습니다. 원값 보존 검사를 상위 원전 검증으로 간주하지 마세요.

입력은 121개이며 이번 배치는 20개입니다. 나머지 101개의 콘텐츠가 생성되었다고 인덱스에 등록하면 안 됩니다.

generatedBy=gpt-5-pro는 G3 v1 스키마 호환 문자열이지 실제 실행 모델 인증값이 아닙니다. README의 메타데이터 설명을 함께 보존하세요.
