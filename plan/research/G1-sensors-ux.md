# G1 — 모바일 브라우저 방향 센서 API 현황과 하늘 앱 UX 벤치마크

- 조사 기준일: **2026-09-06, 한국 시간**.
- 적용 대상: 개인용 별관찰 PWA의 T2 센서 계층과 T5 정렬·push-to 가이드 설계.
- 권장 저장 위치: `plan/research/G1-sensors-ux.md`.
- 근거 구분: **[확인]** 공식 명세·소스·개발사 문서에 근거함. **[유도]** 명시한 좌표 규약에서 직접 계산함. **[제안]** 우리 앱의 설계·시험 기준이며 제품 성능 보장이 아님. **[미확인]** 공개 근거가 부족하거나 해당 실기기에서 확인하지 못함.
- 조사 범위: 문서·공개 소스 조사와 좌표 변환의 수치 검산. **실기기 센서 측정, 여섯 앱의 직접 조작, 저장소 커밋은 수행하지 않았다.** 최신 문서와 과거 버전 문서를 구분했다. 본문 `[Sxx]` 링크의 URL·자료명은 끝의 출처 정의에 있다.

## 0. 먼저 고정할 결론

**이 PWA는 구현할 수 있다. 다만 “센서가 주는 각도를 그대로 카메라에 넣는 앱”이 아니라, 상대 자세·북 기준·보정 신뢰도를 분리하는 앱으로 설계해야 한다.** 망원경용 가이드는 폰 나침반만으로 정밀도를 약속하지 말고, 별 정렬 후의 방향 오차를 따로 측정해야 한다. 아래는 조사 결과에 따른 설계 판단이다.

| 쟁점 | 확인 결과와 설계 영향 |
|---|---|
| 신규 프로젝트는 Generic Sensor를 기반으로 삼을까? | **공통 기반은 DeviceOrientation을 권장한다.** 2026-05-14 W3C Orientation Sensor 초안은 기존 배포 유지용이며 신규 프로젝트에는 Device Orientation and Motion을 권고한다. Generic Sensor는 Android에서 검증된 선택적 Provider로 둔다. [S02] |
| iOS는 항상 진북인가? | **아니다.** 조사한 WebKit `main`은 `webkitCompassHeading`에 Core Location의 `magneticHeading`을 전달한다. “위치 권한을 받으면 Safari 값도 진북”으로 가정하지 않는다. 배포된 특정 iOS 빌드와의 동일성은 별도 확인한다. [S06][S07] |
| 폰 상단 방위와 카메라 방위는 같은가? | **아니다.** 상단 `+Y`의 수평 투영과 후면 `−Z`의 수평 투영은 다른 벡터다. 상단 투영은 β=90°에서 사라지고 그 너머에서 180° 뒤집힐 수 있다. 이 기하학과 iOS가 실제로 반환하는 heading의 자세별 동작은 구분한다. [유도, A3] |
| `requestPermission()`은 iOS 식별자인가? | **이제 아니다.** Chrome 151 릴리스 노트에 도입 내용이 있으며, MDN 호환성 데이터는 Chrome 152부터로 기록한다. 최초 적용 버전 기록에는 차이가 있으므로 기능 감지한다. [S04][S05] |
| Firefox Android는 절대 방향·진동을 지원하는가? | 절대 방향 이벤트는 호환성 데이터상 **110부터 지원**한다. 반면 Vibration은 **129부터 제거**됐다. 예전 호환성 표를 재사용하면 틀린다. [S03][S19] |
| iOS PWA는 7일 뒤 무조건 삭제되는가? | **아니다.** 현재 WebKit 정책은 홈 화면 앱의 1차 도메인을 ITP의 7일 스크립트 저장소 삭제 제한에서 명시적으로 제외한다. 저장 공간 부족·사용자 삭제·앱 제거 등에 대비한 백업은 여전히 필요하다. [S23][S24] |
| PhotoPills의 Night AR는 붉은 야간 모드인가? | **같은 개념이 아니다.** Night AR는 은하수 등의 위치를 카메라 위에 보여주는 기능이다. 별도의 적색 화면 모드는 이번 공식 자료 조사로 확인하지 못했다. [S51][S52] |

---

# Part A. “폰이 가리키는 하늘”을 위한 센서·브라우저 설계

## A1. 조사한 플랫폼과 버전

| 대상 | 기준일에 확인한 버전·상태 | 해석 |
|---|---|---|
| iOS Safari | iOS/iPadOS **26.6.1**, 2026-08-17 보안 릴리스 확인 | Safari 기능은 해당 OS의 WebKit과 함께 평가한다. 모든 기기에 이 버전이 설치됐다는 뜻은 아니다. [S30] |
| iOS 홈 화면 PWA | 위 OS에서 `standalone` 실행 | Safari 탭과 별도 시험 항목이다. 네이티브 WKWebView 앱의 권한 위임 API와 혼동하지 않는다. [S23][S17] |
| Android Chrome | **152.0.7977.82**, 2026-09-03 안정 채널 배포 공지 | 단계적 배포이므로 실제 기기 버전을 기록한다. [S31] |
| Samsung Internet / Samsung Browser | 공식 사이트는 Samsung Browser 명칭을 사용. Android 공개 릴리스 노트는 25.0.0.41/2024-05-11까지 확인 | **2026년 최신 Android 빌드 번호는 미확인.** 이 오래된 번호나 Windows판 번호를 최신 Android 버전으로 인용하지 않는다. [S33][S34] |
| Firefox Android | **155.0**, 2026-09-01 릴리스 확인 | 데스크톱 Firefox의 패치 번호를 Android에 그대로 대입하지 않는다. [S32] |

### A1-1. 방향 센서 지원표

`지원`은 API 구현 정보다. **해당 기기에 센서가 존재하고, 권한이 허용되며, 유효한 샘플이 도착한다는 보장은 아니다.** `alpha`는 나침반 heading 그 자체가 아니라 회전 표현의 한 성분이다. [S01][S02]

| 플랫폼 | `deviceorientation`의 α | `deviceorientationabsolute` | WebKit 나침반 필드 | Generic Absolute / Relative | 구현 판단 |
|---|---|---|---|---|---|
| iOS Safari | 상대 자세로 취급. α만으로 북을 결정하지 않음 | 미지원 | `webkitCompassHeading`, `webkitCompassAccuracy` | 둘 다 미지원 | 상대 자세 + 검증된 나침반 yaw 정렬, 또는 별 정렬. [S03][S06][S10][S11] |
| iOS standalone PWA | 위와 같은 센서 의미를 사용하되 실제 실행 모드별 시험 필요 | 미지원 | 사용 가능 경로. 유효값 수신 확인 필요 | 둘 다 미지원 | 설치했다고 센서 권한·북 기준이 개선되는 것은 아님. [S03][S06][S10][S11] |
| Android Chrome | 일반 이벤트는 상대 방향 경로를 우선 사용해 왔음. **샘플의 `absolute` 확인** | 지원 | 비표준 WebKit 필드를 전제로 하지 않음 | 둘 다 지원 | 절대 이벤트를 기본 경로로, Generic 쿼터니언은 선택적 Provider로 사용. [S03][S10][S11][S12] |
| Samsung Browser Android | Chromium 계열이지만 기기·엔진 버전을 확인. 일반 α의 북 기준을 가정하지 않음 | 호환성 데이터상 지원 | 전제로 하지 않음 | 호환성 데이터상 둘 다 지원 | Chrome과 같은 기본 경로, 실제 생성·샘플 시험으로 확정. [S03][S10][S11][S34] |
| Firefox Android | 이벤트의 `absolute`를 확인해 분류. 플랫폼 전체에 하나의 북 기준을 단정하지 않음 | **110+ 지원** | 전제로 하지 않음 | 둘 다 미지원 | 절대 이벤트 우선. 무응답이면 일반 이벤트를 검사하고 상대/수동 경로로 전환. [S03][S10][S11] |

**중요:** `absolute=true`는 “지구 기준 자세”이지 “진북으로 보정 완료”나 “정확도가 좋음”이라는 뜻이 아니다. 표준 절대 방향 프레임의 북은 자북이다. [S01][S02]

## A2. 권한, 거부, standalone

### A2-1. 공통 조건과 플랫폼 차이

| 항목 | 확인한 사실 | 앱의 처리 |
|---|---|---|
| 보안 컨텍스트 | 방향 센서·Generic Sensor는 보안 컨텍스트를 요구한다. [S01][S02] | HTTPS의 최상위 문서에서 시작한다. 로컬 개발 예외를 배포 동작으로 착각하지 않는다. |
| iOS 사용자 동작 | iOS의 방향 권한 요청은 사용자 클릭 같은 동작 안에서 해야 한다. [S13] | 첫 화면 자동 요청 대신 **“폰으로 하늘 보기”** 버튼에서 직접 호출한다. |
| 요청 API | 최신 명세의 `DeviceOrientationEvent.requestPermission(absolute=false)`는 기본 가속도계·자이로, 절대 요청이면 자력계까지 고려한다. 구현은 브라우저별로 다르다. [S01] | 메서드 존재를 검사한다. iOS 전용 UA 분기로 묶지 않는다. |
| Chrome의 새 메서드 | 151 릴리스 문서와 152 호환성 데이터의 최초 버전 기록이 다르다. [S04][S05] | API 존재 여부와 반환값을 우선한다. 메서드 존재만으로 “새 허용 팝업이 반드시 뜬다”고 설명하지 않는다. |
| Firefox Android | 호환성 데이터상 이 정적 권한 요청 메서드는 미지원. [S05] | 메서드가 없다고 방향 이벤트까지 미지원으로 판정하지 않는다. |
| 권한 거부 후 재요청 | 웹에서 사용자 결정을 강제로 초기화하거나 허용으로 바꾸는 API는 없다. 기존 거부 상태면 호출해도 거부가 유지될 수 있다. [S01] | 반복 팝업 대신 수동 보기 유지. 재시도는 사용자 선택으로만 제공한다. |
| iOS 설정 경로 | iOS 13 도입 시점의 공식 WebKit 안내는 JS 권한 요청을 사용한다. 과거 Safari의 **“Motion & Orientation Access” 토글 경로를 현재 복구 절차로 안내하면 안 된다.** “iOS 13 이후 삭제”의 정확한 Apple 공식 UI 변경 이력 및 최신 거부 초기화 경로는 미확인이다. [S13] | 없는 토글을 찾게 하지 않는다. 사이트 데이터 삭제·PWA 재설치를 기본 해결책으로 제시하지 않는다. |
| standalone 차이 | 홈 화면 앱의 데이터는 Safari와 격리된다. 센서 권한 허용·거부의 공유/보존 수명은 별도 실기기 확인이 필요하다. [S23] | Safari에서 허용했으니 PWA도 허용됐다고 가정하지 않는다. 탭/standalone의 최초 요청·거부·재실행을 각각 시험한다. |

