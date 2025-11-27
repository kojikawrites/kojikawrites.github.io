#!/usr/bin/env node
/**
 * Download Google Fonts and generate CSS
 *
 * Uses the google-webfonts-helper API to download woff2 files
 * and generate CSS with local paths.
 *
 * Usage: node scripts/download-google-fonts.mjs
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = path.join(__dirname, '..', 'src', 'assets', 'fonts');
const FONTS_CSS_PATH = path.join(__dirname, '..', 'src', 'styles', 'fonts.css');

// Fonts to download with their variants
const FONTS_TO_DOWNLOAD = [
    {
        id: 'playfair-display',
        name: 'Playfair Display',
        variants: ['regular', 'italic', '500', '500italic', '600', '600italic', '700', '700italic', '800', '800italic', '900', '900italic'],
        subsets: ['latin', 'latin-ext'],
        category: 'serif'
    },
    {
        id: 'inter',
        name: 'Inter',
        variants: ['100', '200', '300', 'regular', '500', '600', '700', '800', '900'],
        subsets: ['latin', 'latin-ext'],
        category: 'sans-serif'
    },
    {
        id: 'poppins',
        name: 'Poppins',
        variants: ['100', '100italic', '200', '200italic', '300', '300italic', 'regular', 'italic', '500', '500italic', '600', '600italic', '700', '700italic', '800', '800italic', '900', '900italic'],
        subsets: ['latin', 'latin-ext'],
        category: 'sans-serif'
    },
    {
        id: 'lato',
        name: 'Lato',
        variants: ['100', '100italic', '300', '300italic', 'regular', 'italic', '700', '700italic', '900', '900italic'],
        subsets: ['latin', 'latin-ext'],
        category: 'sans-serif'
    },
    {
        id: 'montserrat',
        name: 'Montserrat',
        variants: ['100', '200', '300', 'regular', '500', '600', '700', '800', '900', '100italic', '200italic', '300italic', 'italic', '500italic', '600italic', '700italic', '800italic', '900italic'],
        subsets: ['latin', 'latin-ext'],
        category: 'sans-serif'
    },
    {
        id: 'oswald',
        name: 'Oswald',
        variants: ['200', '300', 'regular', '500', '600', '700'],
        subsets: ['latin', 'latin-ext'],
        category: 'sans-serif'
    },
    {
        id: 'libre-baskerville',
        name: 'Libre Baskerville',
        variants: ['regular', 'italic', '700'],
        subsets: ['latin', 'latin-ext'],
        category: 'serif'
    },
    {
        id: 'source-sans-3',
        name: 'Source Sans 3',
        variants: ['200', '200italic', '300', '300italic', 'regular', 'italic', '600', '600italic', '700', '700italic', '900', '900italic'],
        subsets: ['latin', 'latin-ext'],
        category: 'sans-serif'
    }
];

// Helper to make HTTPS requests
function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                // Follow redirect
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

// Download a single font file
async function downloadFontFile(url, destPath) {
    const data = await httpsGet(url);
    fs.writeFileSync(destPath, data);
    return destPath;
}

// Get font info from API
async function getFontInfo(fontId) {
    const url = `https://gwfh.mranftl.com/api/fonts/${fontId}`;
    const data = await httpsGet(url);
    return JSON.parse(data.toString());
}

// Generate CSS for a font variant
function generateVariantCSS(fontFamily, variant, localPath, category) {
    const weight = variant.replace('italic', '') || '400';
    const weightNum = weight === 'regular' ? '400' : weight;
    const isItalic = variant.includes('italic');

    return `
@font-face {
  font-family: '${fontFamily}';
  font-style: ${isItalic ? 'italic' : 'normal'};
  font-weight: ${weightNum};
  font-display: swap;
  src: url(${localPath}) format('woff2');
}`;
}

// Main download function
async function downloadFont(fontConfig) {
    console.log(`\nDownloading ${fontConfig.name}...`);

    try {
        // Get font metadata from API
        const fontInfo = await getFontInfo(fontConfig.id);

        let cssEntries = [];
        let downloadCount = 0;

        for (const variant of fontInfo.variants) {
            // Check if this variant is in our list
            if (!fontConfig.variants.includes(variant.id)) {
                continue;
            }

            // Download woff2 file
            const woff2Url = variant.woff2;
            if (!woff2Url) {
                console.log(`  Skipping ${variant.id} - no woff2 available`);
                continue;
            }

            // Generate filename
            const weight = variant.fontWeight;
            const style = variant.fontStyle;
            const filename = `${fontConfig.id}-${weight}${style === 'italic' ? '-italic' : ''}.woff2`;
            const destPath = path.join(FONTS_DIR, filename);
            const localPath = `/src/assets/fonts/${filename}`;

            // Download file
            console.log(`  Downloading ${variant.id}...`);
            await downloadFontFile(woff2Url, destPath);
            downloadCount++;

            // Generate CSS
            cssEntries.push(generateVariantCSS(
                fontConfig.name,
                variant.id,
                localPath,
                fontConfig.category
            ));
        }

        console.log(`  Downloaded ${downloadCount} variants`);
        return cssEntries.join('\n');

    } catch (error) {
        console.error(`  Error downloading ${fontConfig.name}:`, error.message);
        return '';
    }
}

// CSS helper class generator
function generateHelperClasses(fontConfig) {
    const className = fontConfig.id.replace(/-/g, '-');
    return `
/* ${fontConfig.name} helper class */
.${className} {
  font-family: "${fontConfig.name}", ${fontConfig.category};
}`;
}

async function main() {
    console.log('Google Fonts Downloader');
    console.log('======================');
    console.log(`Output directory: ${FONTS_DIR}`);

    // Ensure fonts directory exists
    if (!fs.existsSync(FONTS_DIR)) {
        fs.mkdirSync(FONTS_DIR, { recursive: true });
    }

    let allCSS = [];
    let allHelpers = [];

    for (const fontConfig of FONTS_TO_DOWNLOAD) {
        const css = await downloadFont(fontConfig);
        if (css) {
            allCSS.push(`\n/* ========== ${fontConfig.name} ========== */${css}`);
            allHelpers.push(generateHelperClasses(fontConfig));
        }
    }

    // Combine all CSS
    const newCSS = allCSS.join('\n') + '\n\n/* Helper Classes */\n' + allHelpers.join('\n');

    // Write to a separate file first for review
    const outputPath = path.join(__dirname, '..', 'src', 'styles', 'fonts-new.css');
    fs.writeFileSync(outputPath, newCSS);

    console.log(`\n✅ Done! New fonts CSS written to: ${outputPath}`);
    console.log('\nTo add to your existing fonts.css, run:');
    console.log(`  cat ${outputPath} >> ${FONTS_CSS_PATH}`);
}

main().catch(console.error);