const sharp = require('sharp');
const fs = require('fs');

const sizes = [16, 48, 128];
const inputSvg = './public/icons/icon.svg';

async function generateIcons() {
  for (const size of sizes) {
    await sharp(inputSvg)
      .resize(size, size)
      .toFile(`./public/icons/icon${size}.png`);
  }
}

generateIcons();