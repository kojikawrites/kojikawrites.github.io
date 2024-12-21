import {getSiteCode} from "./getSiteConfig";

export async function getBlueskyPostedJson(): Promise<Record<string, any>> {
    const site = getSiteCode();

    const jsonGlobs = import.meta.glob<{
        default: any
    }>('/src/assets/_private/state/**/*.json');
    const jsonKeys = Object.keys(jsonGlobs);
    // console.log('jsonKeys', jsonGlobs);
    const matchingKey = jsonKeys.find(key => key.includes(site));
    if (!matchingKey) {
        console.warn(`No bluesky json found for ${site}`);
        return null;
    }
    // console.log(`Reading ${site} bluesky json...`);
    const jsonValue = await jsonGlobs[matchingKey]();
    // console.log('jsonValue', jsonValue.default);
    return jsonValue.default;
}
