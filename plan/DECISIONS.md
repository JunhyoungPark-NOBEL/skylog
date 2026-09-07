# DECISIONS — 결정 기록 (ADR 요약)

형식: `D-번호 · 날짜 · 제목` → 맥락 / 결정 / 결과·영향. 새 결정은 아래에 추가하고, 번복하면 원 항목에 "→ D-xx로 대체" 표기.

## D-001 · 2026-09-06 · 플랫폼은 PWA
- 맥락: GPS·나침반·자이로가 필요하고, 빠른 반복 개발과 URL 배포가 중요.
- 결정: React + TypeScript + Vite + Three.js 기반 PWA. 네이티브 포장(Capacitor)은 보류(D9).
- 영향: 센서는 웹 API(DeviceOrientation/Generic Sensor)에 의존 → iOS 제약을 보정 기능으로 상쇄. HTTPS 배포 필수.

## D-002 · 2026-09-06 · 저장은 로컬 우선
- 결정: Dexie(IndexedDB) + JSON 내보내기/가져오기. 모든 레코드에 `updatedAt/deletedAt` 유지.
- 영향: 서버·로그인 없음. 동기화(T9)는 나중에 추가 가능.

## D-003 · 2026-09-06 · 천문 계산은 astronomy-engine, 렌더는 Three.js
- 대안: Stellarium Web Engine(AGPL, 임베드 시 라이선스 전염) / 직접 구현(정확도 위험).
- 결정: astronomy-engine(MIT) + 자체 WebGL 렌더러. 별은 J2000 단위벡터 버퍼 + 프레임당 회전행렬 1개.

## D-004 · 2026-09-06 · 데이터 소스
- 결정: HYG v4.4(별), d3-celestial(별자리 선·경계·은하수), OpenNGC(DSO). 모두 CC BY-SA/BSD. Stellarium 데이터·코드는 참고만.
- 영향: 앱 내 라이선스 고지 화면 필요(T0에 골격, T8에 완성).

## D-005 · 2026-09-06 · 망원경 가이드는 "수동 경위대식 push-to" 기본
- 맥락: 마운트 미정(SV48P는 OTA만). 현재는 쌍안경.
- 결정: 폰-경통 부착 + 별 정렬 방식 기본. 적도의(ΔHA/ΔDec)·GoTo(좌표 표시) 모드는 선택지로만. 전동 연동은 보류(D5).

## D-006 · 2026-09-06 · 콘텐츠는 정적 팩으로 선생성
- 결정: GPT Pro로 생성 → Claude 검증 → `public/data/content/v1/*.json` 커밋. 실시간 AI 호출은 보류(D2).
- 영향: 오프라인에서도 스토리 열람 가능, API 키 불필요.

## D-007 · 2026-09-06 · 개발 환경은 경로 A: Claude Code 로컬
- 결정: 데스크톱 앱 Code 탭에서 로컬 폴더(`~/dev/skylog` 등)를 열어 실행. 저장소는 GitHub 원격(push는 사용자 계정의 git 인증 사용). 폰 테스트는 GitHub Pages 배포 URL(T0a) 또는 `vite --host`.
- 모델: 기본 `fable`(Fable 5.1) + effort `high`. 수학·센서·데이터 파이프라인(T0b, T2, T5)은 `xhigh`. 단순 UI·문서·정리 작업은 `sonnet`으로 절약 가능. `max`는 기본 사용 안 함.
- **환경 정보 (2026-09-06, T0a 세션에서 확인)**
  - OS: Windows 11 Education 10.0.26200. 셸: PowerShell 5.1 + Git Bash. 프로젝트 폴더: `C:\Users\JunhyoungPark\OneDrive\Desktop\별관찰해쌀뚜` (Git 저장소 루트, GitHub 저장소 이름은 `skylog`).
  - Node v24.19.0 (winget `OpenJS.NodeJS.LTS`로 T0a에서 설치), npm 11.17.0, pnpm 12.3.4 (`npm i -g pnpm` — `corepack enable`은 Program Files 권한 문제로 실패), git 2.53.0, GitHub CLI 2.100.0 (winget `GitHub.cli`로 설치).
  - gh 로그인 계정: **`JunhyoungPark-NOBEL`** (keyring, https, scopes: repo·workflow·read:org·gist). 저장소 `JunhyoungPark-NOBEL/skylog`(public — 무료 계정 Pages 조건), Pages는 Actions 소스(`build_type=workflow`), URL https://junhyoungpark-nobel.github.io/skylog/.
  - 외부 다운로드: codeberg.org·raw.githubusercontent.com·registry.npmjs.org·svs.gsfc.nasa.gov·api.github.com 모두 접근 가능(T0b `data:fetch` 가능).
  - git 로컬 identity: `Junhyoung Park <jhpark@nobelab.kaist.ac.kr>` (저장소 로컬 설정). 줄바꿈은 `.gitattributes`로 LF 고정, `core.autocrlf=false`.
  - 주의: 프로젝트가 OneDrive 동기화 폴더 안에 있다. `node_modules`·`dist`가 동기화 대상이 되어 느려지거나 파일 잠금이 날 수 있으므로, 문제가 생기면 OneDrive 설정에서 이 폴더를 제외하거나 `C:\dev\skylog`로 옮긴다.

