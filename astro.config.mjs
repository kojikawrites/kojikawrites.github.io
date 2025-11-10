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

// https://astro.build/config
export default defineConfig({
    experimental: {

    },
    svg: true,
    hooks: {
        "astro:build:start": async () => {
            console.log("🔍 Done Extracting frontmatter...");
            const dummy = frontmatter; // to avoid unused import warning.
            const dummy2 = siteLogos // to avoid unused import warning.
        },
    },
    vite: {
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
            }
        },
        plugins: [
            yaml(),
            ...(process.env.NODE_ENV === 'development' ? [basicSsl()] : []),
            // Exclude dev-only pages from production builds completely
            // ...(process.env.NODE_ENV === 'production' ? (() => {
            //     const siteCode = getSiteCode();
            //     const siteConfig = loadSiteConfig(siteCode);
            //     const excludeDirs = siteConfig?.build?.exclude_from_production || [];
            //
            //     if (excludeDirs.length === 0) {
            //         return [];
            //     }
            //
            //     console.log(`🚫 Excluding from production build: ${excludeDirs.join(', ')}`);
            //
            //     return [{
            //         name: 'exclude-dev-pages',
            //         enforce: 'pre',
            //         resolveId(id) {
            //             // Check if this file should be excluded
            //             const normalizedId = id.replace(/\\/g, '/');
            //
            //             for (const dir of excludeDirs) {
            //                 Match both absolute and relative paths
            //                 if (normalizedId.includes(`/src/pages/${dir}/`) ||
            //                     normalizedId.includes(`src/pages/${dir}/`) ||
            //                     normalizedId.match(new RegExp(`[/\\\\]src[/\\\\]pages[/\\\\]${dir}[/\\\\]`))) {
            //                     console.log(`   Excluding from build: ${path.basename(id)}`);
            //                     // Mark as external to completely skip processing
            //                     return { id, external: true };
            //                 }
            //             }
            //             return null;
            //         }
            //     }];
            // })() : [])
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
                                iconFile: "./src/assets/images/shared/links/bluesky.svg",
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
