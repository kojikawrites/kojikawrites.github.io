/**
 * Background Image Filters API
 *
 * Manages CSS filter generation for background images.
 * Automatically detects image variables (url(...)) and their corresponding filter variables.
 *
 * POST /api/background-filters - Update background image filters
 *
 * DEV MODE ONLY - Not available in production builds.
 */
import type { APIRoute } from 'astro';
import fs from 'fs/promises';
import path from 'path';
import { getSiteCode } from '../../../lib/config/getSiteCode';

// the following line will be automatically commented out
// by the build process for production builds.
export const prerender = false; // ![DEV-ONLY]

interface BackgroundFilterUpdate {
    variableName: string;  // e.g., "background-image"
    lightFilter: string;   // CSS filter string or "none"
    darkFilter: string;    // CSS filter string or "none"
}

interface BackgroundFilterRequest {
    filters: BackgroundFilterUpdate[];
}

interface BackgroundFilterResponse {
    success: boolean;
    error?: string;
}

// Get the path to colors.css
const getColorsPath = (): string => {
    const siteCode = getSiteCode();
    return path.join(process.cwd(), 'src', '.sites', siteCode, 'styles', 'colors.css');
};

// Check if a value is a url() pattern
const isUrlValue = (value: string): boolean => {
    return /^url\(['"]?[^'"]+['"]?\)$/.test(value.trim());
};

// Extract image path from url() notation
const extractImagePath = (urlString: string): string | null => {
    const match = urlString.match(/url\(['"]?([^'"]+)['"]?\)/);
    return match ? match[1] : null;
};

// Check if an image file exists
const imageExists = async (imagePath: string): Promise<boolean> => {
    try {
        // Convert /src/ path to file system path
        const fsPath = imagePath.replace(/^\/src\//, path.join(process.cwd(), 'src') + '/');
        await fs.access(fsPath);
        return true;
    } catch {
        return false;
    }
};

// Extract all CSS variables from a section
const extractVariables = (section: string): Map<string, string> => {
    const vars = new Map<string, string>();
    const varRegex = /--([\w-]+):\s*([^;]+);/g;
    let match;
    while ((match = varRegex.exec(section)) !== null) {
        const [, name, value] = match;
        vars.set(name, value.trim());
    }
    return vars;
};

export const POST: APIRoute = async ({ request }) => {
    if (import.meta.env.PROD) {
        return new Response(JSON.stringify({ success: false, error: 'Not available in production' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const { filters } = await request.json() as BackgroundFilterRequest;

        if (!filters || !Array.isArray(filters)) {
            return new Response(JSON.stringify({ success: false, error: 'Invalid filters data' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const colorsPath = getColorsPath();
        let css = await fs.readFile(colorsPath, 'utf-8');

        // Update filters in both :root and :root.theme-dark sections
        for (const filter of filters) {
            const filterVarName = `${filter.variableName}-filter`;

            // Update light theme (:root section)
            const rootMatch = css.match(/(:root\s*\{)([^}]+)(\})/);
            if (rootMatch) {
                // Check if filter variable already exists in this section
                const filterRegex = new RegExp(`--${filterVarName}:\\s*[^;]+;`);

                if (filterRegex.test(rootMatch[2])) {
                    // Update existing filter
                    const updatedRoot = rootMatch[2].replace(
                        new RegExp(`(--${filterVarName}:\\s*)([^;]+)(;)`),
                        `$1${filter.lightFilter}$3`
                    );
                    css = css.replace(rootMatch[0], `${rootMatch[1]}${updatedRoot}${rootMatch[3]}`);
                } else {
                    // Create new filter variable after the image variable
                    const imageRegex = new RegExp(`(--${filter.variableName}:\\s*[^;]+;)`);
                    const updatedRoot = rootMatch[2].replace(
                        imageRegex,
                        `$1\n        /* Background Image Filter: CSS filter to tint background pattern to match theme colors (background layer, color harmony) */\n        --${filterVarName}: ${filter.lightFilter};`
                    );
                    css = css.replace(rootMatch[0], `${rootMatch[1]}${updatedRoot}${rootMatch[3]}`);
                }
            }

            // Update dark theme (:root.theme-dark section)
            const darkMatch = css.match(/(:root\.theme-dark\s*\{)([^}]+)(\})/);
            if (darkMatch) {
                // Check if filter variable already exists in this section
                const filterRegex = new RegExp(`--${filterVarName}:\\s*[^;]+;`);

                if (filterRegex.test(darkMatch[2])) {
                    // Update existing filter
                    const updatedDark = darkMatch[2].replace(
                        new RegExp(`(--${filterVarName}:\\s*)([^;]+)(;)`),
                        `$1${filter.darkFilter}$3`
                    );
                    css = css.replace(darkMatch[0], `${darkMatch[1]}${updatedDark}${darkMatch[3]}`);
                } else {
                    // Create new filter variable after the image variable
                    const imageRegex = new RegExp(`(--${filter.variableName}:\\s*[^;]+;)`);
                    const updatedDark = darkMatch[2].replace(
                        imageRegex,
                        `$1\n        --${filterVarName}: ${filter.darkFilter};`
                    );
                    css = css.replace(darkMatch[0], `${darkMatch[1]}${updatedDark}${darkMatch[3]}`);
                }
            }
        }

        await fs.writeFile(colorsPath, css, 'utf-8');

        return new Response(JSON.stringify({ success: true } as BackgroundFilterResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        console.error('[background-filters API] Write error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message } as BackgroundFilterResponse), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

/**
 * GET endpoint to discover all background image variables and their filters
 */
export const GET: APIRoute = async () => {
    if (import.meta.env.PROD) {
        return new Response(JSON.stringify({ success: false, error: 'Not available in production' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const colorsPath = getColorsPath();
        const css = await fs.readFile(colorsPath, 'utf-8');

        // Extract variables from both sections
        const rootMatch = css.match(/:root\s*\{([^}]+)\}/);
        const darkMatch = css.match(/:root\.theme-dark\s*\{([^}]+)\}/);

        const lightVars = rootMatch ? extractVariables(rootMatch[1]) : new Map();
        const darkVars = darkMatch ? extractVariables(darkMatch[1]) : new Map();

        // Find all image variables (url(...) values)
        const imageVars: Array<{
            name: string;
            lightImage: string;
            darkImage: string;
            lightFilter: string;
            darkFilter: string;
            lightImageExists: boolean;
            darkImageExists: boolean;
        }> = [];

        for (const [name, value] of lightVars) {
            if (isUrlValue(value)) {
                const lightImagePath = extractImagePath(value);
                const darkValue = darkVars.get(name) || value;
                const darkImagePath = extractImagePath(darkValue);

                const filterName = `${name}-filter`;
                const lightFilter = lightVars.get(filterName) || 'none';
                const darkFilter = darkVars.get(filterName) || lightFilter;

                imageVars.push({
                    name,
                    lightImage: value,
                    darkImage: darkValue,
                    lightFilter,
                    darkFilter,
                    lightImageExists: lightImagePath ? await imageExists(lightImagePath) : false,
                    darkImageExists: darkImagePath ? await imageExists(darkImagePath) : false
                });
            }
        }

        return new Response(JSON.stringify({ success: true, imageVars }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        console.error('[background-filters API] Read error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};