# hiive.github.io

A modern blog platform built with Astro, featuring math rendering, multi-framework support, and content management capabilities.

## Tech Stack

- **[Astro](https://astro.build/)** - Static site generator with component islands architecture
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Keystatic](https://keystatic.com/)** - Git-based content management (development mode)
- **[MDX](https://mdxjs.com/)** - Markdown with component support
- **[MathJax](https://www.mathjax.org/)** - Mathematical equation rendering
- **[Pagefind](https://pagefind.app/)** - Fast static search
- **Multiple Frameworks**: Svelte, SolidJS, and React integrations

## Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)

## Getting Started

### Initial Setup

1. Clone the repository:
```bash
git clone https://github.com/hiive/hiive.github.io.git
cd hiive.github.io
```

2. Install dependencies:
```bash
npm install
```

3. Configure your site:
```bash
cp .env.example .env
```

Edit the `.env` file to set your site configuration:
```env
SITE_CODE=hiivelabs.com
DEFAULT_AUTHOR=hiive
```

## Site Configuration

Site-specific settings are configured in `src/assets/config/[site-code].yml`. This includes navigation, build settings, and more.

### Build Exclusions

To exclude directories from production builds, add them to the build configuration:

```yaml
build:
  exclude_from_production:
    - api      # Development API endpoints
    - edit     # Development admin pages
```

These directories will:
- Be excluded from frontmatter extraction
- Be removed from the production build output
- Remain fully functional in development mode

This is useful for admin interfaces, API routes, or other development-only pages that shouldn't be deployed to production.

## Development

### Local Development

Start the development server with live reload:
```bash
npm run dev
```

Your site will be available at [https://localhost:4321](https://localhost:4321)

**Note:** Development mode uses HTTPS with a self-signed certificate. You'll see a browser security warning on first visit - this is expected and safe to bypass for local development.

### Development with Network Access

To access the development server from other devices on your network (e.g., testing on mobile):
```bash
npm run start
```

This runs the dev server with `--host` flag, making it accessible via HTTPS using your local IP address (e.g., `https://192.168.1.x:4321`).

**Important for Mobile Testing:**
- Accept the self-signed certificate warning on your mobile device
- HTTPS is required for Keystatic CMS to work properly (uses Web Crypto API)
- On iOS Safari: Tap "Show Details" → "visit this website" to bypass the warning

### Content Management (Development)

In development mode, Keystatic CMS is available at `/keystatic` for editing content through a visual interface.

**Requirements:**
- HTTPS connection (automatically enabled in development)
- Only available when `NODE_ENV=development`

### Deploy UI (Development)

A web-based deploy interface is available at `/edit/deploy` in development mode. This allows you to:
- View git status and changed files
- Commit and push changes to GitHub
- Manage deployments from any device on your network

**Requirements:**
- Development mode only (automatically redirects to 404 in production)
- Git configured with proper credentials
- Access to GitHub repository

## Docker Development Setup

Run the blog in a Docker container on your local server for network-wide access.

### Prerequisites

- Docker and Docker Compose installed on your server
- Git credentials configured (SSH keys or Personal Access Token)

### Initial Setup

1. **Clone the repository on your server:**
```bash
git clone https://github.com/hiive/hiive.github.io.git
cd hiive.github.io
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your settings
```

3. **Configure Git credentials:**

**Option A: SSH Keys (Recommended)**

Uncomment the SSH volume mount in `docker-compose.yml`:
```yaml
volumes:
  - ~/.ssh:/root/.ssh:ro
```

**Option B: Personal Access Token**

Add to your `.env` file:
```env
GITHUB_TOKEN=ghp_your_token_here
```

4. **Update Git configuration in `.env`:**
```env
GIT_AUTHOR_NAME=Your Name
GIT_AUTHOR_EMAIL=your-email@example.com
GIT_COMMITTER_NAME=Your Name
GIT_COMMITTER_EMAIL=your-email@example.com
```

### Running with Docker

**Start the container:**
```bash
docker-compose up -d
```

**View logs:**
```bash
docker-compose logs -f
```

**Stop the container:**
```bash
docker-compose down
```

**Restart after changes:**
```bash
docker-compose restart
```

### Accessing the Blog

- **Local server:** `https://localhost:4321`
- **From other devices:** `https://your-server-ip:4321`
- **Keystatic CMS:** `https://your-server-ip:4321/keystatic`
- **Deploy UI:** `https://your-server-ip:4321/admin/deploy`

**Note:** Accept the self-signed SSL certificate on first visit.

### Workflow

1. **Edit content** from any device using Keystatic at `/keystatic`
2. **Review changes** at `/edit/deploy` to see what files changed
3. **Commit and push** directly from the deploy UI when ready
4. **GitHub Pages** automatically rebuilds your site

### How It Works

- **Volume mounting:** Source code is mounted from the server, not copied into the container
- **Persistence:** All edits are saved to the server's filesystem
- **Git operations:** Can commit and push directly from the web UI
- **Hot reload:** Changes to files trigger automatic browser refresh

### Editing Files Directly

Since the code is volume-mounted, you can also edit files directly on the server:

```bash
cd /path/to/hiive.github.io
# Edit files with your favorite editor
# Changes appear immediately in the dev server
```

### Troubleshooting

**Port already in use:**
```bash
# Stop any existing containers
docker-compose down
# Or change the port in docker-compose.yml
```

**Git authentication fails:**
```bash
# Check SSH key permissions
ls -la ~/.ssh/

# Or verify GitHub token has repo permissions
```

**Container won't start:**
```bash
# View logs
docker-compose logs

# Rebuild container
docker-compose build --no-cache
docker-compose up -d
```

## Production Build

### Build the Site

```bash
npm run build
```

The build process will:
1. Generate navigation menu data
2. Extract frontmatter from posts
3. Build static pages to the `dist/` directory
4. Generate search index with Pagefind

### Preview Production Build

```bash
npm run preview
```

Or with network access:
```bash
npm run preview-host
```

## Project Structure

```
hiive.github.io/
├── src/
│   ├── assets/
│   │   ├── posts/           # Blog posts organized by site
│   │   ├── images/          # Image assets
│   │   └── config/          # Configuration files
│   ├── components/          # Reusable components (Astro, Svelte, etc.)
│   ├── layouts/             # Page layouts
│   ├── pages/               # Route pages
│   │   ├── blog/            # Blog routes
│   │   ├── [page].astro     # Dynamic pages
│   │   └── index.astro      # Home page
│   ├── scripts/             # Build and utility scripts
│   └── styles/              # Global styles
├── public/                  # Static assets
├── astro.config.mjs         # Astro configuration
├── tailwind.config.mjs      # Tailwind configuration
├── keystatic.config.tsx     # Keystatic CMS configuration
└── package.json             # Dependencies and scripts
```

## Key Features

### Markdown Enhancements
- **Math equations**: Inline `$...$` and display `$$...$$` math with MathJax
- **GitHub Flavored Markdown**: Tables, task lists, strikethrough
- **Smartypants**: Smart quotes and dashes
- **Reading time**: Automatically calculated for posts
- **Syntax highlighting**: Powered by Shiki with dark/light themes

### Content Features
- RSS feed generation
- Sitemap generation
- Category and tag organization
- Full-text search with Pagefind
- External link decoration with icons
- Footnote support
- YouTube embeds

### Developer Experience
- TypeScript support
- Hot module replacement
- Pre-build hooks for data generation
- Multi-site configuration support

## Publishing

### GitHub Pages Deployment

1. Ensure your `.env` is configured correctly for production:
```env
SITE_CODE=yourdomain.com  # or username.github.io
```

2. Build the site:
```bash
npm run build
```

3. The `dist/` directory contains your static site ready for deployment.

For GitHub Pages, the site configuration in `astro.config.mjs` uses the `VITE_SITE_NAME` environment variable to set the base URL.

## Content Organization

Blog posts are stored in `src/assets/posts/[site-name]/` as MDX files. Each post includes:

- Frontmatter with metadata (title, date, author, tags, etc.)
- MDX content with support for components
- Automatic reading time calculation
- Date extraction from filename (YYYY-MM-DD format)

## Scripts

- `npm run dev` - Start development server
- `npm run start` - Start development server with network access
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run preview-host` - Preview production build with network access

## License

See repository for license information.

## Contributing

This is a personal blog platform. For issues or suggestions, please open an issue on GitHub.
