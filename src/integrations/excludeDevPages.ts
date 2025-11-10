import type { AstroIntegration } from 'astro';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { config as dotenvConfig } from 'dotenv';

// Load environment variables
dotenvConfig();

/**
 * Get site code from environment variables
 */
function getSiteCode(): string {
  const siteCode = process.env.SITE_CODE;
  if (siteCode) {
    return siteCode;
  }

  try {
    return new URL(process.env.VITE_SITE_NAME || '').hostname;
  } catch (e) {
    return 'hiivelabs.com';
  }
}

/**
 * Load site configuration from YAML file
 */
function loadSiteConfig(siteCode: string): any {
  const configPath = path.resolve(`src/assets/config/${siteCode}.yml`);
  if (!fs.existsSync(configPath)) {
    console.warn(`No config found for ${siteCode}, using defaults`);
    return {};
  }
  const yamlString = fs.readFileSync(configPath, 'utf8');
  return yaml.load(yamlString);
}

/**
 * Astro integration to exclude dev-only pages from production builds
 * Removes built pages from dist directory after build based on site config
 */
export default function excludeDevPages(): AstroIntegration {
  return {
    name: 'exclude-dev-pages',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        // Only run in production builds
        if (process.env.NODE_ENV !== 'production') {
          return;
        }

        const siteCode = getSiteCode();
        const siteConfig = loadSiteConfig(siteCode);
        const excludeDirs = siteConfig?.build?.exclude_from_production || [];

        if (excludeDirs.length === 0) {
          console.log('ℹ️  No directories configured for exclusion');
          return;
        }

        console.log('🚫 Excluding dev-only pages from production build...');

        for (const dirName of excludeDirs) {
          const distPath = path.join(dir.pathname, dirName);
          if (fs.existsSync(distPath)) {
            console.log(`   Removing: ${path.relative(process.cwd(), distPath)}`);
            fs.rmSync(distPath, { recursive: true, force: true });
          }
        }

        console.log('✅ Dev-only pages excluded from production build');
      },
    },
  };
}
