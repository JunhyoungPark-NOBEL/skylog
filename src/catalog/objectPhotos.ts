import type { ObjectId } from './objectId';

export type PhotoText = Readonly<{ ko: string; en: string }>;
export type ObjectPhotoAsset = Readonly<{
  /** public/ 아래의 상대 경로. 호출부에서 앱의 base URL을 앞에 붙인다. */
  path: string;
  width: number;
  height: number;
  bytes: number;
  sha256: string;
}>;
export type PhotoCreditPart = Readonly<{ text: string; url?: string }>;
export type ObjectPhoto = Readonly<{
  objectId: ObjectId;
  title: PhotoText;
  caption: PhotoText;
  hero: ObjectPhotoAsset;
  thumb: ObjectPhotoAsset;
  sourceURL: string;
  imageURL: string;
  credit: string;
  creditParts: readonly PhotoCreditPart[];
  license: 'CC BY 4.0';
  licenseURL: string;
  rightsURL: string;
  verifiedAt: string;
  sourceSha256: string;
  spectralBand: 'visible' | 'infrared' | 'ultraviolet' | 'multiwavelength';
  coverage: 'whole-object' | 'detail' | 'wide-field';
  modifications: PhotoText;
}>;

// BEGIN GENERATED PHOTOS — scripts/data/prepare-object-photos.mjs
export const OBJECT_PHOTOS: readonly ObjectPhoto[] = [
  {
    objectId: 'planet:jupiter',
    title: {
      ko: '목성과 유로파',
      en: 'Jupiter and Europa',
    },
    caption: {
      ko: '2020년 허블이 촬영한 목성과 위성 유로파. 여러 가시광 필터의 관측을 합친 사진이며, 지금 하늘의 모습은 아니에요.',
      en: 'Hubble observations of Jupiter and Europa from 2020, combined from visible-light filters. This is an archival image, not a live sky view.',
    },
    hero: {
      path: 'object-photos/v1/planet-jupiter-hero.webp',
      width: 960,
      height: 794,
      bytes: 29990,
      sha256: 'f1b2641e454f6a8c4260bcc882fb360412f155488901e3b7bfe755aac42d2efa',
    },
    thumb: {
      path: 'object-photos/v1/planet-jupiter-thumb.webp',
      width: 160,
      height: 132,
      bytes: 2994,
      sha256: '4d7ce114b352feedc7bfcbcddb2ac973e9340c2731b8b12164a8b326e65aeafc',
    },
    sourceURL: 'https://esahubble.org/images/heic2017a/',
    imageURL: 'https://cdn.esahubble.org/archives/images/screen/heic2017a.jpg',
    credit:
      'NASA, ESA, A. Simon (Goddard Space Flight Center), and M. H. Wong (University of California, Berkeley) and the OPAL team.',
    creditParts: [
      {
        text: 'NASA, ESA, A. Simon (Goddard Space Flight Center), and M. H. Wong (University of California, Berkeley) and the OPAL team.',
      },
    ],
    license: 'CC BY 4.0',
    licenseURL: 'https://creativecommons.org/licenses/by/4.0/',
    rightsURL: 'https://esahubble.org/copyright/',
    verifiedAt: '2026-09-09',
    sourceSha256: '99b4d90c87355000a33422a799be8e65bc167705bea32c11790549cabf74f1ac',
    spectralBand: 'visible',
    coverage: 'whole-object',
    modifications: {
      ko: '별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.',
      en: 'Skylog: resized without cropping, preserving source proportions and colours, and converted to WebP. Night protection displays the image through a red filter; choosing original colours removes that display filter.',
    },
  },
  {
    objectId: 'planet:saturn',
    title: {
      ko: '토성과 고리',
      en: 'Saturn and its rings',
    },
    caption: {
      ko: '2019년 허블의 가시광 필터 합성 사진. 고리가 기울어진 모습과 구름 띠를 보여 주며, 현재의 고리 각도와는 달라요.',
      en: 'A visible-light filter composite from Hubble in 2019, showing tilted rings and cloud bands. The ring angle differs from its current appearance.',
    },
    hero: {
      path: 'object-photos/v1/planet-saturn-hero.webp',
      width: 960,
      height: 610,
      bytes: 13592,
      sha256: '218235bd253a16421355d9a7b405fcdc16a050a934273a631ccb9d1e020fb552',
    },
    thumb: {
      path: 'object-photos/v1/planet-saturn-thumb.webp',
      width: 160,
      height: 102,
      bytes: 2570,
      sha256: '3a45065d50e4bbd515d2f9b56e679b30a0fca72e8f0efcea0d6a20afa32bb32e',
    },
    sourceURL: 'https://esahubble.org/images/heic1917a/',
    imageURL: 'https://cdn.esahubble.org/archives/images/screen/heic1917a.jpg',
    credit:
      'NASA, ESA, A. Simon (Goddard Space Flight Center), and M.H. Wong (University of California, Berkeley)',
    creditParts: [
      {
        text: 'NASA, ESA, A. Simon (Goddard Space Flight Center), and M.H. Wong (University of California, Berkeley)',
      },
    ],
    license: 'CC BY 4.0',
    licenseURL: 'https://creativecommons.org/licenses/by/4.0/',
    rightsURL: 'https://esahubble.org/copyright/',
    verifiedAt: '2026-09-09',
    sourceSha256: '7c5ed9588561d115783eb00aeeb3a308e416aaa746251f7bcc20965e81ac0537',
    spectralBand: 'visible',
    coverage: 'whole-object',
    modifications: {
      ko: '별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.',
      en: 'Skylog: resized without cropping, preserving source proportions and colours, and converted to WebP. Night protection displays the image through a red filter; choosing original colours removes that display filter.',
    },
  },
  {
    objectId: 'planet:mars',
    title: {
      ko: '허블이 본 화성',
      en: 'Mars through Hubble',
    },
    caption: {
      ko: '2016년 충 부근에 허블이 촬영한 화성. 원출처의 필터에는 자외선과 가시광이 포함된 색 합성으로, 맨눈이나 접안렌즈의 모습과 같지 않아요.',
      en: 'Hubble observed Mars near opposition in 2016. The source lists ultraviolet and visible filters for this colour composite; it is not an unaided-eye or eyepiece view.',
    },
    hero: {
      path: 'object-photos/v1/planet-mars-hero.webp',
      width: 960,
      height: 960,
      bytes: 16234,
      sha256: '4f4756f0f9196a0d37b7e8109a17e01cffe7ece967e7c661b55c2d4427c68a17',
    },
    thumb: {
      path: 'object-photos/v1/planet-mars-thumb.webp',
      width: 160,
      height: 160,
      bytes: 3008,
      sha256: '2f764a62d526569d46b5390448d487b168295abbf69aaee97f538c98b506bd28',
    },
    sourceURL: 'https://esahubble.org/images/heic1609a/',
    imageURL: 'https://cdn.esahubble.org/archives/images/screen/heic1609a.jpg',
    credit:
      'NASA, ESA, the Hubble Heritage Team (STScI/AURA), J. Bell (ASU), and M. Wolff (Space Science Institute)',
    creditParts: [
      {
        text: 'NASA, ESA, the Hubble Heritage Team (STScI/AURA), J. Bell (ASU), and M. Wolff (Space Science Institute)',
      },
    ],
    license: 'CC BY 4.0',
    licenseURL: 'https://creativecommons.org/licenses/by/4.0/',
    rightsURL: 'https://esahubble.org/copyright/',
    verifiedAt: '2026-09-09',
    sourceSha256: '290698f282675ccb095244ad941dea986f06e267daf75a9788a829f0cc7e905f',
    spectralBand: 'multiwavelength',
    coverage: 'whole-object',
    modifications: {
      ko: '별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.',
      en: 'Skylog: resized without cropping, preserving source proportions and colours, and converted to WebP. Night protection displays the image through a red filter; choosing original colours removes that display filter.',
    },
  },
  {
    objectId: 'planet:uranus',
    title: {
      ko: '허블이 본 천왕성',
      en: 'Uranus through Hubble',
    },
    caption: {
      ko: '허블 OPAL 관측의 천왕성. 가시광과 근적외선 필터를 사용한 색 합성으로, 밝은 극지 구름과 대기를 보여 줘요.',
      en: 'Uranus observed by Hubble’s OPAL programme. This visible and near-infrared filter composite shows the bright polar clouds and atmosphere.',
    },
    hero: {
      path: 'object-photos/v1/planet-uranus-hero.webp',
      width: 903,
      height: 960,
      bytes: 8402,
      sha256: 'cac5e59815e33c245a57c3413d8cda51546fff8741d84c2524b3efa554ddf7f6',
    },
    thumb: {
      path: 'object-photos/v1/planet-uranus-thumb.webp',
      width: 151,
      height: 160,
      bytes: 2266,
      sha256: '3a84ef6b0c7f9dbbad1a183c875f2b07710e1e9b23def6515d5ece0fa74f213b',
    },
    sourceURL: 'https://esahubble.org/images/potw1906a/',
    imageURL: 'https://cdn.esahubble.org/archives/images/large/potw1906a.jpg',
    credit:
      'NASA, ESA, A.A. Simon (NASA Goddard), and M.H. Wong and A.I. Hsu (University of California, Berkeley)',
    creditParts: [
      {
        text: 'NASA, ESA, A.A. Simon (NASA Goddard), and M.H. Wong and A.I. Hsu (University of California, Berkeley)',
      },
    ],
    license: 'CC BY 4.0',
    licenseURL: 'https://creativecommons.org/licenses/by/4.0/',
    rightsURL: 'https://esahubble.org/copyright/',
    verifiedAt: '2026-09-09',
    sourceSha256: 'a91f1dbbe1db4d12f0df3385777dcb698e6b02cafc53dd98089a8d743c6e1c9f',
    spectralBand: 'multiwavelength',
    coverage: 'whole-object',
    modifications: {
      ko: '별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.',
      en: 'Skylog: resized without cropping, preserving source proportions and colours, and converted to WebP. Night protection displays the image through a red filter; choosing original colours removes that display filter.',
    },
  },
  {
    objectId: 'planet:neptune',
    title: {
      ko: '해왕성의 구름과 어두운 폭풍',
      en: 'Clouds and a dark storm on Neptune',
    },
    caption: {
      ko: '2018년 허블 OPAL 관측으로 본 해왕성. 가시광·근적외선 필터의 색 합성이며, 당시의 어두운 폭풍과 구름을 보여 줘요.',
      en: 'Hubble OPAL observations from 2018 combine visible and near-infrared filters, showing Neptune’s clouds and a dark storm present at that time.',
    },
    hero: {
      path: 'object-photos/v1/planet-neptune-hero.webp',
      width: 514,
      height: 543,
      bytes: 4728,
      sha256: '99fd76731f1e29b99d81bb72f0881cadaf7e7837eb443e04fa2f0d99a7630171',
    },
    thumb: {
      path: 'object-photos/v1/planet-neptune-thumb.webp',
      width: 152,
      height: 160,
      bytes: 2266,
      sha256: '7b4ef672c17eef8eb7ffe5e7c79cc193a3588f57edabfaf18c63fcc9892de67d',
    },
    sourceURL: 'https://esahubble.org/images/potw1907a/',
    imageURL: 'https://cdn.esahubble.org/archives/images/large/potw1907a.jpg',
    credit:
      'NASA, ESA, A.A. Simon (NASA Goddard), and M.H. Wong and A.I. Hsu (University of California, Berkeley)',
    creditParts: [
      {
        text: 'NASA, ESA, A.A. Simon (NASA Goddard), and M.H. Wong and A.I. Hsu (University of California, Berkeley)',
      },
    ],
    license: 'CC BY 4.0',
    licenseURL: 'https://creativecommons.org/licenses/by/4.0/',
    rightsURL: 'https://esahubble.org/copyright/',
    verifiedAt: '2026-09-09',
    sourceSha256: 'eac485e5301d78495d5ef59c887f411062434eeab0939b15ce5811359957ba71',
    spectralBand: 'multiwavelength',
    coverage: 'whole-object',
    modifications: {
      ko: '별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.',
      en: 'Skylog: resized without cropping, preserving source proportions and colours, and converted to WebP. Night protection displays the image through a red filter; choosing original colours removes that display filter.',
    },
  },
  {
    objectId: 'moon',
    title: {
      ko: '달의 티코 충돌구 부근',
      en: 'The Moon around Tycho crater',
    },
    caption: {
      ko: '달 전체가 아닌 티코 충돌구 주변 약 700km 영역의 확대 사진. 2012년 허블의 가시광 관측에 비어 있던 일부 영역은 지상 사진으로 보충했어요.',
      en: 'A close-up of the roughly 700 km region around Tycho, not the whole Moon. Gaps in the 2012 Hubble visible-light observations were filled with ground-based images.',
    },
    hero: {
      path: 'object-photos/v1/moon-hero.webp',
      width: 926,
      height: 960,
      bytes: 167084,
      sha256: '56498182fd5d6049032a17a467a7603b0b4ae5b1e46ced59b0d193413da38834',
    },
    thumb: {
      path: 'object-photos/v1/moon-thumb.webp',
      width: 155,
      height: 160,
      bytes: 7154,
      sha256: '0de75babaa225c5c9538c3685cc47275a57fc92341e283aad8fa53948d79150c',
    },
    sourceURL: 'https://esahubble.org/images/potw1219a/',
    imageURL: 'https://cdn.esahubble.org/archives/images/screen/potw1219a.jpg',
    credit:
      'NASA, ESA, D. Ehrenreich (Institut de Planétologie et d’Astrophysique de Grenoble (IPAG)/CNRS/Université Joseph Fourier)',
    creditParts: [
      {
        text: 'NASA, ESA, D. Ehrenreich (Institut de Planétologie et d’Astrophysique de Grenoble (IPAG)/CNRS/Université Joseph Fourier)',
      },
    ],
    license: 'CC BY 4.0',
    licenseURL: 'https://creativecommons.org/licenses/by/4.0/',
    rightsURL: 'https://esahubble.org/copyright/',
    verifiedAt: '2026-09-09',
    sourceSha256: '1c8456cb40afeb15ee25e8b66ed4b86492dcbaa2c706a195044559f736cd4803',
    spectralBand: 'visible',
    coverage: 'detail',
    modifications: {
      ko: '별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.',
      en: 'Skylog: resized without cropping, preserving source proportions and colours, and converted to WebP. Night protection displays the image through a red filter; choosing original colours removes that display filter.',
    },
  },
  {
    objectId: 'star:HIP32349',
    title: {
      ko: '시리우스 A와 작은 동반성',
      en: 'Sirius A and its faint companion',
    },
    caption: {
      ko: '시리우스 A와 작은 동반성 B의 허블 사진. 밝은 별을 과노출해 동반성을 드러냈으며, 십자와 동심원은 별의 실제 모양이 아닌 망원경 회절이에요. 가시광·근적외선 관측을 사용했어요.',
      en: 'Hubble overexposed Sirius A to reveal its faint companion B, using visible and near-infrared observations. The spikes and rings are telescope diffraction, not the stars’ physical shapes.',
    },
    hero: {
      path: 'object-photos/v1/star-hip32349-hero.webp',
      width: 369,
      height: 403,
      bytes: 8470,
      sha256: '724ff900c48ac74da87813e28b9e9ae15cfc82a5828ae0c0e80eb2670e90b38a',
    },
    thumb: {
      path: 'object-photos/v1/star-hip32349-thumb.webp',
      width: 147,
      height: 160,
      bytes: 3062,
      sha256: 'a6b727e42f7302207b029949f6328a3e578d4bc53b51852455f4498312378099',
    },
    sourceURL: 'https://esahubble.org/images/heic0516a/',
    imageURL: 'https://cdn.esahubble.org/archives/images/large/heic0516a.jpg',
    credit: 'NASA, ESA, H. Bond (STScI), and M. Barstow (University of Leicester)',
    creditParts: [
      {
        text: 'NASA',
        url: 'https://www.nasa.gov/',
      },
      {
        text: ', ',
      },
      {
        text: 'ESA',
        url: 'https://www.esa.int/',
      },
      {
        text: ', H. Bond (',
      },
      {
        text: 'STScI',
        url: 'https://www.stsci.edu/',
      },
      {
        text: '), and M. Barstow (University of Leicester)',
      },
    ],
    license: 'CC BY 4.0',
    licenseURL: 'https://creativecommons.org/licenses/by/4.0/',
    rightsURL: 'https://esahubble.org/copyright/',
    verifiedAt: '2026-09-09',
    sourceSha256: '231e45edae763a43b6062648b1df190663eac7cbb9d12e7ef7f5d73876654c01',
    spectralBand: 'multiwavelength',
    coverage: 'wide-field',
    modifications: {
      ko: '별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.',
      en: 'Skylog: resized without cropping, preserving source proportions and colours, and converted to WebP. Night protection displays the image through a red filter; choosing original colours removes that display filter.',
    },
  },
  {
    objectId: 'star:HIP27989',
    title: {
      ko: '베텔게우스 표면 관측',
      en: 'Observing Betelgeuse’s surface',
    },
    caption: {
      ko: '2019년 1월 VLT/SPHERE로 분해해 본 베텔게우스의 표면. 645nm 가시광 관측의 밝기를 색으로 표현했으며, 눈으로 본 별의 색이나 크기를 뜻하지 않아요.',
      en: 'VLT/SPHERE resolved Betelgeuse’s surface in January 2019. Colour represents brightness in a 645 nm visible-light observation, not the star’s naked-eye colour or size.',
    },
    hero: {
      path: 'object-photos/v1/star-hip27989-hero.webp',
      width: 816,
      height: 816,
      bytes: 5024,
      sha256: 'c34bdaea0871e233b96091de4d5904efc49e30c3f44624f126e6373c06e61e6e',
    },
    thumb: {
      path: 'object-photos/v1/star-hip27989-thumb.webp',
      width: 160,
      height: 160,
      bytes: 1916,
      sha256: '4ebdd5ff7d2d5db1472abe6de64820dfe01e4b8dcb2997bab82c56bccfc5bf7f',
    },
    sourceURL: 'https://www.eso.org/public/images/eso2003b/',
    imageURL: 'https://cdn.eso.org/images/large/eso2003b.jpg',
    credit: 'ESO/M. Montargès et al.',
    creditParts: [
      {
        text: 'ESO/M. Montargès et al.',
      },
    ],
    license: 'CC BY 4.0',
    licenseURL: 'https://creativecommons.org/licenses/by/4.0/',
    rightsURL: 'https://www.eso.org/public/outreach/copyright/',
    verifiedAt: '2026-09-09',
    sourceSha256: '1db7b61da7605d91911b5de1084f321f1f8b9a8fa23edd401301025385822239',
    spectralBand: 'visible',
    coverage: 'whole-object',
    modifications: {
      ko: '별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.',
      en: 'Skylog: resized without cropping, preserving source proportions and colours, and converted to WebP. Night protection displays the image through a red filter; choosing original colours removes that display filter.',
    },
  },
  {
    objectId: 'dso:M1',
    title: {
      ko: '게성운 M1',
      en: 'Crab Nebula M1',
    },
    caption: {
      ko: '허블의 24개 노출을 이어 만든 게성운 사진. 가시광의 산소·황 방출선 관측을 색으로 합쳐 초신성 잔해의 가스 구조를 드러냈어요.',
      en: 'A Hubble mosaic assembled from 24 exposures of the Crab Nebula. Visible oxygen and sulphur emission-line observations are mapped to colour to reveal the remnant’s gas.',
    },
    hero: {
      path: 'object-photos/v1/dso-m1-hero.webp',
      width: 960,
      height: 960,
      bytes: 125664,
      sha256: '4975930ab6ce1f40c43969b6a9a75d44bde1a978a70d4488fbf975959b791304',
    },
    thumb: {
      path: 'object-photos/v1/dso-m1-thumb.webp',
      width: 160,
      height: 160,
      bytes: 6352,
      sha256: '72ae15764e6456013bd65f85670fdc2e6a0cb6bec08223d94dc757ea9aa78546',
    },
    sourceURL: 'https://esahubble.org/images/heic0515a/',
    imageURL: 'https://cdn.esahubble.org/archives/images/screen/heic0515a.jpg',
    credit:
      'NASA, ESA and Allison Loll/Jeff Hester (Arizona State University). Acknowledgement: Davide De Martin (ESA/Hubble)',
    creditParts: [
      {
        text: 'NASA',
        url: 'https://www.nasa.gov/',
      },
      {
        text: ', ',
      },
      {
        text: 'ESA',
        url: 'https://www.esa.int/',
      },
      {
        text: ' and Allison Loll/Jeff Hester (Arizona State University). Acknowledgement: Davide De Martin (',
      },
      {
        text: 'ESA',
        url: 'https://www.esa.int/',
      },
      {
        text: '/',
      },
      {
        text: 'Hubble',
        url: 'https://esahubble.org/',
      },
      {
        text: ')',
      },
    ],
    license: 'CC BY 4.0',
    licenseURL: 'https://creativecommons.org/licenses/by/4.0/',
    rightsURL: 'https://esahubble.org/copyright/',
    verifiedAt: '2026-09-09',
    sourceSha256: '9b9162b9a679c04fe9224dd3338691fa1eb56599e111ebd750f6eafe9d028bdc',
    spectralBand: 'visible',
    coverage: 'whole-object',
    modifications: {
      ko: '별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.',
      en: 'Skylog: resized without cropping, preserving source proportions and colours, and converted to WebP. Night protection displays the image through a red filter; choosing original colours removes that display filter.',
    },
  },
  {
    objectId: 'dso:M8',
    title: {
      ko: '석호성운 M8의 별 탄생 영역',
      en: 'A star-forming region in Lagoon Nebula M8',
    },
    caption: {
      ko: '석호성운 전체가 아닌 내부의 약 4광년 영역을 확대한 허블 사진. 여러 가시광 방출선과 필터 관측을 색으로 합친 모습이에요.',
      en: 'A Hubble close-up of a roughly four-light-year region inside the Lagoon Nebula, not the whole nebula. Visible emission-line and filter observations are combined in colour.',
    },
    hero: {
      path: 'object-photos/v1/dso-m8-hero.webp',
      width: 761,
      height: 960,
      bytes: 37462,
      sha256: '155b013b9df814b0b8d97d79d06248a7e4fca01faf20769c62c35cc84fbc965e',
    },
    thumb: {
      path: 'object-photos/v1/dso-m8-thumb.webp',
      width: 127,
      height: 160,
      bytes: 4010,
      sha256: 'e4be574e1ff58db554ca28f6f465fbcb15de2b9af649aac9c2d97c0bd9741a1c',
    },
    sourceURL: 'https://esahubble.org/images/heic1808a/',
    imageURL: 'https://cdn.esahubble.org/archives/images/screen/heic1808a.jpg',
    credit: 'NASA, ESA, STScI',
    creditParts: [
      {
        text: 'NASA, ESA, STScI',
      },
    ],
    license: 'CC BY 4.0',
    licenseURL: 'https://creativecommons.org/licenses/by/4.0/',
    rightsURL: 'https://esahubble.org/copyright/',
    verifiedAt: '2026-09-09',
    sourceSha256: '43cb96804e1b09c3bb3dbe00770719838f90eac34557971636a709ff8eddff6e',
    spectralBand: 'visible',
    coverage: 'detail',
    modifications: {
      ko: '별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.',
      en: 'Skylog: resized without cropping, preserving source proportions and colours, and converted to WebP. Night protection displays the image through a red filter; choosing original colours removes that display filter.',
    },
  },
  {
    objectId: 'dso:M13',
    title: {
      ko: '헤라클레스 구상성단 M13의 중심',
      en: 'The core of Hercules Cluster M13',
    },
    caption: {
      ko: 'M13의 중심부를 확대한 허블 사진. 파랑·빨강 가시광과 근적외선 관측을 각각 화면의 파랑·초록·빨강으로 배정한 색 합성이에요.',
      en: 'A Hubble close-up of M13’s core. Blue and red visible-light data and near-infrared data are assigned to blue, green and red display channels.',
    },
    hero: {
      path: 'object-photos/v1/dso-m13-hero.webp',
      width: 960,
      height: 960,
      bytes: 396548,
      sha256: '2bb43087fdebdc49efa98f15d5fc2542b60aeab7f8ec261edcda3f6c4001867e',
    },
    thumb: {
      path: 'object-photos/v1/dso-m13-thumb.webp',
      width: 160,
      height: 160,
      bytes: 10948,
      sha256: 'b60e52b768ab1ce2064108276289b9d9ee08b7d15ce14304ede49d4831048999',
    },
    sourceURL: 'https://esahubble.org/images/potw1011a/',
    imageURL: 'https://cdn.esahubble.org/archives/images/screen/potw1011a.jpg',
    credit: 'ESA/Hubble and NASA',
    creditParts: [
      {
        text: 'ESA/Hubble and NASA',
      },
    ],
    license: 'CC BY 4.0',
    licenseURL: 'https://creativecommons.org/licenses/by/4.0/',
    rightsURL: 'https://esahubble.org/copyright/',
    verifiedAt: '2026-09-09',
    sourceSha256: 'd785f69137bb216c9beb36d962fd1840d79ed90fae8c0ab62d131bf14ac69bae',
    spectralBand: 'multiwavelength',
    coverage: 'detail',
    modifications: {
      ko: '별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.',
      en: 'Skylog: resized without cropping, preserving source proportions and colours, and converted to WebP. Night protection displays the image through a red filter; choosing original colours removes that display filter.',
    },
  },
  {
    objectId: 'dso:M27',
    title: {
      ko: '아령성운 M27',
      en: 'Dumbbell Nebula M27',
    },
    caption: {
      ko: 'VLT/FORS1의 파장별 관측을 색으로 합친 아령성운 사진. 원출처에는 가시광 방출선과 근자외선 필터가 기재되어 있으며, 가스의 구조를 드러내는 처리 영상이에요.',
      en: 'A colour composite of wavelength-filtered VLT/FORS1 observations. The source lists visible emission lines and a near-ultraviolet filter; processing reveals the nebula’s gas structure.',
    },
    hero: {
      path: 'object-photos/v1/dso-m27-hero.webp',
      width: 960,
      height: 959,
      bytes: 64824,
      sha256: '497f7e562dd0f46be08de493ef1dfc9533d4faa390bafc2461220447d974f855',
    },
    thumb: {
      path: 'object-photos/v1/dso-m27-thumb.webp',
      width: 160,
      height: 160,
      bytes: 5704,
      sha256: 'e6e418704f656fb045d16ffe7854c3948d4881d6cade5b35d7518da29b180fc6',
    },
    sourceURL: 'https://www.eso.org/public/images/eso9846a/',
    imageURL: 'https://cdn.eso.org/images/screen/eso9846a.jpg',
    credit: 'ESO/I. Appenzeller, W. Seifert, O. Stahl, M. Zamani',
    creditParts: [
      {
        text: 'ESO/I. Appenzeller, W. Seifert, O. Stahl, M. Zamani',
      },
    ],
    license: 'CC BY 4.0',
    licenseURL: 'https://creativecommons.org/licenses/by/4.0/',
    rightsURL: 'https://www.eso.org/public/outreach/copyright/',
    verifiedAt: '2026-09-09',
    sourceSha256: 'e8b7969ab150cc3b04deee70b59f5f624b26fb22724fafc393c70604f7853c2d',
    spectralBand: 'multiwavelength',
    coverage: 'whole-object',
    modifications: {
      ko: '별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.',
      en: 'Skylog: resized without cropping, preserving source proportions and colours, and converted to WebP. Night protection displays the image through a red filter; choosing original colours removes that display filter.',
    },
  },
  {
    objectId: 'dso:M31',
    title: {
      ko: '안드로메다은하 M31의 원반 일부',
      en: 'Part of Andromeda Galaxy M31’s disc',
    },
    caption: {
      ko: '안드로메다은하 전체가 아닌 중심에서 원반 한쪽으로 이어지는 허블 모자이크. 가시광·근적외선 합성으로 빽빽한 별과 어두운 먼지 띠를 보여 줘요.',
      en: 'A Hubble mosaic extending from Andromeda’s centre across part of one side of its disc, not the entire galaxy. Visible and near-infrared data reveal dense stars and dark dust lanes.',
    },
    hero: {
      path: 'object-photos/v1/dso-m31-hero.webp',
      width: 960,
      height: 307,
      bytes: 33692,
      sha256: 'e872ec4f977c23a1b2090e5d1344c91563ba7be96519dd69e0ac4ce195741af9',
    },
    thumb: {
      path: 'object-photos/v1/dso-m31-thumb.webp',
      width: 160,
      height: 51,
      bytes: 2574,
      sha256: '23b9af5f89a4caf93b115181a0fc346679eae8cf01924a97c31ebe46bdfc2095',
    },
    sourceURL: 'https://esahubble.org/images/heic1502a/',
    imageURL: 'https://cdn.esahubble.org/archives/images/screen/heic1502a.jpg',
    credit:
      'NASA, ESA, J. Dalcanton (University of Washington, USA), B. F. Williams (University of Washington, USA), L. C. Johnson (University of Washington, USA), the PHAT team, and R. Gendler.',
    creditParts: [
      {
        text: 'NASA',
        url: 'https://www.nasa.gov/',
      },
      {
        text: ', ',
      },
      {
        text: 'ESA',
        url: 'https://esahubble.org/',
      },
      {
        text: ', J. Dalcanton (University of Washington, USA), B. F. Williams (University of Washington, USA), L. C. Johnson (University of Washington, USA), the PHAT team, and R. Gendler.',
      },
    ],
    license: 'CC BY 4.0',
    licenseURL: 'https://creativecommons.org/licenses/by/4.0/',
    rightsURL: 'https://esahubble.org/copyright/',
    verifiedAt: '2026-09-09',
    sourceSha256: '3c3a09d49a2e2674d5b0dd481943a876981380e615721a85da567b5e65263505',
    spectralBand: 'multiwavelength',
    coverage: 'detail',
    modifications: {
      ko: '별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.',
      en: 'Skylog: resized without cropping, preserving source proportions and colours, and converted to WebP. Night protection displays the image through a red filter; choosing original colours removes that display filter.',
    },
  },
  {
    objectId: 'dso:M42',
    title: {
      ko: '오리온성운 M42',
      en: 'Orion Nebula M42',
    },
    caption: {
      ko: '허블의 여러 가시광·근적외선 필터 관측 520장을 이어 만든 오리온성운 모자이크. 주변을 채운 지상 사진도 포함된 색 합성으로, 접안렌즈에서 보이는 색과는 달라요.',
      en: 'A mosaic of 520 Hubble images in visible and near-infrared filters, with ground-based images filling the surrounding nebula. Its composite colours differ from an eyepiece view.',
    },
    hero: {
      path: 'object-photos/v1/dso-m42-hero.webp',
      width: 960,
      height: 960,
      bytes: 40398,
      sha256: 'f8ef9bb62d137562109518ebbcb5b2485515fbb53b984cea5f4f263bc62d3064',
    },
    thumb: {
      path: 'object-photos/v1/dso-m42-thumb.webp',
      width: 160,
      height: 160,
      bytes: 4012,
      sha256: '6137b0ebafba9023f24414bbb6f040d8c0d7d0aa1a2c2c0c1973852fc693e515',
    },
    sourceURL: 'https://esahubble.org/images/heic0601a/',
    imageURL: 'https://cdn.esahubble.org/archives/images/screen/heic0601a.jpg',
    credit:
      'NASA, ESA, M. Robberto ( Space Telescope Science Institute/ESA) and the Hubble Space Telescope Orion Treasury Project Team',
    creditParts: [
      {
        text: 'NASA',
        url: 'https://www.nasa.gov/',
      },
      {
        text: ', ',
      },
      {
        text: 'ESA',
        url: 'https://www.esa.int/',
      },
      {
        text: ', M. Robberto ( ',
      },
      {
        text: 'Space Telescope Science Institute',
        url: 'https://www.stsci.edu/',
      },
      {
        text: '/',
      },
      {
        text: 'ESA',
        url: 'https://www.esa.int/',
      },
      {
        text: ') and the Hubble Space Telescope Orion Treasury Project Team',
      },
    ],
    license: 'CC BY 4.0',
    licenseURL: 'https://creativecommons.org/licenses/by/4.0/',
    rightsURL: 'https://esahubble.org/copyright/',
    verifiedAt: '2026-09-09',
    sourceSha256: '545d43079d936bbce3ad3dac33145992b504327e74db8f30dd92b8da538d6aec',
    spectralBand: 'multiwavelength',
    coverage: 'wide-field',
    modifications: {
      ko: '별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.',
      en: 'Skylog: resized without cropping, preserving source proportions and colours, and converted to WebP. Night protection displays the image through a red filter; choosing original colours removes that display filter.',
    },
  },
  {
    objectId: 'dso:M45',
    title: {
      ko: '플레이아데스 성단 M45',
      en: 'Pleiades Cluster M45',
    },
    caption: {
      ko: '플레이아데스의 밝은 별과 푸른 반사성운을 담은 가시광 사진. 먼지가 산란시킨 별빛이 보이며, 장시간 노출 사진의 색과 밝기는 눈으로 보는 모습과 달라요.',
      en: 'A visible-light photograph of the Pleiades and blue reflection nebulosity. Dust scatters starlight; photographic colour and brightness differ from the unaided-eye view.',
    },
    hero: {
      path: 'object-photos/v1/dso-m45-hero.webp',
      width: 960,
      height: 840,
      bytes: 117778,
      sha256: 'c1a80b900b263e35270d19ab9fc00e43783173372f33bbba4276b2486eb12df5',
    },
    thumb: {
      path: 'object-photos/v1/dso-m45-thumb.webp',
      width: 160,
      height: 140,
      bytes: 5036,
      sha256: '531a3699eaf2c4a9c228313d1aa7aa38a865fe09fc9415411047e2d208b4eec1',
    },
    sourceURL: 'https://www.eso.org/public/images/b11/',
    imageURL: 'https://cdn.eso.org/images/screen/b11.jpg',
    credit: 'ESO/S. Brunier',
    creditParts: [
      {
        text: 'ESO/S. Brunier',
      },
    ],
    license: 'CC BY 4.0',
    licenseURL: 'https://creativecommons.org/licenses/by/4.0/',
    rightsURL: 'https://www.eso.org/public/outreach/copyright/',
    verifiedAt: '2026-09-09',
    sourceSha256: '35abf88910f258337e893cfc89712499419b74b0a059ac6f8ba0b2fe365f0714',
    spectralBand: 'visible',
    coverage: 'wide-field',
    modifications: {
      ko: '별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.',
      en: 'Skylog: resized without cropping, preserving source proportions and colours, and converted to WebP. Night protection displays the image through a red filter; choosing original colours removes that display filter.',
    },
  },
  {
    objectId: 'dso:M51',
    title: {
      ko: '소용돌이은하 M51와 동반은하',
      en: 'Whirlpool Galaxy M51 and its companion',
    },
    caption: {
      ko: '소용돌이은하와 동반은하 NGC 5195를 담은 허블 사진. 가시광·근적외선 필터 합성으로 나선팔, 먼지 띠와 별 탄생 영역을 보여 줘요.',
      en: 'Hubble’s visible and near-infrared filter composite of M51 and companion NGC 5195 reveals spiral arms, dust lanes and star-forming regions.',
    },
    hero: {
      path: 'object-photos/v1/dso-m51-hero.webp',
      width: 960,
      height: 666,
      bytes: 46772,
      sha256: '9fe824637cebf0f64dac56989da5dc80f4d724051a744abad84049ff1abaefae',
    },
    thumb: {
      path: 'object-photos/v1/dso-m51-thumb.webp',
      width: 160,
      height: 111,
      bytes: 3080,
      sha256: '466dd0a6081cf3a5526b4ee4ca4a79cf3fdb6b01da7a51c84c779aa1c91892cc',
    },
    sourceURL: 'https://esahubble.org/images/heic0506a/',
    imageURL: 'https://cdn.esahubble.org/archives/images/screen/heic0506a.jpg',
    credit: 'NASA, ESA, S. Beckwith (STScI), and The Hubble Heritage Team (STScI/AURA)',
    creditParts: [
      {
        text: 'NASA',
        url: 'https://www.nasa.gov/',
      },
      {
        text: ', ',
      },
      {
        text: 'ESA',
        url: 'https://www.esa.int/',
      },
      {
        text: ', S. Beckwith (',
      },
      {
        text: 'STScI',
        url: 'https://www.stsci.edu/',
      },
      {
        text: '), and The Hubble Heritage Team (',
      },
      {
        text: 'STScI',
        url: 'https://www.stsci.edu/',
      },
      {
        text: '/',
      },
      {
        text: 'AURA',
        url: 'https://www.aura-astronomy.org/',
      },
      {
        text: ')',
      },
    ],
    license: 'CC BY 4.0',
    licenseURL: 'https://creativecommons.org/licenses/by/4.0/',
    rightsURL: 'https://esahubble.org/copyright/',
    verifiedAt: '2026-09-09',
    sourceSha256: '626f7d6ba30d186a87b834c089b449e3b77c8defce4fe85ab7edf2078e3633e2',
    spectralBand: 'multiwavelength',
    coverage: 'whole-object',
    modifications: {
      ko: '별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.',
      en: 'Skylog: resized without cropping, preserving source proportions and colours, and converted to WebP. Night protection displays the image through a red filter; choosing original colours removes that display filter.',
    },
  },
  {
    objectId: 'dso:M57',
    title: {
      ko: '고리성운 M57',
      en: 'Ring Nebula M57',
    },
    caption: {
      ko: '허블이 여러 가시광 방출선으로 관측한 고리성운의 색 합성 사진. 원소별로 빛나는 가스를 구별하는 색으로, 맨눈으로 본 색은 아니에요.',
      en: 'Hubble combined visible emission-line observations of the Ring Nebula. Assigned colours distinguish glowing gas and are not a naked-eye colour view.',
    },
    hero: {
      path: 'object-photos/v1/dso-m57-hero.webp',
      width: 960,
      height: 960,
      bytes: 26492,
      sha256: '5f882e4b5bcef54a8a3ee31aec2c7bb70ea7cb657999adcbb8d0ec4aef725966',
    },
    thumb: {
      path: 'object-photos/v1/dso-m57-thumb.webp',
      width: 160,
      height: 160,
      bytes: 3098,
      sha256: '2ee36e0a5392a3cce35ebbccb6c9fb8d79bfc4bc87b6d4819f5e4bb7b5539bd1',
    },
    sourceURL: 'https://esahubble.org/images/heic1310a/',
    imageURL: 'https://cdn.esahubble.org/archives/images/screen/heic1310a.jpg',
    credit: 'NASA, ESA, and C. Robert O’Dell (Vanderbilt University).',
    creditParts: [
      {
        text: 'NASA, ESA, and C. Robert O’Dell (Vanderbilt University).',
      },
    ],
    license: 'CC BY 4.0',
    licenseURL: 'https://creativecommons.org/licenses/by/4.0/',
    rightsURL: 'https://esahubble.org/copyright/',
    verifiedAt: '2026-09-09',
    sourceSha256: '8a3003ab28b0a3a45e97d63ef879a5c55a2029ded9cb174818f09646aeb3b806',
    spectralBand: 'visible',
    coverage: 'whole-object',
    modifications: {
      ko: '별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.',
      en: 'Skylog: resized without cropping, preserving source proportions and colours, and converted to WebP. Night protection displays the image through a red filter; choosing original colours removes that display filter.',
    },
  },
  {
    objectId: 'dso:M81',
    title: {
      ko: '나선은하 M81',
      en: 'Spiral Galaxy M81',
    },
    caption: {
      ko: '허블의 파랑·가시광·근적외선 관측을 합친 M81 사진. 중심으로 감겨 들어가는 나선팔과 먼지 구조를 보여 줘요.',
      en: 'A Hubble composite of blue, visible and near-infrared observations reveals M81’s spiral arms winding toward its nucleus and its dust structure.',
    },
    hero: {
      path: 'object-photos/v1/dso-m81-hero.webp',
      width: 960,
      height: 645,
      bytes: 20626,
      sha256: 'fa316582fee87c8d46f78e2ff241efd8cc921703d111578eddbf26d647e0fe37',
    },
    thumb: {
      path: 'object-photos/v1/dso-m81-thumb.webp',
      width: 160,
      height: 108,
      bytes: 2412,
      sha256: 'b54743dc3058d111ef2dde6b4c4c0a161a41117bd4924caf974b0dc69a40c14e',
    },
    sourceURL: 'https://esahubble.org/images/heic0710a/',
    imageURL: 'https://cdn.esahubble.org/archives/images/screen/heic0710a.jpg',
    credit:
      'NASA, ESA and the Hubble Heritage Team (STScI/AURA). Acknowledgment: A. Zezas and J. Huchra (Harvard-Smithsonian Center for Astrophysics)',
    creditParts: [
      {
        text: 'NASA',
        url: 'https://www.nasa.gov/',
      },
      {
        text: ', ',
      },
      {
        text: 'ESA',
        url: 'https://www.esa.int/',
      },
      {
        text: ' and the Hubble Heritage Team (',
      },
      {
        text: 'STScI',
        url: 'https://www.stsci.edu/',
      },
      {
        text: '/',
      },
      {
        text: 'AURA',
        url: 'https://www.aura-astronomy.org/',
      },
      {
        text: '). Acknowledgment: A. Zezas and J. Huchra (Harvard-Smithsonian Center for Astrophysics)',
      },
    ],
    license: 'CC BY 4.0',
    licenseURL: 'https://creativecommons.org/licenses/by/4.0/',
    rightsURL: 'https://esahubble.org/copyright/',
    verifiedAt: '2026-09-09',
    sourceSha256: '51d4bc130bfa616f962004702061f66c695f42c5133e7762ae8d7d3a5e245190',
    spectralBand: 'multiwavelength',
    coverage: 'whole-object',
    modifications: {
      ko: '별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.',
      en: 'Skylog: resized without cropping, preserving source proportions and colours, and converted to WebP. Night protection displays the image through a red filter; choosing original colours removes that display filter.',
    },
  },
  {
    objectId: 'dso:M82',
    title: {
      ko: '별 탄생 은하 M82',
      en: 'Starburst Galaxy M82',
    },
    caption: {
      ko: '허블의 가시광·근적외선 필터 모자이크. 붉게 배정된 수소 방출선은 M82 중심에서 뻗어 나오는 가스를 드러내요.',
      en: 'A Hubble visible and near-infrared filter mosaic. Hydrogen emission assigned to red reveals gas extending from the centre of M82.',
    },
    hero: {
      path: 'object-photos/v1/dso-m82-hero.webp',
      width: 960,
      height: 748,
      bytes: 36152,
      sha256: '12d64f012cdabd7cc79a0c2d68147243bc39228b723cb7c9759a20211d729eeb',
    },
    thumb: {
      path: 'object-photos/v1/dso-m82-thumb.webp',
      width: 160,
      height: 125,
      bytes: 2892,
      sha256: 'cf1467e08e9e0e2d7c0fecbcface7636ce14753c85564fe7c7e02f209d782e56',
    },
    sourceURL: 'https://esahubble.org/images/heic0604a/',
    imageURL: 'https://cdn.esahubble.org/archives/images/screen/heic0604a.jpg',
    credit:
      'NASA, ESA and the Hubble Heritage Team (STScI/AURA). Acknowledgment: J. Gallagher (University of Wisconsin), M. Mountain (STScI) and P. Puxley (NSF).',
    creditParts: [
      {
        text: 'NASA',
        url: 'https://www.nasa.gov/',
      },
      {
        text: ', ',
      },
      {
        text: 'ESA',
        url: 'https://www.esa.int/',
      },
      {
        text: ' and the Hubble Heritage Team (',
      },
      {
        text: 'STScI',
        url: 'https://www.stsci.edu/',
      },
      {
        text: '/',
      },
      {
        text: 'AURA',
        url: 'https://www.aura-astronomy.org/',
      },
      {
        text: '). Acknowledgment: J. Gallagher (University of Wisconsin), M. Mountain (',
      },
      {
        text: 'STScI',
        url: 'https://www.stsci.edu/',
      },
      {
        text: ') and P. Puxley (NSF).',
      },
    ],
    license: 'CC BY 4.0',
    licenseURL: 'https://creativecommons.org/licenses/by/4.0/',
    rightsURL: 'https://esahubble.org/copyright/',
    verifiedAt: '2026-09-09',
    sourceSha256: 'c7b68b2083e73acdbbeb040b1f44abaeccada4e1a0adaaaceda669a50fd0f06e',
    spectralBand: 'multiwavelength',
    coverage: 'whole-object',
    modifications: {
      ko: '별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.',
      en: 'Skylog: resized without cropping, preserving source proportions and colours, and converted to WebP. Night protection displays the image through a red filter; choosing original colours removes that display filter.',
    },
  },
  {
    objectId: 'dso:M104',
    title: {
      ko: '솜브레로은하 M104',
      en: 'Sombrero Galaxy M104',
    },
    caption: {
      ko: '거의 옆에서 본 솜브레로은하의 허블 모자이크. 가시광과 근적외선 필터 합성으로 밝은 팽대부와 어두운 먼지 띠를 보여 줘요.',
      en: 'A nearly edge-on Hubble mosaic of the Sombrero Galaxy. Visible and near-infrared filters reveal its bright bulge and dark dust lane.',
    },
    hero: {
      path: 'object-photos/v1/dso-m104-hero.webp',
      width: 960,
      height: 538,
      bytes: 17896,
      sha256: '16bd351bb7d53b7ecace9710aa3d3e6175121322e8a3cfbe7658929543afd9fc',
    },
    thumb: {
      path: 'object-photos/v1/dso-m104-thumb.webp',
      width: 160,
      height: 90,
      bytes: 2264,
      sha256: '7081ea74c9fc9b8e127b362eb342811ada8463f8c3473d834f578a2911bb698b',
    },
    sourceURL: 'https://esahubble.org/images/opo0328a/',
    imageURL: 'https://cdn.esahubble.org/archives/images/screen/opo0328a.jpg',
    credit: 'NASA/ESA and The Hubble Heritage Team (STScI/AURA)',
    creditParts: [
      {
        text: 'NASA',
        url: 'https://www.nasa.gov/',
      },
      {
        text: '/',
      },
      {
        text: 'ESA',
        url: 'https://www.esa.int/',
      },
      {
        text: ' and The Hubble Heritage Team (',
      },
      {
        text: 'STScI',
        url: 'https://www.stsci.edu/',
      },
      {
        text: '/',
      },
      {
        text: 'AURA',
        url: 'https://www.aura-astronomy.org/',
      },
      {
        text: ')',
      },
    ],
    license: 'CC BY 4.0',
    licenseURL: 'https://creativecommons.org/licenses/by/4.0/',
    rightsURL: 'https://esahubble.org/copyright/',
    verifiedAt: '2026-09-09',
    sourceSha256: 'f1af80a18a7d4d584ab4c58d85da035a3c4d599932e9e8566446d1e6a0345e56',
    spectralBand: 'multiwavelength',
    coverage: 'whole-object',
    modifications: {
      ko: '별관찰해쌀뚜: 원본 비율·색을 유지하고 크롭 없이 축소해 WebP로 변환. 야간 보호에서는 앱이 적색으로 표시하며, 원래 색 보기를 켜면 이 필터를 해제합니다.',
      en: 'Skylog: resized without cropping, preserving source proportions and colours, and converted to WebP. Night protection displays the image through a red filter; choosing original colours removes that display filter.',
    },
  },
];
// END GENERATED PHOTOS

const byObject = new Map<ObjectId, ObjectPhoto>(
  OBJECT_PHOTOS.map((photo) => [photo.objectId, photo]),
);
export function getObjectPhoto(id: ObjectId): ObjectPhoto | undefined {
  return byObject.get(id);
}
