#!/usr/bin/env node
/**
 * Download Source Sans 3 font
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = path.join(__dirname, '..', 'src', 'assets', 'fonts');

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                return httpsGet(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode} for ${url}`));
                return;
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        }).on('error', reject);
    });
}

async function downloadFontFile(url, destPath) {
    const data = await httpsGet(url);
    fs.writeFileSync(destPath, data);
    return destPath;
}

async function main() {
    console.log('Downloading Source Sans 3...');
    const fontInfo = await httpsGet('https://gwfh.mranftl.com/api/fonts/source-sans-3');
    const info = JSON.parse(fontInfo.toString());

    const variants = ['200', '200italic', '300', '300italic', 'regular', 'italic', '600', '600italic', '700', '700italic', '900', '900italic'];
    let cssEntries = [];
    let count = 0;

    for (const variant of info.variants) {
        if (!variants.includes(variant.id)) continue;
        if (!variant.woff2) continue;

        const weight = variant.fontWeight;
        const style = variant.fontStyle;
        const filename = `source-sans-3-${weight}${style === 'italic' ? '-italic' : ''}.woff2`;
        const destPath = path.join(FONTS_DIR, filename);

        console.log(`  Downloading ${variant.id}...`);
        await downloadFontFile(variant.woff2, destPath);
        count++;

        const isItalic = variant.id.includes('italic');
        const weightNum = variant.id.replace('italic', '') || '400';
        const finalWeight = weightNum === 'regular' ? '400' : weightNum;

        cssEntries.push(`
@font-face {
  font-family: 'Source Sans 3';
  font-style: ${isItalic ? 'italic' : 'normal'};
  font-weight: ${finalWeight};
  font-display: swap;
  src: url(/src/assets/fonts/${filename}) format('woff2');
}`);
    }

    console.log(`  Downloaded ${count} variants`);

    // Output CSS
    const css = `
/* ========== Source Sans 3 ========== */${cssEntries.join('')}

/* Source Sans 3 helper class */
.source-sans-3 {
  font-family: "Source Sans 3", sans-serif;
}
`;

    const outputPath = path.join(__dirname, '..', 'src', 'styles', 'source-sans-3.css');
    fs.writeFileSync(outputPath, css);
    console.log(`\nCSS written to: ${outputPath}`);
}

main().catch(console.error);