## D-008 · 2026-09-06 · 프로젝트 라이선스 (T0a에서 확정)
- 결정: 코드 MIT(`/LICENSE`, 저작권자 Junhyoung Park), `public/data/` 파생 데이터 팩 CC BY-SA 4.0(`/public/data/LICENSE`, HYG·OpenNGC 파생). 앱 내 "정보/라이선스" 화면은 `docs/DATA-LICENSES.md`를 그대로 렌더하며 Open-Meteo(CC BY 4.0)·7Timer 크레딧을 포함한다.
- 영향: GitHub 저장소는 public(무료 계정 Pages 조건)이어도 문제 없음.

## D-009 · 2026-09-06 · 계획 문서의 정본은 코드 저장소의 `plan/` (Claude Code 로컬 실행 기준)
- 맥락: 실행 도구를 Claude Code(데스크톱 Code 탭)로 확정. Claude Code 세션은 저장소 파일을 직접 읽으므로 저장소가 정본이어야 한다.
- 결정: 저장소 `plan/*`(STATUS·DECISIONS·task 프롬프트·research·reports)가 정본, `CLAUDE.md`가 읽기 순서를 지시. 갱신은 커밋. Claude 프로젝트 문서 사본은 초기 배포본·백업(태스크 종료 시 STATUS만 복사, 선택). 저장소 `docs/`는 코드 문서(ARCHITECTURE·DATA-LICENSES·TESTING·RELEASE).

## D-010 · 2026-09-06 · Dexie DB v1은 Task 0에서 생성, settings는 Dexie가 단일 진실 원천
- 결정: T0에서 10개 테이블(observations, bookmarks, sites, telescopes, eyepieces, binoculars, blobs, progress, settings, cache)을 v1으로 생성. zustand `settingsStore`는 persist storage 어댑터를 Dexie `settings`로 구현(localStorage 사용 안 함). T2(sites)·T3(bookmarks, cache)가 T4 전에 DB를 쓸 수 있다.
- 구현 메모(T0a): persist 어댑터는 스토어 전체를 한 행에 넣지 않고 **키마다 한 행**(`settings.theme`, `settings.lang`, …, `settings.__version`)으로 저장한다 → 다른 모듈·내보내기가 개별 설정을 그대로 읽는다. `sites.isDefault`는 Dexie가 boolean을 인덱싱하지 않으므로 `1 | undefined`로 저장.

## D-011 · 2026-09-06 · 라우팅은 해시 라우터(자체 구현)
- 대안: 탭 상태만(URL 없음) / react-router(history 모드).
- 결정: `src/app/router.ts`의 해시 라우터(`#/sky … #/debug/data`, `useSyncExternalStore`). 이유: GitHub Pages 하위 경로(`/skylog/`)에서 서버 설정 없이 새로고침·뒤로가기가 동작하고, PWA `start_url`이 고정되며, 의존성이 없다(초기 JS 예산).
- 영향: 상세 바텀 시트 등 화면 안 상태는 URL에 넣지 않는다(T3에서 필요하면 쿼리 형태로 확장).

## D-012 · 2026-09-06 · i18n은 i18next + react-i18next
- 결정: `src/i18n/ko.json`·`en.json`을 번들에 포함(오프라인), `initI18n(lang)`으로 부트스트랩, 언어는 `settingsStore.lang`이 원천. 천체 이름은 i18n 키가 아니라 카탈로그 `names.ko/en`(마스터 플랜 §6.6).
- 이유: 보간·복수형·네임스페이스가 표준적이고 React 통합이 안정적. 번들 비용(≈ 15KB gz)은 예산 안.

## D-013 · 2026-09-06 · 툴체인 버전 확정 (T0a)
- Vite 8.2.2(rolldown 기반) + `@vitejs/plugin-react` 6.1.1(플러그인이 rolldown-vite에서는 SWC 대신 자체 플러그인을 권장하므로 `plugin-react-swc` 대신 채택), React 19.2.8, TypeScript **6.0.3**(7.x는 typescript-eslint가 아직 미지원 `<6.1`), Tailwind CSS 4.3.3(`@tailwindcss/vite`, CSS-first `@theme inline`), Vitest 5.0.0(jsdom), Playwright 1.63.0, ESLint 10 + typescript-eslint 8.69, pnpm 12.3.4(`pnpm-workspace.yaml`의 `allowBuilds`로 esbuild 빌드 스크립트 허용), Dexie 4.4.5, zustand 5.0.15, three 0.185.1, astronomy-engine 2.1.19, i18next 26.4.2.
- `tsconfig`는 프로젝트 참조(`tsc -b`: app/node). 경로 별칭 `@/` → `src/`. `noUncheckedIndexedAccess`·`verbatimModuleSyntax` 켬.
- CI(`deploy.yml`)는 typecheck → lint → test → build → Pages. e2e(Playwright)는 로컬 전용(브라우저 설치 시간·CI 비용). 필요해지면 별도 잡으로 추가.

