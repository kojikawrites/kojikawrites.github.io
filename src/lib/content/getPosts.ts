import {getSiteConfig} from "../config/getSiteConfig";
import {filterContent} from "./filterContent";
import {siteGlob} from "../utils/siteGlob";
import {getSiteCode} from "../config/getSiteCode";

const siteConfig = await getSiteConfig();
// console.log('getPosts:siteConfig', siteConfig);
const blog_path = siteConfig.blog.path;

export default async function getPosts() {
    // Glob function for posts - MUST stay exactly as is to avoid breaking everything
    const postFilter = (eager:boolean) => import.meta.glob<{ default: any }>(
        [
            '/src/.sites/**/content/posts/**/*.{md,mdx}',
            '/src/.sites/**/content/blog/**/*.{md,mdx}',
            '!/src/.sites/**/content/posts/**/_drafts/**',
            '!/src/.sites/**/content/blog/**/_drafts/**'
        ],
        {eager: true}
    );

    // Use siteGlob with the glob function (for caching and filtering)
    const globResult = await siteGlob({
        siteCode: getSiteCode(),
        type: 'posts',
        globFilter: postFilter
    });

    // Use shared content filter for additional processing (drafts, test, slugs)
    const filteredContent = filterContent(globResult as Record<string, any>, {
        basePath: blog_path,
        pathToIgnore: '/content/pagecontent/',
        filterDrafts: true,
        filterTest: true,
    });

    return filteredContent;
}
