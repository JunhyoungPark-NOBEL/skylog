import fs from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import sharp from 'sharp';
const dir = 'docs/store-assets';
await fs.mkdir(dir, { recursive: true });
await sharp('public/icon.svg').resize(512, 512).png().toFile(`${dir}/play-icon-512.png`);
const stars = Array.from(
  { length: 70 },
  (_, i) =>
    `<circle cx="${(i * 139 + 61) % 1024}" cy="${(i * 83 + 17) % 500}" r="${i % 8 === 0 ? 2 : 0.8}" fill="#b9d4ff" opacity="${0.15 + (i % 5) * 0.1}"/>`,
).join('');
for (const [lang, title, subtitle] of [
  ['ko', '오늘 밤, 나만의 별길', '별을 찾고 · 기록하고 · 배워요'],
  ['en', 'Your path through the stars', 'Explore. Observe. Learn.'],
]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#07090f"/><stop offset="1" stop-color="#12253f"/></linearGradient></defs><rect width="1024" height="500" fill="url(#g)"/>${stars}<path d="M660 375 707 276 789 233 855 126 933 81" fill="none" stroke="#82b6ff" stroke-width="2" opacity=".7"/><g fill="#c7e1ff"><circle cx="660" cy="375" r="5"/><circle cx="707" cy="276" r="7"/><circle cx="789" cy="233" r="5"/><circle cx="855" cy="126" r="8"/><circle cx="933" cy="81" r="5"/></g><g font-family="Malgun Gothic,Arial,sans-serif"><text x="78" y="158" font-size="20" letter-spacing="4" fill="#82b6ff">SKYLOG</text><text x="76" y="246" font-size="${lang === 'ko' ? 46 : 36}" font-weight="700" fill="#f1f6ff">${title}</text><text x="78" y="304" font-size="25" fill="#b6c6dc">${subtitle}</text></g></svg>`;
  await fs.writeFile(`${dir}/feature-${lang}.svg`, svg);
  await sharp(Buffer.from(svg))
    .flatten({ background: '#07090f' })
    .removeAlpha()
    .png()
    .toFile(`${dir}/feature-${lang}-1024x500.png`);
}
