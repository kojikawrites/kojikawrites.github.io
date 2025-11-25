import { createSignal, createEffect, For, Show, onMount, onCleanup, type Component } from 'solid-js';
import iro from '@jaames/iro';
import { analyzeImage } from '../../lib/client/imageAnalysis';
import { getCachedImageAnalysis, cacheImageAnalysis, calculateColorFilter, getBrightestColor, getDarkestColor } from '../../lib/utils/imageFilterUtils';
import { parseRgbString, rgbToHex, hexToRgb } from '../../lib/utils/colorUtils';

// Local theme toggle component (doesn't persist to localStorage)
const LocalThemeToggle = (props: { onThemeChange?: (isDark: boolean) => void }) => {
    const [isDark, setIsDark] = createSignal(
        typeof document !== 'undefined' && document.documentElement.classList.contains('theme-dark')
    );

    const toggleTheme = (dark: boolean) => {
        setIsDark(dark);
        if (dark) {
            document.documentElement.classList.add('theme-dark');
        } else {
            document.documentElement.classList.remove('theme-dark');
        }
        props.onThemeChange?.(dark);
    };

    const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"/></svg>`;
    const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>`;

    return (
        <div class="theme-toggle">
            <label class={!isDark() ? 'checked' : ''}>
                <span innerHTML={sunIcon} />
                <input
                    type="radio"
                    name="local-theme-toggle"
                    checked={!isDark()}
                    value="light"
                    title="Use light theme"
                    aria-label="Use light theme"
                    onChange={() => toggleTheme(false)}
                />
            </label>
            <label class={isDark() ? 'checked' : ''}>
                <span innerHTML={moonIcon} />
                <input
                    type="radio"
                    name="local-theme-toggle"
                    checked={isDark()}
                    value="dark"
                    title="Use dark theme"
                    aria-label="Use dark theme"
                    onChange={() => toggleTheme(true)}
                />
            </label>
        </div>
    );
};

interface ColorValue {
    name: string;
    light: string;
    dark: string;
    themeIndependent?: boolean;  // true if only defined in one theme (same for both)
    displayName?: string;  // User-friendly name from comment e.g. "Main Body Background"
    purpose?: string;  // Full comment string for LLM context
}

/**
 * Color format utilities
 * Format: "238 238 238" or "0 0 0 / 0.125" (space-separated RGB, optional slash + decimal alpha)
 * Legacy format: "0 0 0 32" (space-separated, alpha 0-255) - supported for reading
 */

// Check if value has alpha
const hasAlpha = (rgb: string): boolean => {
    const parsed = parseRgbString(rgb);
    return parsed?.a !== undefined && parsed.a !== 1;
};

// Preserve alpha from original color when applying new RGB values
// This ensures structural alpha (for overlays, tables, etc.) is maintained
const preserveAlpha = (newColor: string, originalColor: string): string => {
    const original = parseRgbString(originalColor);
    const newRgb = parseRgbString(newColor);

    if (!original || !newRgb) return newColor;

    // If original had alpha, apply it to the new color
    if (original.a !== undefined && original.a !== 1) {
        return `${newRgb.r} ${newRgb.g} ${newRgb.b} / ${original.a}`;
    }

    // Otherwise return new color without alpha
    return `${newRgb.r} ${newRgb.g} ${newRgb.b}`;
};

// Convert RGB to HSL
const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return [h, s, l];
};

// Convert HSL to RGB
const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

// Calculate inverse lightness color (same hue/saturation, inverted lightness)
// Outputs space-separated format with slash for alpha
const getInverseLightnessColor = (rgbString: string): string => {
    const parsed = parseRgbString(rgbString);
    if (!parsed) return rgbString;

    const { r, g, b, a } = parsed;

    const [h, s, l] = rgbToHsl(r, g, b);
    const invertedL = 1 - l;
    const [newR, newG, newB] = hslToRgb(h, s, invertedL);

    if (a !== undefined && a !== 1) {
        return `${newR} ${newG} ${newB} / ${a}`;
    }
    return `${newR} ${newG} ${newB}`;
};

// Calculate inverse hue color (hue rotated 180 degrees, same saturation/lightness)
const getInverseHueColor = (rgbString: string): string => {
    const parsed = parseRgbString(rgbString);
    if (!parsed) return rgbString;

    const { r, g, b, a } = parsed;

    const [h, s, l] = rgbToHsl(r, g, b);
    const invertedH = (h + 0.5) % 1; // Rotate hue by 180 degrees
    const [newR, newG, newB] = hslToRgb(invertedH, s, l);

    if (a !== undefined && a !== 1) {
        return `${newR} ${newG} ${newB} / ${a}`;
    }
    return `${newR} ${newG} ${newB}`;
};

// Calculate inverse lightness AND hue color (both inverted)
const getInverseBothColor = (rgbString: string): string => {
    const parsed = parseRgbString(rgbString);
    if (!parsed) return rgbString;

    const { r, g, b, a } = parsed;

    const [h, s, l] = rgbToHsl(r, g, b);
    const invertedH = (h + 0.5) % 1; // Rotate hue by 180 degrees
    const invertedL = 1 - l;
    const [newR, newG, newB] = hslToRgb(invertedH, s, invertedL);

    if (a !== undefined && a !== 1) {
        return `${newR} ${newG} ${newB} / ${a}`;
    }
    return `${newR} ${newG} ${newB}`;
};

// Apply color transformation based on sync mode
const applySyncTransform = (rgbString: string, mode: SyncMode): string => {
    switch (mode) {
        case 'luminance': return getInverseLightnessColor(rgbString);
        case 'hue': return getInverseHueColor(rgbString);
        case 'both': return getInverseBothColor(rgbString);
        default: return rgbString;
    }
};

// Get alpha value from RGBA string (0-1 scale)
const getAlpha = (rgb: string): number => {
    const parsed = parseRgbString(rgb);
    return parsed?.a ?? 1;
};

// RGBA type for solid-colorful
interface RgbaColor {
    r: number;
    g: number;
    b: number;
    a: number;
}

// Convert RGB string to RgbaColor object (supports both formats)
const rgbStringToRgba = (rgb: string | undefined | null): RgbaColor => {
    if (!rgb || typeof rgb !== 'string') return { r: 128, g: 128, b: 128, a: 1 };
    const parsed = parseRgbString(rgb);
    if (!parsed) return { r: 128, g: 128, b: 128, a: 1 };
    return { r: parsed.r, g: parsed.g, b: parsed.b, a: parsed.a ?? 1 };
};

// Convert RgbaColor object to RGB string (space-separated: "238 238 238" or "0 0 0 / 0.5")
const rgbaToRgbString = (rgba: RgbaColor): string => {
    if (rgba.a === 1) {
        return `${rgba.r} ${rgba.g} ${rgba.b}`;
    }
    // Round alpha to 3 decimal places
    const alpha = Math.round(rgba.a * 1000) / 1000;
    return `${rgba.r} ${rgba.g} ${rgba.b} / ${alpha}`;
};

// Normalize color for saving (space-separated, no alpha for opaque, slash alpha otherwise)
const normalizeColorForSave = (rgb: string): string => {
    const parsed = parseRgbString(rgb);
    if (!parsed) return rgb;

    const { r, g, b, a } = parsed;
    // Only include alpha if not 1 (fully opaque)
    if (a !== undefined && a !== 1) {
        const alpha = Math.round(a * 1000) / 1000;
        return `${r} ${g} ${b} / ${alpha}`;
    }
    return `${r} ${g} ${b}`;
};

// Calculate relative luminance (0 = darkest, 1 = brightest)
// Using the standard formula: https://www.w3.org/TR/WCAG20/#relativeluminancedef
const getLuminance = (rgb: string): number => {
    const parsed = parseRgbString(rgb);
    if (!parsed) return 0;

    const { r, g, b } = parsed;
    const [rL, gL, bL] = [r, g, b].map(c => {
        const sRGB = c / 255;
        return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
};

// Format color name for display
const formatName = (name: string): string => {
    return name
        .replace(/^--/, '')
        .replace(/-/g, ' ')
        .replace(/\bBg\b/gi, 'Background')
        .replace(/\b\w/g, c => c.toUpperCase());
};

// Color component values for the four input boxes
interface ColorComponents {
    c1: number;  // R or H
    c2: number;  // G or S
    c3: number;  // B or L
    c4: number;  // Alpha (0-255)
}

// Convert internal RGB string to component values based on selected format
// All values are 0-255 (including alpha which is stored as 0-1 internally but displayed as 0-255)
const rgbStringToComponents = (rgb: string, format: 'hex' | 'rgb' | 'hsl'): ColorComponents => {
    const parsed = parseRgbString(rgb);
    if (!parsed) return { c1: 0, c2: 0, c3: 0, c4: 255 };
    const { r, g, b, a } = parsed;
    const alpha255 = Math.round((a ?? 1) * 255);

    switch (format) {
        case 'hex':
        case 'rgb':
            return { c1: r, c2: g, c3: b, c4: alpha255 };
        case 'hsl': {
            const [h, s, l] = rgbToHsl(r, g, b);
            return {
                c1: Math.round(h * 360),  // Hue 0-360
                c2: Math.round(s * 100),  // Saturation 0-100
                c3: Math.round(l * 100),  // Lightness 0-100
                c4: alpha255
            };
        }
    }
};

// Convert component values back to internal RGB string
const componentsToRgbString = (components: ColorComponents, format: 'hex' | 'rgb' | 'hsl'): string => {
    const { c1, c2, c3, c4 } = components;
    const alpha = c4 / 255;

    let r: number, g: number, b: number;

    switch (format) {
        case 'hex':
        case 'rgb':
            r = Math.max(0, Math.min(255, c1));
            g = Math.max(0, Math.min(255, c2));
            b = Math.max(0, Math.min(255, c3));
            break;
        case 'hsl': {
            const h = Math.max(0, Math.min(360, c1)) / 360;
            const s = Math.max(0, Math.min(100, c2)) / 100;
            const l = Math.max(0, Math.min(100, c3)) / 100;
            [r, g, b] = hslToRgb(h, s, l);
            break;
        }
    }

    if (alpha !== 1) {
        return `${r} ${g} ${b} / ${Math.round(alpha * 1000) / 1000}`;
    }
    return `${r} ${g} ${b}`;
};

// Get hex string without # prefix from RGB components
const componentsToHexString = (components: ColorComponents): string => {
    const r = Math.max(0, Math.min(255, components.c1));
    const g = Math.max(0, Math.min(255, components.c2));
    const b = Math.max(0, Math.min(255, components.c3));
    const hex = `${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    if (components.c4 !== 255) {
        return hex + components.c4.toString(16).padStart(2, '0');
    }
    return hex;
};

// Parse hex string (without #) to components
const hexStringToComponents = (hex: string): ColorComponents | null => {
    const cleaned = hex.replace(/^#/, '').toLowerCase();
    let r: number, g: number, b: number, a = 255;

    if (cleaned.length === 6) {
        r = parseInt(cleaned.slice(0, 2), 16);
        g = parseInt(cleaned.slice(2, 4), 16);
        b = parseInt(cleaned.slice(4, 6), 16);
    } else if (cleaned.length === 8) {
        r = parseInt(cleaned.slice(0, 2), 16);
        g = parseInt(cleaned.slice(2, 4), 16);
        b = parseInt(cleaned.slice(4, 6), 16);
        a = parseInt(cleaned.slice(6, 8), 16);
    } else if (cleaned.length === 3) {
        r = parseInt(cleaned[0] + cleaned[0], 16);
        g = parseInt(cleaned[1] + cleaned[1], 16);
        b = parseInt(cleaned[2] + cleaned[2], 16);
    } else {
        return null;
    }

    if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) return null;
    return { c1: r, c2: g, c3: b, c4: a };
};

// Parse display format input back to internal RGB string
const parseDisplayFormatToRgb = (input: string): string | null => {
    const trimmed = input.trim().toLowerCase();

    // Try hex format: #rgb, #rrggbb, #rrggbbaa
    if (trimmed.startsWith('#')) {
        let hex = trimmed.slice(1);
        let alpha = 1;

        // Handle short hex (#rgb or #rgba)
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        } else if (hex.length === 4) {
            alpha = parseInt(hex[3] + hex[3], 16) / 255;
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        } else if (hex.length === 8) {
            alpha = parseInt(hex.slice(6), 16) / 255;
            hex = hex.slice(0, 6);
        }

        if (!/^[0-9a-f]{6}$/i.test(hex)) return null;

        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);

        if (alpha !== 1) {
            return `${r} ${g} ${b} / ${Math.round(alpha * 1000) / 1000}`;
        }
        return `${r} ${g} ${b}`;
    }

    // Try rgb/rgba format: rgb(r, g, b) or rgba(r, g, b, a)
    const rgbMatch = trimmed.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?\s*\)$/);
    if (rgbMatch) {
        const r = parseInt(rgbMatch[1], 10);
        const g = parseInt(rgbMatch[2], 10);
        const b = parseInt(rgbMatch[3], 10);
        const a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1;

        if (r > 255 || g > 255 || b > 255) return null;

        if (a !== 1) {
            return `${r} ${g} ${b} / ${Math.round(a * 1000) / 1000}`;
        }
        return `${r} ${g} ${b}`;
    }

    // Try hsl/hsla format: hsl(h, s%, l%) or hsla(h, s%, l%, a)
    const hslMatch = trimmed.match(/^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%(?:\s*,\s*([\d.]+))?\s*\)$/);
    if (hslMatch) {
        const h = parseInt(hslMatch[1], 10) / 360;
        const s = parseInt(hslMatch[2], 10) / 100;
        const l = parseInt(hslMatch[3], 10) / 100;
        const a = hslMatch[4] ? parseFloat(hslMatch[4]) : 1;

        const [r, g, b] = hslToRgb(h, s, l);

        if (a !== 1) {
            return `${r} ${g} ${b} / ${Math.round(a * 1000) / 1000}`;
        }
        return `${r} ${g} ${b}`;
    }

    return null;
};

