# 실제 천체 사진 확대와 작은 썸네일의 출처 표시

확인일: 2026-09-09. 적용 대상: beta.9의 20개 사진을 확대하는 후속 작업. 이 문서는 출처 조사와 구현 제안이며, 사진을 새로 배포하거나 출처 기관으로부터 별도 승인을 받은 기록이 아니다.

## 권장 결론

**2MASS의 명시적 public-domain 갤러리로 메시에와 추가 NGC/IC의 기반을 채우고, 개별 권리가 확인된 NASA/JPL·STScI 관측 사진으로 대표 천체를 보완한다.** 작은 사진을 누르면 해당 천체 상세의 큰 사진과 전체 출처를 바로 볼 수 있게 한다. About의 전체 목록은 보조 경로다. 기존 ESA/Hubble·ESO 사진의 긴 크레딧을 숨기는 것만으로 이 조건을 충족했다고 판단하지 않는다.

공공 영역 공개, 일반 CC BY, NASA의 재사용 허용 지침은 서로 다르다. 모든 새 사진에 `CC BY 4.0`을 일괄 부여하지 않는다. 사진 파일별 출처 URL·원본 해시·권리 근거·전체 크레딧·관측 파장·가공·촬영 범위를 남긴다. 관측 자료를 색으로 합성한 사진과 AI 생성 그림도 구분한다. 이번 후보에 생성형 AI 그림은 없다.

## 공식 정책과 표시 방식

