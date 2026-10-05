import path from 'node:path';
import fs from 'node:fs';

test('Metro lee el logo oficial para assets nativos', async () => {
  const logo = path.resolve(__dirname, '../../../packages/ui/src/assets/logo/logo.png');
  const { imageSize } = require('image-size');
  expect(imageSize(fs.readFileSync(logo))).toMatchObject({ width: 512, height: 512 });
  const { getAssetData } = require('metro/private/Assets');
  const asset = await getAssetData(logo, 'logo.png', [], 'android', '/assets');
  expect(asset).toMatchObject({ width: 512, height: 512, type: 'png' });
});
