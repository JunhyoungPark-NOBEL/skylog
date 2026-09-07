# Changelog

형식: [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/). 버전은 Task 8(v1.0)부터 SemVer.

## [Unreleased]

### Added

- T3a: 검색(정규화·접두·퍼지·초성·한국어 음역, 카테고리 칩, 최근 검색, 지금 보이는 유명 천체 제안, 지금 상태), 천체 상세 바텀 시트(지금·오늘·좌표 복사·장비 판정·별자리 구성, 2단계·스와이프, ☆ 관측 예정 북마크), 찾아가기(가장자리 화살표·링·중앙 피드백·지평선 아래 안내), 관측 밤 계산(박명·월출몰·어두운 창)과 "오늘 밤" 하늘 상태 카드, 포맷 유틸.
- T0a: 프로젝트 셋업(Vite + React 19 + TS strict + Tailwind v4), 앱 셸(상태 바·5개 탭·설정), 테마 토큰(다크/적색 야간), i18n(ko/en), Wake Lock, Dexie DB v1(10 테이블), zustand 스토어 골격(settings는 Dexie persist), PWA(vite-plugin-pwa), GitHub Actions → Pages 배포, Vitest·Playwright 하네스, 디버그 HUD, `/debug/data` 페이지, 문서 골격.
- T2: 센서 연동 — GPS·관측지 관리(붙여넣기 좌표, 보이는 하늘 범위), 방향 센서 Provider 4종(절대 이벤트·Generic Sensor·iOS 상대+나침반·시뮬레이터), 자세 필터, WMM2025 편각, 1-별 정렬 마법사, AR 토글·수동 복귀, 센서 디버그 패널(덤프 복사), 피드백 유틸.
- T1: 천구 렌더러(Three.js) — 별·행성·달(위상)·태양, 별자리 선/경계/이름, 격자·적도·황도·자오선, 지평선·땅·방위, 은하수, DSO 기호, HTML 라벨, 탭 선택·툴팁, 드래그/핀치/휠/더블탭/flyTo 카메라, 박명·낮 하늘, 시간 바, 레이어 패널, 야간 모드 렌더러.
- T0b: 데이터 파이프라인(`data:fetch/build/validate`; HYG v4.4·OpenNGC·d3-celestial), 데이터 팩 v1(별 8,920/83,476, 별자리 88, DSO 661 = 메시에 110 + 콜드웰 109, 검색 인덱스, 유성우, 천체 메타), 큐레이션 표(한글 이름·콜드웰·유성우·콘텐츠 대상), G3 입력(`catalog-values.v1.csv`), `src/astro`(좌표·프레임·천체·출몰·박명·굴절·가시성·광학) + GLSL 굴절 청크 + 별 팩 로더, JPL Horizons 기준 표.
