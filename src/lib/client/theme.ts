export function getActiveTheme(defaultTheme: string = 'light'): string {
    // Check if localStorage is available and retrieve the stored theme
    const storedTheme: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null;
    const isThemeSet: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem('themeSet') : null;
    console.log('getActiveTheme: ', isThemeSet);
    if (isThemeSet && storedTheme !== null) {
        return storedTheme;
    }

    // Check if window is available and if the user prefers a dark color scheme
    const prefersDark: boolean = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
        return 'dark';
    }

    // return default theme (dark if unspecified).
    return defaultTheme;
}
