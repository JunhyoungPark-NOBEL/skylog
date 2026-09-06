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

## D-008 · (Task 0에서 확정) · 프로젝트 라이선스
- 제안: 코드 MIT, `public/data/` 파생 데이터 팩 CC BY-SA 4.0(HYG·OpenNGC 파생). 앱 내 고지에 Open-Meteo(CC BY 4.0)·7Timer 크레딧 포함.

## D-009 · 2026-09-06 · 계획 문서의 정본은 코드 저장소의 `plan/` (Claude Code 로컬 실행 기준)
- 맥락: 실행 도구를 Claude Code(데스크톱 Code 탭)로 확정. Claude Code 세션은 저장소 파일을 직접 읽으므로 저장소가 정본이어야 한다.
- 결정: 저장소 `plan/*`(STATUS·DECISIONS·task 프롬프트·research·reports)가 정본, `CLAUDE.md`가 읽기 순서를 지시. 갱신은 커밋. Claude 프로젝트 문서 사본은 초기 배포본·백업(태스크 종료 시 STATUS만 복사, 선택). 저장소 `docs/`는 코드 문서(ARCHITECTURE·DATA-LICENSES·TESTING·RELEASE).

## D-010 · 2026-09-06 · Dexie DB v1은 Task 0에서 생성, settings는 Dexie가 단일 진실 원천
- 결정: T0에서 10개 테이블(observations, bookmarks, sites, telescopes, eyepieces, binoculars, blobs, progress, settings, cache)을 v1으로 생성. zustand `settingsStore`는 persist storage 어댑터를 Dexie `settings`로 구현(localStorage 사용 안 함). T2(sites)·T3(bookmarks, cache)가 T4 전에 DB를 쓸 수 있다.
