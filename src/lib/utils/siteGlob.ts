/**
 * Universal site-aware glob utility
 * Handles all glob operations with automatic site code filtering
 */

export type GlobType = 'json' | 'yaml' | 'css' | 'pages' | 'posts' | 'media' | 'components' | 'custom';

export interface SiteGlobOptions {
    /** The site code to filter by */
    siteCode: string;
    /** Type of files to glob (determines pattern) */
    type: GlobType;
    /** Custom glob pattern (overrides type-based pattern) */
    customPattern?: string;
    /** Custom glob patterns array (for multiple paths like media) */
    customPatterns?: string[];
    /** Eagerly load all matching files */
    eager?: boolean;
    /** Additional filter function */
    filter?: (path: string) => boolean;
    /** Specific filename to match (for single-file lookups) */
    filename?: string;
    /** File extensions to exclude (e.g., ['.mp4', '.avi']) */
    excludeExtensions?: string[];
}

/**
 * Get the glob pattern(s) for a given type
 */
function getPatternForType(type: GlobType): string | string[] {
    const patterns: Record<GlobType, string | string[]> = {
        json: '/src/.sites/**/state/*.json',
        yaml: '/src/.sites/**/config/*.yaml',
        css: '/src/.sites/**/styles/*.css',
        pages: '/src/.sites/**/content/pagecontent/**/*.{md,mdx,astro}',
        posts: '/src/.sites/**/content/posts/**/*.{md,mdx}',
        // Media includes both shared assets and site-specific assets
        media: [
            '/src/assets/**/*.{jpeg,jpg,png,gif,svg,webp,mp4}',
            '/src/.sites/**/*.{jpeg,jpg,png,gif,svg,webp,mp4}'
        ],
        components: '/src/.sites/*/components/*.astro',
        custom: '' // Must provide customPattern or customPatterns
    };
    return patterns[type] || '';
}

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
 * // Get all pages for a site
 * const pages = await siteGlob({
 *   siteCode: 'hiivelabs.com',
 *   type: 'pages',
 *   eager: true
 * });
 */
export async function siteGlob(options: SiteGlobOptions): Promise<any> {
    const { siteCode, type, customPattern, customPatterns, eager = false, filter, filename, excludeExtensions = [] } = options;

    // Get the glob pattern(s)
    let pattern: string | string[];
    if (customPattern) {
        pattern = customPattern;
    } else if (customPatterns) {
        pattern = customPatterns;
    } else {
        pattern = getPatternForType(type);
    }

    if (!pattern || (Array.isArray(pattern) && pattern.length === 0)) {
        throw new Error(`No pattern found for type '${type}'. Provide a customPattern or customPatterns.`);
    }

    // Perform the glob - eager must be a literal boolean, not a variable
    // Handle all combinations: string/array × eager/lazy
    const globResult = eager
        ? import.meta.glob<{ default: any }>(pattern, { eager: true })
        : import.meta.glob<{ default: any }>(pattern);

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
        const [, loader] = filteredEntries[0];
        if (eager) {
            return (loader as any).default;
        }
        const result = await (loader as Function)();
        return result.default;
    }

    // Return filtered entries
    const filtered = Object.fromEntries(filteredEntries);

    // If eager, entries are already loaded, just return them
    if (eager) {
        return filtered;
    }

    // Otherwise return the loader functions
    return filtered;
}

/**
 * Shorthand functions for common glob types
 */
export const getSiteJson = (siteCode: string, filename: string) =>
    siteGlob({ siteCode, type: 'json', filename });

export const getSiteYaml = (siteCode: string, filename: string) =>
    siteGlob({ siteCode, type: 'yaml', filename });

export const getSiteCss = (siteCode: string, filename: string) =>
    siteGlob({ siteCode, type: 'css', filename });

export const getSitePages = (siteCode: string) =>
    siteGlob({ siteCode, type: 'pages', eager: true });

export const getSitePosts = (siteCode: string) =>
    siteGlob({ siteCode, type: 'posts', eager: true });

export const getSiteMedia = (siteCode: string, excludeExtensions: string[] = []) =>
    siteGlob({ siteCode, type: 'media', eager: false, excludeExtensions });
