import getPages from "./getPages";
import {getAstroFile} from "./getAstroFile";

/**
 * Extract title from a page
 */
async function extractTitle(page: any): Promise<string | null> {
    // Try to get title from frontmatter if already loaded
    if (page?.frontmatter?.title) {
        return page.frontmatter.title;
    }

    // Try to load the file and extract title
    if (page?.file) {
        try {
            const astroFile = await getAstroFile(page.file);
            return astroFile?.title || null;
        } catch (e) {
            console.warn(`Failed to extract title from ${page.file}:`, e);
            return null;
        }
    }

    return null;
}

/**
 * Get all page titles for breadcrumbs and navigation
 * Gets pages from site-specific pagecontent directory
 * Returns a mapping of slug -> title
 */
export async function getAllPageTitles(): Promise<Record<string, string>> {
    const titles: Record<string, string> = {};
    const pages = await getPages();

    // Extract titles from pages
    for (const page of pages) {
        const title = await extractTitle(page);
        if (title && title !== "404") {
            // Use the slug directly from the page object
            titles[(page as any).slug] = title;
        }
    }
    // console.log('getAllPageTitles', titles);
    return titles;
}