## D-014 · 2026-09-06 · 데이터 팩 v1 포맷·ID 규칙 확정 (T0b)
- 원본: HYG **v4.4**(`hyg_v44.csv.gz`, codeberg Git LFS → `media/` 엔드포인트), OpenNGC `NGC.csv`+`addendum.csv`, d3-celestial 별자리 3종. 은하수 텍스처는 T1에서 결정(NASA SVS milkyway_* 또는 d3-celestial `mw.json`).
- 별 팩: 헤더 16B + 레코드 28B(J2000 단위벡터 f32×3, mag, bv, hip, hygId), 등급 오름차순. bright ≤ 6.5(8,920개, 244KB), deep ≤ 9.0(83,476개, 2.3MB). 인코더/디코더는 `src/catalog/starPackFormat.ts` 한 곳(스크립트·앱 공유).
- `stars-bright.v1.json`(이름/메타 별 3,171개)에 **ra/dec(J2000 도)를 추가**(계획 포맷에 없던 필드) — 팩 없이도 검색·상세·출몰 계산이 좌표를 쓰기 위함.
- DSO id: M > NGC > IC. NGC/IC가 없는 유명 천체는 **`dso:C<n>`(콜드웰)·`dso:B<n>`(바너드)** 허용(`ObjectId` 타입·정규식 확장): C9 동굴성운, C14 이중성단(쌍; NGC869/884는 별칭 C14만), C41 히아데스, C99 석탄자루, B33 말머리.
- **M102 = NGC 5866**(OpenNGC는 M101 중복으로 처리하지만 관행을 따름), M73은 OpenNGC 타입 'Other'지만 메시에라서 포함. OpenNGC `Dup` 행은 마스터의 별칭으로 흡수(C37→NGC6882, C50→NGC2239).
- 포함 규칙: 메시에 110 + 콜드웰 109 + (V ≤ 10 또는 B ≤ 10.8 또는 공통 이름 또는 한글 이름) → 661개. `*`(단일 별)·`NonEx`·`Nova` 제외.
- 검색 정규화: NFC → 소문자 → 공백·하이픈·밑줄·점·따옴표·가운뎃점·괄호 제거. 그리스 문자 별칭은 α/alpha/Alp/알파 4종. 클라이언트도 같은 함수를 써야 한다(T3에서 `src/catalog/search.ts`로 이식).
- 별자리 한글: 한국천문학회 표기 우선(백조자리·헤르쿨레스자리·**작은여우자리**). d3-celestial ko와 다른 항목은 빌드 로그에 표시.
- 기준 표: `tests/fixtures/reference-altaz.json` — JPL Horizons(대전 2026-09-06 21:00 KST, airless) 토성·목성·달·화성. astronomy-engine과 RA/Dec·alt/az ≤ 0.1° 일치 확인.

## D-015 · 2026-09-06 · astronomy-engine 래퍼 경계와 씬 행렬 규약 (T0b)
- `Horizon`/`DefineStar`/`Constellation`은 `src/astro/frames.ts`·`events.ts` 안에서만 호출. 바깥 API는 도(deg)·J2000. `Horizon`의 굴절 인자는 타입상 `string | undefined`이므로 "굴절 없음"은 `undefined`로 넘긴다.
- `eqjToSceneMatrix()`는 기저 벡터를 `RotateVector`로 돌려 열을 만든다(엔진의 행렬 관례에 비의존). 반환은 **column-major Float32Array(9)** → `THREE.Matrix3.fromArray`/GLSL `mat3` 그대로.
- 굴절은 Sæmundsson(참→겉보기)을 CPU(`refraction.ts`)와 GLSL(`render/shaders/refraction.glsl`) 두 곳에 동일하게 둔다. 값을 바꾸면 둘 다.
- 출몰 해석식은 검증·근사 전용. 실제 표시는 astronomy-engine 검색 함수.

## D-016 · 2026-09-07 · G2(한국어 이름 표) 병합 규칙
- 맥락: GPT Pro G2 산출물(`plan/research/`: 별 233행·별자리 88·DSO 66·콜드웰 109·28수 표·검토 메모)이 도착. 콜드웰 NGC/IC 대응은 T0 큐레이션과 **109개 전부 일치**(독립 출처 2개 합치 → 검증 완료로 간주).
- 결정(`scripts/data/merge-g2.ts`, 재실행 가능):
  - 별자리: G2(한국천문학회 용어표, confidence high) 우선 → **허큘리스자리, 여우자리**로 교정(T0의 헤르쿨레스자리·작은여우자리는 폐기). 계절 분류도 G2.
  - 별: 기존 통용 표기(아르크투루스 등)를 표시명으로 유지, G2의 Stellarium 번역 표기(아크투루스 등)는 새 `aliases_ko` 컬럼에 검색 별칭으로. 전통 이름은 유명한 것(직녀성·견우성·북극성·천랑성·노인성)을 우선하고 G2의 28수 역할명(왕랑, 대장 등)은 보조. "…의 구성별"(성군 그룹 관계)은 데이터에 남기되 **검색 별칭에서 제외**. G2에만 있는 120개 별 추가 → 큐레이션 240행.
  - DSO: 기존 붙여쓰기 표기(안드로메다은하) 유지, G2 띄어쓰기·대체 이름은 `alt_names_ko`. 새 id 9개(M77, M102, NGC40, NGC1275, NGC1499, NGC3132, NGC4038/4039, IC2118) 추가.
  - `needs_review`: confidence low 또는 한글 이름 빈칸만 true. 나머지는 편집 검토 완료로 본다(음역 미세 조정은 T8).
