import tailwindcss from 'tailwindcss';
import postcss from 'postcss';
import cssnano from 'cssnano';

import {getSiteCode} from "./getSiteConfig.ts";
import defaultPreset from "cssnano-preset-default";


let cachedCSS: string | null = null;
let cachedSiteCode: string | null = null;

export async function getSiteStyle(): Promise<string> {
    const site = getSiteCode();
    if (cachedCSS && cachedSiteCode === site) {
        console.log('Using cached CSS for', site);
        return cachedCSS;
    }
    const cssGlobs = import.meta.glob<any>(
        [
            '../../.sites/**/styles/custom.css',
        ]
    );

    const cssKeys = Object.keys(cssGlobs);

    const matchingKey = cssKeys.find(key => key.includes(site));
    // console.log(cssKeys, matchingKey);
    if (!matchingKey) {
        console.warn(`No css found for ${site}...`);
    }
    console.log("matchingKey:", matchingKey)
    return await cssGlobs[matchingKey]().then(css => {
        // manually process the tailwind
        return (async () => {
            const result = await postcss([
                tailwindcss({
                    //...config,
                    content: [{raw: css, extension: "css"}],
                }),
                cssnano({preset: defaultPreset}),
                // ]).process(`@tailwind base;@tailwind components;@tailwind utilities;`, {
            ]).process(`@tailwind base;@tailwind components;@tailwind utilities;`, {
                from: undefined,
            });
            // Cache the result
            cachedCSS = result.css;
            cachedSiteCode = site;

            return cachedCSS;
        })();
    });
}
