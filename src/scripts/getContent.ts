import {getSiteCode} from "./getSiteConfig";

type ContentFilterOptions = {
    basePath: string;          // e.g., 'posts', 'blog', 'pagecontent'
    filterDrafts?: boolean;    // Whether to exclude _drafts folders
    filterTest?: boolean;      // Whether to exclude _test folders in production
};

/**
 * Generic content filter that handles site-filtering and slug extraction
 * Takes the result of import.meta.glob and filters/processes it
 */
export function filterContent(
    globResult: Record<string, any>,
    options: ContentFilterOptions
) {
    const siteCode = getSiteCode();
    const pathFilter = `${options.basePath}/${siteCode}/`;

    let filtered = Object.entries(globResult)
        .filter(([filePath]) => {
            // Check if path contains our base path and site code
            if (!filePath.includes(pathFilter)) return false;

            // Filter out drafts if requested
            if (options.filterDrafts && filePath.includes('/_drafts/')) return false;

            return true;
        })
        .map(([filePath, content]) => {
            // Extract slug: everything after siteCode/, with extension removed
            const splitter = `${siteCode}/`;
            const parts = filePath.split(splitter);
            const filename = parts.slice(1).join(splitter);
            const slug = filename.replace(/\.(astro|mdx|md)$/, '');

            return {
                ...content,
                file: filePath,
                slug: slug
            };
        });

    // Filter test content in production if requested
    if (options.filterTest && import.meta.env.PROD) {
        filtered = filtered.filter(c => !c.file.includes('/_test/'));
    }

    return filtered;
}