**[제안] 클릭 처리 원칙:** 권한 요청을 호출하기 전에 네트워크 요청이나 불필요한 `await`를 넣지 않는다. 방향만 필요하면 Motion까지 불필요하게 요청하지 않는다. Motion도 필요하다면 같은 사용자 동작에서 각 요청을 시작한 후 결과를 기다린다. 승인 후에도 샘플이 없거나 모두 `null`이면 `granted-but-no-data`로 구분한다.

### A2-2. Permissions-Policy

표준상 RelativeOrientationSensor에는 `accelerometer`, `gyroscope`, AbsoluteOrientationSensor에는 추가로 `magnetometer`가 필요하다. 기본 허용 목록은 `self`다. [S02]

**[제안] 최상위 PWA의 응답 헤더 예시:**

    Permissions-Policy: accelerometer=(self), gyroscope=(self), magnetometer=(self), geolocation=(self), screen-wake-lock=(self)

센서용 정책과 위치·Wake Lock 정책은 별개다. `Permissions-Policy`는 브라우저 권한을 우회하는 허가장이 아니다. iframe이 필요하면 상위 응답 정책과 iframe의 `allow`를 함께 설계하되, **iOS를 포함한 교차 출처 iframe 동작을 지원표만으로 보장하지 않는다**. 과거 WebKit 이슈는 확인되지만, 그 이슈가 모든 최신 빌드에서 그대로 남아 있다고 단정하지 않는다. [S02][S14][S18]

## A3. 물리 축, heading의 의미, 180° 반전

### A3-1. 좌표계 계약

이후 모든 식은 **열벡터, 능동 회전, 오른손 좌표계**를 사용한다. 각도는 식·코드 내부에서 라디안이며 표의 입력/출력만 도 단위다.

| 프레임 | 축 |
|---|---|
| 기기 B | `+x`: 자연 화면 방향에서 오른쪽, `+y`: 기기 상단, `+z`: 화면 바깥, 즉 사용자를 향함. 후면 카메라 중심 시선은 이상화하면 `(0,0,-1)`. 화면 UI 회전으로 이 물리 축이 바뀌지 않음. [S01][S15] |
| 자북 ENU, M | `+X`: 자북에 직교하는 동쪽, `+Y`: 자북, `+Z`: 위. “자북 동쪽”과 지리적 동쪽의 차이는 편각 회전으로 처리. [S02] |
| 상대 프레임 R | 수직축을 기준으로 자세를 추적하지만 yaw의 원점은 임의. 시간이 지나며 드리프트할 수 있음. [S01][S02] |
| 최종 씬 S | `+X=지리적 동`, `+Y=천정`, `+Z=지리적 남`. 북은 `−Z`. 최종 렌더링 전 진북 또는 별 정렬 기준으로 변환. [제안] |

### A3-2. iOS 필드에서 확인한 것과 확인하지 못한 것

**[확인]** WebKit 공개 `main`의 `WebCoreMotionManager.mm`은 `magneticHeading`과 `headingAccuracy`를 방향 이벤트 경로에 전달한다. heading을 못 얻는 경로에는 0과 −1이 들어간다. 따라서 **heading=0은 북쪽일 수도 있고, accuracy=−1과 결합하면 무효값일 수도 있다.** 두 필드와 유효성을 같이 검사해야 한다. [S06]

Apple의 `magneticHeading`은 자북 기준 시계방향 방위이며, 어떤 기기 방향을 기준으로 할지는 `headingOrientation`과 관련된다. `headingAccuracy`는 도 단위의 추정 불확실성이고, 음수는 무효 상태다. **측정된 실제 오차의 확정 상한이나 브라우저 간 공통 신뢰구간으로 간주하지 않는다.** [S07][S08][S09]

**[미확인]** 공개 문서만으로는 `webkitCompassHeading`이 모든 iPhone·자세에서 항상 “물리적 상단 +Y의 수평 투영”과 정확히 같다고 보장할 수 없다. Core Location의 수직 자세 처리, heading 유지/재매핑, OS별 센서 융합은 웹 계약에 상세히 명시되어 있지 않다. 후면 카메라 `−Z` 방위라고 단정할 근거도 없다. **기본 후보는 portrait 상단 축 모델로 두되, A8 시험 전에는 `compassAxisVerified=false`로 취급한다.** [S06][S08]

### A3-3. 상단 축과 카메라 축이 갈라지는 정확한 식

**[유도]** W3C의 intrinsic Z–X′–Y″ 순서를 행렬로 쓰면:

$$R(\alpha,\beta,\gamma)=R_z(\alpha)R_x(\beta)R_y(\gamma).$$

물리적 상단 축의 기준 프레임 좌표는:

$$u=R(0,1,0)^T=(-\sin\alpha\cos\beta,\ \cos\alpha\cos\beta,\ \sin\beta)^T.$$

ENU에서 방위 함수를 `Az(v)=atan2(v_E,v_N)`로 두면:

$$A_{top}=\begin{cases}
\operatorname{wrap}_{360}(-\alpha),&\cos\beta>0,\\
\text{정의되지 않음},&\cos\beta=0,\\
\operatorname{wrap}_{360}(180^\circ-\alpha),&\cos\beta<0.
\end{cases}$$

상단의 수평 투영 길이는 `ρtop=|cosβ|`다. β≈90°에서는 아주 작은 자세 오차도 큰 방위 변화로 보일 수 있다. 여기서 생기는 반전은 **벡터 투영의 기하학**이지, 실제 iOS heading 출력에 대한 무조건적인 예측은 아니다.

반면 후면 카메라 시선은:

$$v=R(0,0,-1)^T=
\begin{pmatrix}
-\cos\alpha\sin\gamma-\sin\alpha\sin\beta\cos\gamma\\
-\sin\alpha\sin\gamma+\cos\alpha\sin\beta\cos\gamma\\
-\cos\beta\cos\gamma
\end{pmatrix}.$$

γ=0이고 0°<β<180°이면 카메라는 `Az=wrap360(−α)`, `Alt=β−90°`다. **β=45°→90°→120°에서 카메라의 방위는 유지되지만, 상단의 방위는 마지막 자세에서 180° 달라진다.** 따라서 상단 heading을 카메라 방위와 비교해 yaw를 보정하면 갑작스러운 180° 오정렬을 만들 수 있다. 회전 순서의 출처는 [S01], 위 벡터·분기식은 직접 유도했다.

## A4. Generic Sensor, 주파수, 화면 회전

### A4-1. 쿼터니언 계약과 주파수

**표준의 향후 방향:** 2026-05-14 Orientation Sensor 초안은 기존 배포를 위해 유지되며, 신규 개발에는 Device Orientation and Motion을 권고한다. 현재 Chromium 지원이 즉시 사라진다는 뜻은 아니다. **[제안]** 공통 센서 계층은 DeviceOrientation으로 완성하고, Generic Sensor는 분리된 선택적 구현으로 유지한다. [S02]

Generic OrientationSensor의 배열은 **`[x,y,z,w]`**, 즉 벡터부 먼저·스칼라부 마지막이다. 기본 `referenceFrame`은 `"device"`이며 `"screen"`도 정의한다. Absolute는 자북 ENU 기준 기기 자세, Relative는 임의 기준 자세다. [S02]

| 환경 | 권장 요청 | 상한·주의 |
|---|---|---|
| Chrome / Samsung의 Generic Sensor | `new AbsoluteOrientationSensor({frequency:60, referenceFrame:"device"})` | Chromium의 센서 API 공개 설계는 기본 최대 60Hz를 사용한다. **60Hz 요청은 실제 60개의 독립 샘플 보장이 아니다.** Samsung 개별 빌드·기기의 실제 상한은 미확인. [S16][S29] |
| iOS Safari / standalone | Generic Sensor 미지원이므로 방향 이벤트 사용 | 이벤트 주기를 측정한다. 디스플레이가 120Hz라고 센서도 120Hz라고 가정하지 않는다. 플랫폼 공통의 보장된 이벤트 주파수는 없음. [S10][S11][S01] |
| Firefox Android | 방향 이벤트 사용 | Generic Sensor의 frequency 옵션을 적용할 수 없음. 실제 이벤트 간격을 기록. [S10][S11] |

**[제안]** 센서 업데이트와 렌더 루프를 분리한다. 샘플 timestamp 차이의 중앙값·상위 지연값을 측정하고, 화면은 최신 자세를 보간한다. 장시간 샘플이 끊기면 마지막 자세를 “실시간”으로 표시하지 않는다. 초기 무응답 판정 1.5초는 시험용 제안값이며, 권한 UI를 기다리는 시간을 포함하지 않도록 한다.

### A4-2. screen.orientation과 lock

| 플랫폼 | 화면 방향 읽기 | `screen.orientation.lock()` | 앱 설계 |
|---|---|---|---|
| iOS Safari | 현행 버전 지원. Safari 16.4부터 Screen Orientation API 도입 | 미지원 | lock 없이 세로·가로 렌더링이 맞아야 함. [S20][S21] |
| iOS standalone | 방향 읽기 가능 | 설치만으로 런타임 lock 지원이 생기지 않음 | manifest orientation도 실기기에서 따로 시험. [S20] |
| Android Chrome | 지원 | 지원. 일반 탭은 fullscreen 등 조건의 영향을 받음 | 실제 Promise 성공을 확인. [S20][S22] |
| Samsung Browser | 호환성 데이터상 지원 | 지원 경로가 있으나 실제 버전·fullscreen/설치 조건 시험 | 실패해도 정상 기능을 유지. [S20][S22] |
| Firefox Android | 지원 | 현재 호환성 데이터는 **144+ 지원**, 79–143은 메서드가 있어도 오류를 내는 부분 구현으로 구분 | “메서드 존재”만으로 성공 판정 금지. [S20] |

