#!/usr/bin/env python3
"""
FastAPI service for running isolated production builds and git operations.
Runs on port 8000 alongside the Astro dev server on port 4321.
"""

import os
import shutil
import subprocess
import yaml
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

import time

app = FastAPI()

def get_site_code():
    """Get site code from environment variables."""
    site_code = os.getenv('SITE_CODE')
    if site_code:
        return site_code

    site_name = os.getenv('VITE_SITE_NAME', 'https://hiivelabs.com')
    try:
        from urllib.parse import urlparse
        return urlparse(site_name).hostname or 'hiivelabs.com'
    except:
        return 'hiivelabs.com'


def load_site_config(site_code):
    """Load site configuration from YAML file."""
    config_path = Path(f'/app/src/.sites/{site_code}/config/site.yaml')
    if not config_path.exists():
        return {}

    with open(config_path, 'r') as f:
        return yaml.safe_load(f) or {}

def get_submodule_path(site_code):
    """Get the path to the site's submodule."""
    return f'src/.sites/{site_code}'

def is_submodule_initialized(submodule_path, source_dir):
    """Check if a submodule is initialized."""
    result = subprocess.run(
        ['git', 'submodule', 'status', submodule_path],
        cwd=str(source_dir),
        capture_output=True,
        text=True
    )
    # If output starts with '-', submodule is not initialized
    return result.returncode == 0 and not result.stdout.startswith('-')

def has_submodule_changes(submodule_path, source_dir):
    """Check if submodule has uncommitted changes."""
    result = subprocess.run(
        ['git', 'status', '--porcelain'],
        cwd=str(source_dir / submodule_path),
        capture_output=True,
        text=True,
        timeout=10
    )
    return result.returncode == 0 and bool(result.stdout.strip())

def get_output(result):
    (result.stdout + result.stderr)[-2048:]

@app.get("/ping")
async def ping():
    return JSONResponse({
        'success': True,
        'output': 'pong'
    }, status_code=200)


