import { defineConfig } from 'astro/config'
import svelte from '@astrojs/svelte'
import mdx from '@astrojs/mdx';
import remarkGfm from 'remark-gfm'
import remarkMath from "remark-math";
import remarkSmartypants from 'remark-smartypants'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeMathjax from "rehype-mathjax";
import {remarkReadingTime}  from './remark-reading-time.mjs';
import {remarkPublishDateFromFilename} from "./remark-publish-date-from-filename.mjs";
import tailwind from '@astrojs/tailwind';
import solidJs from '@astrojs/solid-js';
import yaml from '@rollup/plugin-yaml';
import {
    transformerNotationDiff,
    transformerNotationFocus,
    transformerMetaHighlight,
    transformerNotationHighlight
} from '@shikijs/transformers';

// https://astro.build/config
export default defineConfig({
  vite: {
    css: {
      devSourcemap: true,
      transformer: "postcss",
    },
    plugins: [yaml()]
  },
  site: 'https://hiivelabs.com',
  integrations: [mdx(), svelte(), tailwind(), solidJs()],
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
        },
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
