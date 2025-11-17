import {getSiteCode} from "../config/getSiteCode.ts";
import {siteGlob} from "../utils/siteGlob";

export async function getAstroFile(filename: string) : Promise<any> {
    const site = getSiteCode();

    // Get the specific page file using siteGlob (cached and site-filtered)
    const astroValue: any = await siteGlob({
        siteCode: site,
        type: 'components',
        filename: filename,
        globFilter: (eager) => import.meta.glob<{
            default: any
        }>('/src/.sites/**/content/pagecontent/**/*.{mdx,astro}')
    });

    if (!astroValue) {
        console.warn(`No astro file ${filename} found for ${site}`);
        return null;
    }

    return {
        Content: astroValue.Content ?? astroValue.default,
        title: astroValue?.frontmatter?.title ?? '',
        description: astroValue?.frontmatter?.description ?? '',
    }
}

