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

The project uses a two-level environment configuration:

**Root level** (sets which site to use):
```bash
cp .env.example .env
```

Edit the root `.env` file to set your site code:
```env
SITE_CODE=hiivelabs.com
```

**Site level** (site-specific configuration):

**Note**: Site directories (`src/.sites/[site-name]`) are git submodules - separate repositories for each site.

Create `src/.sites/[site-name]/.env` with your site-specific configuration:

```env
# Site URL with protocol (used for sitemap, RSS, and canonical URLs)
VITE_SITE_NAME=https://yoursitename.com

# Default author for new blog posts
DEFAULT_AUTHOR=Your Name

# Git configuration (for /admin/deploy page)
GIT_AUTHOR_NAME=Your Name
GIT_AUTHOR_EMAIL=your-email@example.com
GIT_COMMITTER_NAME=Your Name
GIT_COMMITTER_EMAIL=your-email@example.com

# Optional: GitHub Personal Access Token (if not using SSH keys)
# GITHUB_TOKEN=ghp_your_token_here

# Optional: Docker configuration (only if using Docker)
# DOCKER_BLOG_CODE=mysite
# DOCKER_BLOG_PORT=4321
# DOCKER_BUILD_MODE=pip
# VITE_HMR_HOST=your-server.local
# VITE_HMR_PORT=4321
```

## Site Configuration

Site-specific settings are configured in multiple places:
- **Environment variables**: `src/.sites/[site-name]/.env` - URLs, authors, git credentials
- **YAML configuration**: `src/.sites/[site-name]/config/site.yaml` - Navigation, build settings, and more

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

### site.yaml Reference

Each site has a `config/site.yaml` file for navigation, blog settings, social integrations, component injection, and more.

