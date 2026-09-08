# 2026-09-09 꾸미기 유료화 재검토

확인일: 2026-09-09(KST). 기준 소스 `f5cf178`(beta.7/build12). 공식 Apple·Google·Open-Meteo 문서와 저장소를 읽었다. 판매·계약·계정 권한 변경은 하지 않았다. 경쟁사 지역별 가격이나 매출을 검증한 조사가 아니며 후보 가격은 제품 판단이다.

## 무료 결정과 새 요청

사용자는 D-048에서 꾸미기·업적 보상·사진·댓글·개인 백업까지 무료로 요청했고, 2026-09-09 아바타 발전과 함께 유료화를 다시 생각해 달라고 요청했다. 이를 **검토 재개**로 받아들이며 기존 범위와 이번 꾸미기 개선은 무료로 유지한다. 현재 아이템을 잠그거나 실제 판매하라는 승인으로 해석하지 않는다.

읽은 정본은 [STATUS](../STATUS.md), [D-048~051](../DECISIONS.md), [T9](../task-09-personal-and-community.md), [무료 서비스 구현](../../docs/FREE-COMMUNITY.md)이다. [꾸미기 확장안](../../docs/COMMUNITY-AND-CUSTOMIZATION.md)은 beta.6 설계 이력이다.

`src/community/client.ts`와 `supabase/migrations/`에는 인증·접근 제어·사진/댓글·백업이 구현돼 있다. 일반 가입 메일과 운영자·실기기 확인은 남았다. `src/personal/store.ts`는 로컬 업적 보상을 고유 키로 영구 보존한다. 결제 SDK·상품·검증 거래·유료 이용권과 구매 복원은 아직 없다. 계정이 있다는 사실과 판매 준비 완료를 구분한다.

## 공식 자료에서 확인한 사실

