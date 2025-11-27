import {defineConfig} from 'astro/config'
import mdx from '@astrojs/mdx';
import remarkGfm from 'remark-gfm'
import remarkMath from "remark-math";
import remarkSmartypants from 'remark-smartypants'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeMathjax from "rehype-mathjax";
import {remarkReadingTime} from './plugins/remark-reading-time.mjs';
import {remarkPublishDateFromFilename} from "./plugins/remark-publish-date-from-filename.mjs";
import {remarkEquationSnippetTransform} from "./plugins/remark-equation-snippet-transform.mjs";
import solidJs from '@astrojs/solid-js';
import yaml from '@rollup/plugin-yaml';
import pagefind from "astro-pagefind";
// import frontmatter from "/src/build/extractPagesFrontMatter.ts"; // DO NOT DELETE
import siteLogos from "/src/build/extractDateLogoMap.ts" // DO NOT DELETE
import keystatic from '@keystatic/astro';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import fs from 'fs';
import path from 'path';
import jsYaml from 'js-yaml';
import { config as dotenvConfig } from 'dotenv';

// Load environment variables for config reading
// First load root .env
dotenvConfig();

// Then load site-specific .env if SITE_CODE is set
const siteCode = process.env.SITE_CODE;
if (siteCode) {
    const siteEnvPath = path.resolve(`src/.sites/${siteCode}/.env`);
    if (fs.existsSync(siteEnvPath)) {
        dotenvConfig({ path: siteEnvPath, override: true });
        console.log(`✓ Loaded site-specific .env from: ${siteEnvPath}`);
    } else {
        console.warn(`⚠ Site-specific .env not found at: ${siteEnvPath}`);
    }
}


import rehypeLinkDecorator from "./plugins/rehype-link-decorator.mjs";
import rehypeFootnotesToEnd from "./plugins/rehype-footnotes-to-end.mjs";
import {rehypeRenderEquations} from "./plugins/rehype-render-equations.mjs";
import rehypeContentWarningTransform from "./plugins/rehype-content-warning-transform.mjs";
import {transformerMetaHighlight, transformerNotationHighlight} from '@shikijs/transformers';
import menuWatcher from './src/integrations/menuWatcher.ts';
import excludeDevPages from './src/integrations/excludeDevPages.ts';
import copyPublicFilesIntegration from './src/integrations/copyPublicFiles.ts';
import cleanupSystemFiles from './src/integrations/cleanupSystemFiles.ts';
import multiPublicPlugin from './plugins/vite-plugin-multi-public.ts';
import excludeNonMatchingSites from './plugins/vite-plugin-exclude-sites.ts';

import sitemap from '@astrojs/sitemap';

/**
 * Get site code from environment variables
 */
function getSiteCode() {
    const siteCode = process.env.SITE_CODE;
    if (siteCode) {
        return siteCode;
    }
    try {
        return new URL(process.env.VITE_SITE_NAME || '').hostname;
    } catch (e) {
        return 'hiivelabs.com';
    }
}

/**
 * Load site configuration from YAML file
 */
function loadSiteConfig(siteCode) {
    const configPath = path.resolve(`src/.sites/${siteCode}/config/site.yaml`);
    if (!fs.existsSync(configPath)) {
        console.warn(`No config found for ${siteCode}, using defaults`);
        return {};
    }
    const yamlString = fs.readFileSync(configPath, 'utf8');
    return jsYaml.load(yamlString);
}

const siteName = () => {
    try {
        return import.meta.env.VITE_SITE_NAME ?? process.env.VITE_SITE_NAME;
    } catch (e) {
        return undefined;
    }
};
console.log('siteName:', siteName());

/**
 * Process ![DEV-ONLY] markers in source files based on NODE_ENV
 * - In production: comment out lines containing ![DEV-ONLY]
 * - In development: uncomment lines containing ![DEV-ONLY]
 */
