# TESTING

## 자동 테스트

| 명령             | 내용                                                                                                                                                                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck` | `tsc -b` (app + node 프로젝트)                                                                                                                                                                                                                     |
| `pnpm lint`      | ESLint(typescript-eslint, react-hooks)                                                                                                                                                                                                             |
| `pnpm test`      | Vitest(jsdom + fake-indexeddb). `src/astro`·`src/sensors` 순수 함수는 테스트 필수                                                                                                                                                                  |
| `pnpm test:e2e`  | Playwright — Pixel 7 에뮬레이션, `Asia/Seoul`, `ko-KR`, Chromium `--use-angle=swiftshader --enable-unsafe-swiftshader`. `pnpm build` 후 `vite preview`를 자동으로 띄운다. 스크린샷은 `tests/e2e/__screenshots__/`에 저장되며 세션이 직접 확인한다. |

첫 실행 전 Chromium 설치: `pnpm exec playwright install chromium` (클라우드 환경이면 프리인스톨 Chromium 사용).

하늘 뷰(T1) e2e(`tests/e2e/sky.spec.ts`): 해시 쿼리 `#/sky?t=2026-09-06T12:00:00Z&alt=&az=&fov=&preserve=1`로 시각·시점을 고정하고 `window.__skylogScene`으로 alt/az·픽셀을 읽어 JPL Horizons 기준 표(`tests/fixtures/reference-altaz.json`)와 비교한다. 스크린샷: `sky-south/north/zenith/night/moon/day.png`. 야간 모드는 캔버스 픽셀을 읽어 적색 외 색이 없는지 검사한다(`preserve=1` 필요).

CI(`.github/workflows/deploy.yml`)는 typecheck → lint → test → build만 실행한다. e2e는 로컬에서 태스크 완료 전에 돌린다.

## 성능 측정

DevTools 대신 앱 내 **디버그 HUD**(설정 → 개발자 → 디버그 HUD): fps(rAF), 최대 프레임 시간, draw call(`src/render/stats.ts`, T1이 채움).

센서(T2) e2e(`tests/e2e/sensors.spec.ts`): 설정 → 개발자 → 센서 디버그에서 **센서 시뮬레이터**를 켜면 AR 버튼이 `SimulatorProvider`를 쓴다. 슬라이더(alpha/beta/gamma/heading/accuracy, absolute)로 폰 자세를 주입해 편각·정렬·수동 복귀를 검증한다. 실기기 문제 보고는 센서 디버그의 "덤프 복사" 텍스트를 붙여넣는다.

## 실기기(폰) 테스트 절차 템플릿

### T2 센서 체크리스트 (기기·OS·브라우저 버전을 함께)

```
기기/OS/브라우저:            탭 / 홈 화면 앱:
- [ ] AR 켜기 → 권한 프롬프트 → 허용 후 하늘이 움직임을 따라오는가 (지연 체감: 좋음/보통/나쁨)
- [ ] 폰을 북쪽(지도 앱 확인)으로 세우면 화면 중심 방위가 N±10° 안인가 → 디버그 덤프 붙여넣기
- [ ] 3-자세 프로토콜(iOS 필수): 랜드마크(방위 확인)를 향해 ① 45° 눕힌 자세 ② 세운 자세 90° ③ 젖힌 자세 120°에서
      각각 덤프(compassHeading, alpha, 화면 중심 방위). 세우는 순간 하늘이 180° 뒤집히는지 여부
- [ ] 폰을 눕혀 화면 위 → 천저(땅), 뒤집어 하늘 → 천정
- [ ] 1-별 정렬(낮: 태양 — 광학 기기 없이 폰만 / 밤: 달·밝은 별) → 다른 천체가 십자 근처에 오는가(오차 °)
- [ ] 드래그 → "수동" → 5초 후 센서 복귀
- [ ] 금속 책상/자석 근처에서 간섭 경고
- [ ] 가로 화면에서도 방향이 맞는가 · 10분 사용 후 발열/배터리
- [ ] (iOS) 권한을 한 번 거부한 뒤 안내 문구
```

사용자가 수행하고 결과를 다음 세션 시작 시 알려준다.

```
기기/브라우저: (예: Galaxy S23 / Chrome 130, iPhone 15 / Safari 18)
배포 URL: https://<owner>.github.io/skylog/
- [ ] 접속·로드 (스플래시 → 하늘 화면, 탭 5개)
- [ ] 홈 화면에 추가(설치) → 독립 창으로 열림
- [ ] 설정 → 적색 야간 모드: 흰색 남는 곳 없음
- [ ] 설정 → 언어 English → 탭 이름 바뀜 → 앱 재실행 후에도 유지
- [ ] 설정 → 화면 켜짐 유지: 1분 이상 화면 유지(지원 기기)
- [ ] 비행기 모드에서 앱 재실행 → 정상 로드(오프라인)
- 문제/메모:
```