**[제안]** 자연 기기 프레임을 제공하는 Provider는 카메라 자세에 화면 각도 θ를 한 번만 반영한다. Generic Sensor에서 이미 `referenceFrame:"screen"`을 선택했다면 동일 보정을 다시 하지 않는다. 폰을 경통에 고정했을 때의 물리적 경통 축 `t_b`는 UI의 세로·가로 회전으로 바뀌지 않는다. [S01][S02]

## A5. 정확도: 인용 가능한 숫자와 인용하면 안 되는 숫자

### A5-1. 나침반 오차

**2026년의 모든 브라우저에 적용할 “통상 ±3°” 같은 보장 범위는 확인하지 못했다.** 대신 실제 연구의 조건과 오차 종류를 함께 인용한다.

| 근거 | 관찰된 수치 | 적용 한계 |
|---|---|---|
| Tartachynska 외, 2026, 스마트폰 11모델·관찰자 12명 현장 시험 | 세 방향의 평균 절대 방위 편차 약 **1.9°, 5.5°, 6.9°**. Table 1에는 한 Galaxy S20/방향의 **30°27′** 편차도 있음. [S27] | 수평으로 든 폰의 나침반·시준 시험이다. 최신 Safari/Chrome의 하늘 지향 정확도 시험이 아니며, 방향·조작·자기장 영향이 함께 들어감. |
| 위 연구의 오차 지표 해석 | 방향별 기준값 편차와 논문의 RMSE 열은 동일한 수치가 아님. [S27] | 이를 하나의 “±오차”로 합치거나, 연속 측정의 차이를 그대로 °/분 자이로 드리프트로 환산하지 않음. |
| 개발사 보정 안내 | Star Walk 2와 PhotoPills는 주변 금속·전자기기·자기장으로부터 벗어나고 센서가 안정될 시간을 두도록 안내. [S42][S53] | 8자 동작을 몇 번 했다고 보정 성공이 증명되지는 않음. |

**[제안]** 제품 설명은 “대략적인 방향 찾기, 별로 맞추면 개선”으로 시작한다. 기기별 QA에서는 외부 기준에 대한 **방위 편향, 정지 중 산포, 자세별 최대 오차, 정렬 후 경과 시간에 따른 오차**를 따로 기록한다. 나침반 accuracy 수치가 작더라도 외부 기준 오차가 클 수 있으므로 둘을 섞지 않는다.

### A5-2. 자기장 간섭과 경통 장착

**[제안·시험 항목]** 자석 케이스/자석 거치대를 제거한 경우, 비자성 받침, 금속 삼각대 근처, 실제 경통 장착 상태를 A/B 비교한다. 모든 금속이 같은 영향을 주는 것은 아니므로 “금속에서 정확히 몇 cm 떨어지면 안전” 같은 보편 거리는 정하지 않는다. 장착 상태에서 방위에 따라 오차가 달라지면 단일 yaw 상수만으로는 충분하지 않을 수 있다. 자기장 간섭 자체의 근거는 개발사 안내와 현장 연구다. [S27][S42][S53]

### A5-3. 자이로 드리프트의 실측 보고

Barthold·Subbu·Dantu의 **2011년 Nexus S 연구**는 정지 원시 자이로 적분의 yaw 드리프트 기울기 크기를 **0.015795 rad/s**로 보고했다. 단위 변환하면 **약 54.30°/분**이다. 15회 시험의 평균값이며, 연구는 이후 실험에 드리프트 보정을 적용한다. **이 값은 2026년 브라우저의 융합된 RelativeOrientationSensor나 iOS 자세 데이터에 적용할 수 없다.** [S28]

현행 상대 방향 표준과 Android game rotation vector 문서는 yaw 드리프트 가능성을 인정하지만, 기종 전체에 공통인 °/분 상한은 제공하지 않는다. **현행 타깃 브라우저의 정렬 후 드리프트는 미확인이므로 직접 측정해야 한다.** [S02][S26]

**[제안]** 실제 장착 상태에서 별 정렬 후 0·1·3·5분의 오차와 회전 후 복귀 오차를 측정한다. 3D 오차는 `acos(clamp(p_est·p_ref,-1,1))`로 계산한다. 천정 근처에서는 방위 오차만으로 성능을 평가하지 않는다.

## A6. 보조 API와 데이터 보존

### A6-1. 지원 요약

| API | iOS Safari | iOS standalone | Chrome Android | Samsung Browser | Firefox Android |
|---|---|---|---|---|---|
| Screen Wake Lock | 지원 | **18.4부터 과거 standalone 문제 수정** | 지원 | 호환성 데이터상 지원 | **126+ 지원** [S17][S18] |
| Vibration | 미지원 | 미지원 | 지원, 사용자 동작·장치 조건 영향 | 지원 경로, 장치 확인 | **129부터 제거** [S19][S35] |
| Geolocation 위치/고도 필드 | 지원, 고도 `null` 가능 | 동일 원칙 | 동일 원칙 | 동일 원칙 | 동일 원칙 [S25] |
| `storage.persist()` | **Safari 17+ 지원** | 지원, 홈 화면 앱 여부가 허용 휴리스틱에 포함 | 지원 | 호환성 데이터상 지원 | 지원 [S24][S36] |

Wake Lock은 가시성·전원 상태 등에 따라 해제될 수 있다. **[제안]** 사용자가 화면 유지 기능을 켰다는 상태와 실제 lock 획득 상태를 분리하고, `visibilitychange`로 돌아올 때 필요하면 다시 요청한다. 앱을 떠나도 무조건 계속 켜져 있다고 약속하지 않는다. [S68]

**[제안]** 진동은 선택적 부가 피드백으로만 사용한다. iOS와 현행 Firefox에서는 시각 표시를 기본으로 하고 음성/효과음은 사용자가 선택하게 한다. `vibrate()`의 반환값을 실제 진동 발생의 측정값으로 취급하지 않는다.

### A6-2. 위치 고도와 정확도

Geolocation `altitude`는 **WGS84 타원체 위 높이(m)**이며, `altitudeAccuracy`는 고도 정확도(m)다. 확보하지 못하면 `null`일 수 있다. 일반 해발고도 데이터와 무조건 동일하지 않다. `enableHighAccuracy`는 요청 힌트이지 특정 정확도 보장이 아니다. 또한 `coords.heading`은 **이동 방향**이며 폰이 향한 방위가 아니다. [S25]

**[제안]** 위치 권한 거부 시 관측지 수동 입력을 제공한다. 고도 미수신은 센서 모드 전체 실패로 취급하지 않는다. 저장한 관측지, 실제 GPS 위치, 시간 여행 위치를 서로 구별해 보여준다.

### A6-3. “iOS IndexedDB 7일 삭제”의 정확한 해석

| 질문 | 답 |
|---|---|
| 7일 규칙이 사라졌는가? | 현재 WebKit 정책에 여전히 명시되어 있다. JS 쿠키, IndexedDB, LocalStorage, Service Worker 등록과 캐시 등이 대상이다. [S23] |
| 저장한 순간부터 달력상 7일인가? | 2020년 도입 설명은 **사용자 상호작용 없이 지난 Safari 사용일 7일** 기준을 설명한다. 단순 TTL로 구현하거나 안내하지 않는다. [S37] |
| 홈 화면 앱도 똑같이 적용되는가? | **아니다.** 현행 문서는 홈 화면 앱의 1차 도메인을 해당 ITP 7일 삭제에서 제외하고, Safari와 데이터가 격리된다고 명시한다. [S23] |
| `persist()`가 true이면 영구 백업인가? | 아니다. persistent 저장소의 자동 eviction 보호와 ITP 예외는 구분해야 한다. WebKit은 홈 화면 실행 여부 등을 보고 요청을 판단한다. 반환값을 확인해야 한다. [S24] |
| 앱의 결론 | **[제안]** IndexedDB + 트랜잭션 + 버전 있는 내보내기/가져오기를 기본 제공. 설치 안내와 `persist()`는 보조 수단. 권한 복구 때문에 관측 기록을 지우지 않는다. |

---

## A7. 권장 Provider 계층과 iOS 절대 방향 복원

### A7-1. Provider 우선순위 — 지원 여부와 품질을 별개로

다음은 위 지원 사실을 바탕으로 한 **설계 제안**이다.

| 플랫폼/상황 | 우선순위 |
|---|---|
| iOS Safari / standalone | `deviceorientation + 검증된 webkitCompassHeading` → 상대 자세 + 별/랜드마크 정렬 → 수동 하늘 보기 |
| Android Chrome / Samsung | `deviceorientationabsolute` → `deviceorientation` 중 `absolute=true` → 선택적 `AbsoluteOrientationSensor` → 상대 이벤트/선택적 RelativeOrientationSensor + 별 정렬 → 수동 |
| Firefox Android | `deviceorientationabsolute` → 일반 이벤트의 `absolute=true` → 상대 이벤트 + 별 정렬 → 수동 |
| 금속 경통 등 자기장 환경이 나쁜 경우 | API 순위와 별개로 **상대 자세 + 별 정렬**을 선택할 수 있게 한다. 절대 센서가 존재한다고 무조건 더 정확하지 않다. [S02][S26] |
| 사용자가 센서를 명시적으로 거부한 경우 | 다른 API를 몰래 순회해 거부를 우회하지 않는다. 수동 기능을 유지하고 사용자 주도의 재설정만 제공한다. |

**[제안]** 위 순서는 신규 PWA의 기본값이다. 특정 기기에서 Generic Sensor의 샘플 품질·지연이 더 좋다고 확인되면 사용자 동의 범위에서 우선순위를 올릴 수 있다. 어느 경우에도 Generic Sensor만 구현하고 DeviceOrientation 경로를 생략하지 않는다.

**[제안] 공통 출력 계약:**

    OrientationSample {
      qBodyToFrame: [x, y, z, w];
      frame: "magnetic-ENU" | "relative-Z-up" | "true-ENU";
      northReference: "magnetic" | "true" | "relative" | "unknown";
      referenceFrame: "device" | "screen";
      timestampMs: number;
      yawValid: boolean;
      headingAccuracyDeg: number | null;
      compassAxis: "physical-top" | "rear-camera" | "unknown";
      compassAxisVerified: boolean;
      calibrationAgeMs: number | null;
      provider: string;
    }

`headingAccuracyDeg=null`은 0° 오차가 아니다. `timestampMs`는 어떤 시계인지 문서화하고 같은 시간축으로 정규화한다. 센서 이벤트 하나에 자세와 heading이 함께 있더라도, 두 값이 같은 하드웨어 샘플 시각에 측정됐다고 가정하지 않는다. WebKit은 최신 motion과 최신 heading을 조합하는 경로를 사용한다. [S06]

