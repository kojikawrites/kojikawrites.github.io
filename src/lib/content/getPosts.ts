import {getSiteConfig} from "../config/getSiteConfig";
import {filterContent} from "./filterContent";
import {siteGlob} from "../utils/siteGlob";
import {getSiteCode} from "../config/getSiteCode";

/**
 * Sort posts by publishDate (descending), then by createdAt (descending) for same-day posts.
 * Posts without createdAt are sorted after those with it on the same day.
 */
export function sortPosts<T extends { frontmatter: { publishDate: string; createdAt?: string } }>(posts: T[]): T[] {
    return posts.slice().sort((a, b) => {
        const dateA = new Date(a.frontmatter.publishDate).valueOf();
        const dateB = new Date(b.frontmatter.publishDate).valueOf();
        if (dateB !== dateA) return dateB - dateA;
        // Secondary sort by createdAt for posts on the same day
        const createdA = a.frontmatter.createdAt ? new Date(a.frontmatter.createdAt).valueOf() : 0;
        const createdB = b.frontmatter.createdAt ? new Date(b.frontmatter.createdAt).valueOf() : 0;
        return createdB - createdA;
    });
}

const siteConfig = await getSiteConfig();
// console.log('getPosts:siteConfig', siteConfig);
const blog_path = siteConfig.blog.path;

export interface GetPostsOptions {
    includeDrafts?: boolean;
}

// Static glob for all posts (including drafts) - Vite requires static patterns
const allPostsGlob = (eager: boolean) => import.meta.glob<{ default: any }>(
    [
        '/src/.sites/**/content/posts/**/*.{md,mdx}',
        '/src/.sites/**/content/blog/**/*.{md,mdx}',
    ],
    { eager: false }
);

// Static glob for published posts only (excluding drafts)
const publishedPostsGlob = (eager: boolean) => import.meta.glob<{ default: any }>(
    [
        '/src/.sites/**/content/posts/**/*.{md,mdx}',
        '/src/.sites/**/content/blog/**/*.{md,mdx}',
        '!/src/.sites/**/content/posts/**/_drafts/**',
        '!/src/.sites/**/content/blog/**/_drafts/**'
    ],
    { eager: false }
);

export default async function getPosts(options: GetPostsOptions = {}) {
    const { includeDrafts = false } = options;

    // Use siteGlob with the appropriate glob function
    const lazyGlobResult = await siteGlob({
        siteCode: getSiteCode(),
        type: includeDrafts ? 'posts-with-drafts' : 'posts',
        globFilter: includeDrafts ? allPostsGlob : publishedPostsGlob
    });

    // Load each post, filtering out any that fail (e.g., deleted files)
    const globResult: Record<string, any> = {};
    if (lazyGlobResult) {
        const entries = Object.entries(lazyGlobResult as Record<string, () => Promise<any>>);
        await Promise.all(entries.map(async ([path, loader]) => {
            try {
                const loaded = await loader();
                // Mark posts from _drafts folder as drafts
                // Note: Module objects are frozen, so we create a new object with spread
                if (path.includes('/_drafts/')) {
                    globResult[path] = {
                        ...loaded,
                        frontmatter: { ...loaded.frontmatter, isDraft: true }
                    };
                } else {
                    globResult[path] = loaded;
                }
            } catch (e) {
                // Log the actual error to diagnose the issue
                console.log(`[getPosts] Failed to load: ${path}`);
                console.log(`[getPosts] Error:`, e);
            }
        }));
    }

    // Use shared content filter for additional processing (drafts, test, slugs)
    const filteredContent = filterContent(globResult as Record<string, any>, {
        basePath: blog_path,
        pathToIgnore: '/content/pagecontent/',
        filterDrafts: !includeDrafts,  // Only filter drafts if we're not including them
        filterTest: true,
    });

    return filteredContent;
}
