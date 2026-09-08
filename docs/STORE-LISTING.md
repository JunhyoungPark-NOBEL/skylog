# 스토어 등록 문안 초안

> **beta.7 제출 전 변경 필수**: 선택형 계정·공유 사진/댓글·개인 클라우드 백업이 추가됐다. 아래 beta.4~6의 “로그인 없음/서버 수집 없음” 초안을 그대로 제출하지 않는다. 이메일·사용자 ID·공개 콘텐츠·선택 백업(위치/사진/학습 포함), Supabase 처리/삭제를 실제 구현 기준으로 신고하고 UGC/연령·검토용 계정·운영 연락처를 준비한다. 앱 내 온라인 계정 삭제는 제공된다. 일반 메일/운영 개통·실기기 검증은 아직 대기다. 전 기능 무료/광고 없음/인앱구매 없음. [현행 구현](FREE-COMMUNITY.md).

현재 제공되는 기능만 설명한다. AAB/컴파일 성공은 스토어 심사 승인이나 센서 실기기 인증을 뜻하지 않는다. 개발자 이메일, 배포 지역, 대상 연령, 계정 인증은 소유자가 Console에서 확정한다.

## 한국어

- 이름: 별관찰해쌀뚜
- 짧은 설명: 오늘 밤의 별을 찾고, 관측을 기록하며, 퀴즈와 스타호핑으로 밤하늘을 배워요.
- App Store 부제: 별을 찾고 기록하는 나만의 밤하늘

하늘을 올려다보는 순간부터 오늘 본 별을 기록하는 시간까지, 별관찰해쌀뚜와 함께해요.

• 별·별자리·달·행성을 하늘 지도에서 찾아보세요. 센서가 있는 휴대폰에서는 방향을 따라 하늘을 살펴볼 수 있어요.
• 오늘 밤 보기 좋은 천체와 관측 조건, 달과 주요 천문 일정을 확인하세요.
• 봤던 모습과 메모, 사진, 스케치를 기록하고 내 관측 기록을 돌아보세요.
• 망원경과 쌍안경의 시야를 비교하고, 나침반으로 바로 시작하는 별길 가이드로 목표 방향을 찾아가세요.
• 미라크에서 안드로메다은하까지, 대표 스타호핑 코스를 따라 실제 하늘에서 천체를 찾아보세요.
• 관측 기초부터 망원경 종류·용도·광학 원리까지, 단계별 퀴즈와 코스로 배워요.
• 야간 모드와 한국어·영어 조작 화면을 제공해요. 일부 이야기와 기존 학습 자료는 한국어 중심이에요.

하늘 지도와 이야기·학습 자료는 앱에 포함돼 오프라인에서도 이용할 수 있어요. 새 날씨 정보와 외부 참고 링크는 인터넷 연결이 필요해요. 기록은 기기에 저장되며 JSON 백업으로 보관하거나 옮길 수 있어요.

별길 가이드는 나침반으로 대략 방향을 안내하며, 정밀하게 맞추려면 밝은 별 정렬을 선택할 수 있어요. 카메라로 별을 자동 인식하거나 망원경 모터를 제어하지 않아요. 센서 지원과 정확도는 기기에 따라 달라요. 태양을 망원경이나 쌍안경으로 직접 보지 마세요.

## English

- Name: Skylog: Explore the Night
- Short description: Find stars, record observations, and learn with quizzes and star-hopping.
- App Store subtitle: Find stars. Keep your story.

Explore the night sky, record what you see, and learn at your own pace.

• Find stars, constellations, the Moon and planets on an interactive sky map.
• Plan with tonight’s observing picks, conditions and astronomy events.
• Keep observations with notes, selected photos and sketches.
• Compare telescope and binocular fields of view. Start Starpath guide with compass directions and optionally align to a bright star for finer pointing.
• Follow classic star-hopping routes to the Andromeda Galaxy, Hercules Cluster and more.
• Progress through quizzes on the sky, observing skills and telescope types, uses and optics.
• Use night mode and Korean or English controls. Some stories and older learning material are primarily in Korean.

