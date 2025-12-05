import {getSiteCode} from "../config/getSiteCode.ts";
import {siteGlob} from "../utils/siteGlob";

export async function getAstroFile(filename: string) : Promise<any> {
    const site = getSiteCode();

    // Get the specific page file using siteGlob (cached and site-filtered)
    // Use lazy loading to handle deleted files gracefully
    const lazyResult: any = await siteGlob({
        siteCode: site,
        type: 'components',
        filename: filename,
        eager: false,
        globFilter: (eager) => import.meta.glob<{ default: any }>(
            '/src/.sites/**/content/pagecontent/**/*.{mdx,astro}',
            { eager: false }  // Use lazy loading to avoid errors on deleted files
        )
    });

    if (!lazyResult) {
        console.warn(`No astro file ${filename} found for ${site}`);
        return null;
    }

    // siteGlob with filename already loads the content (even with eager:false)
    // The result format from non-eager: loaded.default ?? loaded (see siteGlob line 211)
    // For MDX/Astro files, this should have Content and frontmatter
    const astroValue = lazyResult;

    // Debug: log what we got to understand the structure
    console.log(`[getAstroFile] Result for ${filename}:`, Object.keys(astroValue));

    return {
        Content: astroValue.Content ?? astroValue.default,
        title: astroValue?.frontmatter?.title ?? '',
        description: astroValue?.frontmatter?.description ?? '',
    }
}

