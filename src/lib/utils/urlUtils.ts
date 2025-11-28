import getPostData from "../content/getPostData";
import {getSiteConfig} from "../config/getSiteConfig";

const siteConfig = await getSiteConfig();

// Normalize blog path - strip trailing slash, add it back for URL construction
const blogPath = (siteConfig.blog?.path || 'blog').replace(/\/$/, '') + '/';

export function cleanUrl(url: string) {
    return url.replace(/\/\//g, '/').replace(/\.html$/i, '');
}

export default function buildPostHref(post, prefix='/') : string {
    const {  path } = getPostData(post);
    const permalink = cleanUrl(`${prefix}${blogPath}${path}`);
    // console.log('buildPostHref: permalink', permalink);
    return permalink;
}

export function buildPermalink(siteRoot: string, urlPathname:string) {
    const permalink = cleanUrl(`${siteRoot}${urlPathname}`);
    // console.log('buildPermalink: permalink', permalink);
    return permalink;
}
