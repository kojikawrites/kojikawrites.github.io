import {getSiteCode} from "./getSiteConfig.ts";

export async function getAstroFile(filename: string) : Promise<any> {
    const site = getSiteCode();
    const globs = import.meta.glob<{
        default: any
    }>('/src/assets/pagecontent/**/*.{mdx,astro}');

    const keys = Object.keys(globs);
    const matchingKey = keys.find(key => key.includes(site) && key.includes(filename + '.'));
    if (!matchingKey) {
        console.warn(`No astro file ${filename} found for ${site}`);
        return null;
    }
    const astroValue: any = await globs[matchingKey]();
    return {
        Content: astroValue.Content ?? astroValue.default,
        title: astroValue?.frontmatter?.title ?? '',
        description: astroValue?.frontmatter?.description ?? '',
    }
}