### A7-2. 안전한 iOS yaw 보정 수식

**전제:** 비교할 물리 축이 기기 프로필에서 검증됐고, relative와 compass 값이 충분히 가까운 시각·저속 자세에서 얻어졌다고 하자. 상단 축 모델이면 `b_c=(0,1,0)`이다. 후면 모델이 검증된 특정 환경에서만 `b_c=(0,0,-1)`로 바꾼다.

**[유도]**

$$A_r=\operatorname{atan2}\big((R_r b_c)_E,(R_r b_c)_N\big),\quad
\phi=\operatorname{wrap}_{\pi}(A_r-H_m),\quad
R_m=R_z(\phi)R_r.$$

여기서 `H_m`은 **동일 물리 축의 자북 heading**이다. ENU의 양의 z 회전은 나침반 방위를 감소시키므로 부호는 `A_r−H_m`이다. 반대로 `H_m−A_r`를 저장한다면 적용 회전의 부호를 반대로 해야 한다.

씬으로 바꾼 상대 자세가 `q_scene_rel`이고 동편각을 `D>0`으로 정의하면:

$$q_{scene,true}=q_y(\phi-D)\otimes q_{scene,rel}.$$

**`alpha=360−webkitCompassHeading`을 모든 자세에서 직접 대입하지 않는다.** 전체 상대 자세를 보존한 채 외부 yaw 오프셋만 갱신한다. 이 유도는 compass가 실제로 다른 축을 보고 있으면 적용할 수 없다.

### A7-3. 어느 자세에서 보정할 것인가

| 상단 축 모델의 β 구간 | 수학적 상태 | 기본 동작 제안 |
|---|---|---|
| `\|β\|≤60°` | 상단 수평 투영 ≥0.5 | 초기 보정 허용 후보. 추가로 `\|γ\|≤45°`, 충분한 정지, 유효 accuracy 요구 |
| `60°<\|β\|<80°` | 투영 감소, 방위 민감도 증가 | 신규 yaw 보정은 보수적으로 중단 |
| `80°≤\|β\|≤100°` | 90° 특이점 포함 | heading 기반 보정 금지. 최근 yaw 보정을 고정하고 상대 자세 추적 |
| 예: `120°≤β≤150°` | 상단 방위에 180° 분기가 필요 | 수학적으로 비교 가능하나 **실제 iOS 고각 heading 의미가 검증된 프로필에서만** 허용. 기본값은 중단 |

이 구간과 accuracy 15° 같은 임계값은 **제안값**이며 Apple의 공식 유효 자세 범위나 정확도 보장이 아니다. “상단 축이 수직이니 카메라 축으로 바꿔 비교”하는 것은 금지한다. 측정된 H가 여전히 상단 축 값이면 비교 축만 바꿔도 틀린다.

**[제안] 보정 의사코드:**

    // 모든 각도 내부 단위: rad. 시간 단위: s.
    const rad = Math.PI / 180;
    const wrapPi = x => ((x + Math.PI) % (2*Math.PI) + 2*Math.PI)
                       % (2*Math.PI) - Math.PI;
    const finiteNumber = x => typeof x === "number" && Number.isFinite(x);

    function compassYawCandidate(event, Rrel, profile, quality) {
      if (!profile.compassAxisVerified) return null;
      if (profile.compassAxis !== "physical-top") return null;
      const H = event.webkitCompassHeading;
      const acc = event.webkitCompassAccuracy;
      if (![event.alpha,event.beta,event.gamma,H,acc].every(finiteNumber))
        return null;                       // null과 0을 구별한다
      if (H < 0 || H >= 360 || acc < 0 || acc > 15) return null;
      if (Math.abs(event.beta) > 60 || Math.abs(event.gamma) > 45)
        return null;
      if (!quality.isQuasiStatic || quality.sampleGapTooLarge) return null;
      const u = multiplyMatrixVector(Rrel, [0,1,0]);
      const rho = Math.hypot(u[0],u[1]);
      if (rho < 0.5) return null;
      const Arel = Math.atan2(u[0],u[1]);
      return wrapPi(Arel - H*rad);
    }

    // 초깃값은 여러 정지 샘플의 원평균으로 구한다.
    // 이후 업데이트 예: phi += k*wrapPi(candidate-phi), k=1-exp(-dt/tau).
    // 큰 잔차는 자동 반영하지 말고 재정렬 필요 상태로 전환한다.
    // 고각에서 candidate=null이면 기존 phi를 유지하되 보정 나이를 증가시킨다.
    // phi 미확정이면 yawValid=false이며 별 정렬/수동 보기로 진행한다.
    // qTrue = qY(phi - declination) * qSceneRelative.

위 코드는 정책을 보여주는 의사코드다. `multiplyMatrixVector`, 정지 판정, 원평균, 최대 잔차, τ는 실제 모듈에서 정의해야 한다. 정상 경로에 `alpha || 0` 같은 누락값 치환을 넣지 않는다. 회전 평활화는 쿼터니언의 부호 동치 `q≡−q`와 최단 경로를 처리한 slerp로 수행한다. Provider 재시작·상대 기준 재설정 시 예전 φ를 무조건 재사용하지 않는다.

### A7-4. WMM 적용과 이중 보정 방지

**[확인]** NOAA의 현행 표준 모델은 **WMM2025**다. 적용 기간은 2025.0–2030.0이며 날짜·위치에 맞는 편각을 계산한다. WMM은 국소 자석·금속으로 생긴 오류를 제거하는 모델이 아니다. [S38][S39]

**[유도]** 동편각 양수일 때:

$$H_{true}=\operatorname{wrap}_{360}(H_{mag}+D),\qquad
q_{scene,true}=q_y(-D)\otimes q_{scene,mag}.$$

| 입력의 북 기준 | 동작 |
|---|---|
| 표준 Android AbsoluteOrientationSensor / 표준 절대 이벤트 | 자북 기준으로 분류하고 WMM을 한 번 적용. [S01][S02] |
| 조사한 WebKit 경로의 `webkitCompassHeading` | 코드 근거는 자북. 해당 기기 프로필·방위 시험으로 확인한 뒤 같은 규칙 적용. [S06] |
| 진북 출력이 명시된 다른 Provider 또는 검증된 프로필 | WMM을 추가 적용하지 않음 |
| 별 정렬로 최종 씬의 yaw가 이미 결정됨 | 별 정렬이 흡수한 편각을 다시 더하지 않음. 정렬 단계의 기준을 메타데이터에 남김 |
| 북 기준을 확정할 수 없음 | `unknown` 유지. 위치 권한 토글이나 `absolute=true`만으로 자동 판정하지 않음 |

**[제안] 판정 실험:** 진방위를 아는 두 개 이상의 방향에서 `Hreported−Htrue`의 원형 잔차를 측정한다. 자북 가설은 약 `−D`, 진북 가설은 약 0의 잔차를 예측한다. 위치 서비스/Compass Calibration 설정 전후도 비교하되, 관찰 결과를 Provider 프로필로 저장한다. **D가 오차보다 작거나 국소 자기장 편향이 있으면 두 가설을 안정적으로 구분할 수 없다.** 그런 경우에는 진북 자동 판정 대신 별 정렬을 사용한다.

## A8. 실기기 3-자세 실험: 45° / 90° / 120°

**목적:** `webkitCompassHeading`이 어떤 물리 축·자세 규칙에 대응하는지 확인하고, 화면 회전·고각 반전·진북 보정 오류를 분리한다. 아래 전체는 제안 절차이며 실행 결과가 아니다.

### A8-1. 준비와 기록

자석 케이스를 제거하고 비자성 받침을 사용한다. 멀리 있는 건물 모서리 등으로 **일정한 수평 방위 A를 가진 수직 평면**을 정한다. 세 자세 모두 후면 카메라의 수평 투영이 이 평면을 향하게 하고 γ≈0을 유지한다.

**서로 다른 세 β에서 같은 지상 점을 카메라 정중앙에 놓으라는 뜻이 아니다.** 카메라의 고도는 −45°·0°·+30°로 변하므로 같은 방위의 수직 평면을 이용해야 한다.

각 자세에서 5–10초 정지 덤프를 제안한다. 기록 필드는 OS/브라우저 빌드, 기기명, 탭/standalone, `screen.orientation.angle`, 이벤트 시각, α/β/γ, `absolute`, heading/accuracy, 원시 쿼터니언, 상단·후면 축의 계산 방위와 투영 길이, 권한 상태, 수동으로 기록한 케이스/장착 조건이다. β는 가능하면 외부 기울기 기준과 교차 확인한다.

### A8-2. 예상 패턴 — γ=0인 이상적 벡터 모델

| 자세 | 카메라 고도 | 카메라 방위 | 상단 +Y 투영의 방위 | 상단 투영 길이 | 해석 |
|---|---:|---:|---:|---:|---|
| β=45° | −45° | A | A | 0.7071 | 두 축의 방위가 같아 이 자세만으로 축을 구별하기 어려움 |
| β=90° | 0° | A | **정의 불가** | 0 | 실제 H가 유지·변동·재매핑되는지 관찰. 이 값으로 보정하지 않음 |
| β=120° | +30° | A | A+180° | 0.5 | H가 A인지 A+180°인지, 혹은 다른 동작인지 확인하는 분리 자세 |

이것은 **기하학적 예상값**이다. 측정 H가 표와 다르면 즉시 “Safari 버그”라고 결론내리지 않는다. 축/headingOrientation/센서 융합의 실제 계약이 다른지 먼저 조사한다.

### A8-3. 필수 반복

화면 UI가 90°/270°인 경우도 반복하여 물리 축과 표시 축을 분리한다. 다른 수평 방향 두 곳 이상, Safari와 standalone, 금속 없는 상태와 실제 경통 장착 상태를 반복한다. 진북/자북 판정은 외부 기준과 WMM을 사용하고, 폰의 기본 나침반 앱 숫자만을 절대 정답으로 삼지 않는다.

**[제안] 통과 기준:** 최소한 축 가설이 여러 방향에서 일관되고, 90° 근방에서 보정이 차단되며, 120°에서 앱의 카메라가 갑자기 반대편으로 뒤집히지 않아야 한다. 절대 정확도 합격선은 실제 접안 시야와 정렬 후 측정 성능을 보고 정한다.

## A9. Three.js 변환식과 테스트 벡터

### A9-1. 구 DeviceOrientationControls의 정확한 핵심

