import {filterContent} from "./getContent";

export default function getPages() {
    // Glob all page content files
    const globResult = import.meta.glob(
        '../assets/pagecontent/**/*.{md,mdx,astro}',
        {eager: true}
    );

    // Use shared content filter
    return filterContent(globResult, {
        basePath: 'pagecontent',
        filterDrafts: false,
        filterTest: false
    });
}