interface ColorRowProps {
    color: ColorValue;
    onLightChange: (value: string) => void;
    onDarkChange: (value: string) => void;
    syncMode: SyncMode;
    onSyncToggle: () => void;
}

// Apply CSS variable directly for real-time preview (without updating state)
const applyLivePreview = (name: string, value: string) => {
    document.documentElement.style.setProperty(`--${name}`, value);
};

// Simple color swatch that triggers the shared picker
const ColorSwatch = (props: {
    color: string;
    onClick: (e: MouseEvent, element: HTMLElement) => void;
}) => {
    let swatchRef: HTMLDivElement | undefined;

    const swatchStyle = () => {
        const rgba = rgbStringToRgba(props.color);
        return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;
    };

    return (
        <div class="color-swatch-wrapper">
            <div
                ref={swatchRef}
                class="color-swatch"
                style={{ "background-color": swatchStyle() }}
                onClick={(e) => props.onClick(e, swatchRef!)}
                title="Click to edit color"
            />
        </div>
    );
};

// Convert RGB string to iro-compatible format (supports both formats)
const rgbStringToIro = (rgb: string): { r: number; g: number; b: number; a: number } => {
    const parsed = parseRgbString(rgb);
    if (!parsed) return { r: 128, g: 128, b: 128, a: 1 };
    return { r: parsed.r, g: parsed.g, b: parsed.b, a: parsed.a ?? 1 };
};

// Convert iro color to RGB string (space-separated with slash for alpha)
const iroToRgbString = (color: iro.Color): string => {
    const rgba = color.rgba;
    if (rgba.a === 1) {
        return `${rgba.r} ${rgba.g} ${rgba.b}`;
    }
    // Round alpha to 3 decimal places
    const alpha = Math.round(rgba.a * 1000) / 1000;
    return `${rgba.r} ${rgba.g} ${rgba.b} / ${alpha}`;
};

interface ColorRowWithPickerProps extends ColorRowProps {
    colorName: string;
    onOpenPicker: (colorName: string, field: 'light' | 'dark', element: HTMLElement, currentColor: string) => void;
}

const ColorRow = (props: ColorRowWithPickerProps) => {
    const isActive = () => props.syncMode !== 'off';

    return (
        <tr>
            <td class="name-cell" title={props.color.purpose}>
                <span class="color-name">{props.color.displayName || formatName(props.color.name)}</span>
                <code class="color-var">--{props.color.name}</code>
            </td>
            <Show when={props.color.themeIndependent} fallback={[
                    <td class="color-cell dark-bg">
                        <ColorSwatch
                            color={props.color.dark}
                            onClick={(e, el) => props.onOpenPicker(props.colorName, 'dark', el, props.color.dark)}
                        />
                    </td>,
                    <td class="sync-cell">
                        <button
                            class={`sync-toggle-row ${isActive() ? 'active' : ''} sync-mode-${props.syncMode}`}
                            onClick={props.onSyncToggle}
                            title={syncTooltips[props.syncMode]}
                        >
                            <span innerHTML={syncIcons[props.syncMode]} />
                        </button>
                    </td>,
                    <td class="color-cell light-bg">
                        <ColorSwatch
                            color={props.color.light}
                            onClick={(e, el) => props.onOpenPicker(props.colorName, 'light', el, props.color.light)}
                        />
                    </td>
            ]}>
                {/* Theme-independent color: spans all 3 columns */}
                <td class="color-cell merged-bg" colSpan={3}>
                    <ColorSwatch
                        color={props.color.light}
                        onClick={(e, el) => props.onOpenPicker(props.colorName, 'light', el, props.color.light)}
                    />
                </td>
            </Show>
        </tr>
    );
};

export { LocalThemeToggle };

