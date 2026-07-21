import type { AstroIntegration } from 'astro';
import fs from 'fs';
import path from 'path';

/**
 * Astro integration to clean up macOS and Windows system files after build.
 * Runs after all other build steps, including public file copying.
 */

const PATTERNS_TO_REMOVE = [
    '.DS_Store',
    '._',           // Prefix for resource fork files
    '.Spotlight-V100',
    '.Trashes',
    '__MACOSX',
    'Thumbs.db',
    '.localized'
];

function cleanDirectory(dirPath: string, distPath: string, logger: any): number {
    let filesRemoved = 0;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
            // Check if directory matches a pattern to remove
            if (PATTERNS_TO_REMOVE.includes(entry.name)) {
                fs.rmSync(fullPath, { recursive: true, force: true });
                filesRemoved++;
                logger.info(`  ✓ Removed directory: ${path.relative(distPath, fullPath)}`);
            } else {
                filesRemoved += cleanDirectory(fullPath, distPath, logger);
            }
        } else {
            // Check if file matches a pattern to remove
            const shouldRemove = PATTERNS_TO_REMOVE.some(pattern => {
                return entry.name === pattern || entry.name.startsWith(pattern);
            });

            if (shouldRemove) {
                fs.unlinkSync(fullPath);
                filesRemoved++;
                logger.info(`  ✓ Removed file: ${path.relative(distPath, fullPath)}`);
            }
        }
    }

    return filesRemoved;
}

export default function cleanupSystemFiles(): AstroIntegration {
    return {
        name: 'cleanup-system-files',
        hooks: {
            'astro:build:done': ({ dir, logger }) => {
                const distPath = dir.pathname;

                logger.info('🧹 Cleaning macOS/Windows-specific files from dist...');
                const filesRemoved = cleanDirectory(distPath, distPath, logger);

                if (filesRemoved > 0) {
                    logger.info(`✅ Removed ${filesRemoved} system file(s)`);
                } else {
                    logger.info('✅ No system files found');
                }
            }
        }
    };
}