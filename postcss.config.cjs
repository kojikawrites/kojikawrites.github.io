const purgecss = require('@fullhuman/postcss-purgecss').default;

// Only run PurgeCSS in production builds
const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
    plugins: [
        // require('postcss-lighten-darken'),
        require('autoprefixer'),

        // PurgeCSS - remove unused CSS in production
        ...(isProduction ? [
            purgecss({
                // Content to scan for CSS class usage
                content: [
                    './src/**/*.{astro,html,js,jsx,ts,tsx,vue,svelte,mdx,md}',
                    './src/.sites/**/*.{astro,html,js,jsx,ts,tsx,vue,svelte,mdx,md,css}',
                    './src/styles/**/*.css',  // Framework-level styles (blog-index.css, etc.)
                ],

                // Default extractor for most content
                defaultExtractor: content => {
                    // Match class names, including those with colons (Tailwind variants)
                    // and brackets (arbitrary values)
                    const matches = content.match(/[\w-/:[\]]+(?<!:)/g) || [];
                    return matches;
                },

                // Safelist - patterns that should NEVER be purged
                safelist: {
                    // Exact class names to keep
                    standard: [
                        // Core HTML elements
                        'html', 'body', 'main', 'article', 'section', 'header', 'footer', 'nav', 'aside',
                        // Theme classes
                        'dark', 'light',
                         // Layout classes from BaseLayout.astro scoped styles
                        'layout',
                        // Pagefind classes
                        /^pagefind/,
                        // Shiki code highlighting
                        /^shiki/, /^astro-code/, /^code-/, /^language-/,
                        // View transitions
                        /^astro-/,
                    ],
                    // Patterns (regex) to keep
                    deep: [
                        // Keep all CSS custom properties/variables
                        /^--/,
                        // Keep all :root, :where, :is selectors
                        /:root/, /:where/, /:is/,
                        // Keep Tailwind utility patterns that might be dynamically generated
                        /^bg-/, /^text-/, /^border-/, /^color-/,
                        // Keep animation classes
                        /animate-/, /transition-/,
                        // Keep responsive prefixes
                        /^sm:/, /^md:/, /^lg:/, /^xl:/, /^2xl:/,
                        // Keep dark mode variants
                        /^dark:/,
                        // Keep hover/focus states
                        /^hover:/, /^focus:/, /^active:/, /^group-hover:/,
                        // Astro scoped styles - keep all selectors with data-astro-cid attributes
                        /data-astro-cid/,
                    ],
                    // Keep entire selectors containing these
                    greedy: [
                        // MathJax classes
                        /mjx-/, /MathJax/, /mathjax/,
                        // Keep navbar and key site components
                        /navbar/, /breadcrumb/, /search/,
                        // Keep tag/category styles
                        /tag/, /category/, /key-/,
                        // Astro scoped styles - these use data-astro-cid-* attributes
                        // Must preserve all scoped component styles
                        /data-astro-cid/,
                    ],
                },

                // Don't purge @font-face rules - PurgeCSS can't detect font usage through CSS variables
                // We'll need a custom solution for font stripping
                fontFace: false,

                // Don't remove @keyframes
                keyframes: false,

                // Don't remove CSS variables
                variables: false,

                // Rejected selectors logging (for debugging)
                // rejected: true,
                // rejectedCss: true,
            })
        ] : []),

        require('cssnano'),
    ],
};