| 주제 | 확인한 내용 | Skylog 적용 판단 |
| --- | --- | --- |
| [Apple 3.1.1·3.1.3(b)](https://developer.apple.com/app-store/review/guidelines/) | 앱 내 디지털 판매는 IAP가 기본. 다른 플랫폼 콘텐츠 접근은 iOS에서도 해당 상품을 IAP로 제공하는 조건. 국가별 외부 결제/링크 예외 존재 | iOS 팩은 표준 IAP로 제공하고 계정 권한 공유를 별도 구현 |
| [Apple IAP 유형](https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/in-app-purchase-types) | 비소모성은 한 번 구매하고 사용으로 소진되거나 만료되지 않는 상품 | 포함 항목이 고정된 테마 팩에 적합 |
| [Google 결제 정책](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en) | 유료 아이템·아바타·클라우드 서비스는 기본적으로 Play Billing 대상. 대체 경로는 적용 조건에 따름 | ‘후원’이라는 이름만으로 유료 장식 판매를 외부 결제 처리하지 않음 |
| [Google 결제 정책 설명](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en) | 구매 기능 없이 다른 곳의 구매 콘텐츠에 로그인해 접근하는 소비 전용 앱도 가능 | 독립 PWA 구매와 Play 앱 안의 구매·유도 동작을 구분 |
| [Apple 복원](https://developer.apple.com/documentation/storekit/appstore/sync%28%29?changes=_6), [현재 이용권](https://developer.apple.com/documentation/storekit/transaction/currententitlements?changes=_7) | 거래는 자동 제공. 명시적 복원 동작에 `sync()` 사용. 환불·철회 상품은 현재 이용권에서 제외 | 자동 확인과 구매 복원을 제공. 네트워크 실패를 권한 철회로 오인하지 않게 구현 |
| [Google 구매 통합](https://developer.android.com/google/play/billing/integrate?hl=en) | 구매 조회로 앱 밖 구매도 확인. 완료 상태에서 제공하고 비소모성은 승인하며 소비하지 않음 | 앱 재개·프로모션·대기 결제 완료를 처리하고 중복 구매 방지 |
| [Apple 계정 토큰](https://developer.apple.com/documentation/appstoreserverapi/appaccounttoken), [Google 구매 보안](https://developer.android.com/google/play/billing/security) | 앱 계정 식별자를 거래에 연결 가능. Google은 서버 검증·고유 구매 토큰·계정 매칭을 안내 | 기존 Supabase UUID와 거래를 서버에서 연결. Apple/Google 계정을 공유하지 않음 |
| [Apple offer code](https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/create-offer-codes-for-in-app-purchases), [Google promo code](https://support.google.com/googleplay/android-developer/answer/6321495?hl=en) | 무료 IAP/한 번 구매 상품 코드 제공. Apple은 배포 가능 앱·승인된 IAP, Google은 활성 상품/구매 옵션 등 조건. Google 구독 코드는 무료 체험 기간 | 두 사람의 무료 팩 거래에 우선 활용. 체험 기간으로 영구 무료를 대신하지 않음 |
| [Open-Meteo 약관](https://open-meteo.com/en/terms), [가격·호출 산정](https://open-meteo.com/en/pricing) | 무료 API는 비상업용. 상업 고객 API와 데이터 CC BY 표기는 별개. 변수 수가 많은 요청은 호출 수 증가 가능 | 테마 판매 전에 날씨 라이선스·서버 키/캐시·비용 준비 |

Apple StoreKit 일부 페이지는 일반 본문이 JavaScript 안내만 반환했다. 해당 항목은 같은 공식 문서의 검색 가능한 본문으로 확인했다. 제품 화면이나 App Store Connect 실계정 구성을 직접 검증한 것은 아니다. 위 조건은 확인일 기준이며 실제 제출 시 출시 국가와 계약 조건을 다시 확인한다.

## 추천과 근거의 경계

**무료 기본 앱 + 신규 테마 팩 1종의 1회 구매**를 추천한다. 적용 모습을 미리 볼 수 있고 현재 무료 성취와 판매 범위를 구분하기 쉽다. 새 의상·배경·장식이 어울리는 묶음을 만들되 기존 무료 아이템을 다시 팔지 않는다. 검토용 3,900원은 사용자 의견과 정산 계산의 출발점일 뿐 적정 가격이 검증됐다는 뜻이 아니다. 경쟁사 가격표·시장 평균은 제시하지 않는다.

구독을 지금 도입하지 않는 이유는 현재 개인 백업이 무료 수동 스냅샷이고, 추가 원본 보관·자동 동기화·장기 버전 보관이 아직 없기 때문이다. 해당 서비스를 만든 뒤 비용과 가치를 확인해 구독 1종을 검토한다. 이 선택은 정책상 모든 꾸미기 구독이 불가능하다는 주장이 아니다.

무료 사용자도 관측→학습→성취→꾸미기를 끝까지 경험한다. 보상 난도를 판매 목적으로 높이지 않고 신고·차단·내 기록 복원을 결제 혜택으로 삼지 않는다. 판매 성과나 유지율 개선을 보장할 근거는 없다. 여러 요금 등급을 만드는 대신 실제 팩 하나와 제작·운영비부터 확인한다.

## 두 사람 무료 권한과 기록 보존

본인과 여자친구에게는 각자의 검증된 Skylog UUID에 만료 없는 무료 권한을 제안한다. `owner`/`complimentary`는 제공 출처이며 운영 역할이 아니다. 신규 상품도 무료 목록에 반영하고 미래 클라우드는 운영자가 비용을 부담할 범위를 정한다. 비밀번호 공유·이메일 문자열 비교·백업의 권한 플래그는 사용하지 않는다.

서버가 거래와 무료 grant를 구분하고 사용자는 자신의 결과만 읽는다. 부여·철회에는 별도 권한과 감사 이력을 남긴다. 스토어 무료 거래를 우선 연결하면 정상 거래 복원 경로를 사용할 수 있다. 별도 무상 grant를 네이티브에서 인정하는 안은 심사 설명에 공개하며 서버 구현만으로 자동 승인된다고 보장하지 않는다.

같은 거래의 여러 계정 중복 등록, 앱 밖 코드 사용, 계정 전환, 재설치, 환불, 테스트/정식 환경 혼합을 검증해야 한다. 유료 팩 이용권과 무료 `personal.reward:*`를 분리하고 기존 장식·배치·관측·학습·내보내기를 보존한다. 구입 복원은 지워진 관측 기록 복원이 아니다.

## 날씨 비용에 대한 판단

`src/services/weather.ts`는 무료 Open-Meteo를 직접 호출한다. 약관은 구독·광고 앱과 상업 제품 이용을 상업 사례로 든다. 날씨가 무료여도 꾸미기를 판매하면 상업 이용 조건을 검토해야 한다는 판단이다. 고객 API 라이선스나 적합한 대체 공급자와 비밀 키를 노출하지 않는 프록시/캐시를 판매 전에 준비한다. 이번에는 계약하거나 유료 플랜을 구매하지 않았다.

현 요청은 변수 10개·기본 2일이다. 향후 변수를 10개보다 늘리거나 기간을 길게 확장할 때 HTTP 요청 1회가 항상 과금 호출 1회라는 가정을 쓰지 않는다. 실제 요청 조합·캐시·사용량으로 견적을 낸다. API 비용·스토어 공제·세금·메일·저장/전송·지원비가 아직 미정이므로 손익분기 인원을 만들어 제시하지 않는다.

실행안과 수용 기준은 [MONETIZATION-PLAN](../../docs/MONETIZATION-PLAN.md)에 반영했다. **이번 범위는 조사·제안 문서이며 결제·이용권·서버·계정·스토어 상품을 변경하지 않았다.**
