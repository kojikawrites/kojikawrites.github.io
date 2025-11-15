import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import { getSiteCode } from '../src/lib/config/getSiteConfig.ts';

/**
 * Vite plugin to serve files from site-specific _public directory as an overlay during development.
 *
 * Overlay behavior:
 * 1. Request comes in (e.g., /favicon.ico)
 * 2. Check src/.sites/<siteCode>/_public/favicon.ico first
 * 3. If found, serve it from _public (override)
 * 4. If not found, fall through to standard public/ directory (fallback)
 *
 * This allows _public to override files in public/ without modifying the public directory.
 *
 * In production builds, files are physically copied by the copyPublicFiles integration.
 * In dev mode, this plugin serves them virtually without copying.
 */
export default function multiPublicPlugin(): Plugin {
    let sitePublicDir: string;
    let isDev = false;

    return {
        name: 'vite-plugin-multi-public',
        enforce: 'pre', // Run before other plugins including Astro

        configResolved(config) {
            isDev = config.command === 'serve';

            if (isDev) {
                const siteCode = getSiteCode();
                sitePublicDir = path.resolve(process.cwd(), 'src', '.sites', siteCode, '_public');

                if (fs.existsSync(sitePublicDir)) {
                    console.log(`\n📂 Multi-public plugin active for ${siteCode}`);
                    console.log(`   Serving files from: ${sitePublicDir}\n`);
                }
            }
        },

        configureServer(server) {
            if (!isDev || !sitePublicDir || !fs.existsSync(sitePublicDir)) {
                return;
            }

            // Install middleware directly (runs in "pre" mode, before Astro's routing)
            server.middlewares.use((req, res, next) => {
                    // Only handle GET and HEAD requests
                    if (req.method !== 'GET' && req.method !== 'HEAD') {
                        return next();
                    }

                    const url = req.url || '';

                    // Remove query string and clean the path
                    const cleanPath = url.split('?')[0];

                    // Don't handle special Vite paths
                    if (cleanPath.startsWith('/@') || cleanPath.startsWith('/__')) {
                        return next();
                    }

                    // Construct the file path in site-specific _public directory
                    // Decode URL
                    let relativePath = cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath;
                    relativePath = decodeURIComponent(relativePath);
                    const filePath = path.join(sitePublicDir, relativePath);

                    // // Debug logging
                    // if (relativePath.includes('hiive-interpretation') || relativePath.includes('notes/')) {
                    //     console.log(`[multi-public] Request: ${cleanPath}`);
                    //     console.log(`[multi-public] Checking: ${filePath}`);
                    //     console.log(`[multi-public] Exists: ${fs.existsSync(filePath)}`);
                    //     if (fs.existsSync(filePath)) {
                    //         console.log(`[multi-public] Is file: ${fs.statSync(filePath).isFile()}`);
                    //     }
                    // }

                    // Check if file exists in site-specific _public
                    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                        try {
                            const content = fs.readFileSync(filePath);
                            const ext = path.extname(filePath).toLowerCase();

                            // Set appropriate content type
                            const contentTypes: Record<string, string> = {
                                '.html': 'text/html',
                                '.css': 'text/css',
                                '.js': 'text/javascript',
                                '.json': 'application/json',
                                '.png': 'image/png',
                                '.jpg': 'image/jpeg',
                                '.jpeg': 'image/jpeg',
                                '.gif': 'image/gif',
                                '.svg': 'image/svg+xml',
                                '.webp': 'image/webp',
                                '.ico': 'image/x-icon',
                                '.pdf': 'application/pdf',
                                '.webmanifest': 'application/manifest+json',
                            };

                            const contentType = contentTypes[ext] || 'application/octet-stream';
                            res.setHeader('Content-Type', contentType);
                            res.setHeader('Content-Length', content.length);

                            console.log(`[multi-public] ✓ Serving from _public: ${relativePath}`);

                            res.end(content);
                            return;
                        } catch (error) {
                            console.error(`[multi-public] Error serving file from _public: ${filePath}`, error);
                        }
                    }

                    // File not found in site-specific _public, continue to next middleware
                    // This allows Vite's built-in public/ directory serving to handle the request
                    next();
            });
        }
    };
}