function processDevOnlyMarkers() {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const srcDir = path.resolve('src');

    // File extensions to process
    const extensions = ['.astro', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue'];

    let filesProcessed = 0;
    let linesModified = 0;

    console.log(`🔍 Processing ![DEV-ONLY] markers for NODE_ENV=${nodeEnv}...`);

    function processDirectory(dirPath) {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            // Skip node_modules and .git
            if (entry.name === 'node_modules' || entry.name === '.git') {
                continue;
            }

            if (entry.isDirectory()) {
                processDirectory(fullPath);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name);
                if (!extensions.includes(ext)) {
                    continue;
                }

                try {
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    const lines = content.split('\n');
                    let modified = false;

                    const newLines = lines.map(line => {
                        if (!line.includes('![DEV-ONLY]')) {
                            return line;
                        }

                        const trimmed = line.trimStart();
                        const indent = line.substring(0, line.length - trimmed.length);

                        if (nodeEnv === 'production') {
                            // Comment out the entire line if not already commented
                            if (!trimmed.startsWith('//')) {
                                modified = true;
                                linesModified++;
                                return `${indent}// ${trimmed}`;
                            }
                        } else if (nodeEnv === 'development') {
                            // Uncomment the line if it's commented
                            if (trimmed.startsWith('// ')) {
                                modified = true;
                                linesModified++;
                                return `${indent}${trimmed.substring(3)}`;
                            }
                        }

                        return line;
                    });

                    if (modified) {
                        fs.writeFileSync(fullPath, newLines.join('\n'), 'utf-8');
                        filesProcessed++;
                    }
                } catch (error) {
                    console.warn(`⚠️  Failed to process ${fullPath}: ${error.message}`);
                }
            }
        }
    }

    processDirectory(srcDir);

    if (filesProcessed > 0) {
        console.log(`✅ Processed ${filesProcessed} files, modified ${linesModified} lines with ![DEV-ONLY] markers`);
    } else {
        console.log(`✅ No ![DEV-ONLY] markers needed processing`);
    }
}

