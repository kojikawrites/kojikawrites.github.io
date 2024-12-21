import getPostData from "./getPostData";

import {getSiteConfig} from "./getSiteConfig";
const siteConfig = await getSiteConfig();

export default function buildPostHref(post, prefix='/') : string {
    const {  path } = getPostData(post);
    const permalink = `${prefix}${siteConfig.blog.prefix}${path}`
    console.log('permalink', permalink);
    return permalink;
}

export function buildPermalink(siteRoot: string, urlPathname:string) {
    const permalink = `${siteRoot}${urlPathname}`;
    console.log('permalink', permalink);
    return permalink;
}
