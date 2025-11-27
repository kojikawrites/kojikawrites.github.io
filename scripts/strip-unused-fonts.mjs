#!/usr/bin/env node
/**
 * Strip unused fonts from production build
 *
 * This script analyzes the site's CSS variable configuration to determine
 * which fonts are actually used, then removes unused font files from dist.
 *
 * It works by:
 * 1. Reading the site's colors.css to find font-family CSS variables
 * 2. Extracting which fonts are referenced (e.g., Merriweather, Fira Sans)
 * 3. Parsing the built CSS to find which font files map to which families
 * 4. Removing font files that don't belong to any used font family
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');

// Font family to file pattern mapping
// These patterns match the file naming conventions in the built CSS
const FONT_FILE_PATTERNS = {
    'Fira Sans': ['va9', 'FiraSans'],
    'Inter': ['Inter', 'UcC'],
    'Lato': ['Lato', 'S6u'],
    'Libre Baskerville': ['LibreBaskerville', 'lRB'],
    'Merriweather': ['Merriweather', 'u-'],
    'Montserrat': ['Montserrat', 'JTU'],
    'Open Sans': ['OpenSans', 'mem'],
    'Oswald': ['Oswald', 'TK3'],
    'Playfair Display': ['PlayfairDisplay', 'nuF'],
    'Poppins': ['Poppins', 'pxiE', 'pxiB', 'pxiD', 'pxiA'],
    'Roboto': ['Roboto', 'KFO'],
    'Source Sans 3': ['SourceSans3', 'source-sans-3'],
    'Telex': ['Telex', 'CWj'],
};

// System/generic fonts that should never be treated as custom fonts
const SYSTEM_FONTS = new Set([
    'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
    'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New',
    '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Oxygen', 'Ubuntu',
    'Cantarell', 'Droid Sans', 'Helvetica Neue', 'system-ui'
]);

/**
 * Parse the site's colors.css to extract used font families
 */
