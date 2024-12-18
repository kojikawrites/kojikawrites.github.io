import toSafeId from "./toSafeId";
import {KeyType} from "./enums";
import getPosts from "./getPosts";
import {extractKeyList} from "./getPostData";

export function toSafeKey(key: string, prefix:string = '') {
    const isUnkeyed = key.startsWith('~') && key.endsWith('~')

    return (isUnkeyed ? '' : prefix) + toSafeId(key.replace('~', ''), false);
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