- 보류: Naga/HIP64962, Bade(HIP 충돌)는 G2 메모대로 제외. 28수 표는 A7(전통 별자리 오버레이) 때 사용 — Stellarium korean 자료는 GPL v2이므로 **선 연결 데이터는 복사하지 않고** 기준별·이름 표만 참고.

## D-017 · 2026-09-07 · T1 렌더러 결정: 투영·은하수·크기 규칙·라벨 임계
- **투영**: 원근 투영(PerspectiveCamera), 사용자 FOV는 **짧은 변 기준 3°~100°**(`render/projection.ts`). 스테레오그래픽 투영(SHOULD)은 보류 → 110° 대신 상한 100°. 카메라 롤 0, 고도 ±89.5° 클램프.
- **은하수**: NASA SVS 이미지는 직접 파일 요청이 403(Referer·UA 붙여도)이라 포기. **d3-celestial `mw.json`(BSD-3)을 빌드 시 1024×512 등적색 회색조 PNG로 래스터화**(`scripts/data/build-milkyway.ts`, sharp SVG, 5단계 누적 밝기, ±180° 경계 링은 unwrap 후 3회 오프셋). 렌더러는 J2000 방향에서 UV(u = RA/360, v = 0.5 + Dec/180)를 계산하므로 이미지 방향 오류가 없다. 45 KB, 프리캐시.
- **별 크기**: `s0 = 4.5px × pixelRatio × clamp(√(60/FOV), 0.7, 3.5)`, `size = s0·10^(−0.2·(mag+소광))`, 하한 1.2px(그 아래는 알파 감소), 상한 18px. mag < 1.5 가우시안 글로우. B−V → RGB 8점 표(Mitchell Charity 근사). 낮에는 `skyBrightnessPenaltyMag(태양 고도)`를 한계등급에서 빼서 별·행성·DSO·라벨을 숨긴다.
- **행성·태양**: 크기 = max(7px, 등급 기반(상한 18px), 각지름 px). 태양은 등급을 쓰지 않고 max(22px, 각지름×2.2). 달은 구 메시(반지름 = 98·tan(각지름/2)) + 태양 방향 DirectionalLight + 앰비언트 0.08(지구조) → 위상 자동. "확대 표시"는 ×3.
- **레이어 순서(renderOrder)**: 배경 0 → 은하수 10 → 별 20 → DSO 22 → 격자 25·기준선 26 → 별자리 경계 29·선 30 → 행성 35·달 36 → 땅 40·지평선 링 41. 전부 depthTest off, 투명 블렌딩(별·은하수는 Additive).
- **라벨**: HTML div 풀, 최대 60개, 사각형 겹침 회피. 우선순위 선택 > 방위 > 행성 > 고유명 별(FOV 100°→mag 1.5, 60°→2.5, 30°→3.5, 10°→5.0, ≤10° 전부) > 메시에(FOV ≤ 60°) > 별자리 이름(FOV ≥ 90° 12개, ≥45° 16개, 그 외 24개).
- **DSO 표시**: FOV > 60° 메시에 mag ≤ 5만, 30~60° 메시에 전부 + mag ≤ 6.5, 15~30° ≤ 8.5, 6~15° ≤ 10.5, 그 이하 전부. 기호 크기 = 각지름 px, 7~48px.
- **팩 교체**: FOV < 20°에서 `stars-deep` 지연 로드, > 28°에서 bright로 복귀(히스테리시스).
- **hit-test**: 반경 24px, 가중치 = 거리 − 2.5·(6 − mag). 달·행성은 원반 반지름만큼 거리 차감.
- **시간·시점 공유**: `#/sky?t=ISO&alt=&az=&fov=&rate=&select=` 해시 쿼리. 해시 변경 시 재적용. `preserve=1`은 테스트 전용(preserveDrawingBuffer).
- **렌더 루프**: invalidate 패턴. 정지 시 draw 0(HUD로 확인). 실시간은 행렬 1초·행성 250ms 간격, 시간 점프(≥60s)는 즉시.
- **T2 훅**: `CameraController.setOrientationQuaternion(q)` — 씬 프레임 쿼터니언 → alt/az. `viewStore.mode = 'sensor'`일 때 센서 프로바이더가 매 프레임 호출하면 된다.