// Sync mode types and icons
type SyncMode = 'off' | 'luminance' | 'hue' | 'both';
const SYNC_MODES: SyncMode[] = ['off', 'luminance', 'hue', 'both'];

// Get next sync mode in cycle
const getNextSyncMode = (current: SyncMode): SyncMode => {
    const currentIndex = SYNC_MODES.indexOf(current);
    return SYNC_MODES[(currentIndex + 1) % SYNC_MODES.length];
};

// Icons for each sync mode - visually distinct
const syncIcons: Record<SyncMode, string> = {
    // Off - unlocked/broken link icon
    off: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>`,
    // Luminance only - L in circle (32x32)
    luminance: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><text x="12" y="17" text-anchor="middle" font-size="14" font-weight="bold" fill="currentColor" stroke="none">L</text></svg>`,
    // Hue only - H in circle (32x32)
    hue: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><text x="12" y="17" text-anchor="middle" font-size="14" font-weight="bold" fill="currentColor" stroke="none">H</text></svg>`,
    // Both - locked icon
    both: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`,
};

// Tooltips for each sync mode
const syncTooltips: Record<SyncMode, string> = {
    off: 'No sync (click for luminance)',
    luminance: 'Inverse luminance (click for hue)',
    hue: 'Inverse hue (click for both)',
    both: 'Inverse luminance & hue (click to disable)',
};

// Preview panel showing how colors are used on the site
// Uses actual site class names - styles come from the global site CSS
const ColorPreview = () => {
    return (
        <div class="color-preview">
            <div class="bg-color-background-body p-4" title="Page background: --background-body">
                <div class="navbar w-full px-2 py-4 flex flex-row rounded-md" title="Navbar: --background-feature">
                    <nav class="flex flex-row items-start" title="Nav links">
                        <a href="#" class="max-w-fit text-nowrap px-2 py-1"
                           title="Nav item: --text-main, --text-secondary (underline hover)">Sample</a>
                        <a href="#" class="selected max-w-fit text-nowrap px-2 py-1"
                           title="Nav item (selected): --primary-color (underline)">Color</a>
                        <a href="#" class="max-w-fit text-nowrap px-2 py-1"
                           title="Nav item: --text-main, --text-secondary (underline hover)">Section</a>
                    </nav>
                </div>
                <header class="bg-color-background-body">
                    <nav class="c-breadcrumbs text-xs mb-4" title="Breadcrumbs">
                        <span class="c-breadcrumbs__link color-primary-color"
                              title="Breadcrumb link: --primary-color">Home</span>
                        <span class="color-text-secondary mx-1"
                              title="Breadcrumb separator: --text-secondary">/</span>
                        <span class="c-breadcrumbs__link color-primary-color"
                              title="Breadcrumb link: --primary-color">Blog</span>
                        <span class="color-text-secondary mx-1"
                              title="Breadcrumb separator: --text-secondary">/</span>
                        <span class="color-secondary-color" title="Breadcrumb current: --secondary-color">Theme Editor Guide</span>
                    </nav>
                </header>
                <div class="post-content bg-color-background-body p-4 mt-4 rounded-md"
                     title="Post content: --background-body">
                    <header>
                        <h1 title="H1 heading: --secondary-color">Color Editor Guide</h1>

                        <div class="flex flex-row preamble">
                            <div class="pr-2">
                                <span class="min-w-fit">
                                    <span>Posted on January 15, 2025</span>
                                </span>
                                <span class="min-w-fit">
                                    <span>&nbsp;by Admin, </span>
                                    <span class="pr-1">about:</span>
                                </span>
                            </div>
                            <a href="#" class="category text-nowrap"
                               title="Category button: --category-background-color (bg), --tag-category-border-color (border), --primary-color-contrast (text)">Tutorial</a>
                        </div>

                        <div class="flex flex-row preamble">
                            <div class="pr-2">Tags:</div>
                            <div class="flex flex-row flex-wrap">
                                <a href="#" class="tag text-nowrap"
                                   title="Tag button: --tag-background-color (bg), --tag-category-border-color (border), --primary-color-contrast (text)">colors</a>
                                <a href="#" class="tag text-nowrap"
                                   title="Tag button: --tag-background-color (bg), --tag-category-border-color (border), --primary-color-contrast (text)">css</a>
                            </div>
                        </div>

                        <div class="flex flex-row space-x-1 preamble" title="Preamble: --text-secondary">
                            <span>Reading Time: ~ 5 min</span>
                        </div>
                        <hr />
                    </header>

                    <article>

                        <h2>How to Use This Page</h2>
                        Sample text and styles, updated in real time.

                        <p title="Body text: --text-main">
                            Click on any <em title="Emphasized text: --text-highlight-color">color swatch</em> to open
                            the color picker.
                            Changes preview in <strong>real-time</strong> before saving.
                        </p>

                        <h3 title="H3 heading: --heading-color">H3 Header</h3>
                        <p class="color-text-secondary" title="Secondary text: --text-secondary">
                            Theme-independent colors appear at the bottom and apply to both light and dark modes.
                        </p>
                        <h4 title="H4 heading: --heading-color">H4 Header</h4>
                        <div class="quote-block"
                             title="Quote block: --bg-quote-block (bg), --text-highlight-color (border & text)">
                            <p>Use the lock icons to sync colors between themes with inverse lightness.</p>
                        </div>
                        <h5>H5 Header</h5>
                        <p title="Body text: --text-main">
                            Check out the <a href="#" class="highlight-link"
                                             title="Link: --text-highlight-color, --primary-color-alt (underline)">documentation</a> for
                            more details,
                            view the <a href="#" class="steam-link" title="Steam link: --text-highlight-color-alt1">Steam
                            page</a>,
                            follow on <a href="#" class="bluesky-link"
                                         title="Bluesky link: --text-highlight-color-alt2">Bluesky</a>,
                            or see the <a href="#" class="github-link"
                                          title="GitHub link: --text-highlight-color-alt3">GitHub repo</a>.
                        </p>
                        <h6>H6 Header</h6>
                        <p title="Body text: --text-main">
                            Inline code looks like <code
                            title="Inline code: --text-code-color">--text-code-color</code> and helps identify
                            variables.
                        </p>
                    </article>
                </div>
            </div>
        </div>
    );
};

