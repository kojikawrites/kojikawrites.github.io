// Cache for resolved alias map (built from site config)
let aliasMapCache: Map<string, string> | null = null;

/**
 * Build a reverse lookup map from aliases to their canonical names.
 * The config format is: { "canonical-name": ["alias1", "alias2"] }
 * This builds: { "alias1": "canonical-name", "alias2": "canonical-name" }
 */
export function buildAliasMap(aliases: Record<string, string[]> | undefined): Map<string, string> {
    const map = new Map<string, string>();
    if (!aliases) return map;

    for (const [canonical, aliasList] of Object.entries(aliases)) {
        if (Array.isArray(aliasList)) {
            for (const alias of aliasList) {
                map.set(alias.toLowerCase(), canonical.toLowerCase());
            }
        }
    }
    return map;
}

/**
 * Set the alias map cache (called once from getSiteConfig or similar)
 */
export function setAliasMapCache(aliases: Record<string, string[]> | undefined): void {
    aliasMapCache = buildAliasMap(aliases);
}

/**
 * Get the alias map cache
 */
export function getAliasMapCache(): Map<string, string> | null {
    return aliasMapCache;
}

/**
 * Resolve a key (tag or category) to its canonical name using aliases.
 * If no alias exists, returns the key as-is (lowercased).
 */
export function resolveKeyAlias(key: string, aliasMap?: Map<string, string>): string {
    const lowerKey = key.toLowerCase();
    const map = aliasMap ?? aliasMapCache;
    if (map && map.has(lowerKey)) {
        return map.get(lowerKey)!;
    }
    return lowerKey;
}

/**
 * Resolve a list of keys to their canonical names using aliases.
 */
export function resolveKeyAliases(keys: string[], aliasMap?: Map<string, string>): string[] {
    return keys.map(k => resolveKeyAlias(k, aliasMap));
}