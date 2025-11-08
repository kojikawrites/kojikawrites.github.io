import type {ImageMetadata} from "astro";


export default function getMediaMetadata(src: string): Promise<{default: ImageMetadata}>
{
    const imageGlobs = import.meta.glob<{ default: ImageMetadata }>('/src/assets/**/*.{jpeg,jpg,png,gif,svg,webp,mp4}');
    console.log(`getMediaMetadata: ${src}`);
    const value = imageGlobs[`${src}`];
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

export async function getImageGlobDict() {
    const imgGlobs = import.meta.glob<{ default: ImageMetadata }>('/src/assets/**/*.{jpeg,jpg,png,gif,svg,webp,mp4}');
    const imgGlobPromiseList = Object.entries(imgGlobs).map(async ([key, importFn]) => {
        const module = await importFn();
        return [key, module.default] as const; // Use 'as const' for better type inference in TS
    });

    const imgGlobResolvedList = await Promise.all(imgGlobPromiseList);
    return Object.fromEntries(imgGlobResolvedList);
}
