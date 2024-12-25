import getPostData from "./getPostData";

import {getSiteConfig} from "./getSiteConfig";
const siteConfig = await getSiteConfig();

export function cleanUrl(url: string) {
    return url.replace(/\/\//g, '/').replace(/\.html$/i, '');
}

export default function buildPostHref(post, prefix='/') : string {
    const {  path } = getPostData(post);
    const permalink = cleanUrl(`${prefix}${siteConfig.blog.prefix}${path}`);
    // console.log('buildPostHref: permalink', permalink);
    return permalink;
}

export function buildPermalink(siteRoot: string, urlPathname:string) {
    const permalink = cleanUrl(`${siteRoot}${urlPathname}`);
    // console.log('buildPermalink: permalink', permalink);
    return permalink;
}
