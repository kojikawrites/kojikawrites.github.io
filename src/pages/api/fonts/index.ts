/**
 * Fonts API - Read and write font family configuration
 *
 * GET /api/fonts - Read current font variables and available fonts
 * POST /api/fonts - Save font variable changes to colors.css
 *
 * DEV MODE ONLY - Not available in production builds.
 */
import type { APIRoute } from 'astro';
import fs from 'fs/promises';
import path from 'path';
import { getSiteCode } from '../../../lib/config/getSiteCode';

// Dev-only route: runs on-demand in dev; excludeDevPages forces it to
// prerender in production builds and deletes its output from dist.
export const prerender = false;

interface FontValue {
    name: string;           // CSS variable name without -- prefix, e.g., "font-family-serif"
    value: string;          // Full value, e.g., "Merriweather, serif"
    displayName: string;    // Human-readable name
    description: string;    // What this font is used for
}

interface AvailableFont {
    name: string;           // Font family name, e.g., "Fira Sans"
    type: 'serif' | 'sans-serif' | 'monospace';  // Font category
    builtin?: boolean;      // True for system/web-safe fonts
}

// Web-safe/system fonts available on virtually all systems
const BUILTIN_FONTS: AvailableFont[] = [
    // Serif fonts
    { name: 'Georgia', type: 'serif', builtin: true },
    { name: 'Times New Roman', type: 'serif', builtin: true },
    { name: 'Palatino Linotype', type: 'serif', builtin: true },
    { name: 'Book Antiqua', type: 'serif', builtin: true },

    // Sans-serif fonts
    { name: 'Arial', type: 'sans-serif', builtin: true },
    { name: 'Helvetica', type: 'sans-serif', builtin: true },
    { name: 'Verdana', type: 'sans-serif', builtin: true },
    { name: 'Tahoma', type: 'sans-serif', builtin: true },
    { name: 'Trebuchet MS', type: 'sans-serif', builtin: true },
    { name: 'Geneva', type: 'sans-serif', builtin: true },

    // Monospace fonts
    { name: 'Courier New', type: 'monospace', builtin: true },
    { name: 'Lucida Console', type: 'monospace', builtin: true },
    { name: 'Monaco', type: 'monospace', builtin: true },
    { name: 'Consolas', type: 'monospace', builtin: true },
];

interface FontsResponse {
    success: boolean;
    fonts?: FontValue[];
    availableFonts?: AvailableFont[];
    error?: string;
}

// Font variable metadata - defines which variables are editable and their display info
const FONT_VARIABLE_METADATA: Record<string, { displayName: string; description: string; fallback: string }> = {
    'font-family-serif': {
        displayName: 'Serif Font',
        description: 'Body text and paragraphs',
        fallback: 'serif'
    },
    'font-family-sans': {
        displayName: 'Sans-Serif Font',
        description: 'Headings and UI elements',
        fallback: 'sans-serif'
    },
    'font-family-sans-alt': {
        displayName: 'Sans-Serif Alt',
        description: 'Accent text, tags, and categories',
        fallback: 'sans-serif'
    },
    'font-family-monospace': {
        displayName: 'Monospace Font',
        description: 'Code blocks and pre-formatted text',
        fallback: 'monospace'
    }
};

// Get the path to colors.css
const getColorsPath = (): string => {
    const siteCode = getSiteCode();
    return path.join(process.cwd(), 'src', '.sites', siteCode, 'styles', 'colors.css');
};

// Get the path to fonts.css (shared across all sites)
const getFontsPath = (): string => {
    return path.join(process.cwd(), 'src', 'styles', 'fonts.css');
};

/**
 * Parse font variables from colors.css
 * Only parses from :root section (fonts are theme-independent)
 */
const parseFontVariables = (css: string): Map<string, string> => {
    const fontVars = new Map<string, string>();

    // Extract :root section
    const rootMatch = css.match(/:root\s*\{([^}]+)\}/);
    if (!rootMatch) return fontVars;

    const rootContent = rootMatch[1];

    // Match font-family variables (only the ones we want to edit)
    for (const varName of Object.keys(FONT_VARIABLE_METADATA)) {
        const regex = new RegExp(`--${varName}:\\s*([^;]+);`);
        const match = rootContent.match(regex);
        if (match) {
            fontVars.set(varName, match[1].trim());
        }
    }

    return fontVars;
};

/**
 * Scan fonts.css for available font families
 * Extracts unique font-family names from @font-face declarations
 */
