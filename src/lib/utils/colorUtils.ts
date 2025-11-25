/**
 * Color Utilities
 *
 * Shared color parsing and manipulation functions used across the application.
 */

/**
 * Parse RGB string to { r, g, b, a? } where alpha is 0-1
 *
 * Supports multiple formats:
 * - Space-separated with slash alpha (CSS Colors Level 4): "238 238 238" or "0 0 0 / 0.125"
 * - Legacy space-separated with 4th number as alpha 0-255: "0 0 0 32"
 * - Comma-separated (fallback): "238, 238, 238" or "0, 0, 0, 0.125"
 *
 * @param rgb - RGB string in various formats
 * @returns Parsed color object or null if invalid
 */
export function parseRgbString(rgb: string): { r: number; g: number; b: number; a?: number } | null {
    const trimmed = rgb.trim();

    // Try space-separated with slash alpha (CSS Colors Level 4): "238 238 238" or "0 0 0 / 0.125"
    const slashMatch = trimmed.match(/^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})(?:\s*\/\s*([\d.]+))?$/);
    if (slashMatch) {
        const r = parseInt(slashMatch[1], 10);
        const g = parseInt(slashMatch[2], 10);
        const b = parseInt(slashMatch[3], 10);
        const a = slashMatch[4] ? parseFloat(slashMatch[4]) : undefined;
        return { r, g, b, a };
    }

    // Try legacy space-separated with 4th number as alpha 0-255: "0 0 0 32"
    const legacyMatch = trimmed.match(/^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})$/);
    if (legacyMatch) {
        const r = parseInt(legacyMatch[1], 10);
        const g = parseInt(legacyMatch[2], 10);
        const b = parseInt(legacyMatch[3], 10);
        const a = parseInt(legacyMatch[4], 10) / 255; // Convert 0-255 to 0-1
        return { r, g, b, a };
    }

    // Try comma-separated (fallback for internal editor state): "238, 238, 238" or "0, 0, 0, 0.125"
    const commaMatch = trimmed.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?$/);
    if (commaMatch) {
        const r = parseInt(commaMatch[1], 10);
        const g = parseInt(commaMatch[2], 10);
        const b = parseInt(commaMatch[3], 10);
        const a = commaMatch[4] ? parseFloat(commaMatch[4]) : undefined;
        return { r, g, b, a };
    }

    return null;
}

/**
 * Convert RGB string to hex "#eeeeee" (ignores alpha)
 *
 * @param rgb - RGB string in various formats
 * @returns Hex color string with # prefix, or "#000000" if invalid
 */
export function rgbToHex(rgb: string): string {
    const parsed = parseRgbString(rgb);
    if (!parsed) return '#000000';
    const { r, g, b } = parsed;
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Convert hex "#eeeeee" to RGB string "238 238 238" (space-separated)
 *
 * @param hex - Hex color string (with or without # prefix)
 * @returns Space-separated RGB string, or "0 0 0" if invalid
 */
export function hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '0 0 0';
    return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`;
}