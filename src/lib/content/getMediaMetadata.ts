import type {ImageMetadata} from "astro";
import {getSiteCode} from "../config/getSiteConfig.ts";

// Cache all media globs (including videos) per site
let cachedImageGlobs: Record<string, () => Promise<{default: ImageMetadata}>> | null = null;
let cachedSiteCode: string | null = null;

export default function getMediaMetadata(src: string, excludeVideo: boolean = false): Promise<{default: ImageMetadata}>
{
    const siteCode = getSiteCode();

    // Check if we need to rebuild the cache (first run or site changed)
    if (!cachedImageGlobs || cachedSiteCode !== siteCode) {
        // Always load ALL media types (including mp4) for caching
        const allMediaGlobs = import.meta.glob<{ default: ImageMetadata }>([
            '/src/assets/**/*.{jpeg,jpg,png,gif,svg,webp,mp4}',
            '/src/.sites/**/*.{jpeg,jpg,png,gif,svg,webp,mp4}'
        ]);

        // Filter by site - exclude entries from other sites
        cachedImageGlobs = Object.fromEntries(
            Object.entries(allMediaGlobs).filter(([key, _]) => {
                // If the key contains ".sites/", it must also contain the current siteCode
                if (key.includes('.sites/')) {
                    return key.includes(`${siteCode}/`);
                }
                // If it doesn't contain ".sites/", keep it (shared assets)
                return true;
            })
        );

        cachedSiteCode = siteCode;
        console.log(`Cached media metadata for site: ${siteCode}`);
    }

    // Filter by video exclusion if needed (from cached collection)
    const filteredGlobs = excludeVideo
        ? Object.fromEntries(
            Object.entries(cachedImageGlobs).filter(([key, _]) => !key.endsWith('.mp4'))
        )
        : cachedImageGlobs;

    // console.log(`getMediaMetadata: ${src}`);
    const value = filteredGlobs[`${src}`];
    if (!value) {
        console.warn(`No media glob found for ${src}`);
    }
    try {
        return value();
    }
    catch (error) {
        console.error(`getMediaMetadata: ${src}: ${error}`);
    }
}
