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

import {transformerMetaHighlight, transformerNotationHighlight} from '@shikijs/transformers';

const siteNameGetter = async () => {
    // get the site name from ./site.txt
    const siteText = import.meta.glob("./site.txt", {query: '?raw', import: 'default'});
    const paths = Object.keys(siteText);
        if(paths.length === 0
    )
    {
        console.error('No site.txt file found.');
        return null;
    }
    else
    {
        return await siteText[paths[0]]();
    }
};

const siteName = await siteNameGetter()
console.log('siteName:', siteName.trimEnd());

// https://astro.build/config
export default defineConfig({
  vite: {
    css: {
      devSourcemap: true,
      transformer: "postcss",
    },
    plugins: [yaml()]
  },

  // site: 'https://hiivelabs.com', //`${siteName}`,//'https://hiivelabs.com',
  site: `${siteName}`,//'https://hiivelabs.com',
  trailingSlash: 'ignore',

  integrations: [mdx(), svelte(), tailwind(), solidJs(), pagefind()],
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
          content: { type: 'text', value: ' 🔗' }
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
