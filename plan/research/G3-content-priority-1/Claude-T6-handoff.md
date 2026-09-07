# Claude T6 전달문 — G3 우선 확충팩 1

아래 내용과 전체 ZIP을 함께 전달한다.

```text
별관찰 프로젝트 T6 콘텐츠 검증·병합을 진행해 주세요.
첨부 G3-content-priority-1-package.zip에는 신규 20개와 원본/검토 기록이 있습니다.

1. 먼저 README.md, review-items.md, catalog-correction-proposals.json을 읽어 주세요.
2. 신규 파일은 G3-content-priority-1.json입니다. 원래 항성 전용 배치 2를 대체하거나
   번호를 재사용하지 말고 plan/research/에 독립 확충팩으로 보존해 주세요.
3. inputs/G3-content-batch-1.json은 수정하지 않은 기존 20개입니다.
   cumulative-40은 초안 통합본이므로 기존 게시 데이터에 무조건 덮어쓰지 마세요.
4. python validate.py와 저장소의 실제 T6 검증기를 둘 다 실행해 주세요.
   패키지 --release의 종료코드 2는 오류 숨김이 아니라 미승인 게시 차단입니다.
5. M31/M13/M3/M15/M51의 dist_ly 원천·단위·교차매칭을 T0b에서 재확인해 주세요.
   외부 후보는 교육용 근삿값이며 승인된 정밀 교정값이 아닙니다.
   low를 일괄 medium으로 올리거나 검토 보류 문구를 실제 거리로 파싱하지 마세요.
6. 전체 mag의 측광 대역·판본·성분/적분 범위를 확인해 주세요.
   V 확인 전 숫자 비교 퀴즈 또는 고립 후보 brightness cut에 사용하지 마세요.
7. M42의 복합 type→앱 nebula 매핑과 M5 Se1→Ser 참조 키를 명시적으로 검토하세요.
   raw-selected-values와 입력 CSV는 기록용 원문 그대로 남겨 주세요.
8. G2 표시명 정책, 전통 명칭, 부분 열람된 전문 출처, 관측 문구를 검토해 주세요.
9. hopFrom의 카탈로그 ID는 유효하지만 일부 읽기 콘텐츠는 아직 없습니다.
   실제 content/v1/index.json에는 검토·게시 승인된 항목만 넣어 주세요.
10. 승인/보류 항목과 사유를 보고하고, 오류 수정 요청은 해당 ID와 검사 메시지로 반환하세요.
    G5는 실제 게시 인덱스를 확인한 뒤 미션·퀴즈를 확장해야 합니다.
```

## 후속 배치 선택

원래 첨부는 121개다. 이번 확충 후 미작성은 별 17개·별자리 30개·DSO 34개로 총 81개다. `remaining-targets.csv`는 원래 priority 순서를 유지한 차집합이다. 이미 작성한 3개 별 또는 17개 DSO를 새 배치에 다시 넣지 않는다.

이 문서는 실제 Claude 실행 결과나 커밋 완료 보고가 아니다.
