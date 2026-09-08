# 오늘 밤·관측 코스·풍경 개선 (beta.5)

## 최신 버전 확인

- 기준은 원격 main `74b764f` 및 앱 소스 `377a665`(beta.4/build9)다. 첨부 ZIP은 소스가 아닌 단일 테스트 APK이며, 내부 APK SHA256 `efdfca31d55dfeb707d7d914b1a404bb14cb8d543b52f6f3549d4a4db75e761f`가 build9 공개본과 일치했다. 자동 센서/원형 하늘/업적48/장비 예시 변경을 포함한 최신 코드를 먼저 반영했다.
- ZIP 안의 자료를 새 작업 지시로 취급하지 않았다. 사용자 요청은 오늘 밤·코스·문구·풍경 UI 개선이다.

## 화면과 동작

- ‘관측 조건’→‘날씨’. 기온·구름·비 확률·바람과 시간별 예보를 먼저 보고, 습도/구름 높이는 펼쳐 본다. 밤하늘은 가장 긴 달빛 적은 시간·일몰·달의 밝은 부분을 요약한다. 출몰·어둠/달/구름 타임라인과 전체 어두운 구간은 상세에 그대로 남는다. 추천 계산과 날씨 원본을 바꾸지 않는다.
- 천문 일정은 목록이 기본이며 이번 달/다음 달 이름은 선택 상태와 무관하게 계산한다. 월간 달력의 날짜 선택·키보드 화살표/Home/End, 12개월 연간 보기·월 이동을 지원한다. 현재 달은 정오 기준 관측 밤이 아니라 현지 달력 날짜로 결정하며, 분 경계/앱 복귀/시계 변경 때 갱신한다. 자정에 월이 바뀌면 보기 방식은 유지하면서 이번 달로 돌아간다.
- 연간 일정은 한 달씩 비동기로 계산해 UI를 막지 않고 위치/시간대별 캐시를 사용한다. `ICS` 파일은 기존 OS 공유/다운로드 경로로 저장한다. UTC 시각·안정적인 UID·예약문자 이스케이프·UTF-8 75바이트 줄 접기를 지원한다. 달력으로 가져온 뒤의 자동 동기화/백그라운드 알림은 만들지 않았다. 유성우 극대는 기존 데이터의 근사 날짜다.
- 코스 첫 화면은 맨눈/쌍안경/망원경 세 테마. 테마→세부 코스→미션으로 이동하며, 망원경→스타호핑 입문에 대표 경로6개를 둔다. 기존 path/mission/hopCourse 링크와 완료 ID·백업·업적 증거는 보존한다. theme/group 해시로 새로고침/뒤로가기 시 현재 단계를 복원한다.
- 스타호핑에서 ‘시야 0.2개’는 ‘보이는 원 너비의 약20%’로 바꾼다. 거리는 기존 실제 장비 시야·각거리로 계산하며 임의로 늘리지 않는다.
- 새 장식 풍경은 실제 지형이나 지평선 장애물 데이터가 아니다. 지평선 주변에만 낮게 표시하고, 화면 중심 고도 0°→−28°에 smoothstep으로 지면/풍경을 100%→0%로 감쇠한다. 기존 사용자 지면 투명도에 곱하며 별·선·라벨·선택에도 같은 유효값을 적용한다. 풍경을 끄면 기존 수동 지면 동작으로 돌아간다. 실제 추천/관측 가능성/태양 차단에는 영향을 주지 않는다.

## 디자인 참고와 구현 판단