@app.post("/build")
async def run_build():
    """
    Run an isolated production build.
    Copies source from /source (read-only mount) to build directory.
    """
    start_time = time.time()
    source_dir = Path('/source')
    build_dir = Path('/tmp/build-workspace/build')



    try:
        # Check if source directory exists and has content
        if not source_dir.exists() or not (source_dir / 'package.json').exists():
            return JSONResponse({
                'success': False,
                'error': 'Source code not found',
                'output': f'Expected source at {source_dir} but not found or incomplete.'
            }, status_code=500)

        # Get directories to exclude from build
        site_code = get_site_code()
        config_path = source_dir / 'src' / '.sites' / site_code / 'config' / 'site.yaml'
        exclude_dirs = []

        if config_path.exists():
            with open(config_path, 'r') as f:
                config = yaml.safe_load(f) or {}
                exclude_dirs = config.get('build', {}).get('exclude_from_production', [])

        # Clean build directory (except node_modules)
        if build_dir.exists():
            print(f"Cleaning build directory (preserving node_modules)...", flush=True)
            for item in build_dir.iterdir():
                print(f".. Removing {item.name}", flush=True)
                if item.name != 'node_modules':
                    if item.is_dir():
                        shutil.rmtree(item)
                    else:
                        item.unlink()
        else:
            build_dir.mkdir(parents=True, exist_ok=True)

        # Copy source to build directory (excluding node_modules and lock file - we'll install fresh)
        # Only copy the site directory for the current site_code to save space and time
        print(f"Copying {source_dir} to {build_dir} (site: {site_code})...", flush=True)
        subprocess.run(
            ['rsync', '-a',
             '--exclude=node_modules',
             '--exclude=.git',
             '--exclude=package-lock.json',
             f'--include=src/.sites/{site_code}/',
             f'--include=src/.sites/{site_code}/**',
             '--exclude=src/.sites/*',
             str(source_dir) + '/', str(build_dir) + '/'],
            check=True,
            capture_output=True,
            text=True
        )

        # Initialize and update submodule for the active site
        submodule_path = get_submodule_path(site_code)
        print(f"[BUILD] Initializing submodule for {site_code} at {submodule_path}...", flush=True)

        init_result = subprocess.run(
            ['git', 'submodule', 'update', '--init', submodule_path],
            cwd=str(build_dir),
            capture_output=True,
            text=True,
            timeout=30
        )

        if init_result.returncode != 0:
            print(f"[BUILD] Warning: Failed to initialize submodule: {get_output(init_result)}", flush=True)
            # Don't fail the build - submodule might not exist or be needed
        else:
            print(f"[BUILD] Submodule initialized successfully", flush=True)

        # Remove excluded directories to prevent Astro from discovering them
        for dir_name in exclude_dirs:
            exclude_path = build_dir / 'src' / 'pages' / dir_name
            if exclude_path.exists():
                print(f"Removing {exclude_path}...", flush=True)
                shutil.rmtree(exclude_path)

        # Install dependencies natively for Linux (generates Linux-specific lock file)
        print(f"Installing dependencies with npm...", flush=True)
        install_result = subprocess.run(
            ['npm', 'install', '--include=dev'],
            cwd=str(build_dir),
            capture_output=True,
            text=True,
            timeout=180,
        )


        if install_result.returncode != 0:
            return JSONResponse({
                'success': False,
                'error': 'npm dependency install failed',
                'output': get_output(install_result)
            }, status_code=500)

        print(f"Pruning unneeded dependencies with npm...", flush=True)
        prune_result = subprocess.run(
            ['npm', 'prune'],
            cwd=str(build_dir),
            capture_output=True,
            text=True,
            timeout=180,
            env={**os.environ, 'NODE_ENV': 'development'} # run the prune ONLY in development mode to keep dev dependencies.
        )

        if prune_result.returncode != 0:
            return JSONResponse({
                'success': False,
                'error': 'npm dependency prune failed',
                'output': get_output(prune_result)
            }, status_code=500)

        # Run the build
        print(f"Running npm build in {build_dir}...", flush=True)
        result = subprocess.run(
            ['npm', 'run', 'build'],
            cwd=str(build_dir),
            capture_output=True,
            text=True,
            timeout=120,
            env={**os.environ, 'NODE_ENV': 'production'}
        )

        duration = round(time.time() - start_time, 2)

        if result.returncode == 0:

            return JSONResponse({
                'success': True,
                'message': f'Build completed successfully in {duration}s',
                'output': get_output(result)
            })
        else:
            return JSONResponse({
                'success': False,
                'error': 'Build failed',
                'output': get_output(result)
            }, status_code=500)

    except subprocess.TimeoutExpired:
        return JSONResponse({
            'success': False,
            'error': 'Build timeout - operation took too long',
            'output': 'The build operation exceeded 2 minutes.'
        }, status_code=500)

    except Exception as e:
        return JSONResponse({
            'success': False,
            'error': f'Build error: {str(e)}',
            'output': str(e)
        }, status_code=500)


