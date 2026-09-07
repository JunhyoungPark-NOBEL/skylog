# Claude T7 전달 안내

아래 문구와 함께 ZIP을 전달한다. T7을 시작하기 전의 준비 자료 검토로도 사용할 수 있다.

```text
별관찰 프로젝트 G5 사전 작업팩을 첨부합니다.
완성된 정식 G5 팩이 아니라 G3 배치1 초안 기반의 준비 자료입니다.
G4는 아직 실제 코드를 받지 못해 수행되지 않았습니다.

1. README.md, review-items.md, readiness-manifest.json부터 읽으세요.
2. 실제 content/v1/index.json과 콘텐츠 로드 가능 상태를 확인하세요.
   content-targets 121행은 작성 대상이지 게시 완료 목록이 아닙니다.
   inputs/g3-content-draft.json을 정식 index로 바꾸거나 게시 완료로 간주하지 마세요.
3. G5-learn-paths/missions/badges/quiz.json 네 파일을 실제 T7 스키마와 대조하세요.
   원래 스키마 밖의 설명/출처/실행 조건은 별도 파일로 분리되어 있습니다.
   임의로 키를 추가하거나 보류 표식을 제거하지 마세요.
4. 미션 단계의 실제 핸들러와 이벤트를 확인하세요.
   arMode/align1/fovSetup/sketch/backup 성공이 클릭·허용만으로 발생하지 않게 하세요.
5. mission-runtime-gates.json과 visibility-screening.json을 참고하되,
   날짜·위치·정식 좌표 기준에 맞는 실제 천체력으로 25° 및 박명 조건을 재검증하세요.
   달/행성은 현재 위치 계산이 필요하며, any는 매일 보인다는 뜻이 아닙니다.
6. skyPick 20개는 full catalog 근접 검사와 실제 3° hit-test 완료 전 비활성화하세요.
   정답 7별끼리의 이격 검사만 했고 전체 하늘 격리 검사는 미완료입니다.
7. badge-readiness.json과 implementation-contract.md에서 집계 의미를 승인하거나
   다른 결정을 명시하세요. 관측과 지도 연습을 섞지 마세요.
8. scripts/validate.py를 실행해 초안 61개 검사를 재현하세요.
   --release는 현재 9개 보류 사유 때문에 의도적으로 실패(exit 2)합니다.
   이것을 통과시키기 위해 검사를 삭제하거나 수량 조건을 낮추지 마세요.
9. 최소 50문항(하늘 선택 10개 이상 포함)과 성단 스타 호핑 튜토리얼이 남아 있습니다.
   후속 G3 콘텐츠에서 대상을 확장하세요. 없는 콘텐츠를 임의로 게시 완료로 만들지 마세요.
10. 반영/보류/수정 항목과 이유, 실제 실행한 테스트 결과를 구분해서 보고하세요.
    다음 G4 리뷰용 코드 ZIP은 별도로 전달해야 합니다.

권장 저장 위치:
plan/research/G5-prep/ (보조 자료 전체)
plan/research/G5-learn-paths.json
plan/research/G5-learn-missions.json
plan/research/G5-learn-badges.json
plan/research/G5-learn-quiz.json

이번 첨부만으로 content/v1 또는 실제 배포 팩에 무검증 병합하지 마세요.
```
