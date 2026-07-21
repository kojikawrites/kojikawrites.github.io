import type { Plugin } from 'vite';
import path from 'path';
import fs from 'fs';

/**
 * Directories that should be excluded from production builds globally
 * These are dev-only directories that exist in any .sites folder
 */
const DEV_ONLY_DIRS = ['keystatic'];

/**
 * Vite plugin to exclude .sites directories that don't match the current SITE_CODE
 * This prevents Vite from processing CSS, images, and other assets from other sites
 *
 * In production mode, also excludes dev-only directories (like keystatic) from ALL sites
 */
export default function excludeNonMatchingSites(siteCode: string): Plugin {
    let hasLoggedInfo = false;
    const isProduction = process.env.NODE_ENV === 'production';

    return {
        name: 'exclude-non-matching-sites',
        enforce: 'pre', // Run before other plugins

        buildStart() {
            if (!hasLoggedInfo) {
                console.log(`\n🔧 Excluding .sites directories except: ${siteCode}`);
                if (isProduction) {
                    console.log(`🔧 Production mode: Also excluding dev-only dirs: ${DEV_ONLY_DIRS.join(', ')}`);
                }
                console.log('');
                hasLoggedInfo = true;
            }
        },

        resolveId(source: string, importer?: string, options?: any) {
            // Intercept at resolution time and mark for skipping
            const cleanSource = source.split('?')[0];

            // In production, exclude dev-only directories from ALL sites (including current site)
            if (isProduction && cleanSource.includes('.sites/')) {
                for (const devDir of DEV_ONLY_DIRS) {
                    if (cleanSource.includes(`/${devDir}/`) || cleanSource.endsWith(`/${devDir}`)) {
                        return '\0virtual:empty-site-file';
                    }
                }
            }

            // Exclude non-matching sites
            if (cleanSource.includes('.sites/')) {
                const match = cleanSource.match(/\.sites[\/\\]([^\/\\]+)/);
                if (match && match[1] && match[1] !== siteCode) {
                    // Return a virtual module ID to prevent other plugins from processing
                    return '\0virtual:empty-site-file';
                }
            }
            return null;
        },

        load(id: string) {
            // Handle the virtual empty module
            if (id === '\0virtual:empty-site-file') {
                return 'export default {}';
            }

            // Also handle direct file paths as a fallback
            // Normalize the path - remove query params and resolve
            const cleanId = id.split('?')[0];

            // Check if this is a file path that includes .sites/
            if (cleanId.includes('.sites/')) {
                // In production, exclude dev-only directories from ALL sites
                if (isProduction) {
                    for (const devDir of DEV_ONLY_DIRS) {
                        if (cleanId.includes(`/${devDir}/`) || cleanId.endsWith(`/${devDir}`)) {
                            return { code: 'export default {}', map: null };
                        }
                    }
                }

                // Extract the site code from the path
                const match = cleanId.match(/\.sites[\/\\]([^\/\\]+)/);
                if (match && match[1]) {
                    const pathSiteCode = match[1];

                    // If it's not the current site, return empty content
                    if (pathSiteCode !== siteCode) {
                        console.log(`🚫 Skipping asset from non-matching site: ${cleanId}`);

                        // Return appropriate empty content based on file type
                        if (cleanId.endsWith('.yaml') || cleanId.endsWith('.yml')) {
                            return { code: 'export default {}', map: null };
                        } else if (cleanId.endsWith('.css')) {
                            return { code: '', map: null };
                        } else if (cleanId.endsWith('.json')) {
                            return { code: 'export default {}', map: null };
                        } else if (cleanId.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
                            return { code: 'export default ""', map: null };
                        } else {
                            return { code: 'export default {}', map: null };
                        }
                    }
                }
            }

            return null; // Let other plugins handle it
        },
    };
}