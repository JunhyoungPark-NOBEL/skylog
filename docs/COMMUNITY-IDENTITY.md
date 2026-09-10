# 사진·댓글 작성자와 천문학 꾸미기

2026-09-10 구현 및 공개 Supabase 프로필 마이그레이션 적용 완료. 기존 회원 1명과 댓글 0개를 보존했고, 아바타 열·갱신 RPC·RLS를 확인했다. 익명 수정과 일반 회원의 정지 상태 수정은 차단된다. 실제 게시물 작성이나 회원 외형 변경은 하지 않았다. 읽기 검증 증거는 `artifacts/qa-build18/community-server-verification.json`에 있다.

일반 가입용 SMTP, 실제 운영 계정, 심사 접근과 운영 절차는 별도로 준비해야 한다. 구매 서버는 이번 프로필 마이그레이션에 포함하지 않았다.

## 사용 흐름

- 내 마당 → 아바타에서 기존 외형과 함께 별 모자·배경을 미리 본다. 아직 받지 않은 보상은 달성 조건과 진도가 표시되고 선택할 수 없다. 적용·취소·보관 코디 동작은 기존과 같다.
- 기존 관측·퀴즈 기록으로 성취 조건을 충족하면 내 마당을 열 때 보상이 지급된다. 같은 보상의 중복 지급을 막는 기존 Dexie 트랜잭션을 사용한다. 이미 받은 보상은 기록을 나중에 지워도 유지되고 기존 JSON 백업에 포함된다.
- 내 마당의 **사진과 댓글의 내 모습**에서 별도의 공개 닉네임과 현재 적용한 아바타를 확인하고 **이 닉네임과 모습 공개 동기화**를 누른다. 마당을 꾸미거나 코디를 보관하는 것만으로 서버에 전송하지 않는다.
- 서버 저장에 성공하면 기존 사진·댓글에도 최신 공개 모습이 사용된다. 목록/상세를 다시 열어 갱신한다. 오류 시 닉네임 초안을 유지하고 재시도할 수 있다. 마당 이름·배치·관측 기록·학습 답안·보상 이력·이메일은 이 동기화 요청에 포함하지 않는다.
- 사진 목록·사진 상세·댓글에 동일한 원형 SVG와 닉네임을 표시한다. 구형 작성자는 기존 별칭과 기본 아바타로 표시한다. 없거나 잘못된 별칭은 일반 관측자 이름으로 대체하며 로그인 이메일에서 이름을 만들지 않는다. 긴 별칭은 줄바꿈한다.

## 새 성취 보상

기존 장식 12종과 아바타 보상 6종을 보존하고 다음 6종을 더한다. 무료 기본 배경 `garden`은 기존 마당 모습이다.

| 선택 키              | 그림           | 기존 실제 성취 ID                | 획득 조건                           |
| -------------------- | -------------- | -------------------------------- | ----------------------------------- |
| `hat:starcrown`      | 별빛 왕관      | `badge-quiz-3`                   | 서로 다른 퀴즈 3개 연속 정답        |
| `hat:meteorcap`      | 유성 관측 모자 | `badge-summer-guide`             | 베가·데네브·알타이르 관측 기록      |
| `background:orion`   | 오리온 별자리  | `badge-constellations-2`         | 서로 다른 별자리 2개 관측 기록      |
| `background:moonlit` | 달빛 언덕      | `challenge-observation-nights-3` | 서로 다른 3일 밤 관측 기록          |
| `background:saturn`  | 토성의 고리    | `challenge-stages-cleared-5`     | 퀴즈 스테이지 5개 완료              |
| `background:galaxy`  | 나선은하       | `badge-messier-three`            | 서로 다른 메시에 천체 3개 관측 기록 |

그림은 기존 독자 SVG를 확장한 꾸미기 일러스트이며 관측 지도·실제 천체 사진으로 안내하지 않는다. 마당, 큰 미리보기, 원형 초상에 같은 선택을 사용하고 모든 그림은 기존 적색 야간 필터를 따른다. SVG 필터·clip ID는 인스턴스별로 생성한다.

## 공개 프로필 데이터와 권한

`202609100001_community_identity.sql`은 `sky_members.avatar` JSONB를 추가한다. 기존 행에는 원래 기본 아바타가 채워진다. 받는 필드는 아래 9개뿐이다.

`suit`, `skin`, `hat`, `hair`, `hairColor`, `expression`, `outfit`, `accessory`, `background`

DB의 `sky_valid_avatar` CHECK는 필드 개수와 각 enum 값을 검사한다. 추가 필드·누락·null·임의 URL·HTML·SVG·좌표·이미지 업로드는 허용하지 않는다. 클라이언트도 표시 전에 enum을 다시 정규화한다.