@app.post("/push")
async def git_push(request: Request):
    """
    Commit and push changes to GitHub.
    Expects JSON body with 'message' field containing the commit message.
    """
    try:
        body = await request.json()
        message = body.get('message')

        print(f"[PUSH] Received push request with message: {message}", flush=True)

        if not message or not isinstance(message, str):
            return JSONResponse({
                'error': 'Commit message is required'
            }, status_code=400)

        # Change to source directory (where the git repo is)
        source_dir = Path('/source')
        print(f"[PUSH] Working in source directory: {source_dir}", flush=True)

        # Get current branch
        result = subprocess.run(
            ['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
            cwd=str(source_dir),
            capture_output=True,
            text=True,
            timeout=10
        )

        if result.returncode != 0:
            return JSONResponse({
                'error': 'Failed to get current branch',
                'output': get_output(result)
            }, status_code=500)

        branch = result.stdout.strip()
        print(f"[PUSH] Current branch: {branch}", flush=True)

        # Check if there are any changes to commit
        result = subprocess.run(
            ['git', 'status', '--porcelain'],
            cwd=str(source_dir),
            capture_output=True,
            text=True,
            timeout=10
        )

        if result.returncode != 0:
            return JSONResponse({
                'error': 'Failed to check git status',
                'output': get_output(result)
            }, status_code=500)

        status = result.stdout.strip()
        print(f"[PUSH] Git status output: {status[:200] if status else '(no changes)'}", flush=True)

        if not status:
            return JSONResponse({
                'error': 'No changes to commit'
            }, status_code=400)

        # Check if submodule has changes and handle them first
        site_code = get_site_code()
        submodule_path = get_submodule_path(site_code)
        submodule_full_path = source_dir / submodule_path
        submodule_has_changes = False

        if submodule_full_path.exists():
            submodule_has_changes = has_submodule_changes(submodule_path, source_dir)

            if submodule_has_changes:
                print(f"[PUSH] Submodule {site_code} has changes, committing and pushing submodule first...", flush=True)

                # Add all changes in submodule
                result = subprocess.run(
                    ['git', 'add', '-A'],
                    cwd=str(submodule_full_path),
                    capture_output=True,
                    text=True,
                    timeout=10
                )

                if result.returncode != 0:
                    return JSONResponse({
                        'error': 'Failed to add submodule changes',
                        'output': get_output(result)
                    }, status_code=500)

                # Commit in submodule
                submodule_commit = subprocess.run(
                    ['git', 'commit', '-m', f"[submodule] {message}"],
                    cwd=str(submodule_full_path),
                    capture_output=True,
                    text=True,
                    timeout=10
                )

                if submodule_commit.returncode != 0:
                    return JSONResponse({
                        'error': 'Failed to commit submodule changes',
                        'output': get_output(submodule_commit)
                    }, status_code=500)

                print(f"[PUSH] Submodule committed, now pushing to remote...", flush=True)

                # Push submodule changes
                submodule_push = subprocess.run(
                    ['git', 'push', 'origin', 'HEAD'],
                    cwd=str(submodule_full_path),
                    capture_output=True,
                    text=True,
                    timeout=30,
                    env={**os.environ, 'GIT_TERMINAL_PROMPT': '0'}
                )

                if submodule_push.returncode != 0:
                    return JSONResponse({
                        'error': 'Failed to push submodule changes',
                        'output': get_output(submodule_push)
                    }, status_code=500)

                print(f"[PUSH] Submodule pushed successfully", flush=True)

                # Add the updated submodule reference to main repo staging area
                result = subprocess.run(
                    ['git', 'add', submodule_path],
                    cwd=str(source_dir),
                    capture_output=True,
                    text=True,
                    timeout=10
                )

                if result.returncode != 0:
                    return JSONResponse({
                        'error': 'Failed to stage submodule reference',
                        'output': get_output(result)
                    }, status_code=500)

        # Add all changes in main repo
        print(f"[PUSH] Adding all changes in main repo...", flush=True)
        result = subprocess.run(
            ['git', 'add', '-A'],
            cwd=str(source_dir),
            capture_output=True,
            text=True,
            timeout=10
        )

        if result.returncode != 0:
            return JSONResponse({
                'error': 'Failed to add changes',
                'output': get_output(result)
            }, status_code=500)

        # Create commit in main repo
        print(f"[PUSH] Creating commit in main repo...", flush=True)
        result = subprocess.run(
            ['git', 'commit', '-m', message],
            cwd=str(source_dir),
            capture_output=True,
            text=True,
            timeout=10
        )

        if result.returncode != 0:
            return JSONResponse({
                'error': 'Failed to create commit',
                'output': get_output(result)
            }, status_code=500)

        # Configure git credentials before any remote operations
        github_token = os.getenv('GITHUB_TOKEN')

        if github_token:
            print('[PUSH] Configuring git credentials...', flush=True)

            # Get the current remote URL
            result = subprocess.run(
                ['git', 'remote', 'get-url', 'origin'],
                cwd=str(source_dir),
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode != 0:
                return JSONResponse({
                    'error': 'Failed to get remote URL',
                    'output': get_output(result)
                }, status_code=500)

            remote_url = result.stdout.strip()

            # Remove any existing credentials from URL
            import re
            clean_url = re.sub(r'https://[^@]*@', 'https://', remote_url)
            print(f'[PUSH] Remote URL: {clean_url}', flush=True)

            # Set clean URL if different
            if remote_url != clean_url:
                subprocess.run(
                    ['git', 'config', '--local', 'remote.origin.url', clean_url],
                    cwd=str(source_dir),
                    capture_output=True,
                    text=True
                )

            # Configure credential helper
            subprocess.run(
                ['git', 'config', '--local', 'credential.helper', 'store'],
                cwd=str(source_dir),
                capture_output=True,
                text=True
            )

            # Set up credential helper with token
            credential_input = f"url={clean_url}\nusername={github_token}\npassword=x-oauth-basic\n"
            subprocess.run(
                ['git', 'credential', 'approve'],
                cwd=str(source_dir),
                input=credential_input,
                text=True,
                capture_output=True
            )
        else:
            print('[PUSH] No GITHUB_TOKEN found', flush=True)

        # Fetch remote changes to check for updates
        print(f'[PUSH] Fetching remote changes...', flush=True)
        fetch_result = subprocess.run(
            ['git', 'fetch', 'origin', branch],
            cwd=str(source_dir),
            capture_output=True,
            text=True,
            timeout=30,
            env={**os.environ, 'GIT_TERMINAL_PROMPT': '0'}
        )

        if fetch_result.returncode != 0:
            print(f'[PUSH] Fetch failed: {get_output(fetch_result)}', flush=True)
            return JSONResponse({
                'success': False,
                'error': 'Failed to fetch remote changes',
                'output': get_output(fetch_result)
            }, status_code=500)

        # Check if local is behind remote
        result = subprocess.run(
            ['git', 'rev-list', '--count', f'HEAD..origin/{branch}'],
            cwd=str(source_dir),
            capture_output=True,
            text=True,
            timeout=10
        )

        if result.returncode == 0:
            commits_behind = int(result.stdout.strip() or '0')
            if commits_behind > 0:
                print(f'[PUSH] Local branch is {commits_behind} commit(s) behind remote. Rebasing...', flush=True)

                # Pull with rebase to apply local commits on top of remote
                pull_result = subprocess.run(
                    ['git', 'pull', '--rebase', 'origin', branch],
                    cwd=str(source_dir),
                    capture_output=True,
                    text=True,
                    timeout=30,
                    env={**os.environ, 'GIT_TERMINAL_PROMPT': '0'}
                )

                if pull_result.returncode != 0:
                    print(f'[PUSH] Rebase failed: {get_output(pull_result)}', flush=True)

                    # Try to abort the rebase to leave repo in clean state
                    subprocess.run(
                        ['git', 'rebase', '--abort'],
                        cwd=str(source_dir),
                        capture_output=True,
                        text=True
                    )

                    return JSONResponse({
                        'success': False,
                        'error': 'Failed to rebase onto remote changes. Manual intervention required.',
                        'output': get_output(pull_result),
                        'hint': 'The remote repository has changes that conflict with your local changes. Please resolve conflicts manually or discard local changes.'
                    }, status_code=409)

                print('[PUSH] Rebase successful', flush=True)
            else:
                print('[PUSH] Local branch is up to date with remote', flush=True)

        # Push to origin with timeout
        print(f'[PUSH] Pushing to origin {branch}...', flush=True)
        push_result = subprocess.run(
            ['git', 'push', 'origin', branch],
            cwd=str(source_dir),
            capture_output=True,
            text=True,
            timeout=30,
            env={**os.environ, 'GIT_TERMINAL_PROMPT': '0'}
        )

        print(f'[PUSH] Push completed with return code: {push_result.returncode}', flush=True)

        if push_result.returncode == 0:
            print('[PUSH] Success!', flush=True)

            # Get commit IDs for build code display
            main_commit = None
            submodule_commit = None

            try:
                result = subprocess.run(
                    ['git', 'rev-parse', '--short', 'HEAD'],
                    cwd=str(source_dir),
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if result.returncode == 0:
                    main_commit = result.stdout.strip()
            except Exception as e:
                print(f'[PUSH] Could not get main commit ID: {e}', flush=True)

            if submodule_has_changes:
                try:
                    result = subprocess.run(
                        ['git', 'rev-parse', '--short', 'HEAD'],
                        cwd=str(submodule_full_path),
                        capture_output=True,
                        text=True,
                        timeout=5
                    )
                    if result.returncode == 0:
                        submodule_commit = result.stdout.strip()
                except Exception as e:
                    print(f'[PUSH] Could not get submodule commit ID: {e}', flush=True)

            return JSONResponse({
                'success': True,
                'message': 'Changes committed and pushed successfully',
                'branch': branch,
                'submodule_pushed': submodule_has_changes,
                'site_code': site_code if submodule_has_changes else None,
                'main_commit': main_commit,
                'submodule_commit': submodule_commit,
                'output': get_output(push_result)
            })
        else:
            print(f'[PUSH] Push failed', flush=True)
            return JSONResponse({
                'success': False,
                'error': 'Failed to push to GitHub',
                'output': get_output(push_result)
            }, status_code=500)

    except subprocess.TimeoutExpired:
        return JSONResponse({
            'success': False,
            'error': 'Operation timeout',
            'output': 'Git operation exceeded timeout limit'
        }, status_code=500)

    except Exception as e:
        return JSONResponse({
            'success': False,
            'error': 'Failed to commit and push',
            'output': str(e)
        }, status_code=500)


if __name__ == '__main__':
    print('Running build service.')
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000, log_level='info')
