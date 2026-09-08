import fs from 'node:fs/promises';
import sharp from 'sharp';
const source = await fs.readFile('public/icon.svg');
for (const [density, scale] of Object.entries({
  mdpi: 1,
  hdpi: 1.5,
  xhdpi: 2,
  xxhdpi: 3,
  xxxhdpi: 4,
})) {
  const dir = `android/app/src/main/res/mipmap-${density}`;
  const image = sharp(source)
    .resize(Math.round(48 * scale), Math.round(48 * scale))
    .flatten({ background: '#07090f' });
  await image.png().toFile(`${dir}/ic_launcher.png`);
  await image.png().toFile(`${dir}/ic_launcher_round.png`);
  // Adaptive icon의 안전 영역(108 중 66)에 심볼을 넣는다.
  const symbol = await sharp(source)
    .resize(Math.round(66 * scale), Math.round(66 * scale))
    .png()
    .toBuffer();
  await sharp({
    create: { width: 108 * scale, height: 108 * scale, channels: 4, background: '#07090f' },
  })
    .composite([{ input: symbol, gravity: 'centre' }])
    .png()
    .toFile(`${dir}/ic_launcher_foreground.png`);
}
await sharp(source)
  .resize(1024, 1024)
  .flatten({ background: '#07090f' })
  .png()
  .toFile('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
  const symbol = await sharp(source).resize(360, 360).png().toBuffer();
  await sharp({ create: { width: 2732, height: 2732, channels: 3, background: '#07090f' } })
    .composite([{ input: symbol, gravity: 'centre' }])
    .png()
    .toFile('ios/App/App/Assets.xcassets/Splash.imageset/' + name);
}
// Android 구형 splash도 프로젝트 고유 아이콘과 배경으로 통일한다.
for (const dir of await fs.readdir('android/app/src/main/res')) {
  const p = `android/app/src/main/res/${dir}/splash.png`;
  try {
    await fs.access(p);
  } catch {
    continue;
  }
  await sharp(source).resize(256, 256).flatten({ background: '#07090f' }).png().toFile(p);
}
