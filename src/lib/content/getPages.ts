import {getSiteCode} from "../config/getSiteCode";
import {filterContent} from "./filterContent";
import {siteGlob} from "../utils/siteGlob";

export default async function getPages() {
    // Glob function for pages - use lazy loading to handle deleted files gracefully
    const pagesFilter = (eager:boolean) => import.meta.glob<{ default: any }>(
        '/src/.sites/**/content/pagecontent/**/*.{md,mdx,astro}',
        { eager: false }  // Use lazy loading to avoid errors on deleted files
    );

    // Use siteGlob with the glob function (for caching and filtering)
    const lazyGlobResult = await siteGlob({
        siteCode: getSiteCode(),
        type: 'pages',
        globFilter: pagesFilter,
    });

    // Load each page, filtering out any that fail (e.g., deleted files)
    const globResult: Record<string, any> = {};
    if (lazyGlobResult) {
        const entries = Object.entries(lazyGlobResult as Record<string, () => Promise<any>>);
        await Promise.all(entries.map(async ([path, loader]) => {
            try {
                const loaded = await loader();
                globResult[path] = loaded;
            } catch (e) {
                // File was deleted - skip it silently
                console.log(`[getPages] Skipping deleted file: ${path}`);
            }
        }));
    }

    // Use shared content filter for additional processing (slugs)
    const filteredContent = filterContent(globResult as Record<string, any>, {
        basePath: '.sites',
        pathToIgnore: 'content/pagecontent',
        filterDrafts: false,
        filterTest: false,
    });

    return filteredContent;
}
