import {getSiteCode} from "../config/getSiteCode";
import {filterContent} from "./filterContent";
import {siteGlob} from "../utils/siteGlob";

export default async function getPages() {
    // Glob function for pages - MUST stay exactly as is to avoid breaking everything
    const pagesFilter = (eager:boolean) => eager
        ? import.meta.glob<{ default: T }>('/src/.sites/**/content/pagecontent/**/*.{md,mdx,astro}', { eager: true })
        : import.meta.glob<{ default: T }>('/src/.sites/**/content/pagecontent/**/*.{md,mdx,astro}');


    // Use siteGlob with the glob function (for caching and filtering)
    const globResult = await siteGlob({
        siteCode: getSiteCode(),
        type: 'pages',
        globFilter: pagesFilter,
    });
    // console.log(globResult);
    // Use shared content filter for additional processing (slugs)
    const filteredContent = filterContent(globResult as Record<string, any>, {
        basePath: '.sites',
        pathToIgnore: 'content/pagecontent',
        filterDrafts: false,
        filterTest: false,
    });
    // console.log(filteredContent);
    return filteredContent;
}
