import {getSiteConfig} from "./getSiteConfig";
import {filterContent} from "./getContent";

const siteConfig = await getSiteConfig();
const blog_path = siteConfig.blog.path;

export default function getPosts() {
    // Glob all blog posts (posts and blog folders)
    const globResult = import.meta.glob(
        [
            '../assets/**/posts/**/*.{md,mdx}',
            '../assets/**/blog/**/*.{md,mdx}',
            '!../assets/**/posts/**/_drafts/**',
            '!../assets/**/blog/**/_drafts/**'
        ],
        {eager: true}
    );

    // Use shared content filter
    return filterContent(globResult, {
        basePath: blog_path,
        filterDrafts: true,
        filterTest: true
    });
}
