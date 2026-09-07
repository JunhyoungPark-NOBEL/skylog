# 관측·망원경 학습 내용과 검토 (2026-09-08)

`data-src/learn-raw/observing-quiz.json`의 obs-001~060은 이번 사용자 요청에 맞춰 새로 작성했다. G5 산출물로 가장하지 않으며 기존 180문항의 ID/산문/정답을 변경하지 않는다. 새 문항은 질문·보기·해설 모두 한국어와 영어를 제공한다. 기초 20 / 실전 20 / 응용 20문항, 5문항씩 12스테이지다.

| 범위 | 주제 | 사실 검토 기준 |
|---|---|---|
| 001~005, 021~025, 036~040 | 어둠 적응·대상 선택·기록·시상/투명도·태양 안전 | 광학 관측 원리, 아래 제조사 매뉴얼과 NASA |
| 006~010 | 굴절·뉴턴 반사·SCT/막스토프 복합식·돕소니안·구경 | Celestron optical tubes |
| 011~020, 026~030 | 경위대/적도의/GoTo·배율/시야/초점비·파인더·상의 반전 | Celestron eyepieces, Sky-Watcher 수동 망원경 매뉴얼 |
| 031~035, 049~050, 056~060 | 폰 윗변·정렬·장착 안정성·드리프트·센서와 영상 인식의 차이 | W3C 상대 방향 센서, D-029, 독립 수학 테스트 |
| 041~045 | 배율·사출동공·실시야·초점비·호핑 이동량 계산 | 500/25=20배, 90/30=3mm, 52/20=2.6°, 1000/200=f/5, 3/6=0.5시야 |
| 046~048, 051~055 | 광축/온도 진단·표면 밝기·시야 회전·관측 전략 | 제조사 사용 매뉴얼과 기하광학 |

한국어 정답/해설 60개를 전수 읽어 보장·과장 표현을 점검했다. ‘시상’은 문항 안에서 대기의 흔들림으로 설명하고, ‘사출동공’은 빛의 지름과 나눗셈으로 풀었다. 초점비와 배율을 혼동하지 않으며 AFOV/배율은 근사, 실제 시야는 필드 스톱에 따라 다를 수 있음을 설명한다. 태양 문항은 일식 안경을 망원경/쌍안경 필터 대신 쓰지 않도록 한다.

## 참고한 1차 자료

- [Celestron 광학계 종류 안내](https://www.celestron.com/blogs/knowledgebase/the-ultimate-guide-to-celestron-optical-tubes): 굴절·반사·복합식의 구성과 용도. 제품 추천이나 보유 장비 가정으로 사용하지 않았다.
- [Celestron 접안렌즈와 배율·시야](https://www.celestron.com/blogs/knowledgebase/how-to-determine-which-eyepieces-to-use-with-your-telescope): 초점거리·배율·시야 관계.
- [Sky-Watcher FAQ](https://www.skywatcher.com/faq/)와 [수동 망원경 매뉴얼](https://skywatcher.com/download/manual/manual-operated-telescope/): 마운트·파인더 정렬·관측/광축 관리.
- [NASA 일식 안전](https://science.nasa.gov/eclipses/safety/): 광학기기 앞쪽 전용 필터, 일식 안경의 사용 한계.
- [W3C Orientation Sensor](https://www.w3.org/TR/orientation-sensor/): 상대 센서는 자력계 없이 가속도계·자이로를 사용하며 드리프트 가능.
- [W3C Device Orientation](https://www.w3.org/TR/orientation-event/): 기기 축·상대/절대 이벤트와 권한.
- [Celestron StarSense Explorer 기술 설명](https://www.celestron.com/pages/starsense-explorer-technology): 상용 기능의 카메라 plate solving과 이번 직접 정렬·센서 안내의 차이를 확인했다. 코드/도안/별 데이터는 가져오지 않았다.

자동 검증: 스키마/ID/정답 범위/ko-en 키, G5 원본 구조 보존, 12단계 문항 참조·코스별 해제, 기존 28단계 그대로 유지, 한·영 첫 단계 완주/해설/복원. 실제 장비 정렬 오차는 합성 센서 테스트로 보장하지 않으며 사용자 실기기 확인과 G4 리뷰가 필요하다.