## D-018 · 2026-09-07 · T2 센서 계층 결정 (G1 리서치 반영, 실기기 검증 전)
- **Provider 우선순위**(G1 §A7-1): `deviceorientationabsolute`(Android, 자북) → `AbsoluteOrientationSensor`(Generic Sensor, 선택적) → `deviceorientation`(absolute=true면 자북, 아니면 iOS 상대 + `webkitCompassHeading`). 1.5초 안에 유효 샘플이 없으면 다음 Provider. 데스크톱은 시뮬레이터(설정 → 개발자 → 센서 디버그). 권한 요청은 "폰으로 하늘 보기" 버튼 탭 안에서만(`requestPermission` 기능 감지, iOS 식별 아님).
- **자세 변환**(`sensors/orientation/math.ts`): `q_scene = qY(α)·qX(β)·qZ(−γ)·qX(−π/2)·qZ(−θ)` — Three.js 구 DeviceOrientationControls와 동일, G1이 `S·Rz(α)Rx(β)Ry(γ)Rz(−θ)`와 동치임을 검산. 카메라 = 로컬 −Z(후면 카메라). α는 위에서 볼 때 반시계(heading = 360 − α). 방위 = `atan2(p_x, −p_z)`, **+Y 양의 회전은 방위를 줄이므로** `yawQuaternion(Δaz) = qY(−Δaz)`. 8개 테스트 벡터 × 화면 회전 4개 통과.
- **편각**: WMM2025(`magvar` 2.2.0, MIT). 대전 2026-09 = **−8.70°**(서편각). 진북 방위 = 자북 방위 + D. 자북 소스(Android 절대, **iOS `webkitCompassHeading`도 자북** — WebKit `WebCoreMotionManager`가 `magneticHeading`을 전달한다는 G1 확인)에 한 번만 적용. 별 정렬 δ가 있으면 정렬이 편각을 흡수(재적용 금지). 설정에서 끌 수 있고 디버그 패널에 값 표시. task-02 초안의 "iOS 기본 미적용"은 G1 근거로 **적용**으로 바꿈 — 실기기 3-자세 프로토콜로 확정.
- **iOS yaw 동기화**(`compassSyncCandidate`): 상단 축(+Y) 기준(`compassAxis='top'`, 미검증 상태), |β| ≤ 60°·|γ| ≤ 45°·투영 길이 ≥ 0.5·accuracy 0~15°·정지(각속도 < 10°/s)일 때만 δ 후보 = (heading + D) − 상단축 상대 방위. 초기값 5샘플 원형 평균, 이후 τ=3s 지수 평활, 15°/s 이상 튀는 값 무시. 세운 자세(β≈90°)·젖힌 자세에서는 갱신 중단(180° 반전 방지).
- **필터**(`OrientationFilter`): slerp 저역통과 τ=100ms, 각속도는 100ms 창 변위로 측정(노이즈가 30°/s처럼 보이는 것 방지), > 30°/s면 이득 1, 출력 데드밴드 0.2°(추정치는 항상 갱신 — 첫 샘플 편향 고정 방지), 절대 소스는 yaw τ=500ms 별도 평활. 이상 감지: 한 샘플(≤120ms) 사이 yaw ≥ 15° & pitch 변화 < 5°. 단위 테스트: 정지 잔여 < 0.2°, 90° 스텝 2° 이내 ≤ 150ms.
- **보정 모델**: `q_world = R_yaw(δ)·q_sensor` + 피치 오프셋(카메라 오른쪽 축). `solveYawOffset(samples[])`는 여러 별의 원형 평균·잔차를 내므로 T5 폰-경통 정렬로 확장 가능. 보정 마법사 3단계, 드래그 미세 조정, 저장된 보정은 같은 관측지 이름이면 재사용.
- **AR UX**: 수동 드래그 → 5초 일시 정지("수동") 후 자동 복귀, "센서 복귀" 버튼. 롤은 기본 반영(설정 "수평 유지"로 무시). 진동은 Android만, 시각 플래시가 1차 피드백, 소리는 옵션.
- **위치**: `getCurrentPosition`(12초) → 정확도 > 100m면 `watchPosition`으로 30초까지 개선. 마지막 위치는 Dexie `settings('sensor.lastFix')`. 시작 시 기본 관측지 > 마지막 GPS > 대전 프리셋. `coords.heading`은 쓰지 않는다(이동 방향).
- **관측지 범위(C15)**: `Site.visibleAz = [[start, end]]`(단일 구간, 시계 방향), `minAltDeg`. T3 추천의 하드 필터. 하늘 화면의 범위 밖 어둡게 표시는 보류.
- **미검증(실기기 필요)**: iOS heading 축·자세별 동작, Android 편각 부호 체감, 실제 지연·떨림, 화면 회전. 결과 반영 후 `task-2-done`.
- **2026-09-07 추기**: 사용자 실기기 테스트 통과("매우 괜찮음, 문제 없이 잘 됨"). 덤프·기기 정보 없이 통과 보고만 있어 위 기본값을 그대로 확정하고 `task-2-done` 태그. iOS 축·편각 가설은 문제 보고가 있을 때 덤프로 재검토.

