/**
 * Universal site-aware glob utility
 * Handles all glob operations with automatic site code filtering
 */

// Cache for glob results
const globCache = new Map<string, any>();

export type GlobType = 'json' | 'yaml' | 'css' | 'pages' | 'posts' | 'media' | 'components' | 'custom';

// Type for glob results when returning multiple files (loaders)
export type GlobResult<T> = Record<string, (() => Promise<{ default: T }>) | { default: T }>;

export interface SiteGlobOptions {
    /** The site code to filter by */
    siteCode: string;
    /** Type of files to glob (determines pattern) */
    type: GlobType;
    // /** Custom glob pattern (overrides type-based pattern) */
    // customPattern?: string;
    // /** Custom glob patterns array (for multiple paths like media) */
    // customPatterns?: string[];
    /** Custom glob function that returns the import.meta.glob result */
    globFilter?: (eager) => Record<string, any>;
    /** Eagerly load all matching files */
    eager?: boolean;
    /** Additional filter function */
    filter?: (path: string) => boolean;
    /** Specific filename to match (for single-file lookups) */
    filename?: string;
    /** File extensions to exclude (e.g., ['.mp4', '.avi']) */
    excludeExtensions?: string[];
    /** Optional post-processing function to run on loaded content before caching */
    postProcess?: (content: any) => Promise<any> | any;
}

/**
 * Generate a cache key for the given options
 */
function getCacheKey(options: SiteGlobOptions): string {
    const { siteCode, type, filename, excludeExtensions = [] } = options;
    const parts = [
        siteCode,
        type,
        filename || '',
        excludeExtensions.sort().join(','),
    ];
    return parts.join('|');
}

/**
 * Get the glob pattern(s) for a given type
 */


/**
 * Universal site-aware glob function
 *
 * @example
 * // Get a specific JSON file
 * const logoMap = await siteGlob({
 *   siteCode: 'hiivelabs.com',
 *   type: 'json',
 *   filename: 'logo-map.json'
 * });
 *
 * @example
 * // Get all pages for a site with type safety
 * const pages = await siteGlob<PageType>({
 *   siteCode: 'hiivelabs.com',
 *   type: 'pages',
 *   eager: true
 * });
 */
