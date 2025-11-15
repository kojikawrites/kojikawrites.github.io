
export async function getJson(siteCode: string, filename: string): Promise<Record<string, any>> {
    const jsonGlobs = import.meta.glob<{
        default: any
    }>('/src/.sites/**/state/*.json');
    const jsonKeys = Object.keys(jsonGlobs);
    // console.log('jsonKeys', jsonGlobs);
    const matchingKey = jsonKeys.find(key => key.includes(`.sites/${siteCode}`) && key.includes(filename));
    if (!matchingKey) {
        console.warn(`No ${filename} json found for ${siteCode}`);
        return null;
    }
    // console.log(`Reading ${site} bluesky json...`);
    const jsonValue = await jsonGlobs[matchingKey]();
    // console.log('jsonValue', jsonValue.default);
    return jsonValue.default;
}
