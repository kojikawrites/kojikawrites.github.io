/**
 * Get the effective theme, resolving 'system' to actual 'light' or 'dark'.
 * This should be used anywhere you need the actual theme being displayed.
 */
export function getEffectiveTheme(): 'light' | 'dark' {
    const storedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null;
    const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

    // If theme is 'system' or not set, use system preference
    if (!storedTheme || storedTheme === 'system') {
        return prefersDark ? 'dark' : 'light';
    }

    // Otherwise return the explicit theme (or default to light if invalid)
    return storedTheme === 'dark' ? 'dark' : 'light';
}

/**
 * Get the raw stored theme value (may be 'light', 'dark', or 'system').
 * Use getEffectiveTheme() if you need the actual displayed theme.
 */
export function getStoredTheme(): 'light' | 'dark' | 'system' | null {
    if (typeof localStorage === 'undefined') return null;
    const theme = localStorage.getItem('theme');
    if (theme === 'light' || theme === 'dark' || theme === 'system') {
        return theme;
    }
    return null;
}

/**
 * @deprecated Use getEffectiveTheme() instead for resolved theme,
 * or getStoredTheme() for the raw stored value.
 */
export function getActiveTheme(defaultTheme: string = 'light'): string {
    // Check if localStorage is available and retrieve the stored theme
    const storedTheme: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null;
    const isThemeSet: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem('themeSet') : null;

    if (isThemeSet && storedTheme !== null) {
        // Handle 'system' by resolving to actual theme
        if (storedTheme === 'system') {
            const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
            return prefersDark ? 'dark' : 'light';
        }
        return storedTheme;
    }

    // Check if window is available and if the user prefers a dark color scheme
    const prefersDark: boolean = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
        return 'dark';
    }

    // return default theme (light if unspecified).
    return defaultTheme;
}