For complete site.yaml documentation, see the [Example Site README](src/.sites/example.com/README.md#site-configuration-siteyaml).

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

A web-based deploy interface is available at `/admin/deploy` in development mode. This allows you to:
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

Set up both root and site-specific environment files:

```bash
# Root .env - sets which site to use
cp .env.example .env
# Edit: SITE_CODE=yoursitename

# Site-specific .env - all other configuration
cp src/.sites/yoursitename/.env.example src/.sites/yoursitename/.env
# Edit: VITE_SITE_NAME, DEFAULT_AUTHOR, GIT_*, etc.
```

3. **Configure Git credentials:**

**Option A: SSH Keys (Recommended)**

Uncomment the SSH volume mount in `docker/compose/docker-compose.yaml`:
```yaml
volumes:
  - ~/.ssh:/root/.ssh:ro
```

**Option B: Personal Access Token**

Add to your site-specific `.env` file (`src/.sites/[site-name]/.env`):
```env
GITHUB_TOKEN=ghp_your_token_here
```

Git configuration should already be set in your site-specific `.env` file:
```env
GIT_AUTHOR_NAME=Your Name
GIT_AUTHOR_EMAIL=your-email@example.com
GIT_COMMITTER_NAME=Your Name
GIT_COMMITTER_EMAIL=your-email@example.com
```

### Running with Docker

**Start the container:**
```bash
docker-compose -f docker/compose/docker-compose.yaml up -d
```

**View logs:**
```bash
docker-compose -f docker/compose/docker-compose.yaml logs -f
```

**Stop the container:**
```bash
docker-compose -f docker/compose/docker-compose.yaml down
```

**Restart after changes:**
```bash
docker-compose -f docker/compose/docker-compose.yaml restart
```

### Accessing the Blog

- **Local server:** `https://localhost:4321`
- **From other devices:** `https://your-server-ip:4321`
- **Keystatic CMS:** `https://your-server-ip:4321/keystatic`
- **Deploy UI:** `https://your-server-ip:4321/admin/deploy`

**Note:** Accept the self-signed SSL certificate on first visit.

### Workflow

1. **Edit content** from any device using Keystatic at `/keystatic`
2. **Review changes** at `/admin/deploy` to see what files changed
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
docker-compose -f docker/compose/docker-compose.yaml down
# Or change the port in docker/compose/docker-compose.yaml
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
docker-compose -f docker/compose/docker-compose.yaml logs

# Rebuild container
docker-compose -f docker/compose/docker-compose.yaml build --no-cache
docker-compose -f docker/compose/docker-compose.yaml up -d
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
│   ├── .sites/              # Site-specific content and configuration
│   │   └── [site-name]/
│   │       ├── config/      # Site configuration (site.yaml)
│   │       ├── content/     # Blog posts and page content
│   │       ├── components/  # Site-specific components
│   │       ├── images/      # Site images
│   │       └── styles/      # Site-specific styles
│   ├── assets/
│   │   ├── fonts/           # Font files
│   │   └── images/          # Shared image assets
│   ├── components/          # Reusable components (Astro, Svelte, etc.)
│   ├── layouts/             # Page layouts
│   ├── lib/                 # Utility libraries and services
│   ├── pages/               # Route pages
│   │   ├── blog/            # Blog routes
│   │   ├── [page].astro     # Dynamic pages
│   │   └── index.astro      # Home page
│   └── styles/              # Global styles
├── docker/                  # Docker configuration
│   ├── compose/             # Docker Compose files
│   └── scripts/             # Build and utility scripts
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

1. Ensure your environment is configured correctly for production:

**Root `.env`:**
```env
SITE_CODE=yourdomain.com  # or username.github.io
```

**Site-specific `.env`** (`src/.sites/[site-code]/.env`):
```env
VITE_SITE_NAME=https://yourdomain.com
```

2. Build the site:
```bash
npm run build
```

3. The `dist/` directory contains your static site ready for deployment.

For GitHub Pages, the site configuration in `astro.config.mjs` uses the `VITE_SITE_NAME` environment variable to set the base URL.

## Content Organization

Blog posts are stored in `src/.sites/[site-name]/content/posts/` as MDX files. Each post includes:

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

## Additional Documentation

- **[Docker Setup](docker/README.md)** - Detailed Docker configuration, volumes, scripts, and troubleshooting
- **[LLM Service](src/lib/services/llm/README.md)** - AI-powered content assistance (alt text generation, text editing)
- **[Example Site](src/.sites/example.com/README.md)** - Reference site with complete site.yaml documentation
- **[Site Components](src/.sites/hiivelabs.com/components/README.md)** - Creating site-specific Astro components

## Creating a New Site from the Framework

This project is designed as a reusable framework. You can create your own site by forking/cloning this repository and adding your site-specific content, while still being able to pull in framework updates.

### Architecture Overview

```
your-site-repo/
├── src/
│   ├── components/      # Framework (from upstream)
│   ├── layouts/         # Framework (from upstream)
│   ├── lib/             # Framework (from upstream)
│   ├── styles/          # Framework (from upstream)
│   ├── pages/           # Framework (from upstream)
│   └── .sites/
│       ├── example.com/       # Reference site (from upstream)
│       └── your-site.com/     # YOUR site content
├── scripts/             # Framework (from upstream)
└── ...
```

**Key principle:** Framework code lives in the root directories. Your site content lives entirely within `src/.sites/your-site.com/`. This separation allows clean merges when updating the framework.

### Step 1: Create Your Site Repository

**Option A: Fork (if you want to contribute back)**
1. Fork this repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/YOUR-FORK.git my-site
   cd my-site
   ```

**Option B: Clone as new project (recommended for most users)**
1. Clone the repository:
   ```bash
   git clone https://github.com/hiive/hiive.github.io.git my-site
   cd my-site
   ```
2. Remove the original origin and set up your own:
   ```bash
   git remote remove origin
   git remote add origin https://github.com/YOUR-USERNAME/my-site.git
   ```

### Step 2: Add Framework as Upstream Remote

This allows you to pull framework updates later:

```bash
git remote add upstream https://github.com/hiive/hiive.github.io.git
```

Verify your remotes:
```bash
git remote -v
# Should show:
# origin    https://github.com/YOUR-USERNAME/my-site.git (fetch)
# origin    https://github.com/YOUR-USERNAME/my-site.git (push)
# upstream  https://github.com/hiive/hiive.github.io.git (fetch)
# upstream  https://github.com/hiive/hiive.github.io.git (push)
```

### Step 3: Create Your Site Directory

1. Copy the example site as a starting point:
   ```bash
   cp -r src/.sites/example.com src/.sites/your-site.com
   ```

2. Remove the other site directories (optional, keeps your repo clean):
   ```bash
   rm -rf src/.sites/hiivelabs.com
   rm -rf src/.sites/kosmic.wisp.place
   # Keep example.com as reference if you want
   ```

3. Configure your site code in the root `.env`:
   ```bash
   cp .env.example .env
   ```
   Edit `.env`:
   ```env
   SITE_CODE=your-site.com
   ```

4. Configure your site-specific settings in `src/.sites/your-site.com/.env`:
   ```env
   VITE_SITE_NAME=https://your-site.com
   DEFAULT_AUTHOR=Your Name
   GIT_AUTHOR_NAME=Your Name
   GIT_AUTHOR_EMAIL=you@example.com
   GIT_COMMITTER_NAME=Your Name
   GIT_COMMITTER_EMAIL=you@example.com
   ```

5. Customize `src/.sites/your-site.com/config/site.yaml` with your:
   - Site name and logo
   - Navigation links
   - Blog settings
   - Social integrations
   - Custom component injections

### Step 4: Install and Run

**Option A: Using Docker (Recommended)**

Docker provides a consistent development environment with hot reloading accessible from any device on your network.

1. Add Docker-specific configuration to `src/.sites/your-site.com/.env`:
   ```env
   # Docker configuration
   DOCKER_BLOG_CODE=mysite           # Prefix for container/volume names
   DOCKER_BLOG_PORT=4321             # External port for dev server
   DOCKER_BUILD_MODE=pip             # or 'uv' for faster builds

   # Optional: Enable HMR from other devices
   VITE_HMR_HOST=your-server.local   # Your server's hostname
   ```

2. Start the Docker environment:
   ```bash
   cd docker
   ./pip-docker-build.sh    # For pip-based build
   # or
   ./uv-docker-build.sh     # For uv-based build (faster)
   ```

3. Access your site at `https://localhost:4321` (or your configured port)

See [Docker Setup](docker/README.md) for detailed configuration and troubleshooting.

**Option B: Local Development (without Docker)**

```bash
npm install
npm run dev
```

Your site is now running at https://localhost:4321

### Step 5: Commit Your Site

```bash
git add .
git commit -m "Initialize my-site"
git push -u origin main
```

### Updating the Framework

When the framework has updates you want to incorporate:

```bash
# Fetch the latest framework changes
git fetch upstream

# Merge framework updates into your branch
git merge upstream/main
```

**Handling merge conflicts:**

Conflicts are rare if you follow the architecture (your content stays in `.sites/your-site.com/`). If conflicts occur:

1. **Framework file conflicts** (components, layouts, lib, etc.): Usually accept the upstream version unless you've intentionally modified framework code
2. **Site file conflicts** (anything in `.sites/your-site.com/`): Keep your version
3. **Config file conflicts** (astro.config.mjs, package.json): Review carefully, merge as appropriate

```bash
# After resolving conflicts
git add .
git commit -m "Merge framework updates"
git push
```

### Best Practices

1. **Never modify framework files directly** - If you need custom behavior, create site-specific overrides in your `.sites/` directory or open an issue/PR on the framework repo

2. **Keep your site content isolated** - Everything specific to your site should be in:
   - `src/.sites/your-site.com/config/` - Configuration
   - `src/.sites/your-site.com/content/` - Blog posts, pages
   - `src/.sites/your-site.com/components/` - Custom components
   - `src/.sites/your-site.com/images/` - Site images
   - `src/.sites/your-site.com/styles/` - Site-specific CSS

3. **Pull framework updates regularly** - Smaller, frequent merges are easier than large infrequent ones

4. **Test after merging** - Run `npm run dev` and `npm run build` after pulling framework updates

### Directory Reference

| Directory | Owner | Description |
|-----------|-------|-------------|
| `src/components/` | Framework | Shared Astro/React/Svelte components |
| `src/layouts/` | Framework | Page layout templates |
| `src/lib/` | Framework | Utilities, services, config helpers |
| `src/pages/` | Framework | Route definitions |
| `src/styles/` | Framework | Global CSS and Tailwind config |
| `src/.sites/your-site.com/` | **You** | All your site-specific content |
| `scripts/` | Framework | Build and utility scripts |
| `docker/` | Framework | Docker configuration |

### Troubleshooting

**"SITE_CODE not configured" error:**
- Ensure `.env` exists in the root with `SITE_CODE=your-site.com`
- Ensure the directory `src/.sites/your-site.com/` exists

**Framework updates break your site:**
- Check the framework's changelog/commits for breaking changes
- You can always revert: `git reset --hard HEAD~1`
- Or stay on a specific framework version by not merging upstream

**Want to contribute a fix back to the framework:**
1. Create a branch: `git checkout -b fix/my-fix`
2. Make changes to framework files only
3. Push to your fork: `git push origin fix/my-fix`
4. Open a PR against the upstream repository

## License

See repository for license information.

## Contributing

This is a personal blog platform. For issues or suggestions, please open an issue on GitHub.
