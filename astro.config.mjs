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
import tailwind from '@astrojs/tailwind';
import solidJs from '@astrojs/solid-js';
import yaml from '@rollup/plugin-yaml';
import pagefind from "astro-pagefind";
import frontmatter from "/src/scripts/extractPagesFrontMatter.mjs"; // DO NOT DELETE
import rehypeLinkDecorator from "./rehype-link-decorator.mjs";
import {transformerMetaHighlight, transformerNotationHighlight} from '@shikijs/transformers';


import sitemap from '@astrojs/sitemap';

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

    hooks: {
        "astro:build:start": async () => {
            console.log("🔍 Done Extracting frontmatter...");
        },
    },
    vite: {
        css: {
            devSourcemap: true,
            transformer: "postcss",
        },
        plugins: [yaml()]
    },

    // site: 'https://hiivelabs.com', //`${siteName}`,//'https://hiivelabs.com',
    site: siteName(),//'https://hiivelabs.com',
    trailingSlash: 'ignore',

    integrations: [mdx(), svelte(), tailwind(), solidJs(), pagefind(), sitemap()],
    markdown: {
        shikiConfig: {
            themes: {
                light: "solarized-light",
                dark: "dark-plus",
            },
            // defaultColor: 'dark',
            wrap: true,
            transformers: [transformerNotationHighlight(), transformerMetaHighlight()],
        },
        syntaxHighlight: 'shiki',
        remarkPlugins: [
            remarkGfm,
            remarkSmartypants,
            remarkReadingTime,
            remarkPublishDateFromFilename,
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
                                iconName: ".wikipedia.",
                                iconFile: "./src/assets/images/shared/links/wikipedia.svg",
                                properties: { className: ["inline", "relative", "-top-0.5"] },
                                contentProperties: { className: ["wiki-link"] }
                            },
                            {
                                iconName: "github.com",
                                iconFile: "./src/assets/images/shared/links/github.svg",
                                properties: { className: ["inline", "relative", "-top-0.5"] },
                                contentProperties: { className: ["github-link"] }
                            },
                            {
                                iconName: "store.steampowered.com",
                                iconFile: "./src/assets/images/shared/links/steam.svg",
                                properties: { className: ["inline", "relative", "-top-0.5"] },
                                contentProperties: { className: ["steam-link"] }
                            },
                            {
                                iconName: "bsky.app",
                                iconFile: "./src/assets/images/shared/links/bluesky.svg",
                                properties: { className: ["inline", "relative", "-top-0.5"] },
                                contentProperties: { className: ["bluesky-link"] }
                            },

                        ]
                        return rehypeLinkDecorator(e, icons, siteName);
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
        ],
    },
})
