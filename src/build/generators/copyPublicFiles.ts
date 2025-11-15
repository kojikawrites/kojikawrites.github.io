import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Post-build script to copy site-specific public files to dist directory.
 * Copies contents of src/.sites/<siteCode>/_public/ directly into dist/
 *
 * For example:
 * - src/.sites/hiivelabs.com/_public/favicons/favicon.ico → dist/favicons/favicon.ico
 * - src/.sites/hiivelabs.com/_public/notes/doc.pdf → dist/notes/doc.pdf
 */

function getSiteCode(): string {
    // Try environment variable first
    const siteCode = process.env.SITE_CODE || process.env.VITE_SITE_NAME;

    if (siteCode) {
        // Remove protocol and path if it's a full URL
        return siteCode
            .replace(/^.*?\/\//, '')
            .split('/')[0]
            .replace(/\s/g, '');
    }

    // Default fallback
    return 'hiivelabs.com';
}

function copyRecursive(src: string, dest: string): void {
    if (!fs.existsSync(src)) {
        console.warn(`⚠️  Source directory does not exist: ${src}`);
        return;
    }

    // Ensure destination directory exists
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
            console.log(`  ✓ ${entry.name} → ${path.relative(process.cwd(), destPath)}`);
        }
    }
}

function main() {
    const siteCode = getSiteCode();
    const rootDir = path.resolve(__dirname, '../../..');
    const publicDir = path.join(rootDir, 'src', '.sites', siteCode, '_public');
    const distDir = path.join(rootDir, 'dist');

    console.log(`\n📦 Copying public files for ${siteCode}...`);
    console.log(`   Source: ${publicDir}`);
    console.log(`   Destination: ${distDir}\n`);

    if (!fs.existsSync(publicDir)) {
        console.log(`ℹ️  No _public directory found for ${siteCode}`);
        console.log(`   Skipping public files copy.\n`);
        return;
    }

    if (!fs.existsSync(distDir)) {
        console.error(`❌ dist directory not found at ${distDir}`);
        console.error(`   Make sure this script runs after the build step.\n`);
        process.exit(1);
    }

    // Copy all contents from _public to dist
    copyRecursive(publicDir, distDir);

    console.log(`\n✅ Public files copied successfully\n`);
}

main();