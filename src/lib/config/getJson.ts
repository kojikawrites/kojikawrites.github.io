import {siteGlob} from "../utils/siteGlob";

export async function getJson(siteCode: string, filename: string): Promise<Record<string, any>> {

    const jsonFilter = (eager: boolean) =>
        eager
            ? import.meta.glob<{ default: any }>('/src/.sites/**/state/*.json', { eager: true })
            : import.meta.glob<{ default: any }>('/src/.sites/**/state/*.json');

    return await siteGlob({
        siteCode: siteCode,
        type: 'json',
        filename: filename,
        globFilter: jsonFilter
    });
}
