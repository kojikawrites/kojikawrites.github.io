import toSafeId from "./toSafeId";
import {KeyType} from "./enums";

export function toSafeKey(key: string, prefix:string = '') {
    const isUnkeyed = key.startsWith('~') && key.endsWith('~')

    return (isUnkeyed ? '' : prefix) + toSafeId(key.replace('~', ''), false);
}


export function getKeyId(keyType: KeyType, key:string) : string {
    return `${keyType}-${toSafeKey(key, '')}`
}
