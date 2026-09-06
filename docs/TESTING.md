# TESTING

## 자동 테스트

| 명령             | 내용                                                                                                                                                                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck` | `tsc -b` (app + node 프로젝트)                                                                                                                                                                                                                     |
| `pnpm lint`      | ESLint(typescript-eslint, react-hooks)                                                                                                                                                                                                             |
| `pnpm test`      | Vitest(jsdom + fake-indexeddb). `src/astro`·`src/sensors` 순수 함수는 테스트 필수                                                                                                                                                                  |
| `pnpm test:e2e`  | Playwright — Pixel 7 에뮬레이션, `Asia/Seoul`, `ko-KR`, Chromium `--use-angle=swiftshader --enable-unsafe-swiftshader`. `pnpm build` 후 `vite preview`를 자동으로 띄운다. 스크린샷은 `tests/e2e/__screenshots__/`에 저장되며 세션이 직접 확인한다. |

첫 실행 전 Chromium 설치: `pnpm exec playwright install chromium` (클라우드 환경이면 프리인스톨 Chromium 사용).

CI(`.github/workflows/deploy.yml`)는 typecheck → lint → test → build만 실행한다. e2e는 로컬에서 태스크 완료 전에 돌린다.

## 성능 측정

DevTools 대신 앱 내 **디버그 HUD**(설정 → 개발자 → 디버그 HUD): fps(rAF), 최대 프레임 시간, draw call(`src/render/stats.ts`, T1이 채움).

## 실기기(폰) 테스트 절차 템플릿

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