export const ThemeEditor = () => {
    const [colors, setColors] = createSignal<ColorValue[]>([]);
    const [originalColors, setOriginalColors] = createSignal<ColorValue[]>([]);
    const [loading, setLoading] = createSignal(true);
    const [saving, setSaving] = createSignal(false);
    const [error, setError] = createSignal<string | null>(null);
    const [success, setSuccess] = createSignal<string | null>(null);
    // Per-row sync state (keyed by color name) - stores the sync mode for each color
    const [rowSyncStates, setRowSyncStates] = createSignal<Record<string, SyncMode>>({});

    // Shared color picker state
    let pickerRef: HTMLDivElement | undefined;
    let popupRef: HTMLDivElement | undefined;
    let colorPicker: iro.ColorPicker | null = null;
    const [pickerOpen, setPickerOpen] = createSignal(false);
    const [pickerPosition, setPickerPosition] = createSignal({ top: 0, left: 0 });
    const [activeColor, setActiveColor] = createSignal<{ colorName: string; field: 'light' | 'dark' } | null>(null);
    const [originalPickerColor, setOriginalPickerColor] = createSignal<string | null>(null);
    // Store the original synced color too (for when themes are linked)
    const [originalSyncedColor, setOriginalSyncedColor] = createSignal<string | null>(null);

    // AI color scheme generation state
    const [aiModalOpen, setAiModalOpen] = createSignal(false);
    const [aiPrompt, setAiPrompt] = createSignal('');
    const [aiImage, setAiImage] = createSignal<string | null>(null); // Base64 data URI
    const [aiImagePreview, setAiImagePreview] = createSignal<string | null>(null); // Preview URL
    // Default mode based on current theme - generate the active theme, derive the other
    const getDefaultAiColorMode = (): 'light' | 'dark' => {
        if (typeof document !== 'undefined') {
            return document.documentElement.classList.contains('theme-dark') ? 'dark' : 'light';
        }
        return 'light';
    };
    const [aiColorMode, setAiColorMode] = createSignal<'light' | 'dark' | 'both'>(getDefaultAiColorMode());
    const [aiLoading, setAiLoading] = createSignal(false);
    const [aiError, setAiError] = createSignal<string | null>(null);

    // Color input format state
    type ColorFormat = 'hex' | 'rgb' | 'hsl';
    const [colorFormat, setColorFormat] = createSignal<ColorFormat>('rgb');
    const [colorComponents, setColorComponents] = createSignal<ColorComponents>({ c1: 0, c2: 0, c3: 0, c4: 255 });
    const [hexInputValue, setHexInputValue] = createSignal('');

    // Background filter state - store original and current values
    const [originalBackgroundFilters, setOriginalBackgroundFilters] = createSignal<Array<{
        name: string;
        lightImage: string;
        darkImage: string;
        lightFilter: string;
        darkFilter: string;
    }>>([]);
    const [currentBackgroundFilters, setCurrentBackgroundFilters] = createSignal<Array<{
        name: string;
        lightImage: string;
        darkImage: string;
        lightFilter: string;
        darkFilter: string;
    }>>([]);

    // Store filter state when color picker opens (for cancel/restore)
    const [pickerOpenFilters, setPickerOpenFilters] = createSignal<Array<{
        name: string;
        lightImage: string;
        darkImage: string;
        lightFilter: string;
        darkFilter: string;
    }> | null>(null);

    // Get sync mode for a specific row
    const getRowSyncMode = (colorName: string): SyncMode => rowSyncStates()[colorName] || 'off';

    // Check if a specific row has any sync enabled (not 'off')
    const isRowSynced = (colorName: string): boolean => getRowSyncMode(colorName) !== 'off';

    // Get dominant sync mode for master toggle display
    const getDominantSyncMode = (): SyncMode => {
        const states = rowSyncStates();
        const colorList = colors();
        if (colorList.length === 0) return 'off';

        // Count occurrences of each mode
        const modeCounts: Record<SyncMode, number> = { off: 0, luminance: 0, hue: 0, both: 0 };
        colorList.forEach(c => {
            const mode = states[c.name] || 'off';
            modeCounts[mode]++;
        });

        // Return the most common non-off mode, or 'off' if all are off
        if (modeCounts.off === colorList.length) return 'off';

        // Find the most common active mode
        let dominant: SyncMode = 'luminance';
        let maxCount = 0;
        for (const mode of ['luminance', 'hue', 'both'] as SyncMode[]) {
            if (modeCounts[mode] > maxCount) {
                maxCount = modeCounts[mode];
                dominant = mode;
            }
        }
        return dominant;
    };

    // Check if all rows have the same sync mode (for master toggle)
    const allSameMode = (): boolean => {
        const states = rowSyncStates();
        const colorList = colors();
        if (colorList.length === 0) return true;
        const firstMode = states[colorList[0].name] || 'off';
        return colorList.every(c => (states[c.name] || 'off') === firstMode);
    };

    // Check if any rows are synced
    const anySynced = (): boolean => {
        const states = rowSyncStates();
        return Object.values(states).some(v => v && v !== 'off');
    };

    // Toggle all rows sync state - cycles through modes: off -> luminance -> hue -> both -> off
    const toggleAllSync = () => {
        const colorList = colors();
        const currentMode = getDominantSyncMode();
        const nextMode = getNextSyncMode(currentMode);
        const newStates: Record<string, SyncMode> = {};
        colorList.forEach(c => {
            newStates[c.name] = nextMode;
        });
        setRowSyncStates(newStates);
    };

    // Toggle single row sync state - cycles through modes
    const toggleRowSync = (colorName: string) => {
        setRowSyncStates(prev => ({
            ...prev,
            [colorName]: getNextSyncMode(prev[colorName] || 'off')
        }));
    };

    // Sort colors by luminance (based on light mode values, darkest first)
    // Theme-independent colors go after theme-dependent ones
    // Only used on initial load
    const sortByLuminance = (colorList: ColorValue[]): ColorValue[] => {
        return [...colorList].sort((a, b) => {
            // Theme-independent colors go last
            if (a.themeIndependent && !b.themeIndependent) return 1;
            if (!a.themeIndependent && b.themeIndependent) return -1;

            // Within each group, sort by luminance (darkest first)
            const lumA = getLuminance(a.light);
            const lumB = getLuminance(b.light);
            return lumA - lumB;
        });
    };

    // Load colors and background filters on mount
    onMount(async () => {
        try {
            const response = await fetch('/api/colors');
            const data = await response.json();
            if (data.success) {
                // Preserve file order (colors are returned in the order they appear in colors.css)
                setColors(data.colors);
                setOriginalColors(JSON.parse(JSON.stringify(data.colors)));
            } else {
                setError(data.error || 'Failed to load colors');
            }

            // Also load original background filter values with image URLs
            try {
                const filtersResponse = await fetch('/api/background-filters');
                const filtersData = await filtersResponse.json();
                if (filtersData.success && filtersData.imageVars) {
                    const filterData = filtersData.imageVars.map((iv: any) => ({
                        name: iv.name,
                        lightImage: iv.lightImage,
                        darkImage: iv.darkImage,
                        lightFilter: iv.lightFilter,
                        darkFilter: iv.darkFilter
                    }));
                    setOriginalBackgroundFilters(filterData);
                    setCurrentBackgroundFilters(JSON.parse(JSON.stringify(filterData)));
                }
            } catch (e) {
                console.warn('[ThemeEditor] Failed to load original background filters:', e);
            }
        } catch (e: any) {
            setError(e.message || 'Failed to load colors');
        } finally {
            setLoading(false);
        }
    });

    // Compute hasChanges as a derived value (not an effect that sets state)
    const computeHasChanges = () => {
        const current = JSON.stringify(colors());
        const original = JSON.stringify(originalColors());
        return current !== original;
    };

    // Check if dark mode is active
    const isDarkMode = () => document.documentElement.classList.contains('theme-dark');

    // Apply a single CSS variable to the document
    const applyCssVariable = (name: string, value: string) => {
        document.documentElement.style.setProperty(`--${name}`, value);
    };

    // Apply all color changes to CSS variables in real-time
    const applyColorsToDocument = () => {
        const currentColors = colors();
        const darkMode = isDarkMode();

        for (const color of currentColors) {
            // Apply the appropriate value based on current theme
            const value = darkMode ? color.dark : color.light;
            applyCssVariable(color.name, value);
        }
    };

    // Effect to apply colors whenever they change or theme changes
    createEffect(() => {
        // Subscribe to colors signal
        const currentColors = colors();
        if (currentColors.length > 0) {
            applyColorsToDocument();
        }
    });

    // Listen for theme changes and reapply colors
    onMount(() => {
        // Watch for theme-dark class changes on documentElement
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.attributeName === 'class') {
                    applyColorsToDocument();
                }
            }
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });

        // Cleanup on unmount would go here if needed
    });

    // Update color by name (since sorted view uses different indices than original array)
    const updateColorByName = (colorName: string, field: 'light' | 'dark', value: string) => {
        setColors(prev => {
            const index = prev.findIndex(c => c.name === colorName);
            if (index === -1) return prev;

            const updated = [...prev];
            const color = updated[index];

            // For theme-independent colors, update both light and dark to the same value
            if (color.themeIndependent) {
                updated[index] = { ...color, light: value, dark: value };
            } else {
                updated[index] = { ...color, [field]: value };

                // If sync is enabled for this row, also update the opposite field using the appropriate transform
                const syncMode = getRowSyncMode(colorName);
                if (syncMode !== 'off') {
                    const otherField = field === 'light' ? 'dark' : 'light';
                    const transformedColor = applySyncTransform(value, syncMode);
                    updated[index] = { ...updated[index], [otherField]: transformedColor };
                }
            }

            return updated;
        });

        // Check if there's an associated background image that needs filter update
        // Pattern: --background-body → --background-body-image, --background-body-image-filter
        updateAssociatedImageFilter(colorName, field, value);
    };

    // Update filters for associated background images when a color changes
    const updateAssociatedImageFilter = async (colorName: string, field: 'light' | 'dark', newColorValue: string) => {
        const imageVarName = `${colorName}-image`;

        // Check if there's a background image variable with this name
        try {
            const response = await fetch('/api/background-filters');
            const data = await response.json();

            if (!data.success || !data.imageVars) return;

            const imageVar = data.imageVars.find((v: any) => v.name === imageVarName);
            if (!imageVar) return;

            console.log(`[ThemeEditor] Detected associated image variable: ${imageVarName}, regenerating filter...`);

            // Helper to extract path from url() notation
            const extractImagePath = (urlString: string): string | null => {
                const match = urlString.match(/url\(['"]?([^'"]+)['"]?\)/);
                return match ? match[1] : null;
            };

            // Helper to analyze image and generate filter
            const analyzeAndGenerateFilter = async (
                imagePath: string,
                targetBgColor: string,
                theme: 'light' | 'dark'
            ): Promise<string> => {
                try {
                    // Check cache first
                    const cached = getCachedImageAnalysis(imagePath);
                    let brightestColor: { r: number; g: number; b: number };

                    if (cached) {
                        console.log(`[ThemeEditor] Using cached analysis for ${theme} mode image`);
                        brightestColor = cached.predominantColor;
                    } else {
                        // Fetch image and analyze using histogram
                        console.log(`[ThemeEditor] Analyzing ${theme} mode background image:`, imagePath);
                        const response = await fetch(imagePath);
                        const blob = await response.blob();

                        // Use histogram approach to find brightest/darkest pixels based on mode
                        // Light mode: affect darkest pixels; Dark mode: affect brightest pixels
                        brightestColor = theme === 'light'
                            ? await getDarkestColor(blob)
                            : await getBrightestColor(blob);

                        // Cache the result
                        cacheImageAnalysis(imagePath, brightestColor);
                    }

                    // Parse target background color
                    const targetColorParsed = parseRgbString(targetBgColor);
                    if (!targetColorParsed) {
                        console.warn(`[ThemeEditor] Failed to parse ${theme} background color:`, targetBgColor);
                        return 'none';
                    }

                    // Get initial/original background color (the zero point for filter calculation)
                    const originalColorEntry = originalColors().find(c => c.name === colorName);
                    const initialBgColor = originalColorEntry ? originalColorEntry[theme] : targetBgColor;
                    const initialColorParsed = parseRgbString(initialBgColor);
                    if (!initialColorParsed) {
                        console.warn(`[ThemeEditor] Failed to parse initial ${theme} background color`);
                        return 'none';
                    }

                    // Calculate and return filter
                    const filter = calculateColorFilter(brightestColor, initialColorParsed, targetColorParsed, theme);
                    console.log(`[ThemeEditor] Generated ${theme} filter:`, filter);
                    return filter;
                } catch (error) {
                    console.error(`[ThemeEditor] Error generating ${theme} filter:`, error);
                    return 'none';
                }
            };

            // Get the current colors to find the color value for the changed mode
            const currentColors = colors();
            const colorEntry = currentColors.find(c => c.name === colorName);
            if (!colorEntry) return;

            // Only regenerate the filter for the mode that changed
            const imagePath = field === 'light'
                ? extractImagePath(imageVar.lightImage)
                : extractImagePath(imageVar.darkImage);

            const imageExists = field === 'light'
                ? imageVar.lightImageExists
                : imageVar.darkImageExists;

            if (!imagePath || !imageExists) {
                console.log(`[ThemeEditor] No ${field} mode image found for ${imageVarName}`);
                return;
            }

            // Generate filter for the changed mode only
            const newFilter = await analyzeAndGenerateFilter(
                imagePath,
                newColorValue,
                field
            );

            // Update only the changed mode's filter in memory
            setCurrentBackgroundFilters(prev => {
                const existing = prev.find(f => f.name === imageVarName);
                if (existing) {
                    // Update only the filter for the mode that changed
                    return prev.map(f => {
                        if (f.name === imageVarName) {
                            return field === 'light'
                                ? { ...f, lightFilter: newFilter }
                                : { ...f, darkFilter: newFilter };
                        }
                        return f;
                    });
                } else {
                    // Create new entry with the changed mode's filter and image URLs from API
                    return [...prev, {
                        name: imageVarName,
                        lightImage: imageVar.lightImage || '',
                        darkImage: imageVar.darkImage || '',
                        lightFilter: field === 'light' ? newFilter : 'none',
                        darkFilter: field === 'dark' ? newFilter : 'none'
                    }];
                }
            });

            // Apply the filter inline for preview (only if we're currently viewing this mode)
            const isDark = document.documentElement.classList.contains('theme-dark');
            const currentModeMatchesChanged = (isDark && field === 'dark') || (!isDark && field === 'light');

            if (currentModeMatchesChanged) {
                document.documentElement.style.setProperty(
                    `--${imageVarName}-filter`,
                    newFilter
                );
                console.log(`[ThemeEditor] Updated ${field} filter for ${imageVarName}:`, newFilter);
            }
        } catch (error) {
            console.error('[ThemeEditor] Failed to update associated image filter:', error);
        }
    };

    const saveColors = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            // Normalize colors before saving (convert alpha 255 to triplet)
            const normalizedColors = colors().map(c => ({
                ...c,
                light: normalizeColorForSave(c.light),
                dark: normalizeColorForSave(c.dark)
            }));

            const response = await fetch('/api/colors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ colors: normalizedColors })
            });
            const data = await response.json();

            if (data.success) {
                setOriginalColors(JSON.parse(JSON.stringify(colors())));

                // Also save background filters if there are any
                const filters = currentBackgroundFilters();
                if (filters.length > 0) {
                    const filterResponse = await fetch('/api/background-filters', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            filters: filters.map(f => ({
                                variableName: f.name,
                                lightFilter: f.lightFilter,
                                darkFilter: f.darkFilter
                            }))
                        })
                    });

                    const filterData = await filterResponse.json();
                    if (!filterData.success) {
                        console.error('[ThemeEditor] Failed to save filters:', filterData.error);
                        setError('Colors saved, but filters failed to save');
                        setSaving(false);
                        return;
                    }

                    // Update original filters after successful save
                    setOriginalBackgroundFilters(JSON.parse(JSON.stringify(filters)));
                }

                setSuccess('Colors saved successfully! The page will refresh to apply changes.');
                // Delay refresh to show success message
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                setError(data.error || 'Failed to save colors');
            }
        } catch (e: any) {
            setError(e.message || 'Failed to save colors');
        } finally {
            setSaving(false);
        }
    };

    const resetColors = () => {
        // Reset colors in memory
        setColors(JSON.parse(JSON.stringify(originalColors())));

        // Also restore original background filter values
        const originalFilters = originalBackgroundFilters();
        if (originalFilters.length > 0) {
            const isDark = document.documentElement.classList.contains('theme-dark');
            for (const filter of originalFilters) {
                const filterValue = isDark ? filter.darkFilter : filter.lightFilter;
                console.log(`[ThemeEditor] Resetting filter --${filter.name}-filter to:`, filterValue);
                // Always set the property, even if it's 'none' - this ensures it gets reset
                document.documentElement.style.setProperty(
                    `--${filter.name}-filter`,
                    filterValue
                );
            }
        } else {
            console.warn('[ThemeEditor] No original filters stored - may need to reload page');
        }

        setError(null);
        setSuccess(null);
    };

    // AI color scheme generation - batched approach
    const BATCH_COUNT = 1; // Number of batches to split colors into (configurable)
    const [aiColorsBeforeGeneration, setAiColorsBeforeGeneration] = createSignal<ColorValue[] | null>(null);

    const generateColorScheme = async () => {
        const prompt = aiPrompt().trim();
        const image = aiImage();

        // Need either text prompt or image
        if (!prompt && !image) {
            setAiError('Please enter a creative direction or upload an inspiration image');
            return;
        }

        // Store current colors so we can revert on cancel
        setAiColorsBeforeGeneration(JSON.parse(JSON.stringify(colors())));

        setAiLoading(true);
        setAiError(null);

        try {
            let creativeDirection = prompt;

            // If an image is provided, analyze it first to get color/mood description
            if (image) {
                const colorContext = 'List ALL distinct colors visible in this image, not just the dominant ones. Include background colors, foreground colors, accent colors, and any secondary colors from objects, characters, or elements in the scene. Be specific (e.g., "bright yellow", "cyan blue", "hot pink", "deep black"). Also describe the overall mood and visual theme. Do not skip any colors - even small areas of color matter for creating a complete palette.';

                const result = await analyzeImage(image, {
                    mode: 'description',
                    context: colorContext,
                    onStatusChange: setAiError
                });

                if (!result.success) {
                    setAiError(`Image analysis failed: ${result.error || 'Unknown error'}`);
                    return;
                }

                // Combine image description with any text prompt
                const imageDescription = result.text;
                creativeDirection = prompt
                    ? `${prompt}. Image inspiration: ${imageDescription}`
                    : `Based on this image: ${imageDescription}`;

                console.log('[ColorEditor] Image analysis result:', imageDescription);
            }

            // Prepare current colors for the API
            const currentColors = colors().map(c => ({
                name: `--${c.name}`,
                light: c.light,
                dark: c.dark,
                themeIndependent: c.themeIndependent,
                purpose: c.purpose  // Include the full comment string for LLM context
            }));

            const mode = aiColorMode();
            const generatedColors: Array<{ name: string; light: string; dark: string }> = [];
            let finalNewColors = colors(); // Will hold the last batch's newColors for filter generation

            // Split colors into BATCH_COUNT batches
            const batches: typeof currentColors[] = [];
            const batchSize = Math.ceil(currentColors.length / BATCH_COUNT);
            for (let i = 0; i < currentColors.length; i += batchSize) {
                batches.push(currentColors.slice(i, i + batchSize));
            }

            // Process each batch sequentially
            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                const batch = batches[batchIndex];
                setAiError(`Generating colors: batch ${batchIndex + 1} of ${batches.length}...`);

                const response = await fetch('/api/llm/text', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        operation: 'generate-color-batch',
                        creativeDirection,
                        colorsToGenerate: batch,
                        previouslyGenerated: generatedColors,
                        colorMode: mode
                    })
                });

                const data = await response.json();

                if (!data.success) {
                    setAiError(`Batch ${batchIndex + 1} failed: ${data.error || data.validationError || 'Unknown error'}`);
                    return;
                }

                // Add the generated colors to our collection
                const batchResults = data.result as Array<{ name: string; light?: string; dark?: string }>;
                for (const result of batchResults) {
                    generatedColors.push({
                        name: result.name,
                        light: result.light || '',
                        dark: result.dark || ''
                    });
                }

                // Apply colors progressively so user sees real-time updates
                // Preserve original alpha values (for overlays, tables, etc.)
                const newColors = colors().map(existingColor => {
                    const generated = generatedColors.find(g => g.name === `--${existingColor.name}`);
                    if (!generated) return existingColor;

                    let newLight = existingColor.light;
                    let newDark = existingColor.dark;

                    if (mode === 'both') {
                        if (generated.light) newLight = preserveAlpha(generated.light, existingColor.light);
                        if (generated.dark) newDark = preserveAlpha(generated.dark, existingColor.dark);
                    } else if (mode === 'light') {
                        if (generated.light) {
                            newLight = preserveAlpha(generated.light, existingColor.light);
                            const inversed = getInverseLightnessColor(newLight);
                            newDark = preserveAlpha(inversed, existingColor.dark);
                        }
                    } else if (mode === 'dark') {
                        if (generated.dark) {
                            newDark = preserveAlpha(generated.dark, existingColor.dark);
                            const inversed = getInverseLightnessColor(newDark);
                            newLight = preserveAlpha(inversed, existingColor.light);
                        }
                    }

                    return { ...existingColor, light: newLight, dark: newDark };
                });
                finalNewColors = newColors; // Track for use after loop
                setColors(newColors);
            }

            // Generate background image filters based on new colors
            setAiError('Discovering background images...');

            try {
                // Discover all background image variables from the CSS file
                const bgDiscoveryResponse = await fetch('/api/background-filters');
                const bgDiscoveryData = await bgDiscoveryResponse.json();

                if (!bgDiscoveryData.success || !bgDiscoveryData.imageVars || bgDiscoveryData.imageVars.length === 0) {
                    console.log('[ThemeEditor] No background images found to filter');
                } else {
                    console.log('[ThemeEditor] Found background images:', bgDiscoveryData.imageVars);
                    setAiError('Generating background image filters...');

                    // Helper to convert image path to fetch URL
                    const imagePathToFetchUrl = (path: string): string => {
                        // In dev mode, Astro serves files from /src/ directly at the /src/ URL
                        // So /src/.sites/... is accessible at /src/.sites/...
                        return path;
                    };

                    // Helper to extract path from url() notation
                    const extractImagePath = (urlString: string): string | null => {
                        const match = urlString.match(/url\(['"]?([^'"]+)['"]?\)/);
                        return match ? match[1] : null;
                    };

                    // Helper to analyze image and generate filter
                    const analyzeAndGenerateFilter = async (
                        imagePath: string,
                        targetBgColor: string,
                        theme: 'light' | 'dark'
                    ): Promise<string> => {
                        try {
                            // Check cache first
                            const cached = getCachedImageAnalysis(imagePath);
                            let brightestColor: { r: number; g: number; b: number };

                            if (cached) {
                                console.log(`[ThemeEditor] Using cached analysis for ${theme} mode image`);
                                brightestColor = cached.predominantColor;
                            } else {
                                // Fetch image and analyze using histogram
                                console.log(`[ThemeEditor] Analyzing ${theme} mode background image:`, imagePath);
                                const fetchUrl = imagePathToFetchUrl(imagePath);
                                const response = await fetch(fetchUrl);
                                const blob = await response.blob();

                                // Use histogram approach to find brightest/darkest pixels based on mode
                                // Light mode: affect darkest pixels; Dark mode: affect brightest pixels
                                brightestColor = theme === 'light'
                                    ? await getDarkestColor(blob)
                                    : await getBrightestColor(blob);

                                // Cache the result
                                cacheImageAnalysis(imagePath, brightestColor);
                            }

                            // Parse target background color
                            const targetColorParsed = parseRgbString(targetBgColor);
                            if (!targetColorParsed) {
                                console.warn(`[ThemeEditor] Failed to parse ${theme} background color:`, targetBgColor);
                                return 'none';
                            }

                            // Get initial/original background color (the zero point for filter calculation)
                            // For AI generation, we use background-body color from originalColors
                            const originalBgBodyColor = originalColors().find(c => c.name === 'background-body');
                            const initialBgColor = originalBgBodyColor ? originalBgBodyColor[theme] : targetBgColor;
                            const initialColorParsed = parseRgbString(initialBgColor);
                            if (!initialColorParsed) {
                                console.warn(`[ThemeEditor] Failed to parse initial ${theme} background color`);
                                return 'none';
                            }

                            // Calculate and return filter
                            const filter = calculateColorFilter(brightestColor, initialColorParsed, targetColorParsed, theme);
                            console.log(`[ThemeEditor] Generated ${theme} filter:`, filter);
                            return filter;
                        } catch (error) {
                            console.error(`[ThemeEditor] Error generating ${theme} filter:`, error);
                            return 'none';
                        }
                    };

                    // Find background-body color for filter target
                    const bgBodyColor = finalNewColors.find(c => c.name === 'background-body');

                    if (!bgBodyColor) {
                        console.warn('[ThemeEditor] background-body color not found, skipping filter generation');
                    } else {
                        // Generate filters for all discovered background images
                        const filterUpdates = [];

                        for (const imageVar of bgDiscoveryData.imageVars) {
                            const lightImagePath = extractImagePath(imageVar.lightImage);
                            const darkImagePath = extractImagePath(imageVar.darkImage);

                            let lightFilter = 'none';
                            let darkFilter = 'none';

                            if (lightImagePath && imageVar.lightImageExists) {
                                lightFilter = await analyzeAndGenerateFilter(
                                    lightImagePath,
                                    bgBodyColor.light,
                                    'light'
                                );
                            }

                            if (darkImagePath && imageVar.darkImageExists) {
                                darkFilter = await analyzeAndGenerateFilter(
                                    darkImagePath,
                                    bgBodyColor.dark,
                                    'dark'
                                );
                            }

                            filterUpdates.push({
                                variableName: imageVar.name,
                                lightFilter,
                                darkFilter
                            });
                        }

                        // Store filters in memory (don't save to file until user clicks Save)
                        if (filterUpdates.length > 0) {
                            setAiError('Applying background filters...');

                            // Store in currentBackgroundFilters for later saving (include image URLs from API)
                            setCurrentBackgroundFilters(filterUpdates.map(f => {
                                const imageVar = bgDiscoveryData.imageVars.find((v: any) => v.name === f.variableName);
                                return {
                                    name: f.variableName,
                                    lightImage: imageVar?.lightImage || '',
                                    darkImage: imageVar?.darkImage || '',
                                    lightFilter: f.lightFilter,
                                    darkFilter: f.darkFilter
                                };
                            }));

                            // Apply inline styles for preview
                            const isDark = document.documentElement.classList.contains('theme-dark');
                            for (const filter of filterUpdates) {
                                const filterValue = isDark ? filter.darkFilter : filter.lightFilter;
                                document.documentElement.style.setProperty(
                                    `--${filter.variableName}-filter`,
                                    filterValue
                                );
                            }

                            console.log('[ThemeEditor] Applied background filters for preview (not saved to file)');
                        }
                    }
                }
            } catch (error) {
                console.error('[ThemeEditor] Failed to generate background filters:', error);
                // Continue anyway - filters are optional
            }

            // All batches complete - clear the stored colors and close modal (generation successful)
            setAiError(null);
            setAiColorsBeforeGeneration(null);
            setAiModalOpen(false);
            setAiPrompt('');
            removeAiImage();
        } catch (e: any) {
            setAiError(e.message || 'Failed to generate color scheme');
        } finally {
            setAiLoading(false);
        }
    };

    // Cancel AI generation and revert any applied colors
    const cancelAiGeneration = () => {
        const colorsBeforeGen = aiColorsBeforeGeneration();
        if (colorsBeforeGen) {
            setColors(colorsBeforeGen);
        }
        setAiColorsBeforeGeneration(null);
        setAiLoading(false);
        setAiError(null);
        setAiImage(null);
        setAiImagePreview(null);
        setAiModalOpen(false);
    };

    // Handle image upload for AI inspiration
    const handleAiImageUpload = (e: Event) => {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setAiError('Please select an image file');
            return;
        }

        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        setAiImagePreview(previewUrl);

        // Read file as base64
        const reader = new FileReader();
        reader.onload = () => {
            setAiImage(reader.result as string);
        };
        reader.onerror = () => {
            setAiError('Failed to read image file');
        };
        reader.readAsDataURL(file);
    };

    // Remove uploaded image
    const removeAiImage = () => {
        if (aiImagePreview()) {
            URL.revokeObjectURL(aiImagePreview()!);
        }
        setAiImage(null);
        setAiImagePreview(null);
    };

    // Open the shared color picker popup
    const openPicker = (colorName: string, field: 'light' | 'dark', element: HTMLElement, currentColor: string) => {
        // Get position of the clicked element
        const rect = element.getBoundingClientRect();
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

        // Position the popup below the swatch
        setPickerPosition({
            top: rect.bottom + scrollTop + 8,
            left: rect.left + scrollLeft
        });

        setActiveColor({ colorName, field });
        setOriginalPickerColor(currentColor);

        // If sync is enabled, also store the original synced color (the other theme's color)
        if (isRowSynced(colorName)) {
            const currentColors = colors();
            const color = currentColors.find(c => c.name === colorName);
            if (color) {
                const otherField = field === 'light' ? 'dark' : 'light';
                setOriginalSyncedColor(color[otherField]);
            }
        } else {
            setOriginalSyncedColor(null);
        }

        // Store current filter state so we can restore it on cancel
        const filters = currentBackgroundFilters();
        setPickerOpenFilters(filters.length > 0 ? JSON.parse(JSON.stringify(filters)) : null);

        setPickerOpen(true);

        // Initialize the iro color picker after DOM update
        // Always recreate since the DOM element is destroyed when popup closes
        setTimeout(() => {
            if (pickerRef) {
                // Clear any existing picker content
                pickerRef.innerHTML = '';

                const iroColor = rgbStringToIro(currentColor);

                // Create new picker
                colorPicker = iro.ColorPicker(pickerRef, {
                    width: 200,
                    color: { r: iroColor.r, g: iroColor.g, b: iroColor.b },
                    layout: [
                        { component: iro.ui.Wheel },
                        { component: iro.ui.Slider, options: { sliderType: 'value' } },
                        { component: iro.ui.Slider, options: { sliderType: 'alpha' } }
                    ]
                });
                colorPicker.color.alpha = iroColor.a;

                // Handle color changes from picker
                colorPicker.on('color:change', (color: iro.Color) => {
                    const active = activeColor();
                    if (active) {
                        const rgbStr = iroToRgbString(color);
                        updateColorByName(active.colorName, active.field, rgbStr);
                        // Update component inputs to reflect new color
                        const components = rgbStringToComponents(rgbStr, colorFormat());
                        setColorComponents(components);
                        if (colorFormat() === 'hex') {
                            setHexInputValue(componentsToHexString(components));
                        }
                    }
                });

                // Set initial component values
                const components = rgbStringToComponents(currentColor, colorFormat());
                setColorComponents(components);
                if (colorFormat() === 'hex') {
                    setHexInputValue(componentsToHexString(components));
                }
            }
        }, 0);
    };

    // Handle component input change (for RGB/HSL number inputs)
    const handleComponentChange = (component: 'c1' | 'c2' | 'c3' | 'c4', value: number) => {
        const format = colorFormat();
        const newComponents = { ...colorComponents(), [component]: value };
        setColorComponents(newComponents);

        // Convert to RGB string and apply
        const rgbStr = componentsToRgbString(newComponents, format);
        const active = activeColor();
        if (active) {
            updateColorByName(active.colorName, active.field, rgbStr);
            // Update the iro picker to match
            if (colorPicker) {
                const iroColor = rgbStringToIro(rgbStr);
                colorPicker.color.set({ r: iroColor.r, g: iroColor.g, b: iroColor.b });
                colorPicker.color.alpha = iroColor.a;
            }
        }
    };

    // Handle hex input change
    const handleHexInputChange = (e: Event) => {
        const input = (e.target as HTMLInputElement).value;
        setHexInputValue(input);

        // Try to parse the hex and apply it
        const components = hexStringToComponents(input);
        if (components) {
            setColorComponents(components);
            const rgbStr = componentsToRgbString(components, 'hex');
            const active = activeColor();
            if (active) {
                updateColorByName(active.colorName, active.field, rgbStr);
                // Update the iro picker to match
                if (colorPicker) {
                    const iroColor = rgbStringToIro(rgbStr);
                    colorPicker.color.set({ r: iroColor.r, g: iroColor.g, b: iroColor.b });
                    colorPicker.color.alpha = iroColor.a;
                }
            }
        }
    };

    // Handle format change
    const handleFormatChange = (format: 'hex' | 'rgb' | 'hsl') => {
        setColorFormat(format);
        // Convert current color to new format
        const active = activeColor();
        if (active) {
            const currentColors = colors();
            const color = currentColors.find(c => c.name === active.colorName);
            if (color) {
                const currentValue = active.field === 'light' ? color.light : color.dark;
                const components = rgbStringToComponents(currentValue, format);
                setColorComponents(components);
                if (format === 'hex') {
                    setHexInputValue(componentsToHexString(components));
                }
            }
        }
    };

    // Get labels for component inputs based on format
    const getComponentLabels = () => {
        const format = colorFormat();
        switch (format) {
            case 'hex':
            case 'rgb':
                return ['R', 'G', 'B', 'A'];
            case 'hsl':
                return ['H', 'S', 'L', 'A'];
        }
    };

    // Get max values for component inputs based on format
    const getComponentMaxValues = () => {
        const format = colorFormat();
        switch (format) {
            case 'hex':
            case 'rgb':
                return [255, 255, 255, 255];
            case 'hsl':
                return [360, 100, 100, 255];
        }
    };

    // Close the picker and apply the change (Apply button)
    const applyAndClosePicker = () => {
        setPickerOpen(false);
        setActiveColor(null);
        setOriginalPickerColor(null);
        setOriginalSyncedColor(null);
    };

    // Cancel the picker and restore original color (and synced color if applicable)
    const cancelPicker = () => {
        const active = activeColor();
        const original = originalPickerColor();
        const originalSynced = originalSyncedColor();

        if (active && original) {
            // Temporarily disable sync to restore both colors independently
            // (otherwise restoring one would auto-calculate the other)
            const currentSyncMode = getRowSyncMode(active.colorName);
            const wasSynced = currentSyncMode !== 'off';
            if (wasSynced) {
                setRowSyncStates(prev => ({ ...prev, [active.colorName]: 'off' }));
            }

            // Restore the active color
            updateColorByName(active.colorName, active.field, original);

            // Restore the synced color if it was stored
            if (originalSynced) {
                const otherField = active.field === 'light' ? 'dark' : 'light';
                updateColorByName(active.colorName, otherField, originalSynced);
            }

            // Re-enable sync with the original mode if it was enabled
            if (wasSynced) {
                setRowSyncStates(prev => ({ ...prev, [active.colorName]: currentSyncMode }));
            }
        }

        // Restore any filters that were modified during color changes
        const savedFilters = pickerOpenFilters();
        if (savedFilters) {
            setCurrentBackgroundFilters(savedFilters);

            // Apply the restored filters inline
            const isDark = document.documentElement.classList.contains('theme-dark');
            for (const filter of savedFilters) {
                const filterValue = isDark ? filter.darkFilter : filter.lightFilter;
                document.documentElement.style.setProperty(
                    `--${filter.name}-filter`,
                    filterValue
                );
            }
            console.log('[ThemeEditor] Restored filters on cancel');
        }
        setPickerOpenFilters(null);

        setPickerOpen(false);
        setActiveColor(null);
        setOriginalPickerColor(null);
        setOriginalSyncedColor(null);
    };

    // Click outside handler for the popup
    onMount(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (!pickerOpen()) return;

            // Check if click is inside the popup
            if (popupRef && popupRef.contains(e.target as Node)) {
                return; // Click inside popup, don't close
            }

            // Click outside, cancel and restore original color
            cancelPicker();
        };

        document.addEventListener('mousedown', handleClickOutside);

        onCleanup(() => {
            document.removeEventListener('mousedown', handleClickOutside);
            if (colorPicker) {
                // iro.js doesn't have a destroy method, but we can clean up our reference
                colorPicker = null;
            }
        });
    });

    return (
        <div class="color-editor">
            <Show when={loading()}>
                <div class="loading">Loading colors...</div>
            </Show>

            <Show when={error()}>
                <div class="error-message">{error()}</div>
            </Show>

            <Show when={success()}>
                <div class="success-message">{success()}</div>
            </Show>

            <Show when={!loading() && colors().length > 0}>
                <ColorPreview />

                <div class="toolbar">
                    <button
                        class="save-btn"
                        onClick={saveColors}
                        disabled={saving() || !computeHasChanges()}
                    >
                        {saving() ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                        class="reset-btn"
                        onClick={resetColors}
                        disabled={saving() || !computeHasChanges()}
                    >
                        Reset
                    </button>
                    <button
                        class="ai-generate-btn"
                        onClick={() => setAiModalOpen(true)}
                        title="Generate color scheme using AI"
                    >
                        <img src="/src/assets/images/admin/robot.svg" alt="" class="ai-icon" style={{ display: "inline"}} />
                        &nbsp;AI Generate
                    </button>
                    <Show when={computeHasChanges()}>
                        <span class="unsaved-indicator">Unsaved changes</span>
                    </Show>
                </div>

                <table class="color-table">
                    <thead>
                        <tr>
                            <th class="name-header">Color Name</th>
                            <th class="dark-header">Dark Mode</th>
                            <th class="sync-header">
                                <button
                                    class={`sync-toggle ${getDominantSyncMode() !== 'off' ? 'active' : ''} ${anySynced() && !allSameMode() ? 'partial' : ''} sync-mode-${getDominantSyncMode()}`}
                                    onClick={toggleAllSync}
                                    title={syncTooltips[getDominantSyncMode()]}
                                >
                                    <span innerHTML={syncIcons[getDominantSyncMode()]} />
                                </button>
                            </th>
                            <th class="light-header">Light Mode</th>
                        </tr>
                    </thead>
                    <tbody>
                        <For each={colors()}>
                            {(color) => (
                                <ColorRow
                                    color={color}
                                    colorName={color.name}
                                    syncMode={getRowSyncMode(color.name)}
                                    onSyncToggle={() => toggleRowSync(color.name)}
                                    onLightChange={(value) => updateColorByName(color.name, 'light', value)}
                                    onDarkChange={(value) => updateColorByName(color.name, 'dark', value)}
                                    onOpenPicker={openPicker}
                                />
                            )}
                        </For>
                    </tbody>
                </table>

                <div class="toolbar bottom">
                    <button
                        class="save-btn"
                        onClick={saveColors}
                        disabled={saving() || !computeHasChanges()}
                    >
                        {saving() ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                        class="reset-btn"
                        onClick={resetColors}
                        disabled={saving() || !computeHasChanges()}
                    >
                        Reset
                    </button>
                </div>
            </Show>

            {/* Shared color picker popup */}
            <Show when={pickerOpen()}>
                <div
                    ref={popupRef}
                    class="color-picker-popup"
                    style={{
                        position: 'absolute',
                        top: `${pickerPosition().top}px`,
                        left: `${pickerPosition().left}px`,
                        "z-index": 1000
                    }}
                >
                    <div ref={pickerRef} class="iro-picker-container" />

                    {/* Format switcher and component inputs */}
                    <div class="color-input-section">
                        <div class="format-switcher">
                            <button
                                class={`format-btn ${colorFormat() === 'hex' ? 'active' : ''}`}
                                onClick={() => handleFormatChange('hex')}
                            >
                                HEX
                            </button>
                            <button
                                class={`format-btn ${colorFormat() === 'rgb' ? 'active' : ''}`}
                                onClick={() => handleFormatChange('rgb')}
                            >
                                RGB
                            </button>
                            <button
                                class={`format-btn ${colorFormat() === 'hsl' ? 'active' : ''}`}
                                onClick={() => handleFormatChange('hsl')}
                            >
                                HSL
                            </button>
                        </div>

                        <Show when={colorFormat() === 'hex'} fallback={
                            /* RGB/HSL: Four number inputs */
                            <div class="component-inputs">
                                <div class="component-input">
                                    <label>{getComponentLabels()[0]}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={getComponentMaxValues()[0]}
                                        value={colorComponents().c1}
                                        onInput={(e) => handleComponentChange('c1', parseInt((e.target as HTMLInputElement).value) || 0)}
                                    />
                                </div>
                                <div class="component-input">
                                    <label>{getComponentLabels()[1]}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={getComponentMaxValues()[1]}
                                        value={colorComponents().c2}
                                        onInput={(e) => handleComponentChange('c2', parseInt((e.target as HTMLInputElement).value) || 0)}
                                    />
                                </div>
                                <div class="component-input">
                                    <label>{getComponentLabels()[2]}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={getComponentMaxValues()[2]}
                                        value={colorComponents().c3}
                                        onInput={(e) => handleComponentChange('c3', parseInt((e.target as HTMLInputElement).value) || 0)}
                                    />
                                </div>
                                <div class="component-input">
                                    <label>{getComponentLabels()[3]}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={getComponentMaxValues()[3]}
                                        value={colorComponents().c4}
                                        onInput={(e) => handleComponentChange('c4', parseInt((e.target as HTMLInputElement).value) || 0)}
                                    />
                                </div>
                            </div>
                        }>
                            {/* HEX: Input with non-editable # prefix */}
                            <div class="hex-input-wrapper">
                                <label class="hex-label">Hex</label>
                                <div class="hex-input-group">
                                    <span class="hex-prefix">#</span>
                                    <input
                                        type="text"
                                        class="hex-input"
                                        value={hexInputValue()}
                                        onInput={handleHexInputChange}
                                        placeholder="rrggbb"
                                        maxLength={8}
                                    />
                                </div>
                            </div>
                        </Show>
                    </div>

                    <div class="picker-buttons">
                        <button class="cancel-picker-btn" onClick={cancelPicker}>
                            Cancel
                        </button>
                        <button class="close-picker-btn" onClick={applyAndClosePicker}>
                            Apply
                        </button>
                    </div>
                </div>
            </Show>

            {/* AI Color Scheme Generation Modal */}
            <Show when={aiModalOpen()}>
                <div class="ai-modal-overlay">
                    <div class="ai-modal">
                        <h3>Generate Color Scheme with AI</h3>
                        <p class="ai-modal-description">
                            Describe the mood, theme, or inspiration for your color scheme.
                        </p>

                        <div class="ai-modal-field">
                            <label>Creative Direction</label>
                            <textarea
                                value={aiPrompt()}
                                onInput={(e) => setAiPrompt((e.target as HTMLTextAreaElement).value)}
                                placeholder="e.g., Ocean sunset, Winter forest, Cyberpunk neon, Warm earth tones..."
                                rows={3}
                                disabled={aiLoading()}
                            />
                        </div>

                        <div class="ai-modal-field">
                            <label>Inspiration Image (optional)</label>
                            <Show when={aiImagePreview()} fallback={
                                <div class="ai-image-upload">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAiImageUpload}
                                        disabled={aiLoading()}
                                        id="ai-image-input"
                                        style={{ display: 'none' }}
                                    />
                                    <label for="ai-image-input" class={`ai-image-upload-label ${aiLoading() ? 'disabled' : ''}`}>
                                        <span class="ai-upload-icon">📷</span>
                                        <span>Click to upload an image</span>
                                        <small>AI will extract colors and mood from the image</small>
                                    </label>
                                </div>
                            }>
                                <div class="ai-image-preview">
                                    <img src={aiImagePreview()!} alt="Inspiration image" />
                                    <button
                                        class="ai-image-remove"
                                        onClick={removeAiImage}
                                        disabled={aiLoading()}
                                        title="Remove image"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </Show>
                        </div>

                        <div class="ai-modal-field">
                            <label>Generation Mode</label>
                            <div class={`ai-mode-options ${aiLoading() ? 'disabled' : ''}`}>
                                <label class={`ai-mode-option ${aiColorMode() === 'both' ? 'selected' : ''} ${aiLoading() ? 'disabled' : ''}`}>
                                    <input
                                        type="radio"
                                        name="colorMode"
                                        value="both"
                                        checked={aiColorMode() === 'both'}
                                        onChange={() => setAiColorMode('both')}
                                        disabled={aiLoading()}
                                    />
                                    <span>Generate both modes</span>
                                    <small>AI creates light and dark themes together</small>
                                </label>
                                <label class={`ai-mode-option ${aiColorMode() === 'light' ? 'selected' : ''} ${aiLoading() ? 'disabled' : ''}`}>
                                    <input
                                        type="radio"
                                        name="colorMode"
                                        value="light"
                                        checked={aiColorMode() === 'light'}
                                        onChange={() => setAiColorMode('light')}
                                        disabled={aiLoading()}
                                    />
                                    <span>Generate light mode</span>
                                    <small>Dark mode derived via inverse lightness</small>
                                </label>
                                <label class={`ai-mode-option ${aiColorMode() === 'dark' ? 'selected' : ''} ${aiLoading() ? 'disabled' : ''}`}>
                                    <input
                                        type="radio"
                                        name="colorMode"
                                        value="dark"
                                        checked={aiColorMode() === 'dark'}
                                        onChange={() => setAiColorMode('dark')}
                                        disabled={aiLoading()}
                                    />
                                    <span>Generate dark mode</span>
                                    <small>Light mode derived via inverse lightness</small>
                                </label>
                            </div>
                        </div>

                        <Show when={aiError()}>
                            <div class="ai-error">{aiError()}</div>
                        </Show>

                        <div class="ai-modal-buttons">
                            <span class="ai-modal-field" style={{opacity: 0.5}}>
                                <strong>WARNING:</strong> This may take a while.
                            </span>
                            <button
                                class="ai-cancel-btn"
                                onClick={cancelAiGeneration}
                            >
                                Cancel
                            </button>
                            <button
                                class="ai-generate-submit-btn"
                                onClick={generateColorScheme}
                                disabled={aiLoading() || (!aiPrompt().trim() && !aiImage())}
                            >
                                {aiLoading() ? 'Generating...' : 'Generate'}
                            </button>
                        </div>
                    </div>
                </div>
            </Show>
        </div>
    );
};

export default ThemeEditor;