// https://astro.build/config
export default defineConfig({
    experimental: {

    },
    svg: true,
    hooks: {
        "astro:build:start": async () => {
            // Process ![DEV-ONLY] markers before build starts
            processDevOnlyMarkers();

            console.log("🔍 Done Extracting frontmatter...");
            const dummy = frontmatter; // to avoid unused import warning.
            const dummy2 = siteLogos // to avoid unused import warning.
        },
    },
    vite: {
        resolve: {
            alias: {
                // Redirect lodash to lodash-es for ESM compatibility (needed for keystatic)
                'lodash': 'lodash-es',
                'lodash/': 'lodash-es/',
            }
        },
        optimizeDeps: {
            // Pre-bundle lodash-es for faster loading
            include: ['lodash-es'],
            // Exclude dev-only editor components from pre-bundling
            // These are manually imported only in Keystatic context and should not be optimized
            exclude: [
                './src/components/editor/ContextMenu',
                './src/components/editor/LLMOperationModal',
                './src/components/editor/guards',
                './src/components/editor/hooks/useTextSelection',
            ],
        },
        css: {
            devSourcemap: true,
            transformer: "postcss",
        },
        build: {
            rollupOptions: {
                onwarn(warning, warn) {
                    // Suppress warnings about unused imports in Astro's internal code
                    // These are from @astrojs/internal-helpers and are false positives
                    if (warning.code === 'UNUSED_EXTERNAL_IMPORT' &&
                        warning.message?.includes('@astrojs/internal-helpers')) {
                        return;
                    }

                    // Suppress warnings about our virtual empty-site-file module
                    // This is intentional - we want all excluded site files to resolve to the same empty module
                    if (warning.message?.includes('virtual:empty-site-file')) {
                        return;
                    }

                    // Suppress warnings about files being both dynamically and statically imported
                    // This happens with siteGlob using import.meta.glob for media files
                    if (warning.message?.includes('is dynamically imported by') &&
                        warning.message?.includes('but also statically imported by')) {
                        return;
                    }

                    // Let other warnings through
                    warn(warning);
                },
                output: {
                    manualChunks: (id) => {
                        // Force critical libraries into main chunk for synchronous loading
                        // This prevents timing issues with view transitions where:
                        // 1. Content swaps in before async CSS loads (FOUC)
                        // 2. JavaScript measures layout before CSS applies (breadcrumbs truncation bug)
                        // 3. View transition libraries need styles immediately available
                        if (id.includes('breadcrumbs') ||
                            id.includes('astro:transitions')) {
                            return 'main';
                        }

                        // Vendor libraries in separate chunk for better caching
                        // When you update your code, vendor chunk remains cached
                        if (id.includes('node_modules')) {
                            return 'vendor';
                        }
                    },
                },
            },

            // CRITICAL: Keep cssCodeSplit enabled - DO NOT set to false!
            // Our architecture REQUIRES CSS code splitting because:
            // 1. StyleHelper.astro dynamically injects site-specific CSS via getSiteStyle()
            // 2. Component CSS is imported separately (breadcrumbs, search, etc.)
            // 3. Single bundle mode (cssCodeSplit: false) breaks styles
            // With code splitting + manualChunks, we get:
            // - Proper CSS load order and variable scoping
            // - Synchronous loading for critical components (via manualChunks)
            // - Async loading for non-critical routes (performance benefit)
            cssCodeSplit: true,

            // Inline small assets as base64 to reduce HTTP requests
            // Files smaller than 4KB (images, icons, small fonts) are embedded in CSS/JS
            // Trade-off: Slightly larger initial bundle vs. fewer network requests
            assetsInlineLimit: 4096,
            chunkSizeWarningLimit: 2000,
            // test
            // Production optimizations
            minify: 'terser',  // Better compression than esbuild
            terserOptions: {
                compress: {
                    drop_console: true,  // Remove console.logs in production
                    drop_debugger: true
                },
                format: {
                    // Terser output format options
                    comments: false, // Remove all comments
                },
            },

            // Helpful for debugging
            sourcemap: process.env.NODE_ENV === 'development',
            reportCompressedSize: true,
            // cssMinify: 'lightningcss',

        },
        server: {
            fs: {
                // Deny access to .sites directories that don't match the current site code
                deny: (() => {
                    const currentSiteCode = getSiteCode();
                    const sitesDir = path.resolve('src/.sites');
                    if (!fs.existsSync(sitesDir)) return [];

                    const allSites = fs.readdirSync(sitesDir, { withFileTypes: true })
                        .filter(d => d.isDirectory())
                        .map(d => d.name);

                    return allSites
                        .filter(site => site !== currentSiteCode)
                        .map(site => `**/.sites/${site}/**`);
                })(),
            },
            watch: {
                // Ignore build artifacts and generated files to prevent unnecessary reloads
                ignored: [
                    '**/dist/**',
                    '**/.astro/**',
                    '**/node_modules/**',
                    '**/.building',
                    '**/src/.sites/**/state',
                    '**/src/build/generators/**'
                ]
            },
            hmr: {
                // Configure HMR for docker environment
                clientPort: process.env.VITE_HMR_PORT ? parseInt(process.env.VITE_HMR_PORT) : undefined,
                host: process.env.VITE_HMR_HOST || undefined,
            }
        },
        plugins: [
            excludeNonMatchingSites(getSiteCode()), // Exclude non-matching .sites directories
            multiPublicPlugin(), // Must be first to intercept requests before Astro routing
            yaml(),
            // Use custom SSL certificates only when accessing via dev site hostname (not localhost/127.0.0.1)
            ...(process.env.NODE_ENV === 'development' ? [{
                name: 'custom-ssl',
                config: () => {
                    const hmrHost = process.env.VITE_HMR_HOST;
                    const isLocalhost = !hmrHost || hmrHost === 'localhost' || hmrHost === '127.0.0.1';

                    // Only use custom SSL for dev site hostnames, not localhost
                    if (isLocalhost) {
                        return {}; // Use Vite's default SSL handling for localhost
                    }

                    return {
                        server: {
                            https: (() => {
                                const certPath = '.ssl/server.crt';
                                const keyPath = '.ssl/server.key';

                                // Check if cert files exist
                                if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
                                    return {
                                        cert: fs.readFileSync(certPath),
                                        key: fs.readFileSync(keyPath)
                                    };
                                }

                                // Fall back to self-signed if certs don't exist yet
                                console.warn('⚠️  SSL certificates not found. Container will generate them on startup.');
                                return true; // Use Vite's built-in self-signed cert as fallback
                            })()
                        }
                    };
                }
            }] : []),
            // Exclude dev-only pages from production builds completely
            ...((() => {
                processDevOnlyMarkers()
                return [];
            })())
        ]
    },

    // site: 'https://hiivelabs.com', //`${siteName}`,//'https://hiivelabs.com',
    site: siteName(),//'https://hiivelabs.com',
    trailingSlash: 'ignore',

    integrations: [
        react({ include: ['**/react/*'] }),
        ...(process.env.NODE_ENV === 'development' ? [keystatic(), menuWatcher()] : [excludeDevPages()]),
        tailwind(),
        mdx(),
        solidJs({ include: ['**/solid/*', '**/bluesky/*', '**/admin/ThemeEditor.tsx', '**/admin/FontEditor.tsx'] }),
        pagefind(),
        copyPublicFilesIntegration(),
        cleanupSystemFiles(), // Must run after copyPublicFilesIntegration
        sitemap({
            filter: (page) => {
                // Exclude dev-only pages from sitemap
                const siteCode = getSiteCode();
                const siteConfig = loadSiteConfig(siteCode);
                const excludeDirs = siteConfig?.build?.exclude_from_production || [];

                for (const dir of excludeDirs) {
                    if (page.includes(`/${dir}/`)) {
                        return false;
                    }
                }
                return true;
            }
        })
    ],
    markdown: {
        shikiConfig: {
            themes: {
                light: "solarized-light",
                dark: "dark-plus",
            },
            // defaultColor: 'dark',
            wrap: true,
            transformers: [
                transformerNotationHighlight({ matchAlgorithm: 'v3', }),
                transformerMetaHighlight({ matchAlgorithm: 'v3', })],
        },
        syntaxHighlight: 'shiki',
        remarkPlugins: [
            remarkGfm,
            remarkSmartypants,
            remarkReadingTime,
            remarkPublishDateFromFilename,
            remarkEquationSnippetTransform, // Must run BEFORE remarkMath
            remarkMath
        ],
        rehypePlugins: [
            [
                rehypeExternalLinks,
                {
                    target: '_blank',
                    rel: ['nofollow', 'noopener', 'noreferrer'],
                    contentProperties: {
                        "className": ["inline-block"]
                    },
                    content: (e) => {
                        const icons = [
                            {
                                iconName: "-external-link",
                                iconFile: "./src/assets/images/links/-external-link.svg",
                                properties: {
                                    className: ["inline", "relative", "-top-0.5"],
                                    width: "0.8em",
                                    height: "0.8em",
                                }
                            },
                            {
                                iconName: "-download-link",
                                iconFile: "./src/assets/images/links/-download-link.svg",
                                properties: {
                                    className: ["inline", "relative", "-top-[2px]"],
                                    width: "0.8em",
                                    height: "0.8em",
                                }
                            },
                            {
                                iconName: "-favicon-link",
                                exclusions: ["www.ospreypublishing.com"],
                                properties: {
                                    className: ["inline", "relative", "-top-0.5", "favicon-link-img"],

                                }
                            },
                            {
                                iconName: ".wikipedia.",
                                iconFile: "./src/assets/images/links/wikipedia.svg",
                                properties: {
                                    className: ["inline", "relative", "-top-0.5"],
                                    width: "0.9em",
                                    height: "0.9em",
                                },
                                contentProperties: {
                                    className: ["wiki-link"],
                                }
                            },
                            {
                                iconName: "github.com",
                                iconFile: "./src/assets/images/links/github.svg",
                                properties: {
                                    className: ["inline", "relative", "-top-0.5"],
                                    width: "0.9em",
                                    height: "0.9em",
                                },
                                contentProperties: {
                                    className: ["github-link"],
                                }
                            },
                            {
                                iconName: "store.steampowered.com",
                                iconFile: "./src/assets/images/links/steam.svg",
                                properties: { className: ["inline", "relative", "-top-0.5"] },
                                contentProperties: {
                                    className: ["steam-link"],
                                    width: "0.9em",
                                    height: "0.9em",
                                }
                            },
                            {
                                iconName: "bsky.app",
                                iconFile: "./src/assets/images/bluesky/bluesky.svg",
                                properties: { className: ["inline", "relative", "-top-0.5"] },
                                contentProperties: {
                                    className: ["bluesky-link"],
                                    width: "0.9em",
                                    height: "0.9em",
                                }
                            },

                        ]
                        return rehypeLinkDecorator(e, icons, siteName());
                    }
                }
            ],
            [
                rehypeMathjax,
                {
                    tex: {
                        inlineMath: [['\\(', '\\)'], ['$', '$']],
                        displayMath: [['\\[', '\\]'], ['$$', '$$']]
                    },
                    options: {
                        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
                    },
                    chtml: {
                        fontURL: "[mathjax]/components/output/chtml/fonts/woff-v2",
                        scale: 1.05,
                        matchFontHeight: false,
                    }
                }
            ],
            rehypeRenderEquations, // Render EquationSnippet components with MathJax directly
            rehypeContentWarningTransform, // Transform ContentWarning to use slots
            rehypeFootnotesToEnd,
        ],
    },
})
