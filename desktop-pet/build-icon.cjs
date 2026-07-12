// Generate build/icon.ico from the throng sprite (square, transparent-padded).
const Jimp = require('jimp');
const _pti = require('png-to-ico');
const pngToIco = _pti.default || _pti;
const fs = require('fs');

(async () => {
  const img = await Jimp.read('assets/throngling.png');
  img.contain(232, 232);                                   // fit with a little margin
  const canvas = new Jimp(256, 256, 0x00000000);           // transparent 256x256
  canvas.composite(img, Math.round((256 - img.bitmap.width) / 2), Math.round((256 - img.bitmap.height) / 2));
  const buf = await canvas.getBufferAsync(Jimp.MIME_PNG);
  const ico = await pngToIco(buf);
  fs.mkdirSync('build', { recursive: true });
  fs.writeFileSync('build/icon.ico', ico);
  console.log('wrote build/icon.ico', ico.length, 'bytes');
})().catch((e) => { console.error('ICON ERR', e.message); process.exit(1); });
