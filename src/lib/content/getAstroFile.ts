import {getSiteCode} from "../config/getSiteCode.ts";
import {siteGlob} from "../utils/siteGlob";

export async function getAstroFile(filename: string) : Promise<any> {
    const site = getSiteCode();

    // Get the specific page file using siteGlob (cached and site-filtered)
    // Note: Must use eager to load MDX content immediately (non-eager returns just the loader)
    const astroValue: any = await siteGlob({
        siteCode: site,
        type: 'components',
        filename: filename,
        eager: true, // Critical: must be eager to get actual content, not just loader
        globFilter: (eager) => eager
            ? import.meta.glob<{ default: any }>('/src/.sites/**/content/pagecontent/**/*.{mdx,astro}', { eager: true })
            : import.meta.glob<{ default: any }>('/src/.sites/**/content/pagecontent/**/*.{mdx,astro}')
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

