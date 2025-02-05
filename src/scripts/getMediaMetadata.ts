import type {ImageMetadata} from "astro";

export default function getMediaMetadata(src: string): Promise<{default: ImageMetadata}>
{
    const imageGlobs = import.meta.glob<{ default: ImageMetadata }>('/src/assets/**/*.{jpeg,jpg,png,gif,svg,webp,mp4}');
    const value = imageGlobs[`${src}`];
    if (!value) {
        console.warn(`No media glob found for ${src}`);
    }
    return value();
}
