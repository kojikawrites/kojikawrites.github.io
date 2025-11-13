import {defineConfig} from 'astro/config'
import svelte from '@astrojs/svelte'
import mdx from '@astrojs/mdx';
import remarkGfm from 'remark-gfm'
import remarkMath from "remark-math";
import remarkSmartypants from 'remark-smartypants'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeMathjax from "rehype-mathjax";
import {remarkReadingTime} from './remark-reading-time.mjs';
import {remarkPublishDateFromFilename} from "./remark-publish-date-from-filename.mjs";
import {remarkEquationSnippetTransform} from "./remark-equation-snippet-transform.mjs";
import solidJs from '@astrojs/solid-js';
import yaml from '@rollup/plugin-yaml';
import pagefind from "astro-pagefind";
import frontmatter from "/src/scripts/extractPagesFrontMatter.mjs"; // DO NOT DELETE
import siteLogos from "/src/scripts/extractDateLogoMap.mjs" // DO NOT DELETE
import keystatic from '@keystatic/astro';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import fs from 'fs';
import path from 'path';
import jsYaml from 'js-yaml';
import { config as dotenvConfig } from 'dotenv';

// Load environment variables for config reading
dotenvConfig();

import rehypeLinkDecorator from "./rehype-link-decorator.mjs";
import rehypeFootnotesToEnd from "./rehype-footnotes-to-end.mjs";
import {rehypeRenderEquations} from "./rehype-render-equations.mjs";
import rehypeContentWarningTransform from "./rehype-content-warning-transform.mjs";
import {transformerMetaHighlight, transformerNotationHighlight} from '@shikijs/transformers';
import menuWatcher from './src/integrations/menuWatcher.ts';
import excludeDevPages from './src/integrations/excludeDevPages.ts';

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
    const configPath = path.resolve(`src/assets/config/${siteCode}.yml`);
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
    const extensions = ['.astro', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte'];

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
        },
        css: {
            devSourcemap: true,
            transformer: "postcss",
        },
        server: {
            watch: {
                // Ignore build artifacts and generated files to prevent unnecessary reloads
                ignored: [
                    '**/dist/**',
                    '**/.astro/**',
                    '**/node_modules/**',
                    '**/.building',
                    '**/src/assets/_private/state/**',
                    '**/src/scripts/onbuild/**'
                ]
            },
            hmr: {
                // Configure HMR for docker environment
                // Check if we're running in docker by looking for HOSTNAME env var or docker-specific indicators
                clientPort: process.env.VITE_HMR_PORT ? parseInt(process.env.VITE_HMR_PORT) : undefined,
                host: process.env.VITE_HMR_HOST || undefined,
            }
        },
        plugins: [
            yaml(),
            ...(process.env.NODE_ENV === 'development' ? [basicSsl()] : []),
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
        svelte(),
        solidJs({ include: ['**/solid/*', '**/bluesky/*'] }),
        pagefind(),
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
                                iconFile: "./src/assets/images/shared/links/-external-link.svg",
                                properties: {
                                    className: ["inline", "relative", "-top-0.5"],
                                    width: "0.8em",
                                    height: "0.8em",
                                }
                            },
                            {
                                iconName: "-download-link",
                                iconFile: "./src/assets/images/shared/links/-download-link.svg",
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
                                iconFile: "./src/assets/images/shared/links/wikipedia.svg",
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
                                iconFile: "./src/assets/images/shared/links/github.svg",
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
                                iconFile: "./src/assets/images/shared/links/steam.svg",
                                properties: { className: ["inline", "relative", "-top-0.5"] },
                                contentProperties: {
                                    className: ["steam-link"],
                                    width: "0.9em",
                                    height: "0.9em",
                                }
                            },
                            {
                                iconName: "bsky.app",
                                iconFile: "./src/assets/images/shared/bluesky/bluesky.svg",
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