const scanAvailableFonts = async (): Promise<AvailableFont[]> => {
    const fontsPath = getFontsPath();
    const fontsCss = await fs.readFile(fontsPath, 'utf-8');

    // Extract font-family names from @font-face declarations
    const fontFaceRegex = /font-family:\s*['"]?([^'";]+)['"]?\s*;/g;
    const fontNames = new Set<string>();

    let match;
    while ((match = fontFaceRegex.exec(fontsCss)) !== null) {
        fontNames.add(match[1].trim());
    }

    // Determine font type based on common patterns and the CSS helper classes at the end
    const fonts: AvailableFont[] = [];
    for (const name of fontNames) {
        // Check for type hints in the CSS
        // Look for font-family: "FontName", serif/sans-serif patterns
        const typeRegex = new RegExp(`font-family:\\s*["']?${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']?,\\s*(serif|sans-serif|monospace)`, 'i');
        const typeMatch = fontsCss.match(typeRegex);

        let type: 'serif' | 'sans-serif' | 'monospace' = 'sans-serif';
        if (typeMatch) {
            const detectedType = typeMatch[1].toLowerCase();
            if (detectedType === 'serif') type = 'serif';
            else if (detectedType === 'monospace') type = 'monospace';
            else type = 'sans-serif';
        } else {
            // Fallback heuristics based on font name
            const lowerName = name.toLowerCase();
            if (lowerName.includes('merriweather') || lowerName.includes('georgia') || lowerName.includes('times')) {
                type = 'serif';
            } else if (lowerName.includes('mono') || lowerName.includes('code') || lowerName.includes('courier')) {
                type = 'monospace';
            }
        }

        fonts.push({ name, type });
    }

    // Sort alphabetically
    fonts.sort((a, b) => a.name.localeCompare(b.name));

    return fonts;
};

/**
 * Extract the primary font name from a CSS font-family value
 * e.g., "'Fira Sans', sans-serif" -> "Fira Sans"
 */
const extractPrimaryFont = (value: string): string => {
    // Remove quotes and get the first font in the stack
    const fonts = value.split(',').map(f => f.trim().replace(/^['"]|['"]$/g, ''));
    return fonts[0] || value;
};

/**
 * Build a font-family CSS value with proper fallback
 */
const buildFontValue = (fontName: string, fallback: string): string => {
    // Handle special case for system monospace stack
    if (fontName === 'System Default' && fallback === 'monospace') {
        return 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    }

    // Quote font names with spaces
    const quotedName = fontName.includes(' ') ? `'${fontName}'` : fontName;
    return `${quotedName}, ${fallback}`;
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
        const fontVars = parseFontVariables(css);

        // Build font values with metadata
        const fonts: FontValue[] = [];
        for (const [name, meta] of Object.entries(FONT_VARIABLE_METADATA)) {
            const value = fontVars.get(name) || buildFontValue('', meta.fallback);
            fonts.push({
                name,
                value,
                displayName: meta.displayName,
                description: meta.description
            });
        }

        // Scan available fonts from fonts.css (bundled fonts)
        const bundledFonts = await scanAvailableFonts();

        // Add "System Default" option for monospace
        const systemDefault: AvailableFont = {
            name: 'System Default',
            type: 'monospace',
            builtin: true
        };

        // Combine: bundled fonts first, then builtin/system fonts, then System Default for monospace
        const availableFonts: AvailableFont[] = [
            ...bundledFonts,
            ...BUILTIN_FONTS,
            systemDefault
        ];

        return new Response(JSON.stringify({
            success: true,
            fonts,
            availableFonts
        } as FontsResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        console.error('[fonts API] Read error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message } as FontsResponse), {
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
        const { fonts } = await request.json() as { fonts: FontValue[] };

        if (!fonts || !Array.isArray(fonts)) {
            return new Response(JSON.stringify({ success: false, error: 'Invalid fonts data' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate font names
        for (const font of fonts) {
            if (!FONT_VARIABLE_METADATA[font.name]) {
                return new Response(JSON.stringify({
                    success: false,
                    error: `Unknown font variable: ${font.name}`
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        const colorsPath = getColorsPath();
        let css = await fs.readFile(colorsPath, 'utf-8');

        // Update each font variable in the :root section
        const rootMatch = css.match(/(:root\s*\{)([^}]+)(\})/);
        if (!rootMatch) {
            return new Response(JSON.stringify({ success: false, error: 'Could not find :root section in colors.css' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        let rootContent = rootMatch[2];

        for (const font of fonts) {
            const regex = new RegExp(`(--${font.name}:\\s*)([^;]+)(;)`);
            rootContent = rootContent.replace(regex, `$1${font.value}$3`);
        }

        css = css.replace(rootMatch[0], `${rootMatch[1]}${rootContent}${rootMatch[3]}`);

        await fs.writeFile(colorsPath, css, 'utf-8');

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        console.error('[fonts API] Write error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};