Three.js r133 예제는 다음 순서다. 각도는 라디안이며 `q1=(-√0.5,0,0,√0.5)`는 x축 −π/2 회전이다. [S40]

    euler.set(beta, alpha, -gamma, "YXZ");
    q.setFromEuler(euler);
    q.multiply(q1);
    q.multiply(qZ(-screenAngle));

**[유도]** 이 식은 다음 행렬과 동치다.

$$R_{old}=R_y(\alpha)R_x(\beta)R_z(-\gamma)R_x(-\pi/2)R_z(-\theta).$$

ENU→씬 변환을:

$$S=\begin{pmatrix}1&0&0\\0&0&1\\0&-1&0\end{pmatrix}=R_x(-\pi/2)$$

로 두면:

$$\boxed{R_{old}=S\,R_z(\alpha)R_x(\beta)R_y(\gamma)R_z(-\theta).}$$

**따라서 원하는 `+X=동,+Y=천정,+Z=남` 프레임은 구 예제의 축 변환과 이미 맞는다.** 단, 입력 α가 절대 방향인지 상대 방향인지, 북 기준이 자북인지 진북인지는 별개다. 구 결과에 x축 −90°를 한 번 더 곱하면 중복 변환이다.

### A9-2. Provider별 최종 변환

**[유도·제안]**

    // DeviceOrientation, 절대 자북 입력:
    qSceneMag = qY(alpha) * qX(beta) * qZ(-gamma)
                * qX(-PI/2) * qZ(-screenAngle);
    qSceneTrue = qY(-D) * qSceneMag;

    // iOS 상대 입력 + 검증된 상단 heading으로 얻은 phi:
    qSceneTrue = qY(phi-D) * qSceneRel;

    // Generic Sensor, referenceFrame:"device", qG=[x,y,z,w]:
    qSceneMag = qX(-PI/2) * qG * qZ(-screenAngle);
    qSceneTrue = qY(-D) * qSceneMag;

    // Generic Sensor, referenceFrame:"screen":
    qSceneMag = qX(-PI/2) * qG; // 화면 보정을 중복하지 않음

곱셈은 오른쪽 회전부터 벡터에 작용한다. 카메라는 로컬 `−Z`를 바라본다. 최종 단위 시선 `p=(px,py,pz)`에 대해:

$$Az=\operatorname{wrap}_{360}(\operatorname{atan2}(p_x,-p_z)),\qquad
Alt=\arcsin(\operatorname{clamp}(p_y,-1,1)).$$

`hypot(px,pz)`가 작으면 방위는 `null` 또는 별도 undefined 상태다. 천정에서 방위를 0°로 강제하면 안내 화살표가 북쪽으로 튄다.

**경통 장착 주의:** `qBody`와 `qCamera`를 구분한다. 장착 축 `t_b`가 물리적 기기 프레임에 정의됐다면 `p_scope=qBody·t_b`를 사용한다. 화면용 `qZ(-screenAngle)`을 곱한 카메라 쿼터니언에 같은 `t_b`를 바로 넣지 않는다. [유도]

### A9-3. 8개 테스트 벡터

조건: 절대 α, D=0°, 화면 각도 θ=0°, 후면 카메라 시선. 입력 β의 허용 범위 때문에 천정 예시는 +180° 대신 −180°를 사용한다.

| # | α | β | γ | 기대 씬 시선 `(동,위,남)` | 기대 방위 | 기대 고도 |
|---|---:|---:|---:|---|---:|---:|
| 1 | 0° | 90° | 0° | `(0,0,-1)` | 0° 북 | 0° |
| 2 | 270° | 90° | 0° | `(1,0,0)` | 90° 동 | 0° |
| 3 | 180° | 90° | 0° | `(0,0,1)` | 180° 남 | 0° |
| 4 | 90° | 90° | 0° | `(-1,0,0)` | 270° 서 | 0° |
| 5 | 0° | 120° | 0° | `(0,0.5,-0.8660254)` | 0° | +30° |
| 6 | 0° | 0° | 0° | `(0,-1,0)` | 정의 불가 | −90° |
| 7 | 0° | −180° | 0° | `(0,1,0)` | 정의 불가 | +90° |
| 8 | 0° | 60° | 30° | `(-0.5,-0.4330127,-0.75)` | 326.309932° | −25.658906° |

**직접 검산 결과:** 위 8개×화면 각도 0°/90°/180°/270°의 **32조건 통과**. 구 예제 행렬과 `S·Rz·Rx·Ry·Rz`의 무작위 10,000조건 비교에서 최대 원소 차이는 **2.22×10⁻¹⁶**이었다. 상단축 45°/90°/120°의 보정 분기 및 동편각 +10°의 부호도 검산했다. 이는 수학 구현 검산이며 **브라우저 샘플의 물리적 정확도 검증이 아니다.**

추가 자동 시험에는 α=359°↔0°, `q↔−q`, `alpha=0`일 때 오프셋 유지, 누락값 `null`, Provider 재시작, 고각에서 보정 중단을 포함한다. r133 원본은 `device.alpha ? ... : 0`로 인해 α=0일 때 `alphaOffset`도 생략하는 경로가 있으므로 그대로 복사하지 않는다. [S40]

## A10. 알려진 함정과 대응

| 함정 | 대응 |
|---|---|
| α를 나침반 heading으로 그대로 사용 | 회전 표현과 북 기준을 분리한다. [S01] |
| iOS compassHeading을 후면 카메라 방위로 간주 | 물리 축 검증 후 동일 축끼리 비교한다. [S06][S08], A3 유도 |
| β=90° 상단 방위로 계속 보정 | 투영 길이를 검사하고 보정을 중단한다. [유도] |
| `absolute=true`를 진북/고정밀 뜻으로 해석 | 자북→진북과 품질 판정을 별도로 둔다. [S01][S02] |
| `requestPermission`으로 iOS를 식별 | Chrome 도입을 반영해 capability 기반으로 구현한다. [S04][S05] |
| permission granted를 정상 동작으로 판정 | 유효 샘플·주기·축·품질까지 검사한다. [제안] |
| 값 0을 누락값으로 판단 | `Number.isFinite`와 명시적 null 검사. r133 오류도 수정한다. [S40] |
| UI 회전을 물리 축에 중복 적용 | Provider referenceFrame, 카메라 프레임, 장착 축을 구분한다. [S01][S02] |
| 8자 동작 후 무조건 “보정 완료” | 외부 기준 잔차와 안정도를 확인한다. [S27][S42] |
| WMM을 정렬 이후 다시 적용 | 북 기준/편각 적용 횟수/정렬 기준을 기록한다. [유도·제안] |
| 앱 복귀 후 오래된 상대 yaw를 신뢰 | 재시작·샘플 단절과 보정 나이를 처리한다. [S02], 제안 |
| 진동·화면 고정·저장 보존을 핵심 기능의 전제조건으로 설정 | 없어도 되는 점진적 기능으로 설계한다. [S17][S19][S20][S23][S24] |

---

# Part B. 하늘 앱 UX 벤치마크

## B0. 비교 범위와 근거 수준

**센서 하늘 보기와 카메라 AR는 구분한다.** 전자는 자세 센서로 가상 하늘을 움직이고, 후자는 카메라 영상 위에 정보를 겹친다. 한 기능의 지원은 다른 기능의 지원 증거가 아니다.

Stellarium은 **Mobile/Plus** 자료만, SkySafari는 가능한 한 **7판으로 명시된 공식 자료**를 사용했다. 현재 `userguide.skysafariastronomy.com`의 Introduction은 Pro 8이므로 7판 기능 근거로 대체하지 않았다. Star Walk 2 PDF는 **2018년 2.4판**으로, 현재 버튼 위치까지 보증하지 않는다. “미확인”은 기능이 없다는 단정이 아니다. [S41][S43][S49]

## B1. 센서/AR 진입, 보정, 수동 전환

| 앱 | 진입과 수동 전환 | 보정 UX | 우리 앱에 대한 평가·제안 |
|---|---|---|---|
| **Stellarium Mobile / Plus** | 센서 모드 사용. 1.8.0 공지는 하단 미니 나침반을 Sensor **Auto** 복귀 버튼으로 설명. 최신 세부 자동 해제 규칙은 미확인. [S44] | 센서 유무·실제 나침반 정렬 확인이 필요. 최신 수동 yaw 보정 버튼의 정확한 동작은 미확인. [S45] | **[평가]** 센서 복귀 버튼이 항상 보이는 구조는 유용. 단, 우리 앱은 Auto/수동/보정 필요 상태를 글자로도 표시. |
| **SkySafari 7** | 공식 Sky Chart Help는 **우상단 Compass 버튼으로 센서/AR 진입**, 드래그로 수동 차트 탐색을 설명한다. 플랫폼별 버튼 순환·자동 해제 조건은 미확인. [S47] | 망원경의 **Align**은 별을 접안 중심에 두고 선택한 천체와 장치 방향을 맞추는 절차다. 폰 자기센서 보정과 다름. [S48] | **[평가]** 하늘 탐색, 폰 정렬, 망원경 Align을 하나의 “보정” 버튼에 합치지 않아야 함. |
| **Star Walk 2** | 구 공식 매뉴얼: 폰을 들면 Star Spotter, 화면 탭으로 해제. 카메라 아이콘으로 AR, 종료 아이콘으로 복귀. [S41] | 개발사 안내에 8자 동작 및 주변 간섭 점검이 있음. [S42] | **[평가]** 진입은 단순하지만 터치가 선택인지 센서 해제인지 불명확해지지 않도록 우리 앱에 명시적 토글 추가. |
| **Sky Guide** | 중앙 나침반 버튼으로 motion tracking을 켠 다음 **AR 버튼**으로 카메라 합성. [S50] | tracking 상태에서 길게 누르고 좌우로 이동해 heading 오프셋 조정. 해당 세션 동안 유지. [S54] | **[평가]** 센서와 AR의 2단 분리가 명확. 수동 오프셋을 “이번 세션 보정”으로 표시하는 패턴을 채택. |
| **Night Sky** | 자동 추적과 수동 탐색, Blending 버튼으로 카메라 합성/복귀. [S55] | Alignment tool을 켜고 좌우 스와이프로 알려진 하늘과 일치시킨 뒤 종료. [S55] | **[평가]** 별도 정렬 도구는 발견하기 쉽다. 센서 문제와 시각 효과 설정은 분리할 것. |
| **PhotoPills** | 별도 **Night AR** 도구와 Planner에서 야간 하늘 위치를 확인. 위치·날짜·시간 변경 가능. [S51][S52] | 공식 AR 보정 튜토리얼과 간섭 회피·안정화 안내 제공. 본 조사에서는 영상의 세부 제스처를 확인하지 못함. [S53][S56] | **[평가]** “지금”과 “계획한 날짜·장소”를 화면에 분명히 표시하는 구조를 참고. Night AR를 적색 테마로 소개하지 않음. |

