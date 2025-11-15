import {getSiteConfig} from "../config/getSiteConfig";
import {filterContent} from "./getContent";

const siteConfig = await getSiteConfig();
const blog_path = siteConfig.blog.path;

export default function getPosts() {
    // Glob all blog posts (posts and blog folders)
    const globResult = import.meta.glob(
        [
            '/src/.sites/**/content/posts/**/*.{md,mdx}',
            '/src/.sites/**/content/blog/**/*.{md,mdx}',
            '!/src/.sites/**/content/posts/**/_drafts/**',
            '!/src/.sites/**/content/blog/**/_drafts/**'
        ],
        {eager: true}
    );
    // console.log('globResult', globResult);
    // console.log('blog_path', blog_path);
    // Use shared content filter
    const filteredContent = filterContent(globResult, {
        basePath: blog_path,
        pathToIgnore: '/content/pagecontent/',
        filterDrafts: true,
        filterTest: true,

    });
    // console.log('filteredContent', filteredContent);
    return filteredContent;
}