## D-019 · 2026-09-07 · T3a 결정: 검색 엔진·상세 계산·찾아가기·관측 밤
- **검색 라이브러리 없음**: MiniSearch/Fuse 대신 `search-index.v1.json`(3,929 항목·약 3만 정규화 별칭) 선형 탐색. 질의당 0.5~3ms(수용 기준 50ms). 이유: 인덱스가 이미 정규화되어 있고 한글·기호 규칙을 우리 함수로 통제해야 하며(빌드 `scripts/data/lib.ts`가 `src/catalog/normalize.ts`를 재export), 랭킹(등급·밝기·지평선·유명 천체)을 직접 정의하는 편이 짧다.
- **랭킹 규칙**: exact(0) < prefix(100) < substring(200) < fuzzy(300, 편집 거리 1·4자 이상) + 등급(mag) − 유명 천체 5 + 지평선 아래 20. 별자리 "…자리" 뗀 별칭과 한국어 음역 확장(`koreanLatin.ts`)은 **약한 일치**(정확 일치라도 prefix 등급) — "안드로메다"는 M31, "오리온자리"는 별자리가 1위. 초성 질의는 prefix 등급.
- **가장자리 화살표**: 카메라 공간 x·y를 직접 써서 방향을 정한다(원근 나눗셈이 없으므로 task-03 §4의 "뒤쪽 뒤집기"는 적용하지 않음 — 적용하면 뒤·오른쪽 목표가 왼쪽을 가리킨다). e2e에서 ±90° 방위 오프셋으로 검증.
- **상세 시트 계산**: "오늘"은 정오→정오(`nightKey`) 안의 사건만 표시(밖이면 —). 최적 시간대 = 어두운 구간(천문박명 사이, 없으면 항해박명·일몰~일출) ∩ 고도 ≥ 30°(없으면 20°) 최장 연속(10분 샘플, 최소 20분). 가장 좋은 달 = 매달 15일 현지 자정 LST와 적경 차 최소.
- **장비 판정(근사, UI에 "참고" 표기)**: 점광원은 한계등급 여유(맨눈 = Bortle NELM − 달 − 소광, 광학계 = 2+5log D − Bortle 4 대비 손실 절반 − 달 − 소광). 확산 천체는 표면 밝기(mag + 2.5log 면적) vs Bortle 하늘 배경(22.0…18.0 mag/arcsec²) 대비 + 쌍안경 +1.0 / 망원경 +2.0 보너스, 총 등급도 한계 안이어야 함. 기본 장비: 쌍안경 10×50, 망원경 90mm f/5.5(T5가 프로필로 대체). Bortle은 관측지(`Site.bortle`) 없으면 7.
- **어두운 창**: 천문박명 사이에서 달 고도 < 10°(굴절 포함) 구간. 5분 샘플 + 이분법 3회(≈1분). 달 나이 = 위상각/360 × 29.530588일. 독립 기준은 USNO rstt API(대전, 일몰·시민박명·월출몰 모두 ±2분 통과; timeanddate는 403이라 사용 안 함).
- **북마크(☆)**: Dexie `bookmarks`에 소프트 삭제(deletedAt)로 토글, 되살리기는 같은 행 재사용. T4가 목록·통계 UI를 확장.
- **씬 준비 대기**: `SkyScene.ready`는 카탈로그 로드 + 첫 행성 배치 후 resolve. 캐시된 데이터로 즉시 로드되는 재마운트에서 `flyToObject`가 첫 프레임 전에 호출되어 실패하던 문제의 원인.
- **보류**: 상세 시트 파인더 차트(SHOULD), 검색 Worker 이동, 어두운 창의 구름 반영(T3b), "실제 하늘처럼"(T3b).

## D-020 · 2026-09-07 · T3b 결정: 날씨·추천 엔진·천문 현상·실제 하늘처럼
- **날씨**: Open-Meteo만(키 없음, CORS 허용, CC BY 4.0 표기). 1시간 캐시는 Dexie `cache`. **7Timer ASTRO는 생략** — `astro.php` 응답에 `Access-Control-Allow-Origin`이 없어(curl로 확인) 브라우저에서 호출 불가. 프록시는 만들지 않는다(task-03 §9). 시상·투명도는 표시하지 않음.
- **추천 엔진**(`astro/recommend.ts`, 순수 함수): 10분 샘플마다 회전행렬 1개로 모든 고정 후보를 변환. 가시 조건 = 종류별 최소 고도(DSO 20·별자리 15·별 10·행성 8·달 5) ∧ 관측지 `visibleAz`/`minAltDeg` ∧ 구름 < 70% ∧ 종류별 어둠(태양 고도: DSO −12°, 별자리 −9°, 별 −6°, 행성 −3°, 달 0°). 안 보이는 이유(horizon/site/twilight/cloud)를 기록해 "곧 진다/올라오는 중"은 지평선·범위 때문일 때만. 최적 시각 = 고도 항 − 달 항의 최대 샘플. 점수 = 고도 30·(≥30° 지속) 20·달 −7×페널티(점광원 절반)·장비 판정 25/15/4·달·고전 5행성 +30(천왕·해왕 +8, 안 보이면 30%)·이벤트 +20·계절 +8·유명 +5·이중성 +6·신선도 +5. 점수용 판정은 달 제외(달은 M 항에서 한 번만), 그룹 배치용 판정은 달 포함. 그룹은 "가장 잘 맞는 장비" 규칙(맨눈 잘 보임이면 쌍안경 그룹 제외, 쇼피스 예외; 행성은 망원경 항상, 쌍안경은 달·목성·천왕·해왕만). 지금 당장 ≥ 35점·최대 8(별자리 2), 올라오는 중 ≥ 50점·최대 6. 계절 시그니처의 "체감 달"은 창 중앙 시각으로 보정(21시 +0, 01시 +2, 04시 +4개월).
- **장비 판정 보정**: 큰 산개성단(장축 ≥ 30′)은 적분 등급 + 1.5를 점광원처럼 판정(M45 잘 보임 / M44 어려움 at Bortle 7). 은하·구상성단은 중심부 보정 +1.5(면적 1/4).
- **천문 현상**(`astro/phenomena.ts`): 행성 충·합(`SearchRelativeLongitude` 0/180), 내행성 최대이각(시민박명 때 고도 ≥ 8°여야 "보임" — 2026-10-12 수성은 25°이각인데 9° 고도라 안 보임), 금성 최대 밝기(`SearchPeakMagnitude`), 달 위상 4분기, 월식(극대 달 고도 > 0)·일식(`SearchLocalSolarEclipse` ±1일 매칭), **슈퍼문은 Espenak 규칙**(망 거리 ≤ 근지점 + 10%×(원지점−근지점); ±1일 규칙은 2026-11-24를 놓침), 유성우 극대 밤 등급 = 달 조도 × (1 − 어두운 창 비율) → good ≤ 0.15, fair ≤ 0.45. 추천에는 충(±30일)·최대이각(±10일)·슈퍼문(±1일)·유성우 극대(복사점 별자리, ±2일) 보너스.
- **실제 하늘처럼**: 한계등급 = Bortle NELM − 달 페널티(박명은 렌더러가 태양 고도로 따로 뺌, 구름 미반영). Bortle은 레이어 설정 > 관측지 > 7.
- **오늘 밤 창**: 저녁 프리셋은 일몰부터(금성·초승달·목성이 박명 중에 보인다; DSO는 −12° 게이트가 막는다).
- **ObjectId 확장**: 데이터 팩 v1에 실재하는 `dso:Mel111`·`dso:Cr399`·ESO/PGC/UGC/HCG/MWSC/H 계열을 타입·정규식에 허용(팩 포맷 변경 없음, D-014 보완).
- 보류: 추천 Worker 이동, Krisciunas & Schaefer 달 모델, 파인더 차트.