## B2. 검색, 상세 정보, 찾아가기, 학습

| 앱 | 검색·상세·찾아가기 | 초보자 학습 | 적용할 패턴 |
|---|---|---|---|
| **Stellarium Mobile / Plus** | 선택 천체 상세, 즐겨찾기, 가시성·남중·출몰 정보. Favorites는 선택 후 상세를 올려 하트, Search→Favorites. 특정 화면 밖 화살표의 최신 동작은 미확인. [S44] | 여러 문화의 별자리·그림, Plus의 3D 보기·행사 달력. 정형화된 학습 경로는 미확인. [S43] | 첫 상세에 오늘 볼 수 있는지와 다음 행동을 배치. |
| **SkySafari 7** | 이름 외 조건 검색, Object Info에 출몰/남중·각거리 등. **Center**로 선택 천체를 차트 중심으로 이동. 기기 이동을 안내하는 화살표와 단순 차트 센터링은 구별. [S46][S57][S58] | Tonight의 태양·달·관측 적기 대상, Events, 천체의 역사·신화·과학 설명, SkyCast. [S46] | “오늘 밤” 추천에 위치·시간·가시성 이유를 붙인다. |
| **Star Walk 2** | 분류 검색·천체 정보. 구 매뉴얼의 화면 밖 대상은 녹색 화살표로 안내. [S41] | 시작 안내, 별자리 설명/이미지, Space Cartoons 등. 현재 유료 범위는 미확인. [S41] | 초보자에게는 한 개의 목표와 짧은 방향 안내를 우선. |
| **Sky Guide** | 검색에서 이름/분류를 선택하거나 선택 천체의 Compass를 누른 후 **화면 화살표를 따라 기기를 이동**. Favorites는 검색 결과 왼쪽 스와이프 또는 상세 하단에서 추가. [S59][S60] | Featured의 이야기·팁, 지역별 행사 Calendar, Time Travel. 체계적인 퀴즈 경로는 미확인. [S61] | 검색→찾기→설명을 짧게 연결하고 사진을 실제 접안 관측상과 구별. |
| **Night Sky** | 일반 이름·통용 별칭·Sky Tags 검색, Directions/Quick Find. [S55] | 편집된 짧은 음성 투어·사용자 투어·교육 자료. [S55] | 검색 별칭과 개인 메모를 함께 찾게 하고, 학습은 실제 관측 행동으로 연결. |
| **PhotoPills** | Planner에서 위치·시간·방위와 고도, Night AR로 은하수 등 배치 확인. 일반 천체 백과/목표 화살표의 동일 기능은 미확인. [S51][S52] | 공식 사용자 가이드·보정 영상·계획 튜토리얼 중심. [S56][S62] | 시간 슬라이더와 명확한 계획 상태, 현장에서 짧게 완료할 수 있는 안내를 참고. |

위 마지막 열은 **설계 평가**이며 사용성 실험 결과가 아니다.

## B3. 관측 기록·리스트와 망원경 연동

| 앱 | 확인한 기록/리스트와 필드 | 망원경 push-to / GoTo | 주의 |
|---|---|---|---|
| **Stellarium Mobile / Plus** | Favorites 확인. **구조화된 관측 로그·세션·노트 필드는 미확인**. Observe Calendar를 로그로 부르지 않음. [S44][S43] | Plus: NexStar/SynScan/LX200 계열, TCP 네트워크, Android Bluetooth SPP. 공식 표에 **Nexus DSC**도 있으며 특정 firmware/앱 조건 명시. [S63] | 네이티브 Mobile Plus 기능이며 Stellarium Web/PWA가 동일 기능을 가진다는 뜻이 아님. |
| **SkySafari 7** | 관측·세션·리스트·장비·관측지. 7판 문의에서 날짜, 장소, 목록, comments, 관측 조건, 장비 필드 확인. LiveSky의 백업·동기화·OAL export는 요금제/기능 범위 구분. [S64][S65] | 7판은 ASCOM Alpaca/INDI도 소개. **Argo Navis+Bluetooth push-to** 공식 지원 사례와 Align 설명 확인. 실제 호환성은 조합별 시험 필요. [S46][S48] | 2024년 공식 답변은 개인 사진의 관측 로그 첨부가 불가능하다고 명시. 그 답변이 2026의 모든 빌드에도 동일한지는 미확인. [S64] |
| **Star Walk 2** | 구조화된 관측 기록·장비별 세션은 미확인 | 인코더/GoTo 제어 미확인 | 보이는 천체를 식별하는 기능을 망원경 제어로 분류하지 않음. [S41] |
| **Sky Guide** | **Favorites** 확인. 반복 관측별 일시·장비·노트 로그는 미확인. [S60] | 인코더/GoTo 제어 미확인 | 즐겨찾기와 관측 완료 기록을 구별. |
| **Night Sky** | Sky Tags: 제목, 노트, 사진, 색, 아이콘, 분류, 좌표 등. [S55] | 인코더/GoTo 제어 미확인 | 개인 하늘 메모에는 적합. 동일 천체의 여러 관측 세션을 정규화한 로그와는 다른 모델. |
| **PhotoPills** | Plans/Points of Interest와 저장·공유·KMZ 백업/가져오기 확인. 천체 관측 세션 로그는 미확인. [S52][S62] | 인코더/GoTo 제어 미확인 | 촬영 계획 데이터와 “실제로 관측한 기록”을 혼동하지 않음. |

**[설계 판단] 우리 PWA의 push-to는 세 가지를 구별해야 한다.**

1. **폰 기반 가이드:** 경통에 고정한 폰의 자세와 별 정렬로 방향을 추정한다. 외부 인코더 측정이라고 표현하지 않는다.
2. **DSC/인코더 기반 push-to:** 별도의 장치가 망원경 축 위치를 측정하고 사용자가 손으로 움직인다.
3. **GoTo:** 모터 장치가 명령을 받아 움직인다. 연결·정렬·정지·오류 상태가 추가로 필요하다.

Stellarium의 SPP/TCP나 SkySafari의 장치 연동은 네이티브 구현 근거다. **iOS WebKit은 Web Bluetooth·Serial 등을 지원하지 않는 것으로 명시하므로 네이티브 연결법을 PWA에 그대로 옮길 수 없다.** 외부 연동은 지원 장치의 웹 프로토콜 또는 별도 브리지의 필요성을 검토하는 독립 과제로 둔다. MVP의 폰 기반 방향 가이드와 묶어 약속하지 않는다. [S23][S46][S63]

## B4. 야간 모드, 시야원, 상 반전

다음의 장점·주의점은 공식 기능을 바탕으로 한 **UX 평가**다. 실측 화면 휘도나 암순응 실험을 한 결과는 아니다.

| 앱 | 확인 기능 | 좋은 점 | 주의점·미확인 |
|---|---|---|---|
| **Stellarium Mobile / Plus** | 적색 야간 모드. Plus의 instrument ocular. [S43] | 어두운 하늘 보기와 접안 시야 예측을 같은 도구에서 연결 | Mobile Plus의 최신 좌우/상하 반전 옵션·표현은 미확인. 데스크톱 Oculars 문서로 대체하지 않음. |
| **SkySafari 7** | Night Vision. 상단 FOV를 눌러 시야원·좌우/상하 반전 설정. 7 Pro Android의 Speed Panel→Flip→None 복구 사례도 확인. [S47][S66] | 장비 시야와 영상 방향을 조절하고 원상 복구할 수 있음 | 전용 적색 키보드도 있지만 과거 기기별 입력 문제 보고가 있음. 전체 시스템 UI까지 적색이 된다는 뜻은 아님. [S67] |
| **Star Walk 2** | 구 매뉴얼의 reddish night mode, 등급 한계 조절. [S41] | 안 보이는 별을 줄여 맨눈 하늘과 비교 가능 | 망원경 접안 시야원·상 반전은 미확인. 적색이라는 이유만으로 모든 사진·팝업이 충분히 어둡다고 보장하지 않음. |
| **Sky Guide** | 개발사 페이지에 적색 Night Vision 확인. [S61] | 복잡한 장비 설정 없이 야간 관측에 진입 | 접안 시야원·망원경식 상 반전은 미확인. |
| **Night Sky** | Dark Adaptation View, 적색 Night Mode. 빠른 버튼은 현지 일몰 후 표시된다고 문서화. [S55] | 야간 화면으로 빠른 접근 | 우리 앱은 일몰 여부와 무관하게 수동 야간 모드를 켤 수 있게 한다. 시야원/상 반전은 미확인. |
| **PhotoPills** | Night AR, 카메라의 수평·수직·대각 FoV 계산과 AR 프레이밍. [S52] | 계획 결과와 실제 촬영 구도의 연결이 직접적 | **적색 야간 모드 미확인. 카메라 FoV 사각형은 접안렌즈 시야원과 다르다.** |

**[제안] 우리 앱의 FOV UI:** 장비 이름과 실제 하늘 시야각을 붙인 원, 맨눈/쌍안경/망원경 프리셋, `정상 / 좌우 반전 / 상하 반전 / 180° 회전`의 명시적 상태와 작은 비대칭 미리보기를 제공한다. 화면의 광학상 반전은 표시 계층에 적용하고, 실제 기기 자세나 천체 좌표를 반전시키지 않는다.

**[제안] 야간 모드 QA:** 하늘 화면뿐 아니라 검색, 상세 사진, 관측 기록, 로딩·오류 화면, 키보드 호출, 권한창으로 이동하기 직전의 안내까지 점검한다. 웹이 시스템 UI의 색·밝기를 모두 통제한다고 약속하지 않는다. 첫 렌더 전 저장된 테마를 적용하고, 야간 중 밝은 사진은 명시적으로 열 때만 표시한다.

## B5. 반드시 따라야 할 관행 10개

아래는 **벤치마크에 근거한 우리 앱의 제안**이다.

