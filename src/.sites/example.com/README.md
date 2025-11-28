# Example Site

A minimal example site demonstrating the blog platform capabilities.

## What's Included

This example site demonstrates:

### Content
- ✅ **Blog post** (`2025-11-17-welcome-to-example-site.mdx`) - Published post with today's date
- ✅ **Draft post** (`_drafts/2099-12-25-future-post.mdx`) - Future-dated draft post
- ✅ **About page** (`content/pagecontent/about.mdx`) - Static page with site information
- ✅ **Test page** (`content/pagecontent/test.mdx`) - Page showcasing markdown features

### Components
- ✅ **ExampleComponent.astro** - Minimal reusable Astro component with props and slots

### Configuration
- ✅ **site.yaml** - Site configuration with custom navigation menu
  - Left menu: Test Page
  - Right menu: About
- ✅ **.env.example** - Site-specific environment variables template
- ✅ **logo-map.json** - Logo configuration for Keystatic

## Directory Structure

```
example.com/
├── .env.example                  # Site-specific environment template
├── .gitignore                    # Git ignore rules
├── README.md                     # This file
├── components/
│   └── ExampleComponent.astro    # Custom Astro component
├── config/
│   └── site.yaml                 # Site configuration
├── content/
│   ├── pagecontent/
│   │   ├── about.mdx            # About page
│   │   └── test.mdx             # Test page
│   └── posts/
│       ├── 2025-11-17-welcome-to-example-site.mdx  # Published post
│       └── _drafts/
│           └── 2099-12-25-future-post.mdx          # Draft post
├── images/
│   └── blog/                    # Blog post images go here
└── state/
    └── logo-map.json            # Logo mapping
```

## Usage

To use this example site:

1. **Set as active site** in root `.env`:
   ```env
   SITE_CODE=example.com
   ```

2. **Copy the environment file**:
   ```bash
   cp src/.sites/example.com/.env.example src/.sites/example.com/.env
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Visit**: https://localhost:4321

## Features Demonstrated

### Markdown & MDX
- Headers, lists, tables
- Code blocks with syntax highlighting
- Blockquotes
- Math equations (LaTeX)
- Custom components in MDX

### Navigation
- Custom menu items (left and right)
- Breadcrumbs configuration
- Page linking

### Blog Posts
- Date extraction from filename
- Draft posts in `_drafts` folder
- Categories and tags
- Author attribution

### Components
- Astro component with props
- TypeScript interfaces
- Scoped styles
- Slots for children

## Extending This Example

You can extend this site by:

- Adding more blog posts in `content/posts/`
- Creating new pages in `content/pagecontent/`
- Building custom components in `components/`
- Adding images to `images/blog/`
- Customizing navigation in `config/site.yaml`
- Updating environment variables in `.env`

## Notes

- This site follows the structure documented in the main README.md
- Images are referenced but not included (placeholders)
- The component works without Tailwind classes if you prefer vanilla CSS