## D-021 · 2026-09-07 · UI 리프레시(둥근 표면·유리 내비게이션 층)와 한국어/영어 카피 규칙
- 맥락: 사용자가 "딱딱하고 각진" UI를 요즘 유행(둥근 모서리)으로 바꾸길 원함. 리서치(iOS 26 Liquid Glass·Material 3 Expressive·NN/g·KRDS)와 코드 진단: 원인은 불투명 1px 외곽선·하드 디바이더·작은 반지름·모션 부재·uppercase 헤더.
- **토큰 v2**(`src/app/theme.css`): 반지름 xs8/sm12/md16/lg20/xl24/2xl28/3xl32/4xl40/pill(Tailwind 기본 스케일 덮어씀), 표면 층 bg→surface→surface-2→surface-3(야간 #120303/#1c0605/#260807), fg 알파 헤어라인(야간에 자동 붉음), 톤 상태색(accent-soft/success-soft/danger-soft), 그림자는 상단 1px 하이라이트 + 옅은 앰비언트, 유리(`glass`/`glass-strong`/`glass-sm`/`glass-off`, `@supports` 폴백, `prefers-reduced-transparency`·`html[data-glass='off']`), 스프링 이징(M3 Expressive ζ0.8/k380·ζ0.6/k800을 `linear()`로 샘플), 한글 타이포 스케일(본문 16/24), 야간 `--muted` #7a1010(1.9:1) → #d9503f(5.2:1).
- **구조**: 상태 바는 떠 있는 HUD 캡슐, 탭 바는 떠 있는 pill(활성 탭 accent-soft 인디케이터), 바텀 시트 28px 유리(하늘 위·반쯤 열림일 때만, 그 외 불투명), 하늘 컨트롤은 유리 캡슐, 레이어 패널·리스트·카드는 불투명. 유리 위 텍스트는 fg. 콘텐츠 화면은 인셋 그룹 카드(24px).
- **카피 규칙**(ko): 라벨은 짧은 명사형, 문장은 해요체(합쇼체 제거). 용어집: 천문박명 끝 → "완전히 어두워짐", 시작 → "밝아지기 시작", 항해박명 → "거의 어두워짐", 박명 → "어스름", 남중 → "가장 높을 때", 주극성 → "하루 종일 떠 있음", 각거리 → "…와 떨어진 각도", 각지름 → "보이는 크기", 조도 → "밝은 부분 %", 달 나이 → "월령", 상현망간/하현망간 → "차오르는 달/기우는 달", 한계등급 → "{{mag}}등급까지 보임", Bortle → "광해 N단계", 편각 → "나침반 북쪽 보정(편각)", 어두운 창 → "가장 어두운 시간", 별로 정렬 → "별에 맞추기", 시간 여행 → "시간 이동 중". 유지: 고도·방위·등급·일출/일몰/월출/월몰·관측지·천구 적도·황도·자오선·J2000. en은 sentence case·미국식 철자, "First light" 같은 은어 금지("Dark ends"), 편각 토글과 무관하게 참인 "Compass heading".
- 영향: e2e가 검사하는 문자열(보정됨·잘 보임·★ 예정됨·그믐달·삭제·복사됨·고도)은 유지. `Sites`의 Bortle 셀렉트는 i18n 키(`sites.bortle*`)로. 실기기 체크리스트에 "달이 캡슐 뒤에 있을 때 대비"·"야간 모드×유리 on/off" 추가.
- **추기(스크롤, D-022로 이관)**: `scroll-fade-y`(스크롤러 자체의 `mask-image`)는 폐기 — 아래쪽 페이드는 `ui/ScrollArea.tsx`의 오버레이가 그린다.
- **추기(재스타일 검토 반영)**: (1) `theme.css`의 베이스 리셋(`html/body`, `button{background:none;padding:0}`, `:focus-visible`)은 **반드시 `@layer base` 안에** — 레이어 밖 규칙은 `@layer utilities`를 이기므로 `bg-accent`·`px-*`가 전부 무시된다(캡슐 버튼이 투명하게 렌더된 원인). (2) `<main>`은 `isolate`로 스태킹 컨텍스트를 만들어 하늘 뷰 내부 z-index가 떠 있는 크롬(z-20)과 경쟁하지 않게 한다. (3) 시트 전체 높이는 `calc(100% − status − safe-area-top − 8px)`; 탭 pill 하단 여백은 `calc(--tab-inset + safe-area-bottom)`으로 `pb-tab`/`bottom-sky`와 같은 식. (4) 유리 유틸리티에는 그림자를 넣지 않고 `glass shadow-float`처럼 조합. (5) 보정 마법사 루트는 `pointer-events-none`(카드만 auto)이어야 캔버스 드래그 미세 조정이 동작한다. (6) 시트가 열리면 하늘 뷰 하단 독은 `invisible`(유리 위 유리 방지, 훅은 유지). (7) 유리 위 텍스트는 `text-fg`(muted는 대비 실패).

## D-022 · 2026-09-07 · 스크롤: 마우스 드래그 스크롤(관성) + 스크롤러 mask 폐기 + 얇은 스크롤바
- 맥락: 사용자 보고 "스크롤이 부드럽지 않고, 스크롤 바를 정확히 눌러야 스크롤된다 — 근처를 눌러도 위아래로 스크롤되게". 진단: (1) 마우스 환경(데스크톱 브라우저·Claude 앱 브라우저 창)에서는 브라우저가 콘텐츠 드래그로 스크롤하지 않는다(휠·스크롤바만). 터치 경로를 막는 요소는 없었다(`touch-action: none`은 캔버스·범위 링·시트 손잡이뿐). (2) 탭 화면·레이어 패널 스크롤러에 걸린 `mask-image`(D-021 `scroll-fade-y`)가 합성기 스크롤 최적화를 깨 폰에서 끊김을 만든다.
- **`ui/useDragScroll.ts` / `ui/ScrollArea.tsx`**: 세로 스크롤 영역은 `ScrollArea`(탭 화면 `TabScreen`·상세 시트 본문·설정 `ScreenFrame`·레이어 패널)로 통일하고, 높이 제한이 있는 곳(보정 마법사 후보 목록)은 훅만 붙인다. 규칙: `pointerType === 'mouse'`만 처리(터치·펜은 네이티브), 6px 임계값 뒤 첫 이동 방향으로 축 고정(가로면 가장 가까운 `overflow-x` 스크롤러 — 칩 행), 드래그 중 `user-select: none`·`cursor: grabbing`·`data-drag-scrolling="1"`, 놓으면 최근 100ms 속도로 관성(지수 감쇠 τ=325ms, 최대 4px/ms, 경계에서 정지), 휠·새 pointerdown이면 즉시 정지, 드래그 직후 400ms 안의 `click`은 캡처 단계에서 삼킨다(끌다 놓은 버튼이 눌리지 않게), 입력 요소·`[data-drag-scroll="off"]`·`touch-action: none` 조상에서 시작한 드래그는 무시(범위 링·시트 손잡이 보호).
- **페이드**: 스크롤러에 `mask-image`를 걸지 않는다. `ScrollArea fadeBottom`이 `relative` 래퍼 + `pointer-events-none` 그라디언트 오버레이(기본 `--bg`, 레이어 패널은 `--surface`)로 같은 28px 페이드를 그린다. 스크롤러에는 `overscroll-y-contain`(스크롤 체이닝 방지).
- **스크롤바**: `@layer base`에 `* { scrollbar-width: thin }` + `html { scrollbar-color: fg 24% / transparent }` — 얇고 야간 모드에서 붉어진다. 칩 행의 `[scrollbar-width:none]`은 utilities 레이어라 그대로 이긴다.
- 검증: 단위(`tests/unit/ui/useDragScroll.test.ts` — 임계값·클릭 억제·터치 무시·입력/off 영역·가로 축·관성·순수 함수) + e2e(`tests/e2e/scroll.spec.ts` — 마우스 드래그·관성·버튼 위 드래그 억제·CDP 터치 네이티브 스크롤·시트 본문).
- 보류: 스크롤 위치 복원(탭 전환 시), `scroll-snap`은 쓰지 않음. 유리(backdrop-filter)가 폰에서 무겁다고 느껴지면 설정 → 반투명 끄기(이미 있음).
