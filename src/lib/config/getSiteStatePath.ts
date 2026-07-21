import {getSiteCode} from "./getSiteCode.ts";

/**
 * Get the relative path to a file in the site-specific state directory.
 * This directory stores generated/dynamic files like logo-map.json and system-menu-items.json.
 *
 * NOTE: This is a SERVER-ONLY function. Do not import this in client-side code.
 *
 * @param filename - The name of the file (e.g., 'logo-map.json', 'system-menu-items.json')
 * @param siteCode - Optional site code. If not provided, will use getSiteCode()
 * @returns Relative path to the file in src/.sites/{siteCode}/state
 */
export function getSiteStatePath(filename: string, siteCode?: string): string {
    const site = siteCode || getSiteCode();
    return `src/.sites/${site}/state/${filename}`;
}
