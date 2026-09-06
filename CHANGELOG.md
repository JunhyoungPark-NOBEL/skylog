# Changelog

형식: [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/). 버전은 Task 8(v1.0)부터 SemVer.

## [Unreleased]

### Added

- T0a: 프로젝트 셋업(Vite + React 19 + TS strict + Tailwind v4), 앱 셸(상태 바·5개 탭·설정), 테마 토큰(다크/적색 야간), i18n(ko/en), Wake Lock, Dexie DB v1(10 테이블), zustand 스토어 골격(settings는 Dexie persist), PWA(vite-plugin-pwa), GitHub Actions → Pages 배포, Vitest·Playwright 하네스, 디버그 HUD, `/debug/data` 페이지, 문서 골격.
- T0b: 데이터 파이프라인(`data:fetch/build/validate`; HYG v4.4·OpenNGC·d3-celestial), 데이터 팩 v1(별 8,920/83,476, 별자리 88, DSO 661 = 메시에 110 + 콜드웰 109, 검색 인덱스, 유성우, 천체 메타), 큐레이션 표(한글 이름·콜드웰·유성우·콘텐츠 대상), G3 입력(`catalog-values.v1.csv`), `src/astro`(좌표·프레임·천체·출몰·박명·굴절·가시성·광학) + GLSL 굴절 청크 + 별 팩 로더, JPL Horizons 기준 표.
