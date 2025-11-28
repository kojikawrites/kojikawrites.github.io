import type { AstroIntegration } from 'astro';
import { execSync } from 'child_process';
import path from 'path';
import { getSiteStatePath } from '../lib/config/getSiteStatePath.ts';
import { loadEnv } from '../lib/config/loadEnv.js';

// Load environment variables from root and site-specific .env files
loadEnv();

export default function menuWatcher(): AstroIntegration {
  return {
    name: 'menu-watcher',
    hooks: {
      'astro:server:setup': ({ server }) => {
        // Get site code from environment variable - no silent fallbacks
        const SITE_CODE = process.env.SITE_CODE;
        if (!SITE_CODE) {
          throw new Error(
            'SITE_CODE not configured. Please set SITE_CODE in your .env file.\n' +
            'Example: SITE_CODE=example.com'
          );
        }

        const watchPaths = [
          `src/.sites/${SITE_CODE}/content/pagecontent`,
          getSiteStatePath('system-menu-items.json', SITE_CODE),
          getSiteStatePath('logo-map.json', SITE_CODE)
        ];

        let regenerating = false;

        const regenerateMenu = () => {
          if (regenerating) return;

          regenerating = true;
          console.log('\n🔄 Regenerating menu...');

          try {
            execSync('npx tsx src/build/generateNavMenu.ts', {
              stdio: 'inherit',
              cwd: process.cwd()
            });
            console.log('✅ Menu updated');

            // Trigger page reload after menu regeneration
            // Use setTimeout to ensure the file system has settled
            // Note: Vite 6 renamed server.ws to server.hot
            setTimeout(() => {
              const hotServer = (server as any).hot || server.ws;
              // Send custom event - client will decide whether to reload
              // (skips reload on Keystatic editor pages to avoid draft conflicts)
              hotServer.send({
                type: 'custom',
                event: 'menu-updated',
                data: {}
              });
              console.log('🔃 Menu update notification sent\n');
            }, 100);
          } catch (error) {
            console.error('❌ Menu regeneration failed');
          } finally {
            regenerating = false;
          }
        };

        // Use Vite's file watcher - watch for both 'change' and 'add' events
        const handleFileChange = (file: string) => {
          const relativePath = path.relative(process.cwd(), file);

          // Debug: log all changes to config/content directories
          if (relativePath.includes(`${SITE_CODE}/config`) || relativePath.includes(`${SITE_CODE}/content/pagecontent`)) {
            console.log(`[MenuWatcher] File changed: ${relativePath}`);
          }

          // Check if changed file matches our watch paths
          const shouldRegenerate = watchPaths.some(watchPath =>
            relativePath.startsWith(watchPath) || relativePath === watchPath
          );

          if (shouldRegenerate) {
            console.log(`📝 ${relativePath}`);
            regenerateMenu();
          }
        };

        server.watcher.on('change', handleFileChange);
        server.watcher.on('add', handleFileChange);

        console.log('👀 Watching menu files for changes\n');
      }
    }
  };
}
