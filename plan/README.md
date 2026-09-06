# 별관찰해쌀뚜 (skylog) 계획 문서 — 읽는 순서

| 파일 | 내용 | 누가 읽나 |
|---|---|---|
| `00-master-plan.md` | 비전·결정·기능 매트릭스·아키텍처·데이터·공통 규약·로드맵·품질 기준·인수인계 규약 | 모든 세션(필수) |
| `STATUS.md` | 현재 진행 상황, 링크, 다음 세션이 알아야 할 것 | 모든 세션(필수, 매 세션 갱신) |
| `DECISIONS.md` | 결정 기록(ADR) | 모든 세션(갱신) |
| `task-00-setup-and-data.md` | T0 셋업·데이터 파이프라인·배포 | T0 세션 |
| `task-01-sky-renderer.md` | T1 천구 렌더러 | T1 세션 |
| `task-02-sensors-ar.md` | T2 센서·AR 모드·보정 | T2 세션 |
| `task-03-search-and-tonight.md` | T3 검색·상세·찾아가기·오늘 밤·날씨 | T3 세션 |
| `task-04-observation-log.md` | T4 관측 기록·북마크·통계·백업 | T4 세션 |
| `task-05-telescope-guide.md` | T5 망원경/쌍안경 가이드·스타 호핑 | T5 세션 |
| `task-06-content-pack.md` | T6 AI 요약 콘텐츠 팩 | T6 세션 |
| `task-07-learning.md` | T7 학습 시스템 | T7 세션 |
| `task-08-polish-release.md` | T8 마감·릴리스 v1.0 | T8 세션 |
| `99-deferred-tasks.md` | 보류 기능의 재개 조건과 접근 스텁 | T8 이후 |
| `gpt-pro-requests.md` | GPT Pro에 붙여넣을 요청 G1~G5 | 사용자 |
| `KICKOFF-PROMPT.md` | 첫 세션에 붙여넣는 킥오프 프롬프트(폴더 정리·GitHub 자동 생성·Pages·T0a) | 사용자 |
| `repo-CLAUDE.md` | 저장소 루트에 `CLAUDE.md`로 복사할 Claude Code 진입 지침 | T0a 세션 |

## Claude Code에서 시작하는 법 (경로 A, 확정)

1. GitHub에 빈 저장소(예: `skylog`)를 만들고 로컬에 clone한다(예: `~/dev/skylog`). 저장소 Settings → Pages → Source를 **GitHub Actions**로 설정.
2. 이 zip의 `skylog-plan/` 내용을 clone한 폴더의 `plan/`으로 복사하고, `plan/repo-CLAUDE.md`를 루트의 `CLAUDE.md`로 복사한 뒤 커밋(`docs: add plan and CLAUDE.md`).
3. Claude 데스크톱 앱 → **Code** 탭 → 환경 **Local** → 그 폴더 선택 → 모델 `fable`(Fable 5.1), 권한 모드는 처음엔 **Accept edits**(파일 수정은 자동, 명령 실행은 확인).
4. 아래 문구로 시작한다.

```
별관찰 프로젝트 Task 0 진행해줘. (T0a부터)
```

(실기기 테스트 결과나 GPT Pro 산출물이 있으면 함께 첨부: "Task 6 진행해줘. G3 배치 1 첨부")

## 실행 순서 요약

```
T0(a,b) ──► T1 ──► T2 ──► T3(a,b) ──► T4 ──► T5 ──► T6 ──► T7 ──► T8 (v1.0)
  │  │             ▲                          │      ▲      ▲
  │  └─ G3 입력 생성  G1 전에                  └ G4 후에  G3 전에  G5 전에
  └─ G2 병행
```

- T0와 T3는 각각 두 세션(a/b)으로 나뉘며, 프롬프트에 절단선이 명시되어 있다.
- 지금 바로 할 수 있는 GPT Pro 작업: **G1**(센서 리서치)과 **G2**(한국어 이름 표). 둘 다 코드가 없어도 된다.
- G3(콘텐츠)는 T0b가 끝나 `content-targets.v1.csv`·`catalog-values.v1.csv`가 나온 뒤에. G4는 T5 후, G5는 T7 전에.
- 계획 문서의 정본은 이 Claude 프로젝트의 문서(`plan/…`)다. 저장소에는 복제하지 않는다.
