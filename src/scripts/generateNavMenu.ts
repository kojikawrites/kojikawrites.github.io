import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import {getSiteCode} from "./getSiteConfig.ts";

const PAGES_DIR = `src/assets/pagecontent/${getSiteCode()}`;
const SYSTEM_MENU_FILE = 'src/assets/config/system-menu-items.json';
const OUTPUT_FILE = `src/assets/config/${getSiteCode()}.yml`;

interface PageFrontmatter {
  title: string;
  showInMenu?: boolean;
  menuLabel?: string;
  menuPosition?: 'left' | 'right' | 'none';
  menuOrder?: number;
}

interface NavItem {
  href: string;
  label: string;
  order: number;
}

/**
 * Parse frontmatter from markdown content using proper YAML parser
 * @param content - Full markdown file content
 * @returns Parsed frontmatter object or empty object if parsing fails
 */
function parseFrontmatter(content: string): any {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return {};

  try {
    // Use proper YAML parser instead of regex to handle all YAML features
    const parsed = yaml.load(frontmatterMatch[1]);
    return parsed || {};
  } catch (error) {
    console.error('Failed to parse YAML frontmatter:', error);
    return {};
  }
}

async function generateNavMenu() {
  const leftNav: NavItem[] = [];
  const rightNav: NavItem[] = [];

  // 1. Load system menu items (blog, categories, tags)
  if (fs.existsSync(SYSTEM_MENU_FILE)) {
    try {
      const systemMenuData = JSON.parse(fs.readFileSync(SYSTEM_MENU_FILE, 'utf-8'));

      for (const item of systemMenuData.items || []) {
        const navItem: NavItem = {
          href: item.href,
          label: item.label,
          order: item.order || 999
        };

        if (item.position === 'left') {
          leftNav.push(navItem);
        } else if (item.position === 'right') {
          rightNav.push(navItem);
        }
      }
      console.log(`✓ Loaded ${systemMenuData.items?.length || 0} system menu items`);
    } catch (error) {
      console.warn('⚠ Could not load system menu items:', error);
    }
  } else {
    console.warn('⚠ System menu items file not found, skipping');
  }

  // 2. Load content pages from Keystatic
  if (fs.existsSync(PAGES_DIR)) {
    const pageFiles = fs.readdirSync(PAGES_DIR)
      .filter(file => file.endsWith('.mdx') || file.endsWith('.md'));

    for (const file of pageFiles) {
      try {
        const filePath = path.join(PAGES_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const frontmatter = parseFrontmatter(content) as PageFrontmatter;

        // Skip if not in menu
        if (!frontmatter.showInMenu || frontmatter.menuPosition === 'none') {
          continue;
        }

        const slug = path.basename(file, path.extname(file));
        const navItem: NavItem = {
          href: `/${slug}`,
          label: frontmatter.menuLabel || frontmatter.title || slug,
          order: frontmatter.menuOrder || 999
        };

        if (frontmatter.menuPosition === 'left') {
          leftNav.push(navItem);
        } else if (frontmatter.menuPosition === 'right') {
          rightNav.push(navItem);
        }
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
      }
    }
    console.log(`✓ Processed ${pageFiles.length} content pages`);
  }

  // 3. Sort by order
  leftNav.sort((a, b) => a.order - b.order);
  rightNav.sort((a, b) => a.order - b.order);

  // 4. Load existing YAML to preserve logo and breadcrumbs config
  let existingConfig: any = {};
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const existingYaml = fs.readFileSync(OUTPUT_FILE, 'utf-8');
      existingConfig = yaml.load(existingYaml) as any;
    } catch (error) {
      console.error('Error loading existing YAML:', error);
    }
  }

  // 5. Generate new config
  const newConfig = {
    ...existingConfig,
    navbar: {
      ...existingConfig.navbar,
      left: leftNav.map(({ href, label }) => ({ href, label })),
      right: rightNav.map(({ href, label }) => ({ href, label }))
    }
  };

  // 6. Write YAML
  const yamlContent = yaml.dump(newConfig, {
    indent: 2,
    lineWidth: -1 // Don't wrap lines
  });

  fs.writeFileSync(OUTPUT_FILE, yamlContent, 'utf-8');

  console.log(`✓ Generated navigation menu with ${leftNav.length} left items and ${rightNav.length} right items`);
  console.log(`  Left: ${leftNav.map(item => item.label).join(', ')}`);
  console.log(`  Right: ${rightNav.map(item => item.label).join(', ')}`);
}

generateNavMenu().catch(error => {
  console.error('Failed to generate navigation menu:', error);
  process.exit(1);
});
