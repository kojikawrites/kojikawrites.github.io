import type { AstroIntegration } from 'astro';
import fs from 'fs';
import path from 'path';
import { getSiteCode } from '../lib/config/getSiteConfig.ts';

/**
 * Astro integration to copy site-specific public files to dist directory.
 * Runs during the build process, before sitemap generation.
 *
 * Copies contents of src/.sites/<siteCode>/_public/ directly into dist/
 *
 * For example:
 * - src/.sites/hiivelabs.com/_public/favicons/favicon.ico → dist/favicons/favicon.ico
 * - src/.sites/hiivelabs.com/_public/notes/doc.pdf → dist/notes/doc.pdf
 */

function copyRecursive(src: string, dest: string, logger: any): void {
    if (!fs.existsSync(src)) {
        logger.warn(`Source directory does not exist: ${src}`);
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
            copyRecursive(srcPath, destPath, logger);
        } else {
            fs.copyFileSync(srcPath, destPath);
            const relativeDest = path.relative(process.cwd(), destPath);
            logger.info(`  ✓ Copied: ${entry.name} → ${relativeDest}`);
        }
    }
}

export default function copyPublicFilesIntegration(): AstroIntegration {
    return {
        name: 'copy-public-files',
        hooks: {
            'astro:build:done': ({ dir, logger }) => {
                const siteCode = getSiteCode();
                const publicDir = path.resolve(process.cwd(), 'src', '.sites', siteCode, '_public');
                const distDir = dir.pathname;

                logger.info(`\n📦 Copying public files for ${siteCode}...`);
                logger.info(`   Source: ${publicDir}`);
                logger.info(`   Destination: ${distDir}\n`);

                if (!fs.existsSync(publicDir)) {
                    logger.info(`ℹ️  No _public directory found for ${siteCode}`);
                    logger.info(`   Skipping public files copy.\n`);
                    return;
                }

                // Copy all contents from _public to dist
                copyRecursive(publicDir, distDir, logger);

                logger.info(`\n✅ Public files copied successfully\n`);
            }
        }
    };
}