- `sky_update_profile(display_name, look, expected_user)`는 **security invoker**로 실행한다. 인증 주체가 화면에서 동기화한 계정과 다른 경우 `ACCOUNT_CHANGED`로 거부하고, 탈퇴·정지 계정은 거부한다.
- 일반 회원에게는 본인 행의 `name,avatar` 두 열 UPDATE만 허용한다. RLS는 `id=auth.uid() and not suspended`를 USING과 WITH CHECK 양쪽에서 적용한다. `id`, `suspended`, `accepted_at`이나 다른 회원의 프로필을 바꿀 수 없다.
- 읽기는 기존 회원 RLS를 유지한다. 양방향 차단·정지 상태와 운영자 읽기 범위를 기존과 동일하게 적용한다. 사진/댓글의 본문·미승인 상태·나만 보기·삭제·신고·재검토 RPC에는 권한 확장을 하지 않는다.
- 닉네임은 1~24 Unicode 문자이며 이메일용 `@`, `< >`, 제어문자·방향 바꾸기 등 숨은 형식 문자를 제한한다. 마이그레이션은 기존 별칭을 임의로 바꾸지 않으며, 새 쓰기부터 검사한다. 기존 잘못된 공개 별칭은 UI에서 일반 관측자로 대체한다.
- 외형은 표시용 데이터다. **로컬 보상을 서버에서 검증한 성취, 구매 소유권, 경쟁 점수로 취급하지 않는다.** 다른 작성자의 안전한 보상 그림을 보는 것이 내 장비/배경의 소유권을 지급하지 않는다. 결제·권한 판정은 별도 서버 기준을 사용해야 한다.
- 계정 삭제의 기존 `auth.users → sky_members` CASCADE가 공개 아바타도 제거한다. 별도 파일 저장은 없다. 직접 업데이트에도 동일한 DB enum/닉네임 CHECK를 적용한다.

사진·댓글에서는 화면에 필요한 작성자 ID만 묶어서 읽는다. 서버에서 아직 `avatar` 열이 없는 경우 PostgreSQL `42703`에 한해 기존 이름 조회로 폴백한다. 프로필 저장 RPC가 미배포라면 준비 중 오류를 표시한다. 네트워크 실패나 권한 실패를 성공으로 가장하지 않는다.

기존 Supabase 클라이언트의 인증된 RPC를 사용하므로 Edge 함수의 서비스 키 경로를 새로 열지 않는다. `supabase/functions/community/index.ts`의 사진 업로드/서명 URL/삭제/백업 동작은 변경하지 않는다.

## 검증 및 공개 전 확인

2026-09-10 로컬 검증: 관련 단위 **47개**, 신규 프로필 PostgreSQL/RLS **27개** 및 기존 커뮤니티 **46개**, 안정된 preview에서 모바일 Chromium **15개**가 통과했다. 타입 검사·대상 ESLint·변경 파일 포맷 검사도 통과했다. 360px 영어 125%에서 가로 넘침이 없고 공개 아바타의 밝은 픽셀에서 적색 이외 누출 비율이 0.1% 미만이었다. 새 야간/구형 작성자 시나리오의 JS 예외는 0개였다.

초기 dev 실행에서는 개발 서버의 HTML 감지/재시작 중 스플래시에서 3개가 시간 초과되어 중단하고 기록을 보존했다. 검사 제한을 늘리거나 제품 조건을 생략하지 않고, 파일 감지 제외 설정과 정적 preview로 전환하여 같은 15개 전체를 다시 통과했다. `artifacts/qa-community-identity/e2e-preview.log`와 `artifacts/qa-build18/community-results`에 최종 근거를 보관한다. 그림의 직접 시각 검토는 별 왕관·은하 배경 미리보기, 사진 작성자 원형 초상, 영문 야간 초상을 포함한다.

단위 검사는 구형 프로필, 새 보상 지급·장착·백업, 공개 enum 정규화, 이메일 폴백, SVG ID 충돌, 동기화 명시성·오류 초안·계정 변경 후 늦은 응답을 확인한다. 로컬 PostgreSQL/PGlite 검사는 익명 쓰기, 다른 회원 수정, 잘못된 외형, 운영자 열 변경, 정지/차단/삭제와 계정 변경 요청 거부를 확인한다. 기존 커뮤니티 DB 검사도 신규 마이그레이션을 포함해 실행한다.

재현 명령:

```text
pnpm exec vitest run tests/unit/avatar.test.ts tests/unit/personalAvatar.test.ts tests/unit/communityIdentity.test.tsx tests/unit/publicProfileSync.test.tsx tests/unit/communityComments.test.tsx tests/unit/comments.test.ts tests/unit/avatarEditor.test.tsx
node tests/backend/community-identity.test.mjs
pnpm test:community-db
pnpm exec playwright test tests/e2e/community-identity.spec.ts tests/e2e/avatar.spec.ts tests/e2e/personal-community.spec.ts tests/e2e/comments.spec.ts --workers=1
```

브라우저 검사는 격리된 API 모킹과 시험 관측/정답 기록으로 수행한다. 실제 게시물·회원·메일을 만들지 않는다. 실제 공개 서버에서의 DB 마이그레이션 적용, 앱의 개인정보 고지 갱신, 실계정 동기화 및 Android/iPhone 확인은 통합 담당자가 별도로 진행한다. 실제 학습/관측과 별개로 시험 자료임을 명확히 구분한다.
