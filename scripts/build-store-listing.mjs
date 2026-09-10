// 실제 앱 캡처에 스토어 소개 문구를 배치한다. 앱 안의 화면은 수정하지 않는다.
/* global document */
import fs from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import console from 'node:console';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const root = path.resolve('docs/store-assets/launch-20260910');
await fs.mkdir(path.join(root, 'phone'), { recursive: true });
const cards = [
  {
    id: '01-sky',
    raw: '01-sky',
    label: '하늘 지도',
    title: '저 별,\n이름이 뭘까',
    sub: '휴대폰 방향을 따라 살펴보는 밤하늘',
    theme: 'night',
  },
  {
    id: '02-tonight',
    raw: '02-tonight',
    label: '오늘 밤 추천',
    title: '오늘은\n어떤 별을 볼까',
    sub: '관측하기 좋은 천체를 한눈에',
    theme: 'cream',
  },
  {
    id: '03-photos',
    raw: '03-photo',
    label: '천체 사진',
    title: '작은 빛 너머,\n이런 모습이 있었네',
    sub: '164개 천체의 실제 참고 사진',
    theme: 'night',
  },
  {
    id: '04-starhop',
    raw: '07d-starhop-chart',
    label: '망원경 관측 · 스타호핑',
    title: '별에서 별로,\n망원경과 한 걸음씩',
    sub: '장비 시야 6.0° 기준 · 차트는 주변까지',
    theme: 'cream',
  },
  {
    id: '05-log',
    raw: '04-log',
    label: '관측 기록',
    title: '그날의 하늘을\n내 기록으로',
    sub: '메모와 사진, 스케치로 남기는 관측 노트',
    theme: 'night',
  },
  {
    id: '06-quiz',
    raw: '05b-quiz',
    label: '퀴즈와 관측 코스',
    title: '알아갈수록\n더 재밌는 밤하늘',
    sub: '작은 호기심이 관측 실력이 되도록',
    theme: 'cream',
  },
  {
    id: '07-garden',
    raw: '06-garden',
    label: '아바타와 내 마당',
    title: '별 보고 돌아와,\n내 마당에서 쉬어요',
    sub: '관측과 학습으로 모으는 꾸미기 보상',
    theme: 'green',
  },
];
const escape = (text) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const fontCSS = `
@font-face{font-family:GowunDodum;src:url('fonts/GowunDodum-Regular.ttf') format('truetype');font-weight:400;font-display:block}
@font-face{font-family:GowunBatang;src:url('fonts/GowunBatang-Bold.ttf') format('truetype');font-weight:700;font-display:block}
*{box-sizing:border-box}html,body{margin:0}body{font-family:GowunDodum,sans-serif;-webkit-font-smoothing:antialiased}
`;
const css = `${fontCSS}
.card{position:relative;width:1080px;height:1920px;overflow:hidden;color:#f8f2e7;background:#101c21}
.card.cream{background:#efeade;color:#263e3c}.card.green{background:#233d37;color:#faf0df}
.topline{position:absolute;top:46px;left:84px;right:84px;display:flex;justify-content:space-between;align-items:center;font-size:25px;letter-spacing:.03em}
.brand{font-size:27px;letter-spacing:.015em}.eyebrow{opacity:.82}
h1{position:absolute;top:104px;left:84px;right:72px;margin:0;font:700 65px/1.18 GowunBatang,serif;letter-spacing:-.045em;white-space:pre-line}
.sub{position:absolute;top:282px;left:86px;right:75px;margin:0;font-size:29px;line-height:1.45;letter-spacing:-.035em;opacity:.86;white-space:nowrap}
.screen{position:absolute;top:360px;left:108px;width:864px;height:1536px;border-radius:36px;overflow:hidden;background:#080d16;box-shadow:0 12px 35px #0003;outline:1px solid #ffffff1a}
.screen img{display:block;width:100%;height:100%;object-fit:contain}
.cream .screen{outline:1px solid #182d3422;box-shadow:0 14px 35px #18302822}
.feature{position:relative;width:1024px;height:500px;background:#0b161c;overflow:hidden;color:#f8f0e2}
.feature .sky{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.feature .shade{position:absolute;inset:0;background:linear-gradient(90deg,#0b181ff5 0%,#0b181feb 36%,#0b181f8a 66%,#0b181f00 100%)}
.feature .brand{position:absolute;top:49px;left:64px;display:flex;gap:12px;align-items:center;font-size:24px}
.feature .brand img{width:38px;height:38px;border-radius:10px}
.feature h1{top:135px;left:64px;font-size:56px;line-height:1.27;letter-spacing:-.04em}
.feature .sub{top:324px;left:68px;font-size:21px;letter-spacing:-.035em;line-height:1.7;white-space:pre-line}
`;
const cardHTML = (card) =>
  `<section class="card ${card.theme}" id="${card.id}"><div class="topline"><span class="eyebrow">${card.label}</span><span class="brand">Skyard</span></div><h1>${escape(card.title)}</h1><p class="sub">${card.sub}</p><div class="screen"><img src="raw-phone/${card.raw}.png" alt="${escape(card.label)} 실제 앱 화면"></div></section>`;
