# wisp-cli

**Version:** 0.3.0

A command-line tool for deploying, managing, and serving static sites on [wisp.place](https://wisp.place) through the AT Protocol (Bluesky) Personal Data Server (PDS).

## Overview

wisp-cli allows you to host static websites directly on your Bluesky PDS account, making your sites accessible through the wisp.place service. The tool provides deployment, retrieval, and local development capabilities with real-time updates from the AT Protocol firehose.

## Installation

The `wisp-cli` executable is located at `/build-service/wisp-cli` in the build-service Docker container.

## Global Options

These options can be used with any command:

- `-p, --path <PATH>` - Path to the directory containing your static site
- `-s, --site <SITE>` - Site name (defaults to directory name)
- `--store <STORE>` - Path to auth store file for OAuth sessions
- `--password <PASSWORD>` - App Password for authentication (alternative to OAuth)
- `-h, --help` - Print help information
- `-V, --version` - Print version information

## Commands

### `deploy` (Default Command)

Deploy a static site to wisp.place. This is the default command if no subcommand is specified.

**Usage:**
```bash
wisp-cli deploy [OPTIONS] <INPUT>
```

**Arguments:**
- `<INPUT>` - Your Bluesky identity (required)
  - Handle (e.g., `alice.bsky.social`)
  - DID (Decentralized Identifier)
  - PDS URL

**Options:**
- `-p, --path <PATH>` - Path to the directory containing your static site (default: current directory `.`)
- `-s, --site <SITE>` - Site name (defaults to directory name)
- `--store <STORE>` - Path to auth store file (default: `/tmp/wisp-oauth-session.json`)
  - Only used with OAuth authentication
  - File will be created if it doesn't exist
- `--password <PASSWORD>` - App Password for authentication (alternative to OAuth)

**Examples:**
```bash
# Deploy current directory to wisp.place using handle
wisp-cli deploy alice.bsky.social

# Deploy a specific directory with a custom site name
wisp-cli deploy alice.bsky.social --path ./dist --site my-blog

# Deploy using app password authentication
wisp-cli deploy alice.bsky.social --password "my-app-password"

# Deploy with custom OAuth session store
wisp-cli deploy alice.bsky.social --store ~/.wisp-session.json
```

**Authentication Methods:**
1. **OAuth** (default): Interactive browser-based authentication
   - Session is stored in the file specified by `--store`
   - Reuses existing session if valid
2. **App Password**: Use `--password` flag with a Bluesky app password
   - Generate app passwords in Bluesky settings
   - Useful for CI/CD pipelines

---

### `pull`

Download a previously deployed site from the PDS to your local directory.

**Usage:**
```bash
wisp-cli pull [OPTIONS] --site <SITE> <INPUT>
```

**Arguments:**
- `<INPUT>` - Your Bluesky identity (required)
  - Handle (e.g., `alice.bsky.social`)
  - DID (Decentralized Identifier)

**Options:**
- `-s, --site <SITE>` - Site name to pull (required) - this is the record key
- `-o, --output <OUTPUT>` - Output directory for the downloaded site (default: current directory `.`)
- `-p, --path <PATH>` - Path to the directory containing your static site
- `--store <STORE>` - Path to auth store file
- `--password <PASSWORD>` - App Password for authentication

**Examples:**
```bash
# Pull a site to the current directory
wisp-cli pull alice.bsky.social --site my-blog

# Pull a site to a specific directory
wisp-cli pull alice.bsky.social --site my-blog --output ./downloads

# Pull using app password
wisp-cli pull alice.bsky.social --site my-blog --password "my-app-password"
```

**Use Cases:**
- Backup your deployed site
- Retrieve a site deployed from another machine
- Verify deployment integrity
- Clone a site for local editing

---

### `serve`

Serve a site locally with real-time updates from the AT Protocol firehose. This command both downloads the site and serves it locally, with live updates as changes are detected in the PDS.

**Usage:**
```bash
wisp-cli serve [OPTIONS] --site <SITE> <INPUT>
```

**Arguments:**
- `<INPUT>` - Your Bluesky identity (required)
  - Handle (e.g., `alice.bsky.social`)
  - DID (Decentralized Identifier)

**Options:**
- `-s, --site <SITE>` - Site name to serve (required) - this is the record key
- `-o, --output <OUTPUT>` - Output directory for the site files (default: current directory `.`)
- `-p, --port <PORT>` - Port to serve the site on (default: `8080`)
- `-p, --path <PATH>` - Path to the directory containing your static site
- `--store <STORE>` - Path to auth store file
- `--password <PASSWORD>` - App Password for authentication

**Examples:**
```bash
# Serve a site on default port 8080
wisp-cli serve alice.bsky.social --site my-blog

# Serve on a custom port
wisp-cli serve alice.bsky.social --site my-blog --port 3000

# Serve with custom output directory and auth
wisp-cli serve alice.bsky.social --site my-blog --output ./site-cache --password "my-app-password"
```

**Features:**
- **Local HTTP Server**: Serves your site on `http://localhost:<port>`
- **Real-time Updates**: Monitors the AT Protocol firehose for changes to your site
- **Auto-refresh**: Automatically updates served files when changes are detected in the PDS
- **Development Mode**: Useful for testing sites or previewing live changes

**Use Cases:**
- Preview your wisp.place site locally before sharing the URL
- Monitor site changes in real-time
- Development and testing workflow
- Debug site issues locally

---

## Authentication

wisp-cli supports two authentication methods:

### 1. OAuth (Default)

Interactive browser-based authentication flow:
- Launches browser for Bluesky login
- Stores session in auth store file (default: `/tmp/wisp-oauth-session.json`)
- Reuses existing session if valid
- More secure for interactive use

### 2. App Password

Alternative authentication using Bluesky app passwords:
- Use `--password` flag
- Generate app passwords in Bluesky Settings → App Passwords
- Useful for automation and CI/CD
- No browser interaction required

**Example:**
```bash
# OAuth (interactive)
wisp-cli deploy alice.bsky.social

# App Password (non-interactive)
wisp-cli deploy alice.bsky.social --password "xxxx-xxxx-xxxx-xxxx"
```

---

## Workflow Examples

### First-time Deployment

```bash
# 1. Build your static site
npm run build

# 2. Deploy to wisp.place
wisp-cli deploy alice.bsky.social --path ./dist --site my-portfolio

# 3. Site is now available at wisp.place
```

### Update Existing Site

```bash
# 1. Make changes and rebuild
npm run build

# 2. Deploy updates (same site name overwrites)
wisp-cli deploy alice.bsky.social --path ./dist --site my-portfolio
```

### Backup and Restore

```bash
# Backup: Pull site from PDS
wisp-cli pull alice.bsky.social --site my-portfolio --output ./backup

# Restore: Deploy from backup
wisp-cli deploy alice.bsky.social --path ./backup --site my-portfolio
```

### Local Development with Live Updates

```bash
# Serve site locally with firehose monitoring
wisp-cli serve alice.bsky.social --site my-portfolio --port 8080

# Visit http://localhost:8080
# Site auto-updates when changes detected in PDS
```

---

## Common Options Reference

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--path` | `-p` | Directory containing static site | `.` (current dir) |
| `--site` | `-s` | Site name (record key) | Directory name |
| `--output` | `-o` | Output directory for downloads | `.` (current dir) |
| `--port` | `-p` | Port for local server | `8080` |
| `--store` | | OAuth session store file | `/tmp/wisp-oauth-session.json` |
| `--password` | | App password for auth | None (uses OAuth) |
| `--help` | `-h` | Show help information | |
| `--version` | `-V` | Show version | |

---

## Troubleshooting

### Authentication Issues

**OAuth not working:**
- Ensure browser access is available
- Check that the auth store path is writable
- Try deleting the store file to reset: `rm /tmp/wisp-oauth-session.json`

**App password not working:**
- Verify the password is correct
- Generate a new app password in Bluesky settings
- Ensure the password has proper permissions

### Deployment Issues

**Site not updating:**
- Verify you're using the same `--site` name
- Check that the `--path` points to your built site
- Ensure all files are present in the source directory

**Permission errors:**
- Verify you're authenticated as the correct user
- Check file permissions in the source directory
- Ensure the PDS account has proper permissions

### Serve Issues

**Port already in use:**
- Use a different port with `--port` option
- Kill the process using the port
- Check for other servers running on the same port

**Site not updating in real-time:**
- Verify firehose connection is active
- Check network connectivity
- Try restarting the serve command

---

## Technical Details

### AT Protocol Integration

wisp-cli integrates with the AT Protocol (Bluesky) ecosystem:
- **PDS (Personal Data Server)**: Your site files are stored in your PDS
- **Record Keys**: Site names become record keys in your PDS
- **Firehose**: Real-time updates are powered by the AT Protocol firehose
- **DIDs**: Decentralized identifiers for user resolution

### File Storage

- Sites are stored as records in your Bluesky PDS
- Each site has a unique record key (the `--site` name)
- Files are packaged and uploaded to the PDS
- wisp.place resolves and serves sites from PDS records

---

## Links

- **wisp.place**: https://wisp.place
- **AT Protocol**: https://atproto.com
- **Bluesky**: https://bsky.app

---

## Version

Current version: **0.3.0**

Check version: `wisp-cli --version`