| 출처 | 원문에서 확인한 내용 | 이번 앱에 적용할 판단 |
|---|---|---|
| [ESA/Hubble](https://esahubble.org/copyright/) | CC BY 4.0. 전체 크레딧을 원문대로 읽을 수 있게 표시하고, 온라인 링크는 활성화. 숨긴 탭에만 둔 크레딧을 Q&A에서 거절한다. | 작은 사진 아래 전체 크레딧을 유지하거나, 작은 사진에 쓰는 원본을 다른 허용 자료로 교체한다. 상세/About만으로 충분하다는 명시적 근거는 찾지 못했다. |
| [ESO](https://www.eso.org/public/outreach/copyright/) | 전체 크레딧의 가시성과 이미지와의 연결을 요구한다. 게임에서는 모든 사용자가 볼 수 있는 전체 크레딧 splashscreen 예시를 허용한다. | splashscreen 예외를 사용자가 열지 않을 수도 있는 About 화면으로 확대 해석하지 않는다. |
| [CC BY 4.0 §3(a)](https://creativecommons.org/licenses/by/4.0/legalcode.en#s3a) | 창작자·지정 크레딧·라이선스·가능한 원본 링크·변경 사실을 보존해야 한다. §3(a)(2)는 매체·수단·맥락에 합리적인 방식으로 정보를 담은 링크를 허용한다. | 일반 CC BY 자료는 사진과 연결된 명확한 출처 링크와 오프라인 상세 정보를 설계할 근거가 있다. 기관의 구체적 요청과 충돌하는 배치를 법적으로 해결했다고 단정하지 않는다. |
| [2MASS 갤러리](https://www.ipac.caltech.edu/2mass/gallery/) | 사진을 public domain으로 공개한다. acknowledgement를 요청하며, 공간이 부족하면 축약할 수 있다고 명시한다. | 전체 acknowledgement를 해당 사진 상세에, 전체 목록을 About에 보존하는 방식의 가장 명확한 기반이다. `CC0`로 재표기하지 않는다. |
| [NASA 미디어 지침](https://www.nasa.gov/nasa-brand-center/images-and-media/) | 정보성·편집적 사용과 상업 출판을 허용하는 설명이 있다. NASA 출처 표기를 요청한다. 제3자 저작물은 NASA가 재사용 권리를 주지 않는다. | 순수 천체 설명에 쓰고 NASA의 앱 추천·승인을 암시하지 않는다. NASA 도메인이나 크레딧의 NASA 글자만으로 public domain을 추정하지 않는다. |
| [STScI Content Use Policy](https://www.stsci.edu/copyright) | NASA 계약으로 STScI가 제작한 자료는 별도 표시 없으면 저작권을 주장하지 않고 공공 영역 자료처럼 사용할 수 있다. 타인·타기관 제작분은 별도다. | 실제 STScI 제작 단독 이미지인지 확인하고 전체 NASA/STScI 크레딧을 보존한다. |
| [JPL Image Use Policy](https://www.jpl.nasa.gov/jpl-image-use-policy/) | 예외 표시 없으면 목적 제한 없이 재사용 가능하며 이미지와 연결된 크레딧을 요구한다. 제3자 소유 자료는 상업 사용에 별도 제약이 있을 수 있다. | 개별 caption을 확인한 탐사선 관측 사진을 선택하고 원문 크레딧을 상세 사진에 붙인다. 지침 기반 허용을 임의의 CC 라이선스로 바꾸지 않는다. |

NASA 지침 상단의 브랜드 설명에는 imagery와 public domain에 관한 넓은 문장이 있지만, 본문의 실제 미디어 사용 허용과 제3자 예외가 함께 있다. 따라서 도메인 전체를 한 가지 저작권 상태로 판정하지 않고 **자료별 제작 주체와 허용 근거**를 저장한다.

## 대량 수급의 실제 범위

[2MASS Messier 갤러리](https://www.ipac.caltech.edu/2mass/gallery/messiercat.html)는 M1부터 M110까지 항목을 제공한다. M42/43은 공동 이미지이고 M102에는 식별의 불확실성을 나타내는 물음표가 있다. 번호 수와 고유 사진 수를 같은 것으로 집계하지 않는다. M42와 M43에 같은 전체 사진을 쓴다면 `coverage`에 주변 영역을 포함한다고 설명해야 한다.

[2MASS 갤러리 분류](https://www.ipac.caltech.edu/2mass/gallery/)에는 성운·산개성단·구상성단·은하·은하단 등이 있다. 파일명만으로 천체를 결합하지 않고 개별 설명과 앱 canonical ID를 대조한다. 갤러리 RGB는 J/H/Ks 근적외선 관측을 색으로 매핑한 것이다. 기본 방향은 북쪽 위·동쪽 왼쪽이다. 상세에 **근적외선 관측을 색으로 표현한 사진**임을 남겨 육안이나 접안렌즈의 실제 색으로 오해하지 않게 한다.

[IRSA 사용 조건](https://irsa.ipac.caltech.edu/data_use_terms.html)은 대부분 공개 데이터에 사용 제한이 없다고 설명하면서 DSS를 저작권 예외로 분리한다. [MAST 데이터 조건](https://archive.stsci.edu/publishing/data-use)은 DSS와 그 기반 Guide Star Catalog의 상업 사용에는 권리자의 서면 허가가 필요하다고 명시한다. 임의 천체를 채우는 자동 DSS cutout은 이번 유료 배포 가능 앱의 기본 수단으로 선택하지 않는다. 2MASS의 전천 관측 범위가 넓다는 사실과, 모든 NGC 천체의 질 좋은 완성 사진이 이미 준비됐다는 주장은 구별한다.

NASA의 [Hubble Messier 목록](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/)은 110개 중 관측 96개, 공개 처리 이미지 89개라고 설명한다. Hubble만으로 110개 전체를 채웠다고 표시하면 안 된다. 작은 시야의 중심부 사진은 `whole-object` 대신 `detail`로 표시한다.

## NASA 목록에서 실제 확인한 제외 대상

- [M44](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-44/): 일부 구성 사진에 DSS와 K. Hartnett의 허가받은 아마추어 사진이 섞여 있다. NASA가 받은 허가를 앱에 재허가한 것으로 보지 않는다. 별도로 표시된 단독 Hubble 이미지와 합성 패널을 분리한다.
- [M13](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-13/), [M104](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-104/): 아마추어 비교 패널과 Stellarium 탐색도가 함께 있다. 페이지의 첫 JPG나 모든 `img`를 일괄 수급하지 않는다. 이 저장소는 Stellarium 자료를 복사하지 않는다.
- [NASA APOD 설명](https://science.nasa.gov/apod/apod-about/): 제3자 사진이 많고, 공개·상업 사용 권한은 개별 소유자가 갖는다. APOD 등록이나 NASA API 응답은 재배포 라이선스가 아니다.
- [NASA 원본 사진 FAQ](https://science.nasa.gov/solar-system/multimedia/raw-images-faq/): 원시 관측 자료와 시민 과학자가 가공한 결과물의 권리는 다를 수 있다. 원시 데이터의 공개 상태를 별도 제작자의 가공 이미지에 자동 승계하지 않는다.
- [금성 PIA00271](https://science.nasa.gov/photojournal/venus-computer-simulated-global-view-of-the-northern-hemisphere/): 제목부터 컴퓨터로 구성한 표면 뷰다. 금성 구름의 실제 관측 대표 사진으로 채택하지 않는다. 아래 Mariner 10의 구름 관측을 사용한다.

## Wikimedia/CC0 보완 원칙

[Commons 재사용 안내](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia)에 따라 개별 File 페이지의 작성자·원본·라이선스를 확인한다. 페이지 하단의 **구조화 데이터 CC0** 안내는 이미지 자체의 CC0 선언이 아니다. 업로더와 사진 작가가 다르면 실제 작가에게 크레딧을 준다. CC BY-SA는 가공 이미지의 라이선스 요구도 따라야 하며, 이를 검토하기 전 CC BY와 같은 분류에 넣지 않는다.

이번 조사에서 대량 기반으로 검증한 것은 2MASS의 public-domain 사진이다. 특정 Commons 사진을 CC0로 확정하여 신규 채택하지 않았다. 후속 후보는 개별 File 페이지에서 이미지 자체의 CC0/PD 또는 적합한 CC BY를 확인한 뒤 추가한다. 원본 사진을 재게시한 사이트의 표지만 바꿔 권리 검토를 생략하지 않는다.

## 대표 사진 후보 10개: 파이프라인 인계용 JSON

아래 URL은 2026-09-09에 공식 개별 페이지의 다운로드 링크·크레딧·관측 설명과 대조했다. **원본 바이트/해시·실제 이미지 프레임 검사·WebP 변환은 수급 담당자의 후속 작업**이다. 배포 완료 목록이 아니다. `NASA/JPL permitted reuse`는 출처 지침에 따른 분류이며 public domain이나 CC BY로 임의 치환하지 않는다. 모든 상세 사진 아래에 전체 크레딧·원본·권리 링크를 붙인다.

M104는 [단독 이미지 설명](https://science.nasa.gov/asset/hubble/the-majestic-sombrero-galaxy-m104/)에서 STScI Heritage Team의 제작과 HST 프로그램 9714를 확인했다. [공식 제작 설명](https://science.nasa.gov/missions/hubble/heritage-project-celebrates-five-years-of-harvesting-the-best-images-from-hubble-space-telescope/)도 STScI 천문학자와 이미지 처리 담당자의 작업이라고 명시한다. 아마추어 비교판이나 DSS를 포함한 확대 동영상은 후보에 넣지 않았다.

```json
[
  {
    "objectId": "planet:mercury",
    "sourceURL": "https://science.nasa.gov/photojournal/planet-mercury/",
    "imageURL": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia00/pia00437/PIA00437.jpg",
    "credit": "NASA/JPL/USGS",
    "rightsURL": "https://www.jpl.nasa.gov/jpl-image-use-policy/",
    "rightsEvidence": "NASA/JPL permitted reuse. PIA00437 Mariner 10 관측; 개별 caption에 별도 제한 없음.",
    "band": "visible",
    "coverage": "whole-object",
    "caption": "Mariner 10이 1974년 3월 24일 촬영한 수성. 촬영 당시의 밝은 반구가 보인다."
  },
  {
    "objectId": "planet:venus",
    "sourceURL": "https://science.nasa.gov/photojournal/venus-from-mariner-10/",
    "imageURL": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia23/pia23791/PIA23791.jpg",
    "credit": "NASA/JPL-Caltech",
    "rightsURL": "https://www.jpl.nasa.gov/jpl-image-use-policy/",
    "rightsEvidence": "NASA/JPL permitted reuse. PIA23791; JPL engineer가 Mariner 10 기록을 처리한 공식 배포.",
    "band": "multiwavelength",
    "coverage": "whole-object",
    "caption": "1974년 Mariner 10의 주황색·자외선 필터 관측을 합성해 표현한 금성 구름. 자연색이나 표면 사진이 아니다."
  },
  {
    "objectId": "planet:mars",
    "sourceURL": "https://science.nasa.gov/photojournal/global-color-views-of-mars/",
    "imageURL": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia00/pia00407/PIA00407.jpg",
    "credit": "NASA/JPL/USGS",
    "rightsURL": "https://www.jpl.nasa.gov/jpl-image-use-policy/",
    "rightsEvidence": "NASA/JPL permitted reuse. PIA00407 Viking/USGS 관측 모자이크; 개별 제한 없음.",
    "band": "visible",
    "coverage": "whole-object",
    "caption": "Viking 궤도선 관측을 합친 화성 구체 투영. 관측 틈은 보간했고 일부 색과 명암을 강조한 자료다."
  },
  {
    "objectId": "planet:jupiter",
    "sourceURL": "https://science.nasa.gov/photojournal/jupiter/",
    "imageURL": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia00/pia00343/jpeg/PIA00343.jpg",
    "credit": "NASA/JPL/USGS",
    "rightsURL": "https://www.jpl.nasa.gov/jpl-image-use-policy/",
    "rightsEvidence": "NASA/JPL permitted reuse. PIA00343 Voyager 관측을 USGS가 처리; 개별 제한 없음.",
    "band": "visible",
    "coverage": "whole-object",
    "caption": "1979년 Voyager 관측을 USGS가 처리한 목성. 구름대와 대적점의 세부가 드러나도록 색을 강조했다."
  },
  {
    "objectId": "planet:saturn",
    "sourceURL": "https://science.nasa.gov/photojournal/saturn-taken-from-voyager-2/",
    "imageURL": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia01/pia01364/PIA01364.jpg",
    "credit": "NASA/JPL",
    "rightsURL": "https://www.jpl.nasa.gov/jpl-image-use-policy/",
    "rightsEvidence": "NASA/JPL permitted reuse. PIA01364 Voyager 2 관측; 개별 제한 없음.",
    "band": "visible",
    "coverage": "whole-object",
    "caption": "1981년 Voyager 2가 본 토성과 고리. 원본의 폭풍 설명 표식 유무를 실제 이미지 검수에서 확인한다."
  },
  {
    "objectId": "planet:uranus",
    "sourceURL": "https://science.nasa.gov/photojournal/uranus-as-seen-by-nasas-voyager-2/",
    "imageURL": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia18/pia18182/PIA18182.jpg",
    "credit": "NASA/JPL-Caltech",
    "rightsURL": "https://www.jpl.nasa.gov/jpl-image-use-policy/",
    "rightsEvidence": "NASA/JPL permitted reuse. PIA18182 Voyager 2 관측; 개별 제한 없음.",
    "band": "visible",
    "coverage": "whole-object",
    "caption": "Voyager 2가 1986년 촬영한 천왕성."
  },
  {
    "objectId": "planet:neptune",
    "sourceURL": "https://science.nasa.gov/photojournal/neptune-full-disk-view/",
    "imageURL": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia01/pia01492/PIA01492.jpg",
    "credit": "NASA/JPL",
    "rightsURL": "https://www.jpl.nasa.gov/jpl-image-use-policy/",
    "rightsEvidence": "NASA/JPL permitted reuse. PIA01492 Voyager 2 관측; 개별 제한 없음.",
    "band": "visible",
    "coverage": "whole-object",
    "caption": "Voyager 2의 녹색·주황색 필터 관측으로 구성한 해왕성. 대흑점과 밝은 구름이 보인다."
  },
  {
    "objectId": "moon",
    "sourceURL": "https://science.nasa.gov/photojournal/earths-moon/",
    "imageURL": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia00/pia00405/PIA00405.jpg",
    "credit": "NASA/JPL/USGS",
    "rightsURL": "https://www.jpl.nasa.gov/jpl-image-use-policy/",
    "rightsEvidence": "NASA/JPL permitted reuse. PIA00405 Galileo 관측; 개별 제한 없음.",
    "band": "multiwavelength",
    "coverage": "whole-object",
    "caption": "Galileo가 1992년 촬영한 달. 보라색과 근적외선 필터 관측을 합성해 색을 강조한 사진이다."
  },
  {
    "objectId": "sun",
    "sourceURL": "https://science.nasa.gov/resource/pumpkin-sun/",
    "imageURL": "https://assets.science.nasa.gov/content/dam/science/psd/solar/2023/09/h/Halloween_Sun_2014.jpg",
    "credit": "NASA/GSFC/SDO",
    "rightsURL": "https://www.nasa.gov/nasa-brand-center/images-and-media/",
    "rightsEvidence": "NASA 정보성 재사용 지침. NASA/GSFC/SDO 관측; 제3자 저작권 표시 없음.",
    "band": "ultraviolet",
    "coverage": "whole-object",
    "caption": "SDO가 2014년 10월 8일 관측한 태양의 활동 영역. 171·193 옹스트롬 극자외선을 색으로 합성했다."
  },
  {
    "objectId": "dso:M104",
    "sourceURL": "https://science.nasa.gov/asset/hubble/the-majestic-sombrero-galaxy-m104/",
    "imageURL": "https://assets.science.nasa.gov/content/dam/science/missions/hubble/releases/2003/10/STScI-01EVT8YKVEYX7FZC7AM76BPYHZ.tif/jcr:content/renditions/11472x6429.jpg",
    "credit": "NASA and The Hubble Heritage Team (STScI/AURA)",
    "rightsURL": "https://www.stsci.edu/copyright",
    "rightsEvidence": "STScI 자체 제작 자료의 공개 정책. 개별 설명이 Heritage Team/프로그램9714 제작을 확인한다.",
    "band": "visible",
    "coverage": "whole-object",
    "caption": "Hubble ACS의 빨강·초록·파랑 필터 관측 여섯 장을 연결한 솜브레로 은하 M104."
  }
]
```

## 인계와 미확인

정책과 후보를 `sky_visuals`에 전달했다. 실제 채택 수·중복 제거·canonical ID·원본 다운로드 성공·잘린 천체 여부·파생 해시·총 용량은 파이프라인 결과로 확정한다. `M102?`, 공동 M42/43 사진, 작은 중심부 사진을 별도로 검수한다. 앱 이미지의 화면 크기나 source URL만 보고 전체 천체 사진이라고 판정하지 않는다.

이번 조사는 메타데이터·자산·UI·서버를 수정하지 않았다. 외부 기관에 허가 요청이나 메시지를 보내지 않았다. 정책 원문과 다른 표시를 별도로 승인받았다고 주장하지 않는다.