const featureHTML = `<section class="feature" id="feature"><img class="sky" src="feature-sky-source.png" alt="앱에서 렌더링한 밤하늘"><div class="shade"></div><div class="brand"><img src="play-icon-512.png" alt="">스카이야드 Skyard</div><h1>오늘 밤,\n별 보러 가요</h1><p class="sub">오늘의 하늘부터\n나만의 관측 기록까지</p></section>`;
// Play가 둥근 모서리를 적용하므로 제출용 아이콘은 기존 도안을 정사각형으로 내보낸다.
const iconSVG = (await fs.readFile('public/icon.svg', 'utf8')).replace(' rx="112"', '');
await fs.writeFile(path.join(root, 'play-icon-source.svg'), iconSVG);
await sharp(Buffer.from(iconSVG))
  .resize(512, 512)
  .toColourspace('srgb')
  .ensureAlpha()
  .png()
  .toFile(path.join(root, 'play-icon-512.png'));
await fs.writeFile(
  path.join(root, 'design-source.html'),
  `<!doctype html><html lang="ko"><meta charset="utf-8"><title>스카이야드 스토어 그래픽 원본</title><style>${css}body{display:flex;flex-wrap:wrap;gap:40px;padding:40px;background:#bbb8ae}</style>${featureHTML}${cards.map(cardHTML).join('')}</html>`,
);
const browser = await chromium.launch();
const report = {
  capturedUI: '830c974bebeab0e873925ba58b0bd8a01798de6e / beta.12 build17',
  generatedAt: new Date().toISOString(),
  assets: [],
};
try {
  const page = await browser.newPage({
    viewport: { width: 1160, height: 2000 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(pathToFileURL(path.join(root, 'design-source.html')).href);
  await page.evaluate(() => document.fonts.ready);
  if (
    !(await page.evaluate(
      () => document.fonts.check('700 65px GowunBatang') && document.fonts.check('29px GowunDodum'),
    ))
  )
    throw new Error('Gowun fonts did not load');
  const missing = await page
    .locator('img')
    .evaluateAll((imgs) => imgs.filter((x) => !x.complete || !x.naturalWidth).map((x) => x.src));
  if (missing.length) throw new Error(`Missing images: ${missing.join(', ')}`);
  for (const card of cards) {
    const el = page.locator(`[id="${card.id}"]`);
    const overflow = await el
      .locator('h1,.sub,.topline')
      .evaluateAll((els) => els.some((e) => e.scrollWidth > e.clientWidth));
    if (overflow) throw new Error(`Text overflow: ${card.id}`);
    const raw = await el.screenshot();
    const dest = path.join(root, 'phone', `${card.id}.png`);
    await sharp(raw).flatten({ background: '#101c21' }).toColourspace('srgb').png().toFile(dest);
    const m = await sharp(dest).metadata();
    if (m.width !== 1080 || m.height !== 1920 || m.hasAlpha)
      throw new Error(`Incorrect phone format: ${dest}`);
    report.assets.push({
      file: `phone/${card.id}.png`,
      raw: `raw-phone/${card.raw}.png`,
      width: m.width,
      height: m.height,
      bytes: (await fs.stat(dest)).size,
    });
  }
  const feature = await page.locator('#feature').screenshot();
  await sharp(feature)
    .flatten({ background: '#0b161c' })
    .toColourspace('srgb')
    .png()
    .toFile(path.join(root, 'feature-ko-1024x500.png'));
  if (errors.length) throw new Error(errors.join('\n'));
  await fs.writeFile(
    path.join(root, 'graphics-report.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  const contact = `<!doctype html><html lang="ko"><meta charset="utf-8"><title>스카이야드 · 스토어 등록 이미지</title><style>${fontCSS}body{background:#dedbd2;color:#263e3c;padding:32px}header{max-width:1100px;margin:0 auto 32px}header h2{font:700 32px GowunBatang;margin:12px 0}header p{font-size:17px;line-height:1.7}.banner{width:768px;max-width:100%;border-radius:8px;display:block}.row{display:grid;grid-template-columns:repeat(4,270px);gap:18px;max-width:1134px;margin:auto}.row img{width:270px;border-radius:8px}.row p{margin:6px 0 18px;font-size:16px}.row a{color:inherit;text-decoration:none}footer{max-width:1134px;margin:24px auto;font-size:14px;line-height:1.7}</style><header><h2>별 보러 가는 밤, 스카이야드</h2><p>실제 앱 화면 · 고운바탕과 고운돋움 · 한국어 등록 이미지</p><img class="banner" src="feature-ko-1024x500.png" alt="스카이야드 피처 그래픽"></header><div class="row">${cards.map((c, i) => `<a href="phone/${c.id}.png"><img src="phone/${c.id}.png" alt="${c.label}"><p>${i + 1}. ${c.label}</p></a>`).join('')}</div><footer>앱 beta.12/build17의 브라우저 화면을 촬영했습니다. 기록은 ‘샘플 기록’으로 표시한 예시입니다. 태블릿 이미지는 별도 폴더에 있습니다.<br>현재 빌드에 결제가 없어 유료 문구는 넣지 않았습니다. 향후 유료 기능을 적용할 때 안내를 추가합니다.</footer></html>`;
  await fs.writeFile(path.join(root, 'preview.html'), contact);
  await page.setViewportSize({ width: 1210, height: 1200 });
  await page.goto(pathToFileURL(path.join(root, 'preview.html')).href);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(root, 'preview.png'), fullPage: true });
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
