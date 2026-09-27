// One-off icon generator for the "BoothBuddy" brand mark — a conference
// name-badge glyph (clip + body, with a photo circle and two text bars
// punched out as transparent cutouts) composited over different
// backgrounds per platform requirement. Run once, not part of the build —
// sharp isn't a project dependency, so run `npm install --no-save sharp`
// first if you want to regenerate these (e.g. after tweaking GLYPH_SVG):
// `node scripts/gen-icons.mjs`
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const BRAND_BLUE = '#3c87f7';

const GLYPH_SVG = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <mask id="cutouts">
    <rect x="0" y="0" width="1024" height="1024" fill="white"/>
    <circle cx="512" cy="440" r="92" fill="black"/>
    <rect x="352" y="592" width="320" height="34" rx="17" fill="black"/>
    <rect x="392" y="652" width="240" height="34" rx="17" fill="black"/>
  </mask>
  <g mask="url(#cutouts)">
    <rect x="466" y="176" width="92" height="66" rx="18" fill="white"/>
    <rect x="256" y="256" width="512" height="592" rx="56" fill="white"/>
  </g>
</svg>
`;

async function glyphBuffer(size) {
  return sharp(Buffer.from(GLYPH_SVG)).resize(size, size).png().toBuffer();
}

async function iconWithBackground(outPath, canvasSize, glyphSize, background) {
  const glyph = await glyphBuffer(glyphSize);
  const offset = Math.round((canvasSize - glyphSize) / 2);
  await sharp({
    create: { width: canvasSize, height: canvasSize, channels: 4, background },
  })
    .composite([{ input: glyph, left: offset, top: offset }])
    .png()
    .toFile(outPath);
  console.log('wrote', outPath);
}

async function solidBackground(outPath, size, background) {
  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .png()
    .toFile(outPath);
  console.log('wrote', outPath);
}

async function transparentGlyph(outPath, canvasWidth, canvasHeight, glyphSize) {
  const glyph = await glyphBuffer(glyphSize);
  const left = Math.round((canvasWidth - glyphSize) / 2);
  const top = Math.round((canvasHeight - glyphSize) / 2);
  await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: glyph, left, top }])
    .png()
    .toFile(outPath);
  console.log('wrote', outPath);
}

const dir = 'assets/images';
await mkdir(dir, { recursive: true });

await iconWithBackground(`${dir}/icon.png`, 1024, 720, BRAND_BLUE);
await iconWithBackground(`${dir}/favicon.png`, 48, 36, BRAND_BLUE);
await transparentGlyph(`${dir}/android-icon-foreground.png`, 512, 512, 330);
await solidBackground(`${dir}/android-icon-background.png`, 512, BRAND_BLUE);
await transparentGlyph(`${dir}/android-icon-monochrome.png`, 432, 432, 280);
await transparentGlyph(`${dir}/splash-icon.png`, 228, 213, 170);

console.log('Done.');