| # | 관행 | 근거와 구현 방향 |
|---|---|---|
| 1 | **수동 보기·센서 보기·카메라 AR를 분리** | Sky Guide의 tracking→AR 구조를 참고. 센서 권한 거부가 앱 전체 이용 거부가 되지 않게 한다. [S50] |
| 2 | **센서 복귀와 보정 상태를 항상 보이게** | Stellarium 미니 나침반처럼 복귀 지점을 제공하고 `수동/추적/보정 필요`를 함께 표시. [S44] |
| 3 | **위치·날짜·현재/시뮬레이션을 드러내기** | PhotoPills의 계획 시각과 SkySafari의 Tonight 구조를 참고. “지금으로”를 한 번에 실행. [S44][S46][S52] |
| 4 | **검색→찾기→관측 기록의 동선을 짧게** | SkySafari 상세/Center와 Sky Guide Finding Objects를 참고. 상세를 닫아도 선택 천체를 유지. [S58][S59] |
| 5 | **화면 밖 목표의 안내와 목표 선택을 유지** | Star Walk 2의 화살표를 참고. 우리 앱은 목표 이름·각거리·고도와 센서 신뢰 상태를 함께 표시. [S41] |
| 6 | **오늘 밤 추천에 관측 가능한 이유 제시** | Tonight/가시성 정보를 참고. 위치·시간·장비에 따른 이유를 표시하고 카탈로그 유명도만으로 추천하지 않음. [S44][S46] |
| 7 | **즐겨찾기·계획·실제 관측을 다른 데이터로 저장** | SkySafari 세션/관측, Night Sky 태그, PhotoPills 계획의 차이를 반영. 한 천체에 여러 관측을 허용. [S64][S65][S55][S52] |
| 8 | **야간 모드를 모든 앱 내부 화면에 일관되게 적용** | 여러 앱의 적색 모드와 SkySafari 키보드 사례를 참고. 화면 밝기·색·사진 노출을 함께 점검. [S43][S61][S67] |
| 9 | **장비 프리셋에 FOV·광학상 방향을 명시** | Stellarium ocular와 SkySafari Flip 사례를 참고. 잘못 뒤집었을 때 한 번에 초기화. [S43][S66] |
| 10 | **학습·이야기를 실제 관측 한 단계와 연결하고 백업 제공** | 투어/튜토리얼은 “지금 찾아보기”로 연결. 완료 기록은 내보낼 수 있게 한다. [S46][S55][S62][S65] |

## B6. 피해야 할 실수 10개

| # | 실수 | 피해야 하는 이유와 대안 |
|---|---|---|
| 1 | 첫 실행부터 위치·센서·카메라를 한꺼번에 요청 | 사용 목적별 버튼으로 요청하고 거부 시 수동 기능을 유지. 권한 종류가 서로 다르다. [S01][S25][S50] |
| 2 | “iOS=진북, Android=자북”을 하드코딩 | WebKit 코드 근거와 맞지 않는다. northReference를 Provider 메타데이터로 관리. [S06] |
| 3 | 수직 자세에서도 compassHeading을 카메라 방위에 직접 대입 | 물리 축 차이·투영 특이점을 무시한다. A3/A7의 동일 축 보정 사용. [유도] |
| 4 | “8자로 흔들었으니 정확합니다” 표시 | 보정 동작과 정확도 검증은 다르다. 기준 방향 잔차·안정도 표시. [S27][S42] |
| 5 | 수동으로 드래그하는 즉시 센서가 차트를 되돌림 | 사용자 조작과 추적 상태가 경쟁하지 않게 상태 전이를 명시. [S41][S44], 설계 판단 |
| 6 | 화살표가 중앙에 오면 관측 완료 자동 기록 | 폰 방향 추정과 사용자의 실제 접안 관측은 다르다. 완료는 명시적 확인으로 기록. [S48], 설계 판단 |
| 7 | 태그·즐겨찾기·캘린더를 “관측 로그”로 포장 | 날짜별 실제 관측·장비·노트와 다른 데이터다. 개별 모델을 구분. [S43][S55][S60][S64] |
| 8 | 적색 하늘 화면만 만들고 검색창·이미지·키보드는 방치 | 야간 경험은 전체 동선이다. 외부 시스템 UI 한계를 알리고 앱 내부는 일관되게 처리. [S67], 설계 판단 |
| 9 | Phone push-to를 인코더·GoTo와 동일 정밀도/기능으로 홍보 | 측정 장치와 제어 경로가 다르다. 실제 잔차 시험을 통과한 범위만 설명. [S48][S63], 설계 판단 |
| 10 | AI가 앱에 없는 기능·관측 사실을 지어내도록 허용 | 실제 SkySafari 공식 답변에서 챗봇이 없는 사진 첨부 기능을 안내한 오류가 확인됨. AI 스토리와 실행 가능한 기능/기록을 분리하고 출처·기능 목록으로 검증. [S64] |

## B7. T2·T5로 넘길 실기기 검증 목록과 미확인 사항

| 항목 | 최소 확인 내용 | 미확인인 경우의 기본값 |
|---|---|---|
| 권한 | 최초 허용, 거부, 재시도, 앱 재실행을 탭/standalone 각각 시험 | 수동 보기 유지, 파괴적 초기화 금지 |
| 물리 축 | A8의 3자세×복수 방위×화면 회전 | `compassAxisVerified=false`, 별 정렬 |
| 북 기준 | 외부 진방위·WMM·설정 전후 비교 | `northReference=unknown`, 이중 보정 금지 |
| 샘플 | 유효값, 실제 주기, 백그라운드 복귀, 정지·회전 후 오차 | 오래된 자세는 추적 중으로 표시하지 않음 |
| 경통 장착 | 자석/금속 영향, 장착 축, 정렬 후 방향별 잔차와 드리프트 | 대략적 가이드로 제한 |
| 보조 API | lock 실패, Wake Lock 해제·재획득, 진동 없음 | 기능이 없어도 관측 흐름 유지 |
| 저장 | 오프라인 재실행, migration, 내보내기→초기화→복원 시험 | 백업 없는 데이터 삭제 절차 차단 |
| UX | 센서 해제/복귀, 시간 여행 복귀, 야간 검색·기록, FOV 초기화 | 숨은 상태 대신 명시적 라벨 |

**남은 근거 공백:** Samsung 최신 Android 빌드, iOS 최신 거부 상태의 확실한 초기화 경로, 모든 iPhone 고각에서의 compass 물리 축, 타깃 브라우저의 실제 °/분 드리프트, 여러 앱의 최신 비공개 UI/로그 기능은 확정하지 못했다. 찾은 공식 소스·호환성 자료·과거 매뉴얼만으로 이 항목들을 보장할 수 없어 미확인으로 남겼다. 대신 실패 시 동작과 이를 확정할 실기기 절차를 제시했다.

---

## 출처 URL와 자료 식별

모든 URL은 2026-09-06 조사에서 확인했다. `main` 소스·호환성 데이터·갱신형 도움말은 변동 가능하다. 명시한 역사적 버전의 기능을 현재 모든 빌드로 일반화하지 않는다.

