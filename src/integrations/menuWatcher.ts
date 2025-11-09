import type { AstroIntegration } from 'astro';
import { execSync } from 'child_process';
import path from 'path';

export default function menuWatcher(): AstroIntegration {
  return {
    name: 'menu-watcher',
    hooks: {
      'astro:server:setup': ({ server }) => {
        const watchPaths = [
          'src/assets/pagecontent/hiivelabs.com',
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

        // Use Vite's file watcher
        server.watcher.on('change', (file) => {
          const relativePath = path.relative(process.cwd(), file);

          // Check if changed file matches our watch paths
          const shouldRegenerate = watchPaths.some(watchPath =>
            relativePath.startsWith(watchPath)
          );

          if (shouldRegenerate) {
            console.log(`📝 ${relativePath}`);
            regenerateMenu();
          }
        });

        console.log('👀 Watching menu files for changes\n');
      }
    }
  };
}
