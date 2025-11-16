import type { AstroIntegration } from 'astro';
import fs from 'fs';
import path from 'path';
import { getSiteCode } from '../lib/config/getSiteCode.ts';

/**
 * Astro integration to ensure required public directories exist.
 * Creates the /files/ directory if it doesn't exist.
 */
export default function ensurePublicFilesDirsIntegration(): AstroIntegration {
    return {
        name: 'ensure-public-files-dirs',
        hooks: {
            'astro:config:done': () => {
                const siteCode = getSiteCode();
                const filesDir = path.resolve(process.cwd(), 'src', '.sites', siteCode, '_public', 'files');

                // Create files directory if it doesn't exist
                if (!fs.existsSync(filesDir)) {
                    fs.mkdirSync(filesDir, { recursive: true });
                    console.log(`✅ Created files directory: ${filesDir}`);
                } else {
                    console.log(`✓ Files directory exists: ${filesDir}`);
                }
            }
        }
    };
}