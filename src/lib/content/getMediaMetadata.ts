import type {ImageMetadata} from "astro";
import {getSiteCode} from "../config/getSiteCode.ts";
import {siteGlob} from "../utils/siteGlob";

export default async function getMediaMetadata(src: string, excludeVideo: boolean = false): Promise<{default: ImageMetadata}>
{

    const mediaFilter = (eager:boolean) =>
        eager
            ? import.meta.glob<{ default: any }>([
                '/src/assets/**/*.{jpeg,jpg,png,gif,svg,webp,mp4}',
                '/src/.sites/**/*.{jpeg,jpg,png,gif,svg,webp,mp4}'
            ], { eager: true })
            : import.meta.glob<{ default: any }>([
                '/src/assets/**/*.{jpeg,jpg,png,gif,svg,webp,mp4}',
                '/src/.sites/**/*.{jpeg,jpg,png,gif,svg,webp,mp4}'
            ]);

    // Use siteGlob with the glob function (for caching and filtering)
    const mediaGlobs = await siteGlob({
        siteCode: getSiteCode(),
        type: 'media',
        eager: false,
        globFilter: mediaFilter,
        excludeExtensions: excludeVideo ? ['.mp4'] : []

    });
    // console.log('mediaGlobs', mediaGlobs);

    const value = mediaGlobs[src];
    // console.log(value)
    if (!value) {
        console.warn(`No media glob found for ${src}`);
        return null;
    }

    try {
        return value();
    }
    catch (error) {
        console.error(`getMediaMetadata: ${src}: ${error}`);
        return null;
    }
}
