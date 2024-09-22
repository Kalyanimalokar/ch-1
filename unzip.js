const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const tar = require('tar-fs');

const inputFile = path.join('tmp', 'dump.tar.gz');
const outputDir = path.join('tmp', 'extracted');

// Ensure the output directory exists
fs.mkdirSync(outputDir, { recursive: true });

fs.createReadStream(inputFile)
  .pipe(zlib.createGunzip())
  .pipe(tar.extract(outputDir))
  .on('finish', () => {
    console.log('Extraction completed');
  })
  .on('error', (err) => {
    console.error('Error during extraction:', err);
  });