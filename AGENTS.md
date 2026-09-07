# AGENTS.md — skylog (별관찰해쌀뚜)

> 이 파일은 저장소 루트에 `AGENTS.md`라는 이름으로 둔다. Codex는 세션을 시작할 때 이 파일을 자동으로 읽는다.

## 이 저장소는 무엇인가

별·달·행성 관측용 개인 PWA. 하늘 뷰(센서 AR) → 검색/추천 → 관측 기록 → 망원경 push-to 가이드 → AI 요약 스토리 → 학습. 계획 문서 전체가 `plan/`에 있다.

## 세션 시작 시 반드시 할 일 (순서대로)

1. `plan/STATUS.md` 읽기 — 어느 태스크까지 끝났는지, "다음 세션이 알아야 할 것".
2. `plan/00-master-plan.md` 읽기 — 공통 규약(§6: ObjectId, 좌표계, astronomy-engine 호출 규칙, DB 스키마, 디렉터리), 품질 기준(§8), 인수인계(§9).
3. 사용자가 지목한 `plan/task-0N-*.md` 읽기. 그 파일의 "0. 세션 시작 절차"를 따른다.
4. `pnpm install && pnpm typecheck && pnpm test`로 저장소가 건강한지 확인한 뒤 시작한다(T0a 이전에는 생략).
5. 실행 계획을 5~10줄로 제시하고 바로 진행한다. 결정이 꼭 필요한 항목만 질문한다.

## 세션 종료 시 반드시 할 일

- `plan/STATUS.md`(태스크 상태·링크·다음 세션이 알아야 할 것·완료 보고 요약)와 `plan/DECISIONS.md`(새 결정) 갱신 후 **커밋**.
- 마스터 플랜 §9.2 완료 보고 템플릿으로 마지막 메시지 작성(실기기 체크리스트·사용자 액션 포함).
- 태스크 완료 시 `git tag task-N-done`.

## 절대 규칙 (마스터 플랜 요약)

- TypeScript strict, `any` 금지. `src/astro`·`src/sensors` 순수 함수는 Vitest 필수.
- astronomy-engine의 `Horizon`/`DefineStar`/`Constellation`은 RA **시간(hours)** 단위·of-date 좌표 — 반드시 `src/astro` 래퍼로만 호출.
- 씬 프레임 +X=동, +Y=천정, +Z=남. 방위 북=0°, 동=90°. 데이터 파일 각도는 도(deg).
- 데이터 팩 포맷(`public/data/*.v1.*`)을 바꾸면 버전을 올리고 DECISIONS에 기록.
- Stellarium 코드·데이터 복사 금지(라이선스). 외부 CDN 스크립트 금지(오프라인).
- 비밀값(API 키)을 코드·문서에 넣지 않는다. 필요한 키는 현재 없다.
- 실기기(폰) 테스트는 사용자가 한다 → 배포 URL과 체크리스트를 제공한다.
- 한 태스크가 한 세션에 끝나지 않으면 프롬프트의 절단선(T0a/T0b, T3a/T3b)에서 멈추고 STATUS에 기록.

## 명령

`pnpm dev` · `pnpm build` · `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm test:e2e` · `pnpm data:fetch` · `pnpm data:build` · `pnpm data:validate`

## 언어

UI·문서·주석은 한국어, 식별자·커밋 메시지 본문은 영어(Conventional Commits: `feat:`, `fix:`, `data:`, `docs:`, `test:`).