Sky, story and learning packs are included for offline use. New weather and external reference links require an internet connection. Records stay on your device and can be exported or transferred through JSON backups.

Starpath uses compass directions and motion sensors, with optional manual star alignment. It does not automatically recognise camera images or control telescope motors. Sensor support and accuracy vary by device. Never look directly at the Sun through a telescope or binoculars.

## 정책 입력 대조표

| 항목                   | 현재 구현에 따른 초안                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 로그인/앱 액세스       | 로그인 없이 모든 현재 기능 이용                                                                                                                                                                                                                                                                                                                                                              |
| 광고/결제/구독         | 없음                                                                                                                                                                                                                                                                                                                                                                                         |
| 추적/광고 ID           | 사용하지 않음                                                                                                                                                                                                                                                                                                                                                                                |
| 기기 내 기록·사진·학습 | 로컬 저장, 개발자 서버 자동 전송 없음                                                                                                                                                                                                                                                                                                                                                        |
| 위치                   | 새 설치에서 자동 사용 기본 켜짐. 권한 허용 후 앱 시작·복귀 때 한 번 확인하고 최근 위치는 재사용하며, 백그라운드 추적 없음. 관측지 화면에서 끌 수 있고 저장 관측지 선택 시 자동 꺼짐. 거부한 권한은 자동 반복 요청하지 않음. 마지막 위치·설정은 기기에 저장. 자동 GPS를 포함한 현재 관측 좌표가 날씨 요청 시 Open-Meteo로 전송됨. 정밀 좌표 가능, 기능 제공 목적, 사용자 계정과 연결하지 않음 |
| 서버 접속 정보         | 날씨·웹 앱 파일·외부 링크 요청 시 IP 등 일반 접속 정보 발생. 각 제공자 정책 적용                                                                                                                                                                                                                                                                                                             |
| 방향 센서              | 자동 사용 기본 켜짐. 지원 기기에서 필요한 권한 허용 후 앱 기능 중에만 사용하며 백그라운드에서는 중단. iPhone 등은 최초 버튼 탭으로 승인 필요. 자동 사용 끄기 가능. 원시 방향 값 외부 전송 없음, 권한 선택·설정·별 정렬 정보는 기기에 저장                                                                                                                                                    |
| 백업 공유              | 사용자가 선택한 대상에 명시적으로 내보냄. 사진·좌표 포함 여부 안내                                                                                                                                                                                                                                                                                                                           |
| 개인정보 URL           | https://junhyoungpark-nobel.github.io/skylog/privacy.html                                                                                                                                                                                                                                                                                                                                    |
| 지원 URL               | https://junhyoungpark-nobel.github.io/skylog/support.html                                                                                                                                                                                                                                                                                                                                    |
| 콘텐츠 등급/연령       | 폭력·도박·사용자 간 채팅 없음. 천문 교육 목적. 새 Apple/Play 질문지의 최종 답변과 아동 대상 여부는 소유자가 확정                                                                                                                                                                                                                                                                             |

등록용 아이콘 `store-assets/play-icon-512.png`와 한·영 피처 그래픽 `feature-ko-1024x500.png` / `feature-en-1024x500.png`를 준비했다. 자체 SVG에서 생성했으며 외부 이미지를 복사하지 않았다. 재생성은 `node scripts/store-assets.mjs`. [Google의 미리보기 자산 규격](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en)에 따라 피처 그래픽은 1024×500 불투명 PNG다.

스크린샷 후보: 하늘 지도, 간결한 오늘 밤, 기록, 퀴즈 스테이지, 별길 방향 카드, 스타호핑 코스. 실제 Play/TestFlight 빌드에서 개인정보 없이 최종 촬영한다. 브라우저 미리보기 캡처는 `tests/e2e/__screenshots__`에 있지만 실기기 검증 증거를 대신하지 않는다.
