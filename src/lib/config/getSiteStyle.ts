import tailwindcss from 'tailwindcss';
import postcss from 'postcss';
import cssnano from 'cssnano';

import {getSiteCode} from "./getSiteCode.ts";
import {siteGlob} from "../utils/siteGlob";

import defaultPreset from "cssnano-preset-default";


export async function getSiteStyle(): Promise<string> {


    const siteCssFilter = (eager:boolean) => eager //  '../../.sites/**/styles/custom.css',
             ? import.meta.glob<any>('/src/.sites/**/styles/custom.css', { eager: true })
             : import.meta.glob<any>('/src/.sites/**/styles/custom.css');

    const siteCssPostProcessor = async (css) => {
        // Process with Tailwind and cssnano
        const result = await postcss([
            tailwindcss({
                content: [{raw: css, extension: "css"}],
            }),
            cssnano({preset: defaultPreset}),
        ]).process(`@tailwind base;@tailwind components;@tailwind utilities;`, {
            from: undefined,
        });
        return result.css;
    }
    const site = getSiteCode();
    const processedCSS = await siteGlob<string>({
        siteCode: site,
        type: 'css',
        filename: 'custom.css',
        globFilter: siteCssFilter,
        postProcess: siteCssPostProcessor
    });
    // Load custom.css and process with postcss/tailwind/cssnano (cached in siteGlob)
    // const _processedCSS = await getSiteCustomCSS(site, async (css) => {
    //     // Process with Tailwind and cssnano
    //     const result = await postcss([
    //         tailwindcss({
    //             content: [{raw: css, extension: "css"}],
    //         }),
    //         cssnano({preset: defaultPreset}),
    //     ]).process(`@tailwind base;@tailwind components;@tailwind utilities;`, {
    //         from: undefined,
    //     });
    //     return result.css;
    // });

    if (!processedCSS) {
        console.warn(`No CSS found for ${site}`);
        return '';
    }

    return processedCSS as string;
}