export async function siteGlob<T = any>(options: SiteGlobOptions): Promise<T | GlobResult<T> | null> {
    const { siteCode, type, globFilter, eager = false, filter, filename, excludeExtensions = [], postProcess } = options;

    // Check cache (skip if in dev mode)
    const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;
    const cacheKey = getCacheKey(options);

    if (!isDev && globCache.has(cacheKey)) {
        // console.debug(`Using cached glob result for ${type}/${filename || 'all'} (${siteCode})`);
        return globCache.get(cacheKey);
    }

    // Perform the glob - Vite requires literal patterns, so we use switch/case
    // Must use literal patterns because Vite statically analyzes import.meta.glob
    let globResult: Record<string, any>;

    // If custom glob function provided, use it
    if (globFilter) {
        globResult = globFilter(eager);
    } else { //else if (customPattern || customPatterns) {
        throw new Error('Must provide glob filter.');
    } //else {
        // Use built-in glob types
        // switch (type) {
        // case 'json':
        //     globResult = eager
        //         ? import.meta.glob<{ default: T }>('/src/.sites/**/state/*.json', { eager: true })
        //         : import.meta.glob<{ default: T }>('/src/.sites/**/state/*.json');
        //     break;
        // case 'yaml': REMOVED - use inline import.meta.glob in getSiteConfig instead
        //     // YAML files must be loaded inline to avoid config-time loading issues
        //     globResult = eager
        //         ? import.meta.glob<T>('/src/.sites/**/config/*.yaml', { eager: true })
        //         : import.meta.glob<T>('/src/.sites/**/config/*.yaml');
        //     break;
        // case 'customcss':
        //     // Only match custom.css to avoid Vite processing all CSS files
        //     // Use <any> type like the old code - CSS doesn't have { default: } wrapper
        //     globResult = eager //  '../../.sites/**/styles/custom.css',
        //         ? import.meta.glob<any>('/src/.sites/**/styles/custom.css', { eager: true })
        //         : import.meta.glob<any>('/src/.sites/**/styles/custom.css');
        //     break;
        // case 'pages':
        //     globResult = eager
        //         ? import.meta.glob<{ default: T }>('/src/.sites/**/content/pagecontent/**/*.{md,mdx,astro}', { eager: true })
        //         : import.meta.glob<{ default: T }>('/src/.sites/**/content/pagecontent/**/*.{md,mdx,astro}');
        //     break;
        // case 'posts':
        //     globResult = eager
        //         ? import.meta.glob<{ default: T }>('/src/.sites/**/content/posts/**/*.{md,mdx}', { eager: true })
        //         : import.meta.glob<{ default: T }>('/src/.sites/**/content/posts/**/*.{md,mdx}');
        //     break;
        // case 'media':
        //     globResult = eager
        //         ? import.meta.glob<{ default: T }>([
        //             '/src/assets/**/*.{jpeg,jpg,png,gif,svg,webp,mp4}',
        //             '/src/.sites/**/*.{jpeg,jpg,png,gif,svg,webp,mp4}'
        //         ], { eager: true })
        //         : import.meta.glob<{ default: T }>([
        //             '/src/assets/**/*.{jpeg,jpg,png,gif,svg,webp,mp4}',
        //             '/src/.sites/**/*.{jpeg,jpg,png,gif,svg,webp,mp4}'
        //         ]);
        //     break;
        // case 'components':
        //     globResult = eager
        //         ? import.meta.glob<{ default: T }>('/src/.sites/*/components/*.astro', { eager: true })
        //         : import.meta.glob<{ default: T }>('/src/.sites/*/components/*.astro');
        //     break;
        // case 'custom':
        //     // Custom type requires customGlobFn
        //     throw new Error('Custom type requires customGlobFn parameter');
        // default:
        //     throw new Error(`Unknown glob type: ${type}. Supported types: json, yaml, customcss, pages, posts, media, components, custom`);
        // }
    //}

    // Filter by site code and optional filters
    const filteredEntries = Object.entries(globResult).filter(([path]) => {
        // For paths in .sites/, must include the site code
        if (path.includes('.sites/')) {
            if (!path.includes(`.sites/${siteCode}/`)) return false;
        }
        // Paths not in .sites/ are shared assets - always include

        // If filename specified, must match
        if (filename && !path.includes(filename)) return false;

        // Exclude specified extensions
        if (excludeExtensions.length > 0) {
            const hasExcludedExt = excludeExtensions.some(ext =>
                path.toLowerCase().endsWith(ext.toLowerCase())
            );
            if (hasExcludedExt) return false;
        }

        // Apply custom filter if provided
        if (filter && !filter(path)) return false;

        return true;
    });

    // If looking for a specific file, return just that one
    if (filename) {
        if (filteredEntries.length === 0) {
            console.warn(`No ${filename} found for ${siteCode}`);
            return null;
        }
        const [filePath, loader] = filteredEntries[0];
        let result;
        if (eager) {
            // When eager, the loader IS the loaded content
            // MDX files: { frontmatter, Content, getHeadings, ..., default }
            // YAML files via @rollup/plugin-yaml: { default: content } (no other keys)
            // CSS files: raw content string
            if (type === 'css') {
                result = loader;
            } else if ((loader as any).Content !== undefined) {
                // MDX/Astro files - they have Content, use the whole loader
                result = loader;
            } else if ((loader as any).default !== undefined) {
                // YAML/JSON wrapped in { default: } - extract the default
                result = (loader as any).default;
            } else {
                // Fallback - use as-is
                result = loader;
            }
        } else {
            // Non-eager: loader is a function that returns a promise
            if (typeof loader !== 'function') {
                console.error(`[siteGlob] Expected loader to be a function for ${filePath}, got:`, typeof loader, loader);
                throw new Error(`siteGlob: Expected loader function for ${filePath}`);
            }
            const loaded = await loader();
            // MDX/Astro files have { Content, frontmatter, ... } without .default wrapper
            // YAML/JSON have { default: content }
            // Try both patterns
            result = loaded.default ?? loaded;
        }

        // Apply post-processing if provided
        if (postProcess) {
            result = await postProcess(result);
        }

        // Cache the result (if not in dev mode)
        if (!isDev) {
            globCache.set(cacheKey, result);
            console.log(`Cached ${postProcess ? 'processed ' : ''}glob result for ${type}/${filename} (${siteCode})`);
        }

        return result;
    }

    // Return filtered entries
    const filtered = Object.fromEntries(filteredEntries);

    // Cache the result (if not in dev mode)
    if (!isDev) {
        globCache.set(cacheKey, filtered);
        console.log(`Cached glob result for ${type}/${filename || 'all'} (${siteCode})`);
    }

    // If eager, entries are already loaded, just return them
    if (eager) {
        return filtered;
    }

    // Otherwise return the loader functions
    return filtered;
}

/**
 * Shorthand functions for common glob types
 * All support generic type parameters for type safety
 *
 * @example
 * interface MyConfig { name: string; version: number; }
 * const config = await getSiteYaml<MyConfig>('hiivelabs.com', 'site.yaml');
 * // config.name is typed as string, config.version as number
 */
// export const getSiteJson = <T = any>(siteCode: string, filename: string) =>
//     siteGlob<T>({ siteCode, type: 'json', filename });

// getSiteYaml removed - use inline import.meta.glob in getSiteConfig instead to avoid config-time issues

// getSiteCss removed - use getSiteCustomCSS for custom.css

// export const getSitePages = <T = any>(siteCode: string) =>
//     siteGlob<T>({ siteCode, type: 'pages', eager: true });

// export const getSitePosts = <T = any>(siteCode: string) =>
//     siteGlob<T>({ siteCode, type: 'posts', eager: true });

// export const getSiteMedia = <T = any>(siteCode: string, excludeExtensions: string[] = []) =>
//     siteGlob<T>({ siteCode, type: 'media', eager: false, excludeExtensions });

/**
 * Get and process custom.css for a site with Tailwind and cssnano
 * This helper ensures only custom.css is globbed, preventing Vite from processing all CSS files
 */
// export const getSiteCustomCSS = async (siteCode: string, postProcess?: (css: any) => Promise<any> | any) =>
//     siteGlob<string>({
//         siteCode,
//         type: 'customcss',
//         filename: 'custom.css',
//         postProcess
//     });
