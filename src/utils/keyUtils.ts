import toSafeId from "./toSafeId";
import {KeyType} from "./enums";
import getPosts from "./getPosts";

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
    return keyArray?.map(k => k?.toLowerCase());
}

export function getKeyId(keyType: KeyType, key:string) : string {
    return `${keyType}-${toSafeKey(key, '')}`
}

export function getAllKeys(keyType:KeyType) : string[] {
    const allPosts = getPosts();
    const allKeys = allPosts.map(p => (
        extractKeyList(p.frontmatter[keyType])
    )).filter(p => p);
    return Array.from(new Set(allKeys.flat()));
}