function getUsedFonts(siteDir) {
    const colorsPath = path.join(ROOT_DIR, 'src/.sites', siteDir, 'styles/colors.css');

    if (!fs.existsSync(colorsPath)) {
        console.error(`  Colors file not found: ${colorsPath}`);
        return new Set();
    }

    const content = fs.readFileSync(colorsPath, 'utf-8');
    const usedFonts = new Set();

    // Match specific font-family CSS variables (not the system font stack)
    // Only match: --font-family-serif, --font-family-sans, --font-family-sans-alt, --font-family-monospace
    const fontVarRegex = /--font-family-(serif|sans|sans-alt|monospace):\s*([^;]+)/g;
    let match;

    while ((match = fontVarRegex.exec(content)) !== null) {
        const fullValue = match[2].trim();
        // Parse the comma-separated font stack
        const fonts = fullValue.split(',').map(f => f.trim().replace(/^['"]|['"]$/g, ''));

        for (const fontName of fonts) {
            // Skip generic fallbacks and system fonts
            if (!SYSTEM_FONTS.has(fontName) && fontName.length > 0) {
                usedFonts.add(fontName);
            }
        }
    }

    return usedFonts;
}

/**
 * Get patterns for fonts that should be KEPT
 */
function getKeepPatterns(usedFonts) {
    const patterns = [];

    for (const font of usedFonts) {
        if (FONT_FILE_PATTERNS[font]) {
            patterns.push(...FONT_FILE_PATTERNS[font]);
        } else {
            // Try to generate pattern from font name
            const cleaned = font.replace(/\s+/g, '');
            patterns.push(cleaned);
            patterns.push(font.toLowerCase().replace(/\s+/g, '-'));
        }
    }

    return patterns;
}

/**
 * Check if a filename matches any of the keep patterns
 */
function shouldKeepFont(filename, keepPatterns) {
    const lowerFilename = filename.toLowerCase();
    return keepPatterns.some(pattern => {
        const lowerPattern = pattern.toLowerCase();
        return filename.includes(pattern) || lowerFilename.includes(lowerPattern);
    });
}

/**
 * Strip unused fonts from the dist folder
 */
function stripUnusedFonts(distDir, keepPatterns, dryRun = false) {
    const astroDir = path.join(distDir, '_astro');

    if (!fs.existsSync(astroDir)) {
        console.error(`  _astro directory not found: ${astroDir}`);
        return { removed: 0, kept: 0, savedBytes: 0 };
    }

    const files = fs.readdirSync(astroDir);
    const fontFiles = files.filter(f => f.endsWith('.woff2') || f.endsWith('.woff') || f.endsWith('.ttf'));

    let removed = 0;
    let kept = 0;
    let savedBytes = 0;

    for (const fontFile of fontFiles) {
        const filePath = path.join(astroDir, fontFile);

        if (shouldKeepFont(fontFile, keepPatterns)) {
            kept++;
        } else {
            const stats = fs.statSync(filePath);
            savedBytes += stats.size;

            if (dryRun) {
                console.log(`  [DRY RUN] Would remove: ${fontFile}`);
            } else {
                fs.unlinkSync(filePath);
            }
            removed++;
        }
    }

    return { removed, kept, savedBytes };
}

/**
 * Also clean up @font-face rules from CSS files for removed fonts
 */
function cleanupCssFiles(distDir, usedFonts, dryRun = false) {
    const astroDir = path.join(distDir, '_astro');
    const cssFiles = fs.readdirSync(astroDir).filter(f => f.endsWith('.css'));

    let totalRemoved = 0;

    for (const cssFile of cssFiles) {
        const filePath = path.join(astroDir, cssFile);
        let content = fs.readFileSync(filePath, 'utf-8');
        const originalLength = content.length;

        // Match @font-face blocks and check their font-family
        const fontFaceRegex = /@font-face\s*\{[^}]*font-family:\s*['"]?([^'";,}]+)['"]?[^}]*\}/g;

        content = content.replace(fontFaceRegex, (match, fontFamily) => {
            const cleanFamily = fontFamily.trim();
            if (usedFonts.has(cleanFamily)) {
                return match; // Keep this @font-face
            }
            totalRemoved++;
            return ''; // Remove this @font-face
        });

        // Clean up empty lines that might be left behind
        content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

        if (content.length !== originalLength && !dryRun) {
            fs.writeFileSync(filePath, content);
        }
    }

    return totalRemoved;
}

/**
 * Main function
 */
async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const siteDir = process.env.SITE || 'hiivelabs.com';
    const distDir = path.join(ROOT_DIR, 'dist');

    console.log('\n🔤 Font Stripping Tool');
    console.log('======================');
    console.log(`Site: ${siteDir}`);
    console.log(`Dist: ${distDir}`);
    if (dryRun) console.log('Mode: DRY RUN (no changes will be made)\n');

    // Step 1: Find used fonts
    console.log('\n📖 Analyzing font configuration...');
    const usedFonts = getUsedFonts(siteDir);

    if (usedFonts.size === 0) {
        console.log('  No custom fonts detected in colors.css');
        console.log('  Keeping all fonts.');
        return;
    }

    console.log(`  Used fonts: ${[...usedFonts].join(', ')}`);

    // Step 2: Get keep patterns
    const keepPatterns = getKeepPatterns(usedFonts);
    console.log(`  Keep patterns: ${keepPatterns.slice(0, 10).join(', ')}${keepPatterns.length > 10 ? '...' : ''}`);

    // Step 3: Strip unused font files
    console.log('\n🗑️  Removing unused font files...');
    const { removed, kept, savedBytes } = stripUnusedFonts(distDir, keepPatterns, dryRun);

    console.log(`  Removed: ${removed} font files`);
    console.log(`  Kept: ${kept} font files`);
    console.log(`  Saved: ${(savedBytes / 1024 / 1024).toFixed(2)} MB`);

    // Step 4: Clean up CSS @font-face rules
    console.log('\n🧹 Cleaning up CSS @font-face rules...');
    const cssRulesRemoved = cleanupCssFiles(distDir, usedFonts, dryRun);
    console.log(`  Removed ${cssRulesRemoved} @font-face rules from CSS files`);

    console.log('\n✅ Font stripping complete!\n');
}

main().catch(console.error);