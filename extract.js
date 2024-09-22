const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://fiber-challenges.s3.amazonaws.com/dump.tar.gz';
const outputPath = path.join('tmp', 'dump.tar.gz');

fs.mkdirSync('tmp', { recursive: true });

const fileStream = fs.createWriteStream(outputPath);

https.get(url, (response) => {
    response.pipe(fileStream);

    fileStream.on('finish', () => {
        fileStream.close();
        console.log('Download completed');
    });
}).on('error', (err) => {
    console.error('Error downloading file:', err);
    fileStream.close();
});

