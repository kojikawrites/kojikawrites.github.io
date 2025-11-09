import type { AstroIntegration } from 'astro';
import { execSync } from 'child_process';
import path from 'path';
import { config as dotenvConfig } from 'dotenv';

// Load environment variables from .env file
dotenvConfig();

export default function menuWatcher(): AstroIntegration {
  return {
    name: 'menu-watcher',
    hooks: {
      'astro:server:setup': ({ server }) => {
        // Get site code from environment variable or use default
        const SITE_CODE = process.env.SITE_CODE || 'hiivelabs.com';

        const watchPaths = [
          `src/assets/pagecontent/${SITE_CODE}`,
          'src/assets/config/system-menu-items.json'
        ];

        let regenerating = false;

        const regenerateMenu = () => {
          if (regenerating) return;

          regenerating = true;
          console.log('\n🔄 Regenerating menu...');

          try {
            execSync('npx tsx src/scripts/generateNavMenu.ts', {
              stdio: 'inherit',
              cwd: process.cwd()
            });
            console.log('✅ Menu updated');

            // Trigger full page reload after menu regeneration
            server.ws.send({
              type: 'full-reload',
              path: '*'
            });
            console.log('🔃 Page reload triggered\n');
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
          if (relativePath.includes('assets/config') || relativePath.includes('assets/pagecontent')) {
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
