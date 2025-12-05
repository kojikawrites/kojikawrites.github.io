import toSafeId from "./toSafeId";
import {KeyType} from "./enums";
import getPosts from "../content/getPosts";
import {resolveKeyAlias} from "./aliasUtils";

// Re-export alias utilities for backwards compatibility
export { buildAliasMap, setAliasMapCache, getAliasMapCache, resolveKeyAlias, resolveKeyAliases } from "./aliasUtils";

export function toSafeKey(key: string, prefix:string = '') {
    const isUnkeyed = key.startsWith('~') && key.endsWith('~')

    return (isUnkeyed ? '' : prefix) + toSafeId(key.replace('~', ''), false);
}

export function extractKeyList(keys: string | string[]) : string[] {
    let keyArray: string[];
    if (typeof keys === 'string') {
        // Split the string by whitespace into an array
        keyArray = keys.trim().split(/\s+/);
    } else if (Array.isArray(keys)) {
        keyArray = keys;
    }
    // Lowercase and resolve aliases (e.g., "ml" -> "machine-learning")
    return keyArray?.map(k => k ? resolveKeyAlias(k.toLowerCase()) : k);
}

export function getKeyId(keyType: KeyType, key:string) : string {
    return `${keyType}-${toSafeKey(key, '')}`
}

export async function getAllKeys(keyType:KeyType) : Promise<string[]> {
    const allPosts = await getPosts();
    const allKeys = allPosts.map(p => (
        extractKeyList(p.frontmatter[keyType])
    )).filter(p => p);
    return Array.from(new Set(allKeys.flat()));
}
