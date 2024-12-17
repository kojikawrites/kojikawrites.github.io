import type {ImageMetadata} from "astro";

export default function getImageMetadata(src: string): Promise<{default: ImageMetadata}>
{
    const imageGlobs = import.meta.glob<{ default: ImageMetadata }>('/src/assets/**/*.{jpeg,jpg,png,gif,svg,webp}');
    const value = imageGlobs[`${src}`];
    if (!value) {
        console.warn(`No image glob found for ${src}`);
    }
    return value();
}