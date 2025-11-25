/**
 * Colors API - Read and write site color configuration
 *
 * GET /api/colors - Read current colors from colors.css
 * POST /api/colors - Save colors to colors.css
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

interface ColorValue {
    name: string;
    light: string;  // RGB format e.g. "238 238 238" or "0 0 0 / 0.125"
    dark: string;
    themeIndependent?: boolean;  // true if only defined in one theme (same for both)
    displayName?: string;  // User-friendly name from comment e.g. "Main Body Background"
    purpose?: string;  // Full comment string e.g. "Main Body Background: base color of entire page body (background layer, primary canvas)"
}

interface ColorsResponse {
    success: boolean;
    colors?: ColorValue[];
    error?: string;
}

/**
 * Color format detection and parsing
 * Supports both old and new formats:
 * - Old: "238 238 238" or "0 0 0 32" (space-separated, alpha 0-255)
 * - New: "238 238 238" or "0 0 0 / 0.125" (space-separated, slash alpha 0-1)
 */

// Detect if value is old format (space-separated with optional 4th number for alpha 0-255)
const isOldFormat = (value: string): boolean => {
    return /^\d{1,3}\s+\d{1,3}\s+\d{1,3}\s+\d{1,3}$/.test(value.trim());
};

// Detect if value is new format (space-separated with optional slash alpha)
const isNewFormat = (value: string): boolean => {
    // "238 238 238" or "0 0 0 / 0.125"
    return /^\d{1,3}\s+\d{1,3}\s+\d{1,3}(?:\s*\/\s*[\d.]+)?$/.test(value.trim());
};

// Parse RGB values from CSS - accepts both old and new formats
const parseRgbValues = (value: string): string | null => {
    const trimmed = value.trim();
    if (isOldFormat(trimmed) || isNewFormat(trimmed)) {
        return trimmed;
    }
    return null;
};

// Convert old format to normalized format
// Uses space-separated RGB with optional "/ alpha" suffix (CSS Colors Level 4)
// "238 238 238" -> "238 238 238" (no alpha for opaque)
// "0 0 0 32" -> "0 0 0 / 0.125" (alpha converted from 0-255 to 0-1, using slash syntax)
const convertOldToNewFormat = (value: string): string => {
    if (!isOldFormat(value)) return value;
    const parts = value.trim().split(/\s+/).map(n => parseInt(n, 10));
    if (parts.length === 3) {
        return `${parts[0]} ${parts[1]} ${parts[2]}`;
    } else if (parts.length === 4) {
        const alpha = Math.round((parts[3] / 255) * 1000) / 1000; // Convert 0-255 to 0-1, 3 decimal places
        return `${parts[0]} ${parts[1]} ${parts[2]} / ${alpha}`;
    }
    return value;
};

// Normalize a color value to the new format (for loading)
const normalizeColorForLoad = (value: string): string => {
    if (isOldFormat(value)) {
        return convertOldToNewFormat(value);
    }
    return value;
};

// Parse comment metadata for a CSS variable
// Format: /* Display Name: description (layer info) */
const parseCommentMetadata = (comment: string): { displayName?: string; purpose?: string } => {
    // Extract content between /* and */
    const contentMatch = comment.match(/\/\*\s*(.+?)\s*\*\//);
    if (!contentMatch) return {};

    const content = contentMatch[1];
    // Split on first colon to get "Display Name: description"
    const colonIndex = content.indexOf(':');
    if (colonIndex === -1) return { purpose: content };

    const displayName = content.substring(0, colonIndex).trim();

    return { displayName, purpose: content };
};

// Extract color variables from CSS content with their comment metadata
const parseColors = (css: string): {
    lightColors: Map<string, string>,
    darkColors: Map<string, string>,
    metadata: Map<string, { displayName?: string; purpose?: string }>
} => {
    const lightColors = new Map<string, string>();
    const darkColors = new Map<string, string>();
    const metadata = new Map<string, { displayName?: string; purpose?: string }>();

    // Split into light (:root) and dark (:root.theme-dark) sections
    const rootMatch = css.match(/:root\s*\{([^}]+)\}/);
    const darkMatch = css.match(/:root\.theme-dark\s*\{([^}]+)\}/);

    const extractColors = (section: string, map: Map<string, string>) => {
        // Match comment followed by variable declaration
        // Regex: optional whitespace, comment, optional whitespace, variable
        const commentedVarRegex = /(?:\/\*[^*]*\*\/\s*)?(--[\w-]+):\s*([^;]+);/g;
        let match;
        let lastComment = '';

        // Split section into lines to track comments
        const lines = section.split('\n');
        for (const line of lines) {
            // Check if line is a comment
            const commentMatch = line.match(/\/\*(.+?)\*\//);
            if (commentMatch) {
                lastComment = line.trim();
                continue;
            }

            // Check if line is a variable declaration
            const varMatch = line.match(/--([\w-]+):\s*([^;]+);/);
            if (varMatch) {
                const [, name, value] = varMatch;
                const trimmedValue = value.trim();
                // Only include color values (RGB triplets/quadruplets), skip urls, fonts, and filters
                if (parseRgbValues(trimmedValue)) {
                    map.set(name, trimmedValue);

                    // If there was a comment on the previous line, parse it
                    if (lastComment && !metadata.has(name)) {
                        const meta = parseCommentMetadata(lastComment);
                        if (meta.displayName || meta.purpose) {
                            metadata.set(name, meta);
                        }
                    }
                }
                lastComment = ''; // Reset after processing
            }
        }
    };

    if (rootMatch) extractColors(rootMatch[1], lightColors);
    if (darkMatch) extractColors(darkMatch[1], darkColors);

    return { lightColors, darkColors, metadata };
};

