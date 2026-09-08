# 풍경 개선 beta.6

2026-09-08 · D-045. 잔디·꽃의 질감과 주변 지면 경계 개선. 현재 화면 변화이며 꾸미기/커뮤니티는 후속 설계다.

## 에셋

- 내장 image_gen으로 이 프로젝트에 새로 생성했다. 외부 사진/풍경 데이터와 별도 생성 API/CLI를 쓰지 않았다.
- 채택 원본: exec-22ac7be6-f0be-478f-b371-45d27b2056ad.png. 실제 **1774×887 RGB**, WebP quality92/effort6 인코딩 **805,980bytes**. public/landscapes/meadow-v2.webp. PWA/native에 포함한다.
- 요청 프롬프트는 3840×1920을 지정했으나 도구가 반환한 실제 크기는 위와 같다. 4K 원본/초해상도라고 보고하지 않는다. 생성 후 확대나 픽셀 편집은 하지 않았으며 WebP 인코딩만 했다.
- 이전 원본은 대부분이 빈 투명 하늘이었다. v2는 전 영역을 식물 묘사에 사용하고 360°에 6회 반복해 화면상 잔디의 샘플 밀도를 늘린다. 반복 횟수는 원본 해상도가 높아졌다는 뜻이 아니다.
- 먼저 생성한 두 컷은 투명 대신 체크무늬가 그려져 채택하지 않았다. 최종 이미지는 원래부터 식물이 가득한 불투명 표면이며 하늘 영역을 잘라내는 후처리가 필요 없다. 미사용 v1은 Git 이력에 남고 앱 번들에서는 제외한다.

## 경계를 잇는 방식

별도 풍경 메쉬를 없애고 지면 재질 안에서 이미지 색과 기본 지면 색을 섞는다. 풍경을 50%로 볼 때 지면50% + 풍경50%가 겹쳐75%가 되던 문제를 없앤다. 지평선 바로 아래0–2.5°에서 질감을 서서히 나타내고, 14–32° 구간에서 지면 색으로 잇는다. 지평선0–0.8°에는 부드러운 alpha 전이를 적용한다. 별도의 짙은 테두리/불투명 사각 띠가 생기지 않는다.

수평 반복 끝10%는 교차 혼합하며 밉맵과 기기 지원 범위 내 최대8x 이방성 필터링을 쓴다. 야간에는 적색, 평상시에는 태양 고도에 맞춰 밝기를 조절한다. 장식은 지평선 위를 가리지 않는다. 사용자 시선0→−28°에 따라 지면 전체가 투명해지는 D-044 규칙, 투명도 설정·별 선택·지평선 아래 안내를 유지한다. 실제 관측 지형/좌표/센서/태양 안전 계산은 바꾸지 않는다.

## 검증

- typecheck/lint, 단위501개, 브라우저59개 전체 통과.
- 실제 WebGL 픽셀의 full/half/clear를 비교해 half가 양끝의 평균과 평균오차2미만임을 확인. 두 겹의75% 합성을 검출하는 회귀 검사다.
- 주간·야간·기본 지평선·아래14°/35° 캡처 확인. 야간 풍경 픽셀의 green/blue≤1, red>10 확인.
- 별자리·태양/달 크기·AR·망원경·스크롤·퀴즈/관측 기록·달력 회귀 통과. 모바일 빌드/공개 배포의 최종 결과는 STATUS에 기록한다.
- 실기기: 기본 하늘의 식물 질감/좌우 이음, 아래를 볼 때 잔상 없이 사라짐, 풍경 끄기, 야간 모드, 확대/이동 중 프레임을 확인한다.

## 채택 이미지의 실제 요청

```text
Use case: photorealistic-natural. Production game environment texture: a lush peaceful low meadow carpet, softly lit at blue hour, fine green grass and clover leaves, sparse small white daisies and a few muted lavender and pale blue wildflowers. Create an extremely detailed high-resolution image, requested 3840x1920 pixels (2:1 panorama), highest native resolution available. The entire frame must be covered edge-to-edge by continuous low vegetation. No sky and no horizon line, no transparency, no checkerboard, no black background or cutout silhouette. Camera looking gently downward across grass, upper rows slightly more distant, lower rows slightly nearer, but consistent scale across the width. Crisp well-defined botanical textures without artificial sharpening or blur. Fine graceful grass, leaves and tasteful small flowers, premium tranquil realism. Low soft cool evening light with natural variation and no strong shadows. Every edge extends beyond the frame. Left and right texture edges meet naturally as a horizontally tileable panorama. No objects except low grasses/clover/wildflowers. No hills, trees, buildings, paths, fences, pots, people, sky, stars, moon, signs or text. This fully filled meadow texture will be projected only onto the ground beneath an astronomy sky, and its boundaries will be feathered by a shader. It must not look like a strip pasted onto black.
```
