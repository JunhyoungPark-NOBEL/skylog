# Claude Code 첫 세션용 킥오프 프롬프트

> 준비: ① 빈 폴더 `skylog`를 만들고 그 안에 `skylog-plan.zip`을 푼다(→ `skylog/skylog-plan/…`). ② 데스크톱 앱 Code 탭 → Local → `skylog` 폴더 선택 → 모델 `fable`, 권한 모드 **Auto**(gh·git 명령이 많아서 Accept edits면 승인 클릭이 잦음). ③ 아래 블록을 그대로 붙여넣는다. GitHub CLI(`gh`)가 설치·로그인되어 있으면 저장소 생성·Pages 설정·push까지 전부 자동이다.

```
이 폴더는 새 프로젝트 skylog(별관찰해쌀뚜, 천체 관측 PWA)의 시작점이야. 아직 코드는 없고 계획 문서만 `skylog-plan/` 폴더에 있어. 아래를 순서대로 전부 자동으로 진행해줘. 나에게 물어볼 것은 GitHub 로그인이 안 되어 있을 때뿐이고, 나머지는 기본값으로 진행하되 가정은 보고에 명시해.

1. 정리: `skylog-plan/`을 `plan/`으로 이름을 바꾸고, `plan/repo-CLAUDE.md`를 루트에 `CLAUDE.md`로 복사해.
2. 읽기: `CLAUDE.md` → `plan/STATUS.md` → `plan/00-master-plan.md` → `plan/task-00-setup-and-data.md`. 이 문서들이 이후 모든 규칙이야.
3. git: 저장소가 없으면 `git init -b main`, 기본 `.gitignore`(node, dist, data-src/raw) 작성, 첫 커밋 `docs: add plan and CLAUDE.md`.
4. GitHub 자동화(gh CLI 사용):
   - `gh auth status`로 로그인 확인. 안 되어 있으면 `gh auth login` 방법을 알려주고 거기서 멈춰.
   - `gh repo create skylog --public --source=. --remote=origin --push` (public인 이유: 무료 계정의 GitHub Pages는 public 저장소만 지원. 코드는 MIT라 문제 없음)
   - Pages를 GitHub Actions 소스로 켜기: `gh api -X POST repos/{owner}/skylog/pages -f build_type=workflow` (이미 있으면 `-X PUT`). 
   - 저장소 URL과 Pages URL(`https://<owner>.github.io/skylog/`)을 `plan/STATUS.md` 링크 섹션에 기록.
5. `plan/DECISIONS.md`의 D-007(경로 A: Claude Code 로컬)에 이 환경 정보(OS, node/pnpm 버전, gh 로그인 계정)를 덧붙여.
6. **Task 0a 실행**: `plan/task-00-setup-and-data.md`의 §0 절차와 §3 MUST 1·2·5·6(툴체인, 앱 셸·테마·i18n·Dexie v1·스토어, PWA + GitHub Actions 배포, 테스트 하네스·디버그 HUD)을 수행해. Vite `base`는 `/skylog/`. push 후 `gh run watch`로 배포 워크플로가 성공하는지 확인하고, Pages URL이 실제로 열리는지(`curl -I`) 확인해.
7. T0a 수용 기준(§6 T0a) 체크 → 마스터 플랜 §9.2 템플릿으로 완료 보고 → `plan/STATUS.md`·`plan/DECISIONS.md` 갱신 → 커밋·push. 시간이 남으면 이어서 **T0b**(§3 MUST 3·4: 데이터 파이프라인, `src/astro`)를 시작하고, 끝나지 않으면 STATUS에 정확히 어디까지 했는지 남겨.

규칙: `CLAUDE.md`와 마스터 플랜 §6(규약)·§8(품질 기준)을 지켜. 패키지 버전은 `npm view <pkg> version`으로 최신 안정 버전을 확인해서 써. 외부 다운로드가 막히면 대체 경로(사용자 업로드)를 안내해. 완료 보고 끝에는 내가 폰으로 확인할 실기기 체크리스트와, 지금 GPT Pro에 돌릴 요청(G1·G2, `plan/gpt-pro-requests.md`)을 알려줘.
```

## 이후 세션 문구

```
별관찰 프로젝트 Task N 진행해줘.
```

(실기기 테스트 결과·GPT Pro 산출물이 있으면 `plan/research/`에 파일로 넣고 "G3 배치 1은 plan/research/G3-content-batch-1.json에 있어"처럼 경로를 알려준다.)

## gh CLI가 없을 때

- macOS: `brew install gh` · Windows: `winget install GitHub.cli` → `gh auth login`(브라우저 인증). 그 후 위 프롬프트를 다시 붙여넣으면 된다.
