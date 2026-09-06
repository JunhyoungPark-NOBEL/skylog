# G2 — 검토가 필요한 항목

조사일: 2026-09-06. 이 목록은 출시 전 큐레이션 검토용이며, 아래 미확인 사항을 완료한 것으로 표시하지 않는다.

## 1. 범위·최신성

**별 이름 표는 233행이지만, 2026-09-06 현재의 모든 IAU 공식명 별 중 V≤3.5가 누락 없이 포함됐다고 보증하지 않는다.** 접근 가능한 2022-04-04 IAU-CSN의 밝기 기준 183행과 유명 추가 22행을 기준으로 2026-02 IAU 공지 및 ASE의 후속 채택 설명을 보완했다. 현행 전량 명명 카탈로그와 일관된 V등급 카탈로그의 전수 조인은 완료하지 못했다. 최종 T0 검증에서 최신 원본의 버전·해시를 고정하고 누락 집합을 계산해야 한다. [IAU-CSN 기준 목록](https://www.pas.rochester.edu/~emamajek/WGSN/IAU-CSN.txt) · [2026 IAU 공지](https://www.iau.org/IAU/IAU/News/Ann2026/New-Star-Names-2026.aspx)

DSO는 확인한 한국어 이름 중심 66행이며, 그중 메시에 32행이다. 확인한 대표 용례는 포함했으나 인터넷 전체의 메시에 별칭을 빠짐없이 수집한 사전은 아니다. M24의 ‘활잡이성운’은 별구름의 종류와 혼동될 수 있어 이번 기본명에서 제외했고, M74의 한국어 별칭은 확인한 문서에 없어 임의 번역하지 않았다. [M24](https://ko.wikipedia.org/wiki/메시에_24) · [M74](https://ko.wikipedia.org/wiki/메시에_74)

## 2. 이름·식별자별 보류

| 항목 | 관찰한 문제 | 병합 처리 |
|---|---|---|
| γ Hya / HIP64962 / Naga 후보 | 최신 보조 목록에 있으나 ASE 원문에서 채택 문구를 최종 재확인하지 못함 | 공식명 CSV에서는 제외. 별도 승인 근거 확인 후 추가. [후보 원문](https://ase.exopla.net/index.php/Naga) |
| Bade 후보 | ASE 카드의 μ Lep / HIP24305와 본문 제안의 γ Lep / HIP27072가 서로 다름 | 이름과 HIP를 추정 결합하지 않음. μ Lep는 밝기 컷 누락 검토 대상. [원문](https://ase.exopla.net/index.php/Bade) |
| Nganurganity / HIP33856 | 2022 IAU-CSN 표기와 현대 보조 목록의 Unurgunite 표기가 다름 | 2022 이름은 provenance와 low를 유지; 현행 공식명 확정 전 두 HIP 행을 만들지 않음 |
| Nuchuang / HIP84380 | ASE 페이지 제목은 Nüchuang이나 본문은 IAU 채택 철자를 발음구별기호 없는 Nuchuang으로 명시 | CSV의 iau_name_en은 Nuchuang, 원문 링크는 Nüchuang 페이지. [원문](https://ase.exopla.net/index.php/N%C3%BCchuang) |
| Vindemiatrix, Talitha, Alkes | 확인한 한국어 번역이 의심스럽거나 통용 표기를 직접 확인하지 못함 | name_ko는 빈칸, confidence=low. 숫자 HIP는 보존 |
| 2026 ASE 보완 항목의 HIP | 다수 항목은 보조 교차표도 사용 | T0의 HIP 기본 카탈로그/SIMBAD와 Bayer·성분·좌표를 교차 검증 |
| 다중성의 고유명 | WGSN 이름은 특정 성분, HIP는 계/주성 중심 관측 레코드일 수 있음 | 별 이름을 계의 모든 성분에 무조건 복제하지 않음 |
| M102 / NGC5866 | 역사적 식별 논쟁 | 낮은 확신도 유지. M101과 자동 합치기 금지 |
| B33 / IC434 | 앞의 암흑성운과 뒤의 발광성운 | 말머리 성운은 B33로 유지; DSO 파서에 B 계열 지원 |
| C14 / NGC869·NGC884 | 두 성단을 묶은 항목 | C14 하나의 식별자 셀을 세미콜론으로 분리해 다대다 관계로 저장 |
| C49 / NGC2237, C50 / NGC2244 | 성운 전체/대표 NGC 번호/중심 성단의 범위가 다름 | 별개 레코드 및 포함 관계 유지 |
| C33·C34 / Veil | 초신성잔해의 동쪽·서쪽 부분과 전체 명칭의 범위가 다름 | 베일 성운 전체를 각 구성부와 같은 ID로 합치지 않음 |
| C103 / NGC2070 | Tarantula Nebula 복합체와 중심 성단의 명칭 범위 | 복합체 분류를 사용한 검토 행. 카탈로그의 NGC2070 단위와 조정 필요 |
| NGC2392의 역사적 한국어 별칭 | NASA가 Eskimo Nebula 명칭 사용을 중단 | 검색 호환용 역사명으로만 검토; 기본 표시는 NGC2392 권장. [NASA](https://www.nasa.gov/solar-system/nasa-to-reexamine-nicknames-for-cosmic-objects/) |

## 3. 한국어·전통 이름

별자리 88개 한글은 학회 표를 따른다. **허큘리스자리**, **테이블산자리**, **직각자자리**, **Hydra=바다뱀자리 / Hydrus=물뱀자리**를 임의로 통용 번역과 섞지 않았다. 개별 별 음역은 다수가 Stellarium 공동체 번역이므로 학회 표준으로 오인하지 않는다. 발음·띄어쓰기·현행 사용률의 편집 검토는 남아 있다. [학회 표](https://www.kas.org/down/dictionary/15.pdf) · [별 이름 번역](https://raw.githubusercontent.com/Stellarium/stellarium/master/po/stellarium-sky/ko.po)

`traditional_ko`의 태자·상상·차상·대장 등은 서로 다른 성군에서 반복되는 역할명이다. 이번 데이터는 출처가 특정한 한국 전통 재구성의 관계를 기록했으며, 유일한 국가 표준·모든 시대의 동아시아 통일 명칭이 아니다. `삼태성`, `남두육성`, `묘수`의 구성별 표시는 그룹 관계다. 성군 전체 이름으로 단일 별만 검색되게 만들지 않는다. 칠석의 견우성 Altair와 28수 牛宿을 분리한다. [전통 데이터](https://raw.githubusercontent.com/Stellarium/stellarium/master/skycultures/korean/index.json) · [칠석 전승](https://astro.kasi.re.kr/kor/post/constellationLegend/71335)

28수의 대표별 선택은 특히 **壁=γ Peg**, **奎=ζ And**, **觜=φ¹ Ori**, **鬼=θ Cnc**를 확인해야 한다. ‘가장 밝은 대표별’을 택하는 학습용 표 또는 다른 시대 중국 목록과 값이 다를 수 있다. 별자리를 잇는 선을 구현할 때에도 다른 skyculture의 선을 혼용하지 않는다. 한국천문연구원 개요에는 항수·기수의 대응이 본 재구성과 다른 항목이 있어 단일 근거처럼 합치지 않았다. [한국천문연구원 개요](https://astro.kasi.re.kr/kor/post/easternConstellation/71347) · [채택한 기준성 배열](https://raw.githubusercontent.com/Stellarium/stellarium/master/skycultures/korean/index.json)

## 4. 한국어 미확인 행 목록

별 이름 name_ko 미확인: Schedar (HIP3179), Tiansi (HIP4427), Alaybasan (HIP10064), Sarvvis (HIP17358), Áldu (HIP18532), Bibing (HIP18724), Rhombus (HIP19780), Ping (HIP23685), Pipit (HIP31685), Nganurganity (HIP33856), Talitha (HIP44127), Zhang (HIP48356), Alkes (HIP53740), Imai (HIP59747), Vindemiatrix (HIP63608), Kulou (HIP65109), Heng (HIP67464), Leepwal (HIP68002), Uridim (HIP71860), Xami (HIP71908), Qigong (HIP74666), Blaze Star (HIP78322), Paikauhale (HIP81266), Tianji (HIP81693), Xamidimura (HIP82514), Nuchuang (HIP84380), Nandou (HIP92041), Okab (HIP93747), Guqi (HIP95501), Pagru (HIP97804), Telum (HIP98337), Antinous (HIP99473), Albali (HIP102618), Garnet Star (HIP107259), Lang-Exster (HIP110130).

콜드웰 name_ko 미확인: C1 (NGC188), C3 (NGC4236), C5 (IC342), C7 (NGC2403), C8 (NGC559), C9 (Sh2-155), C10 (NGC663), C15 (NGC6826), C16 (NGC7243), C17 (NGC147), C18 (NGC185), C21 (NGC4449), C23 (NGC891), C25 (NGC2419), C26 (NGC4244), C28 (NGC752), C29 (NGC5005), C30 (NGC7331), C35 (NGC4889), C36 (NGC4559), C37 (NGC6885), C38 (NGC4565), C40 (NGC3626), C42 (NGC7006), C43 (NGC7814), C44 (NGC7479), C45 (NGC5248), C46 (NGC2261), C47 (NGC6934), C48 (NGC2775), C50 (NGC2244), C51 (IC1613), C52 (NGC4697), C53 (NGC3115), C54 (NGC2506), C56 (NGC246), C57 (NGC6822), C58 (NGC2360), C59 (NGC3242), C62 (NGC247), C64 (NGC2362), C66 (NGC5694), C67 (NGC1097), C68 (NGC6729), C69 (NGC6302), C70 (NGC300), C71 (NGC2477), C72 (NGC55), C73 (NGC1851), C75 (NGC6124), C76 (NGC6231), C78 (NGC6541), C79 (NGC3201), C81 (NGC6352), C82 (NGC6193), C83 (NGC4945), C84 (NGC5286), C85 (IC2391), C86 (NGC6397), C87 (NGC1261), C88 (NGC5823), C89 (NGC6087), C90 (NGC2867), C91 (NGC3532), C93 (NGC6752), C95 (NGC6025), C96 (NGC2516), C97 (NGC3766), C98 (NGC4609), C100 (IC2944), C101 (NGC6744), C103 (NGC2070), C104 (NGC362), C105 (NGC4833), C107 (NGC6101), C108 (NGC4372), C109 (NGC3195).

빈칸은 ‘공인된 이름이 없다’는 증명이 아니라 이번 조사에서 확인하지 못했다는 뜻이다. confidence=low도 번호·분류가 모두 틀렸다는 뜻은 아니다. 행의 이름·관계·출처 범위를 함께 읽는다.

## 5. 배포 전 라이선스·파일 검토

Stellarium korean 자료는 CC BY-SA로 표시하지 않는다. 확인한 설명은 **GNU GPL v2.0**을 명시한다. 문장·그림·선 연결 데이터의 직접 복사·수정·재배포 범위는 실제 취득 파일의 고지와 라이선스 전문을 확인한 뒤 결정한다. 공개 웹페이지라는 이유만으로 한국천문연구원 자료 전체에 오픈 라이선스가 있다고 판단하지 않는다. [Stellarium 고지](https://raw.githubusercontent.com/Stellarium/stellarium/master/skycultures/korean/description.md)

별·DSO 명칭 CSV는 조사 결과의 큐레이션이며 원본 카탈로그의 모든 수치/서술/이미지를 배포하는 파일이 아니다. 그 사실만으로 제3자 권리 문제가 모두 해소됐다고 보증하지 않는다. CSV의 source와 이 보고서를 유지한다. 이 패키지는 리포지터리에 커밋되지 않았다.
