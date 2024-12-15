// import { parse, stringify } from 'yaml'

export function getSiteCode(): string {
    return import.meta.env.SITE.replace(/^.*?\/\//, '').split('/')[0];
}

export async function getSiteConfig() {
    const site = getSiteCode();

    const yamlGlobs = import.meta.glob<{ default: any }>('/src/assets/config/*.yml');
    const yamlKeys = Object.keys(yamlGlobs);
    const matchingKey = yamlKeys.find(key => key.includes(site));
    if (!matchingKey) {
        console.warn(`No yaml found for ${site}`);
    }
    console.log(`Reading ${site} yaml config...`);
    return await yamlGlobs[matchingKey]().then(y => {
            return y;
        }
    );
}
