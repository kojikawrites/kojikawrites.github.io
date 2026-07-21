export function getSiteCode(): string {
    // Try import.meta.env.SITE (Astro runtime - extracts hostname from site URL)
    if (typeof import.meta !== 'undefined' && import.meta.env?.SITE) {
        return import.meta.env.SITE
            .replace(/^.*?\/\//, '') // Remove the protocol
            .split('/')[0]            // Extract the domain name
            .replace(/\s/g, '');      // Remove all whitespace characters
    }

    // Fall back to SITE_CODE environment variable (for build scripts, etc.)
    // Try import.meta.env.SITE_CODE first, then process.env.SITE_CODE
    const siteCode = (typeof import.meta !== 'undefined' && import.meta.env?.SITE_CODE)
        || (typeof process !== 'undefined' && process.env?.SITE_CODE);

    if (siteCode) {
        return siteCode.replace(/\s/g, ''); // Remove all whitespace characters
    }

    // No fallback - throw an error with helpful message
    throw new Error(
        'SITE_CODE not configured. Please set one of:\n' +
        '  - SITE_CODE in .env (for build scripts)\n' +
        '  - VITE_SITE_NAME with full URL (extracts hostname)\n' +
        'Example: SITE_CODE=example.com'
    );
}
