import {filterContent} from "./getContent";

export default function getPages() {
    // Glob all page content files
    const globResult = import.meta.glob(
        '/src/.sites/**/content/pagecontent/**/*.{md,mdx,astro}',
        {eager: true}
    );

    // Use shared content filter
    const filteredContent = filterContent(globResult, {
        basePath: '.sites',
        pathToIgnore: 'content/pagecontent',
        filterDrafts: false,
        filterTest: false,
    });
    // console.log('filteredContent', filteredContent);
    return filteredContent;
}