// Get the path to colors.css
const getColorsPath = (): string => {
    const siteCode = getSiteCode();
    return path.join(process.cwd(), 'src', '.sites', siteCode, 'styles', 'colors.css');
};

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
        const { lightColors, darkColors, metadata } = parseColors(css);

        // Merge into a single list with both light and dark values
        // Preserve the order from the :root section (lightColors is a Map which preserves insertion order)
        const colors: ColorValue[] = [];
        const processedNames = new Set<string>();

        // First, iterate through light colors in file order
        for (const [name, light] of lightColors) {
            const dark = darkColors.get(name);
            // Check if color is only defined in one theme (theme-independent)
            const themeIndependent = !dark;
            // Normalize to new format (space-separated, slash alpha)
            const normalizedLight = normalizeColorForLoad(light);
            const normalizedDark = normalizeColorForLoad(dark || light);
            // Get metadata if available
            const meta = metadata.get(name);
            colors.push({
                name,
                light: normalizedLight,
                dark: normalizedDark,
                themeIndependent,
                displayName: meta?.displayName,
                purpose: meta?.purpose
            });
            processedNames.add(name);
        }

        // Then add any dark-only colors (preserving their order)
        for (const [name, dark] of darkColors) {
            if (!processedNames.has(name)) {
                const normalizedDark = normalizeColorForLoad(dark);
                const meta = metadata.get(name);
                colors.push({
                    name,
                    light: normalizedDark,
                    dark: normalizedDark,
                    themeIndependent: true,
                    displayName: meta?.displayName,
                    purpose: meta?.purpose
                });
            }
        }

        return new Response(JSON.stringify({ success: true, colors } as ColorsResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        console.error('[colors API] Read error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message } as ColorsResponse), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

export const POST: APIRoute = async ({ request }) => {
    if (import.meta.env.PROD) {
        return new Response(JSON.stringify({ success: false, error: 'Not available in production' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const { colors } = await request.json() as { colors: ColorValue[] };

        if (!colors || !Array.isArray(colors)) {
            return new Response(JSON.stringify({ success: false, error: 'Invalid colors data' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate all color values
        for (const color of colors) {
            if (!parseRgbValues(color.light) || !parseRgbValues(color.dark)) {
                return new Response(JSON.stringify({
                    success: false,
                    error: `Invalid color format for ${color.name}. Expected RGB values like "238 238 238" or "0 0 0 / 0.5"`
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        const colorsPath = getColorsPath();
        let css = await fs.readFile(colorsPath, 'utf-8');

        // Update each color in the CSS
        for (const color of colors) {
            // Update light theme (:root section)
            const lightRegex = new RegExp(`(--${color.name}:\\s*)([^;]+)(;)`, 'g');

            // We need to be careful to only update in the correct section
            // First, find and update in :root section
            const rootMatch = css.match(/(:root\s*\{)([^}]+)(\})/);
            if (rootMatch) {
                const updatedRoot = rootMatch[2].replace(
                    new RegExp(`(--${color.name}:\\s*)([^;]+)(;)`),
                    `$1${color.light}$3`
                );
                css = css.replace(rootMatch[0], `${rootMatch[1]}${updatedRoot}${rootMatch[3]}`);
            }

            // Then, find and update in :root.theme-dark section
            const darkMatch = css.match(/(:root\.theme-dark\s*\{)([^}]+)(\})/);
            if (darkMatch) {
                const updatedDark = darkMatch[2].replace(
                    new RegExp(`(--${color.name}:\\s*)([^;]+)(;)`),
                    `$1${color.dark}$3`
                );
                css = css.replace(darkMatch[0], `${darkMatch[1]}${updatedDark}${darkMatch[3]}`);
            }
        }

        await fs.writeFile(colorsPath, css, 'utf-8');

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        console.error('[colors API] Write error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};