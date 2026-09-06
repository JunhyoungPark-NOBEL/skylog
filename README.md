# 별관찰해쌀뚜 (skylog)

별·달·행성 관측용 개인 PWA. 폰을 하늘로 들어 올리면 그 방향의 별·행성·별자리를 보여주고(센서 AR), 검색·추천 → 관측 기록 → 망원경 push-to 가이드 → AI 요약 스토리 → 학습으로 이어진다.

- 배포(GitHub Pages): **https://junhyoungpark-nobel.github.io/skylog/** · 저장소: https://github.com/JunhyoungPark-NOBEL/skylog
- 계획 문서: [`plan/`](plan/README.md) — 세션은 [`CLAUDE.md`](CLAUDE.md) → `plan/STATUS.md` 순서로 읽는다.
- 코드 문서: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/TESTING.md`](docs/TESTING.md) · [`docs/DATA-LICENSES.md`](docs/DATA-LICENSES.md)

## 개발

요구: Node ≥ 22.12 (`.nvmrc` = 24), pnpm (`packageManager` 참조).

```bash
pnpm install
pnpm dev            # http://localhost:5173/skylog/
pnpm build && pnpm preview
```

| 스크립트                                                     | 내용                                                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `pnpm typecheck` · `pnpm lint` · `pnpm format`               | 정적 검사                                                                                         |
| `pnpm test`                                                  | Vitest 단위 테스트                                                                                |
| `pnpm test:e2e`                                              | Playwright 스모크(모바일 에뮬레이션, 스크린샷) — 최초 1회 `pnpm exec playwright install chromium` |
| `pnpm data:fetch` → `pnpm data:build` → `pnpm data:validate` | 데이터 팩 파이프라인(T0b)                                                                         |
| `pnpm gen:icons`                                             | `public/icon.svg` → PWA 아이콘 PNG                                                                |

폰에서 개발 서버 보기: `pnpm dev --host` 후 같은 Wi-Fi에서 접속(센서 API는 HTTPS가 필요하므로 실기기 센서 테스트는 배포 URL을 쓴다).

## 배포

`main`에 push하면 `.github/workflows/deploy.yml`이 typecheck → lint → test → build → GitHub Pages 배포를 수행한다. Vite `base`는 `/skylog/`이며 `VITE_BASE`로 바꿀 수 있다.

## 라이선스

코드 MIT(`LICENSE`), 데이터 팩 CC BY-SA 4.0(`public/data/LICENSE`, `docs/DATA-LICENSES.md`).