- [Google Material 3 Expressive 연구](https://design.google/library/expressive-material-design-google-research)의 크기·형태·묶음으로 핵심을 구별하는 접근을 참고했다. 기존 테마와 둥근 카드는 유지하고 기온/관측 시간/장비 테마처럼 먼저 판단할 정보를 크게 배치했다. Google의 연구 수치를 이 앱의 성능 향상 수치로 주장하지 않는다.
- [Apple WWDC25 디자인 기초](https://developer.apple.com/videos/play/wwdc2025/359/)의 정보 우선순위와 단계별 공개를 참고했다. 앱에 적용한 ‘요약→펼치기’, ‘장비→코스→미션’ 구조는 이 작업의 설계 판단이다.
- 달력 파일은 [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545) 형식을 따른다. 별도 외부 달력 SDK나 새 패키지 없이 구현했다.

## 풍경 이미지·생성 기록

- 내장 **image_gen** 도구로 새 이미지를 생성했다(CLI/API 대체 실행 없음).
- 사용 에셋: `public/landscapes/meadow-v1.webp`, 2172×724, alpha 보존, 331,322 bytes. 생성 PNG를 내용 변경 없이 WebP로 압축했다. 초기 PWA 프리캐시와 native 번들에 포함한다.
- 원본은 현재 PC의 `.codex/generated_images/01a07b8d-fc61-7b40-9646-7c998091705f/exec-e5dc6a53-1852-49f9-9fb5-979b138ccfd0.png`. 앱은 저장소의 WebP만 참조한다.
- 최종 생성 프롬프트:

```text
Use case: stylized-concept. Asset type: production transparent panorama texture for an astronomy sky map, grass and flowers along a very low horizon. Generate a wide 3:1 image, 1536x512 if possible, genuinely transparent background with alpha. Peaceful natural meadow strip, fine short green grass with sparse small white daisies and tiny muted wildflowers, painterly realistic texture with soft twilight lighting. Terrain surface is nearly level and continues seamlessly from left edge to right edge, horizontal tileable. The top 50% must be empty transparent sky. Grass tips and sparse flowers occupy only the next 15%, below them a dense low meadow lawn to the bottom edge. No hills, trees, buildings, people, sky, sun, stars, fog, text, logos, watermarks, UI or checkerboard drawing. Not a floating isolated turf patch: landscape continues beyond both side edges and all the way down to the lower edge. Preserve delicate alpha around blades and flowers. Low contrast, calm colors suitable for seeing bright celestial points above it. This is a decorative fictional meadow, not a photograph of any real observing site.
```

야간 적색 변환·밝기·아래 경계 혼합·투명화는 런타임 셰이더에서 처리한다. 천체 그림이나 실제 지형 사진을 복사하지 않았다.

## 실기기 확인

- [ ] 오늘 밤→날씨: 첫 화면에 기온/구름/비/바람이 보이고 상세를 펼쳐 원래 정보를 볼 수 있다.
- [ ] 천문 일정: 이번/다음 달 이름이 다르며 월간/연간 전환·날짜 선택·ICS 가져오기가 맞는다.
- [ ] 코스: 장비→세부 코스→미션/스타호핑, 새로고침·뒤로가기, 기존 진도가 유지된다.
- [ ] 하늘: 지평선 위 잔디/꽃은 낮게 보이고, 아래를 향하면 부드럽게 사라진다. 야간 적색·가로 화면·원형 하늘·오프라인에서도 확인한다.

## 최종 검증·산출물

- 소스15e7163 / 태그v0.1.0-beta.5-build10, 단위501개, 브라우저58개 고유 시나리오(전체+관련 재검사), 타입/lint/data·PWA/native 성공. 공개 웹 beta.5·날씨HTTP200·SW/오프라인·JS 오류0 확인.
- Android API36 오프라인 WebView1/1·lint오류0/경고33, iOS arm64 무서명 컴파일/build10·풍경내장 확인. 기존 Play 업로드 키로 서명 AAB를 검증했고 공개 다운로드 SHA256도 일치한다. [릴리스](https://github.com/JunhyoungPark-NOBEL/skylog/releases/tag/v0.1.0-beta.5-build10). 스토어 제출·실제 폰 센서/그래픽·iPhone 서명IPA는 남는다.
