import type { Plugin, HmrContext } from 'vite';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Vite plugin that:
 * 1. Blocks default HMR for content/config files to prevent Keystatic refresh conflicts
 * 2. Sends custom content-changed events that BaseHead.astro handles
 * 3. Non-Keystatic pages reload via the custom event; Keystatic pages ignore it
 */
export default function globRefreshPlugin(): Plugin {
    // Patterns for site files
    const contentPattern = /\/\.sites\/[^/]+\/content\//;
    const configPattern = /\/\.sites\/[^/]+\/config\//;
    const statePattern = /\/\.sites\/[^/]+\/state\//;

    // Valid file extensions
    const contentExtensions = ['.md', '.mdx', '.astro'];
    const configExtensions = ['.yaml', '.yml', '.json'];

    const isSiteFile = (filePath: string): { isContent: boolean; isConfig: boolean } => {
        const normalizedPath = filePath.replace(/\\/g, '/');
        const ext = path.extname(normalizedPath).toLowerCase();

        if (contentPattern.test(normalizedPath) && contentExtensions.includes(ext)) {
            return { isContent: true, isConfig: false };
        }
        // Config and state directories both use configExtensions
        if ((configPattern.test(normalizedPath) || statePattern.test(normalizedPath)) && configExtensions.includes(ext)) {
            return { isContent: false, isConfig: true };
        }
        return { isContent: false, isConfig: false };
    };

    return {
        name: 'vite-plugin-glob-refresh',

        // Block default HMR for content/config files
        // This prevents Vite from triggering reloads that would affect Keystatic
        handleHotUpdate(ctx: HmrContext) {
            const { isContent, isConfig } = isSiteFile(ctx.file);

            if (isContent || isConfig) {
                const fileName = path.basename(ctx.file);
                const source = isContent ? 'content-edit' : 'config-edit';

                console.log(`\n📝 [edit] ${fileName} (HMR blocked, sending custom event)`);

                // Send custom event - BaseHead.astro handles this
                // Keystatic pages don't have the listener, so they won't reload
                const hotServer = (ctx.server as any).hot || ctx.server.ws;
                hotServer.send({
                    type: 'custom',
                    event: 'content-changed',
                    data: { file: fileName, source }
                });

                // Return empty array to block Vite's default HMR
                return [];
            }
        },

        configureServer(server) {
            // Helper to invalidate specific content modules that use import.meta.glob
            const invalidateContentModules = () => {
                const targetModules = [
                    '/src/lib/content/getPosts.ts',
                    '/src/lib/content/getPages.ts',
                    '/src/lib/content/getAllPageTitles.ts',
                    '/src/lib/content/getPostData.ts'
                ];

                for (const mod of server.moduleGraph.idToModuleMap.values()) {
                    if (mod.file && targetModules.some(target => mod.file!.endsWith(target))) {
                        console.log(`   Invalidating: ${mod.file}`);
                        server.moduleGraph.invalidateModule(mod);
                    }
                }
            };

            // Watch for new files being added
            server.watcher.on('add', (filePath: string) => {
                const { isContent, isConfig } = isSiteFile(filePath);
                if (!isContent && !isConfig) return;

                // Skip drafts
                if (filePath.includes('/_drafts/')) return;

                const fileName = path.basename(filePath);
                const source = isContent ? 'content-add' : 'config-add';

                console.log(`\n📝 [add] ${fileName}`);

                // Invalidate content modules so import.meta.glob picks up new files
                if (isContent) {
                    invalidateContentModules();
                }

                // Send custom event - non-Keystatic pages will reload via BaseHead.astro
                const hotServer = (server as any).hot || server.ws;
                hotServer.send({
                    type: 'custom',
                    event: 'content-changed',
                    data: { file: fileName, source }
                });
            });

            // Watch for file deletions
            // No invalidation needed - getPosts.ts uses lazy loading with try/catch
            // to gracefully handle deleted files. Keystatic handles its own redirect.
            server.watcher.on('unlink', (filePath: string) => {
                const { isContent, isConfig } = isSiteFile(filePath);
                if (!isContent && !isConfig) return;

                const fileName = path.basename(filePath);
                console.log(`\n🗑️ [delete] ${fileName}`);

                // If a page was deleted, regenerate the menu to remove orphaned entries
                if (isContent && filePath.includes('/content/pagecontent/')) {
                    console.log('🔄 Regenerating menu after page deletion...');
                    try {
                        execSync('npx tsx src/build/generateNavMenu.ts', {
                            stdio: 'inherit',
                            cwd: process.cwd()
                        });
                        console.log('✅ Menu updated');
                    } catch (error) {
                        console.error('❌ Menu regeneration failed');
                    }
                }
            });

            console.log('👀 Watching site content/config files');
        },
    };
}
