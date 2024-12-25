import tailwindcss from 'tailwindcss';
import postcss from 'postcss';
import cssnano from 'cssnano';
// import autoprefixer from 'autoprefixer';

import {getSiteCode} from "./getSiteConfig.ts";
import defaultPreset from "cssnano-preset-default";

export async function getSiteStyle(): Promise<string> {
    const site = getSiteCode();
    const cssGlobs = import.meta.glob<any>('/src/styles/**/custom.css');
    const cssKeys = Object.keys(cssGlobs);
    const matchingKey = cssKeys.find(key => key.includes(site));
    //const matchingKey = cssKeys.find(key => key.includes('custom'));
    if (!matchingKey) {
        console.warn(`No css found for ${site}...`);
    }
    // console.log('matchingKey', matchingKey);
    // console.log(`Reading ${site} yaml config...`);
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
            ]).process(`@tailwind base;@tailwind components`, {
                from: undefined,
            });
            return result.css;
        })();
    });
}