[S01]: https://www.w3.org/TR/orientation-event/ "W3C — Device Orientation and Motion; 현행 명세"
[S02]: https://www.w3.org/TR/orientation-sensor/ "W3C — Orientation Sensor; 2026-05-14"
[S03]: https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Window.json "MDN browser-compat-data — Window 이벤트 지원 데이터; main"
[S04]: https://developer.chrome.com/release-notes/151 "Chrome for Developers — Chrome 151 릴리스 노트; 2026-07-28"
[S05]: https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/DeviceOrientationEvent.json "MDN browser-compat-data — DeviceOrientationEvent; main"
[S06]: https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WebCore/platform/ios/WebCoreMotionManager.mm "WebKit 공개 소스 — WebCoreMotionManager.mm; main, 배포 바이너리와 구분"
[S07]: https://developer.apple.com/documentation/corelocation/clheading/magneticheading "Apple — CLHeading.magneticHeading"
[S08]: https://developer.apple.com/documentation/corelocation/cllocationmanager/headingorientation "Apple — CLLocationManager.headingOrientation"
[S09]: https://developer.apple.com/documentation/corelocation/clheading/headingaccuracy "Apple — CLHeading.headingAccuracy"
[S10]: https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/AbsoluteOrientationSensor.json "MDN browser-compat-data — AbsoluteOrientationSensor; main"
[S11]: https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/RelativeOrientationSensor.json "MDN browser-compat-data — RelativeOrientationSensor; main"
[S12]: https://developer.chrome.com/blog/device-orientation-changes "Chrome for Developers — DeviceOrientation 변경 안내"
[S13]: https://bugs.webkit.org/show_bug.cgi?id=201676 "WebKit Bug 201676 — iOS 사용자 동작과 방향 권한 요청; 2019"
[S14]: https://bugs.webkit.org/show_bug.cgi?id=221399 "WebKit Bug 221399 — iframe 방향 권한 관련 과거 이슈"
[S15]: https://developer.android.com/develop/sensors-and-location/sensors/sensors_overview "Android Developers — Sensors overview, 물리 좌표계"
[S16]: https://developer.chrome.com/docs/capabilities/web-apis/generic-sensor "Chrome for Developers — Generic Sensor API"
[S17]: https://webkit.org/blog/16574/webkit-features-in-safari-18-4/ "WebKit — Safari 18.4; 2025-03-31, standalone Wake Lock 수정"
[S18]: https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/WakeLock.json "MDN browser-compat-data — WakeLock; 연결된 WebKit bug 254545 포함"
[S19]: https://w3c.github.io/vibration/reports/implementation.html "W3C Vibration API implementation report; Firefox 129 제거 포함"
[S20]: https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/ScreenOrientation.json "MDN browser-compat-data — ScreenOrientation; main"
[S21]: https://webkit.org/blog/13966/webkit-features-in-safari-16-4/ "WebKit — Safari 16.4, Screen Orientation 도입"
[S22]: https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/lock "MDN — ScreenOrientation.lock 조건 및 오류"
[S23]: https://webkit.org/tracking-prevention/ "WebKit — 현행 Tracking Prevention; 홈 화면 앱 ITP 예외 및 미지원 API"
[S24]: https://webkit.org/blog/14403/updates-to-storage-policy/ "WebKit — Updates to Storage Policy; 2023-08-10"
[S25]: https://www.w3.org/TR/geolocation/ "W3C — Geolocation, 고도·정확도·이동 heading"
[S26]: https://developer.android.com/develop/sensors-and-location/sensors/sensors_position "Android Developers — Position sensors; game rotation vector"
[S27]: https://science.lpnu.ua/sites/default/files/journal-paper/2026/may/42954/001ang4.pdf "Tartachynska 외 — Use of smartphones for determining orientation angles in the field; 2026, Table 1 및 방법 확인"
[S28]: https://engineering.unt.edu/cse/research/labs/nsl/sites/default/files/biblio/documents/evaluation_of_gyroscope_embedded_mobile_phones.pdf "Barthold, Subbu, Dantu — Evaluation of Gyroscope-embedded Mobile Phones; IEEE 2011, Nexus S"
[S29]: https://groups.google.com/a/chromium.org/g/blink-dev/c/r8iKkTXftm4/m/8iBn0c2UAAAJ "Chromium blink-dev — 센서 주파수 최대 60Hz 설계 안내"
[S30]: https://support.apple.com/en-us/100100 "Apple security releases — iOS/iPadOS 26.6.1; 2026-08-17"
[S31]: https://chromereleases.googleblog.com/2026/09/chrome-for-android-update.html "Chrome Releases — Android stable 152.0.7977.82; 2026-09-03"
[S32]: https://www.firefox.com/en-US/firefox/android/155.0/releasenotes/ "Mozilla — Firefox Android 155.0; 2026-09-01"
[S33]: https://developer.samsung.com/internet/android/overview.html "Samsung Developers — Android Browser overview"
[S34]: https://developer.samsung.com/internet/release-note/android-release-note.html "Samsung Developers — Android release notes; 최신성이 부족한 공개 이력"
[S35]: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate "MDN — Navigator.vibrate"
[S36]: https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/StorageManager.json "MDN browser-compat-data — StorageManager; main"
[S37]: https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/ "WebKit — Full Third-Party Cookie Blocking and More; 2020, Safari 사용일 기준 설명"
[S38]: https://www.ncei.noaa.gov/products/world-magnetic-model "NOAA NCEI — World Magnetic Model / WMM2025"
[S39]: https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=gov.noaa.ngdc%3AWMM2025%3Bview%3Diso "NOAA NCEI — WMM2025 메타데이터와 적용 기간"
[S40]: https://raw.githubusercontent.com/mrdoob/three.js/r133/examples/jsm/controls/DeviceOrientationControls.js "Three.js — r133 DeviceOrientationControls.js, 고정 버전"
[S41]: https://starwalk.space/assets/starwalk2_manual_en.pdf "Vito Technology — Star Walk 2 manual, 2018년 2.4판; 센서·AR·화살표·야간 모드"
[S42]: https://starwalk.space/en/tutorials/fix-sky-displacement-tutorial "Star Walk — 나침반/하늘 위치 어긋남 보정 안내; 2020-09-22"
[S43]: https://stellarium-labs.com/stellarium-mobile-plus/ "Stellarium Labs — Mobile/Plus 공식 기능 비교"
[S44]: https://stellarium-labs.com/blog/update-1-8-0/ "Stellarium Labs — Mobile 1.8.0; Favorites, 가시성, Now, Sensor Auto"
[S45]: https://stellarium-labs.com/blog/faq/ "Stellarium Labs — FAQ, 센서와 지원 안내"
[S46]: https://apps.apple.com/us/app/skysafari-7-plus/id1567654881 "Simulation Curriculum — SkySafari 7 Plus 공식 App Store 설명; 7판 기능"
[S47]: https://support.simulationcurriculum.com/hc/en-us/articles/4412178509719-Sky-Chart-Help "Simulation Curriculum — SkySafari 7 매뉴얼의 Sky Chart Help; 생성 2021-11-03, 갱신 2025-12-22"
[S48]: https://support.simulationcurriculum.com/hc/en-us/community/posts/18295694358167--Scope-Control-How-To-Use-The-Align-Button-In-SkySafari-7-Pro-Argo-Navis-Bluetooth-Push-To-Answer-Read-On "Simulation Curriculum — SkySafari 7 Pro / Argo Navis push-to Align; 2023 공식 지원 답변"
[S49]: https://userguide.skysafariastronomy.com/introduction "Simulation Curriculum — 현행 도움말은 SkySafari Pro 8, 7판과 구분"
[S50]: https://support.fifthstarlabs.com/article/15-augmented-reality "Fifth Star Labs — Sky Guide Augmented Reality; 2025-06-03"
[S51]: https://www.photopills.com/user-guide "PhotoPills — User Guide I, Planner"
[S52]: https://www.photopills.com/user-guide-2 "PhotoPills — User Guide II, Night AR / FoV / 백업"
[S53]: https://www.photopills.com/faqs "PhotoPills — FAQ, AR 자기장 간섭과 안정화 안내"
[S54]: https://support.fifthstarlabs.com/article/4-objects-are-not-lining-up-with-their-true-positions-in-the-sky "Fifth Star Labs — Sky Guide Compass Correction; 2024-11-08"
[S55]: https://icandiapps.com/support/ "iCandi Apps — Night Sky 26 User Manual; 정렬·Sky Tags·야간 모드·투어"
[S56]: https://www.photopills.com/videos/calibrating-augmented-reality-views-ar "PhotoPills — Calibrating the Augmented Reality Views, 공식 튜토리얼 안내"
[S57]: https://support.simulationcurriculum.com/hc/en-us/articles/4412182401943-Search-Help "Simulation Curriculum — SkySafari 7 Search Help"
[S58]: https://support.simulationcurriculum.com/hc/en-us/articles/4412182506007-Selection-Help-Object-Info-Help "Simulation Curriculum — SkySafari 7 Object Info Help"
[S59]: https://support.fifthstarlabs.com/article/8-finding-objects "Fifth Star Labs — Sky Guide Finding Objects"
[S60]: https://support.fifthstarlabs.com/article/22-favorites "Fifth Star Labs — Sky Guide Favorites"
[S61]: https://www.fifthstarlabs.com/ "Fifth Star Labs — Sky Guide 공식 기능, Night Vision"
[S62]: https://www.photopills.com/videos/how-plan-photo-milky-way-1-minute-augmented-reality-tool "PhotoPills — Night AR를 이용한 은하수 촬영 계획 튜토리얼"
[S63]: https://stellarium-labs.com/telescope-control-in-stellarium-mobile-plus "Stellarium Labs — Mobile PLUS Telescope Control, 프로토콜과 DSC 호환 표"
[S64]: https://support.simulationcurriculum.com/hc/en-us/community/posts/23717368174487-How-To-Add-Image-To-An-Observation-Answer-It-Is-Not-Possible-At-This-Time "Simulation Curriculum — SkySafari 7 관측 기록/사진 첨부 공식 답변; 2024-05-27"
[S65]: https://support.simulationcurriculum.com/hc/en-us/community/posts/10237547443095-What-s-Included-With-The-SkySafari-Subscription-Answer-Read-On "Simulation Curriculum — SkySafari 7 / LiveSky 구독·데이터 기능; 2022-11-15"
[S66]: https://support.simulationcurriculum.com/hc/en-us/community/posts/14263552742807-Why-Is-The-Starchart-Sky-Inverted-In-SkySafari-7-Pro-Answer-Choose-Speed-Panel-Flip-None-Read-On "Simulation Curriculum — SkySafari 7 Pro Android Flip 설정; 2023-05-01"
[S67]: https://support.simulationcurriculum.com/hc/en-us/community/posts/12651975363095-How-To-Protect-Night-Vision-Using-The-Keyboard-in-SkySafari-7-Pro-Answer-Use-The-SS7-Night-Vision-Keyboard "Simulation Curriculum — SkySafari 7 적색 키보드와 과거 입력 문제; 2023-02"

[S68]: https://www.w3.org/TR/screen-wake-lock/ "W3C — Screen Wake Lock API; 가시성·자동 해제·재요청"

## Claude 구현 세션에 전달할 핵심 결정 사항
01. 센서 계약은 기기 자세·북 기준·화면 기준·timestamp·보정 신뢰도를 분리하고 최종 씬은 +동/+천정/+남으로 고정한다.
02. iOS는 상대 DeviceOrientation과 검증된 compassHeading을 결합하며, WebKit 코드의 자북 경로를 무시하고 진북으로 하드코딩하지 않는다.
03. heading의 물리 축은 45°/90°/120° 실험으로 확인하고, 검증 전에는 자동 compass yaw 보정 대신 별 정렬을 제공한다.
04. 상단 축 보정은 초기 |β|≤60°·|γ|≤45°에서 시작하며 90° 근방과 미검증 고각에서는 갱신을 중단한다.
05. 같은 물리 축으로 φ=wrap(Arel−Hmag)를 구하고, 자북 입력을 진북 씬으로 바꿀 때 qY(φ−D)를 왼쪽에 곱한다.
06. WMM2025는 magnetic 입력에 한 번만 적용하고 true/unknown/별 정렬 완료 입력에 편각을 자동 중복 적용하지 않는다.
07. 공통 기반은 DeviceOrientation으로 구현하고 Android 절대 이벤트를 우선하며 Generic Sensor는 선택적 Provider로 격리한다.
08. requestPermission은 iOS 판별자가 아니므로 최신 Chrome을 포함해 기능 감지하고 사용자 클릭 안에서 필요한 권한만 요청한다.
09. 구 Three.js의 축 변환은 이미 동/위/남 프레임과 맞으므로 −90° 변환을 중복하지 않고 8벡터×4화면각 시험을 CI에 넣는다.
10. 화면 회전은 카메라에 한 번만 반영하며 경통의 물리적 장착 축 계산에는 화면용 회전을 섞지 않는다.
11. 수동/센서/카메라 AR를 분리하고 null·stale·재시작·정렬 만료를 정상적인 UI 상태로 처리한다.
12. iOS standalone Wake Lock은 18.4 이후 수정 상태로 취급하되 실제 해제·재획득을 처리하고 진동·화면 lock을 필수 기능으로 만들지 않는다.
13. 홈 화면 앱의 ITP 7일 예외와 persist를 구분하고 관측 데이터의 버전 있는 내보내기·가져오기를 반드시 제공한다.
14. 관측 로그·즐겨찾기·계획을 분리하고 야간 모드·FOV·상 반전·현재 시각 복귀를 전체 관측 동선에서 명시한다.
15. 폰 기반 push-to는 외부 인코더·GoTo와 구분하며 정확도 홍보와 AI 기능 안내는 실제 시험 결과·지원 기능·출처에 한정한다.
