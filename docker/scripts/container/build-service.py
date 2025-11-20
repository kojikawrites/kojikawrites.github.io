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
from fastapi.responses import JSONResponse, FileResponse

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
    return (result.stdout + result.stderr)[-2048:]

def write_build_log(content, log_dir='/tmp/build-logs'):
    """Write full build log to a file and return the filename."""
    Path(log_dir).mkdir(parents=True, exist_ok=True)

    # Use timestamp for unique filename
    import datetime
    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    log_filename = f'build_{timestamp}.log'
    log_path = Path(log_dir) / log_filename

    with open(log_path, 'w') as f:
        f.write(content)

    return log_filename

def ensure_env_in_gitignore(repo_path):
    """Ensure .env files are in .gitignore and not tracked by git."""
    gitignore_path = repo_path / '.gitignore'

    # Check if .gitignore exists
    if not gitignore_path.exists():
        print(f"[GIT] Creating .gitignore file", flush=True)
        gitignore_path.write_text('')

    # Read current .gitignore
    gitignore_content = gitignore_path.read_text()

    # Check if .env is already ignored
    env_patterns = ['**/.env', '.env', '**/.env.*', '!**/.env.example']
    needs_update = False

    for pattern in env_patterns:
        if pattern not in gitignore_content:
            needs_update = True
            break

    # Add .env patterns if missing
    if needs_update:
        print(f"[GIT] Adding .env patterns to .gitignore", flush=True)
        if not gitignore_content.endswith('\n'):
            gitignore_content += '\n'
        gitignore_content += '\n# Environment variables (auto-added for security)\n'
        gitignore_content += '**/.env\n'
        gitignore_content += '**/.env.*\n'
        gitignore_content += '!**/.env.example\n'
        gitignore_path.write_text(gitignore_content)

    # Remove any .env files from git cache
    print(f"[GIT] Checking for tracked .env files...", flush=True)
    result = subprocess.run(
        ['git', 'ls-files', '**/.env', '**/.env.*', '.env'],
        cwd=str(repo_path),
        capture_output=True,
        text=True,
        timeout=10
    )

    if result.returncode == 0 and result.stdout.strip():
        tracked_env_files = result.stdout.strip().split('\n')
        # Filter out .env.example files
        tracked_env_files = [f for f in tracked_env_files if not f.endswith('.env.example')]

        if tracked_env_files:
            print(f"[GIT] Found {len(tracked_env_files)} tracked .env files, removing from cache...", flush=True)
            for env_file in tracked_env_files:
                print(f"[GIT]   - Untracking: {env_file}", flush=True)
                subprocess.run(
                    ['git', 'rm', '--cached', env_file],
                    cwd=str(repo_path),
                    capture_output=True,
                    text=True,
                    timeout=10
                )

def check_for_env_files_in_changes(repo_path):
    """Check if any .env files are staged for commit (excluding .env.example)."""
    result = subprocess.run(
        ['git', 'diff', '--cached', '--name-only'],
        cwd=str(repo_path),
        capture_output=True,
        text=True,
        timeout=10
    )

    if result.returncode == 0 and result.stdout.strip():
        staged_files = result.stdout.strip().split('\n')
        env_files = [f for f in staged_files
                     if '.env' in f and not f.endswith('.env.example')]
        return env_files

    return []

@app.get("/ping")
async def ping():
    return JSONResponse({
        'success': True,
        'output': 'pong'
    }, status_code=200)


@app.get("/deploy-config")
async def get_deploy_config():
    """
    Get deployment configuration from environment variables.
    Returns deployment target and wisp configuration if applicable.
    """
    deploy_target = os.getenv('DEPLOY_TARGET', 'github').lower()

    config = {
        'target': deploy_target
    }

    # Add wisp configuration if target is wisp
    if deploy_target == 'wisp':
        config['wisp'] = {
            'handle': os.getenv('WISP_HANDLE', ''),
            'app_password': os.getenv('WISP_APP_PASSWORD', ''),
            'site_name': os.getenv('WISP_SITE_NAME', '') or get_site_code()
        }

    return JSONResponse(config)


@app.get("/git-status")
async def git_status():
    """
    Get git status including uncommitted changes and unpushed commits.
    Returns both local changes and remote tracking status.
    """
    try:
        source_dir = Path('/source')

        # Get current branch
        branch_result = subprocess.run(
            ['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
            cwd=str(source_dir),
            capture_output=True,
            text=True,
            timeout=10
        )

        if branch_result.returncode != 0:
            return JSONResponse({
                'error': 'Failed to get current branch',
                'output': get_output(branch_result)
            }, status_code=500)

        branch = branch_result.stdout.strip()

        # Get site code and submodule path
        site_code = get_site_code()
        submodule_path = get_submodule_path(site_code)
        submodule_full_path = source_dir / submodule_path

        # Get repo names from git remotes
        def get_repo_name(repo_path):
            """Extract just the repo name (without owner) from git remote URL."""
            try:
                result = subprocess.run(
                    ['git', 'remote', 'get-url', 'origin'],
                    cwd=str(repo_path),
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if result.returncode == 0:
                    url = result.stdout.strip()
                    # Extract repo name from URL (e.g., github.com/owner/repo.git -> repo)
                    # Handle both SSH and HTTPS URLs
                    import re
                    # Try to extract owner/repo pattern, then take just the repo part
                    match = re.search(r'[:/][^/]+/([^/]+?)(\.git)?$', url)
                    if match:
                        return match.group(1).replace('.git', '')
            except Exception as e:
                print(f"[GIT-STATUS] Error getting repo name for {repo_path}: {e}", flush=True)
            return None

        main_repo_name = get_repo_name(source_dir) or 'main'
        submodule_repo_name = site_code  # Default to site_code
        if submodule_full_path.exists() and (submodule_full_path / '.git').exists():
            submodule_repo_name = get_repo_name(submodule_full_path) or site_code

        print(f"[GIT-STATUS] Main repo: {main_repo_name}, Submodule repo: {submodule_repo_name}", flush=True)

        # Get working tree status with rename/move detection
        status_result = subprocess.run(
            ['git', 'status', '--porcelain', '--find-renames'],
            cwd=str(source_dir),
            capture_output=True,
            text=True,
            timeout=10
        )

        if status_result.returncode != 0:
            return JSONResponse({
                'error': 'Failed to get git status',
                'output': get_output(status_result)
            }, status_code=500)

        status_output = status_result.stdout.strip()

        # Parse main repo status
        files = []
        if status_output:
            for line in status_output.split('\n'):
                if line:
                    status = line[:2]
                    file_part = line[2:].strip()

                    # Skip the submodule reference itself - we'll get actual submodule files separately
                    if file_part == submodule_path:
                        continue

                    # Handle renames (R) and copies (C) which have format "old -> new"
                    if status[0] in ['R', 'C'] and ' -> ' in file_part:
                        old_file, new_file = file_part.split(' -> ', 1)
                        # Check if file is in submodule
                        is_submodule = new_file.startswith(submodule_path + '/')
                        files.append({
                            'status': status,
                            'file': new_file,
                            'oldFile': old_file,
                            'module': 'submodule' if is_submodule else 'main',
                            'moduleName': submodule_repo_name if is_submodule else main_repo_name
                        })
                    else:
                        # Check if file is in submodule
                        is_submodule = file_part.startswith(submodule_path + '/')
                        files.append({
                            'status': status,
                            'file': file_part,
                            'module': 'submodule' if is_submodule else 'main',
                            'moduleName': submodule_repo_name if is_submodule else main_repo_name
                        })

        # Get submodule status separately if submodule exists
        if submodule_full_path.exists() and (submodule_full_path / '.git').exists():
            submodule_status_result = subprocess.run(
                ['git', 'status', '--porcelain', '--find-renames'],
                cwd=str(submodule_full_path),
                capture_output=True,
                text=True,
                timeout=10
            )

            if submodule_status_result.returncode == 0 and submodule_status_result.stdout.strip():
                for line in submodule_status_result.stdout.strip().split('\n'):
                    if line:
                        status = line[:2]
                        file_part = line[2:].strip()

                        # Prepend submodule path to file for full path
                        full_file_path = f"{submodule_path}/{file_part}"

                        # Handle renames
                        if status[0] in ['R', 'C'] and ' -> ' in file_part:
                            old_file, new_file = file_part.split(' -> ', 1)
                            files.append({
                                'status': status,
                                'file': f"{submodule_path}/{new_file}",
                                'oldFile': f"{submodule_path}/{old_file}",
                                'module': 'submodule',
                                'moduleName': submodule_repo_name
                            })
                        else:
                            files.append({
                                'status': status,
                                'file': full_file_path,
                                'module': 'submodule',
                                'moduleName': submodule_repo_name
                            })

        has_changes = bool(files)

        # Check if branch is ahead of remote
        commits_ahead = 0
        commits_behind = 0
        tracking_branch = f'origin/{branch}'

        # Check if remote branch exists
        remote_check = subprocess.run(
            ['git', 'rev-parse', '--verify', tracking_branch],
            cwd=str(source_dir),
            capture_output=True,
            text=True,
            timeout=10
        )

        if remote_check.returncode == 0:
            # Get commits ahead
            ahead_result = subprocess.run(
                ['git', 'rev-list', '--count', f'{tracking_branch}..HEAD'],
                cwd=str(source_dir),
                capture_output=True,
                text=True,
                timeout=10
            )
            if ahead_result.returncode == 0:
                commits_ahead = int(ahead_result.stdout.strip() or '0')

            # Get commits behind
            behind_result = subprocess.run(
                ['git', 'rev-list', '--count', f'HEAD..{tracking_branch}'],
                cwd=str(source_dir),
                capture_output=True,
                text=True,
                timeout=10
            )
            if behind_result.returncode == 0:
                commits_behind = int(behind_result.stdout.strip() or '0')

        return JSONResponse({
            'branch': branch,
            'hasChanges': has_changes,
            'files': files,
            'commitsAhead': commits_ahead,
            'commitsBehind': commits_behind,
            'needsPush': commits_ahead > 0,
            'needsPull': commits_behind > 0
        })

    except subprocess.TimeoutExpired:
        return JSONResponse({
            'error': 'Timeout getting git status'
        }, status_code=500)
    except Exception as e:
        return JSONResponse({
            'error': f'Failed to get git status: {str(e)}'
        }, status_code=500)


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

        # Framework pages that are always excluded from production builds
        framework_excludes = ['admin', 'api', 'edit']

        # Get site-specific exclusions
        site_excludes = []
        if config_path.exists():
            with open(config_path, 'r') as f:
                config = yaml.safe_load(f) or {}
                site_excludes = config.get('build', {}).get('exclude_from_production', [])

        # Combine framework and site-specific exclusions
        exclude_dirs = framework_excludes + site_excludes

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
        # Include .git and .gitmodules for submodule initialization
        print(f"Copying {source_dir} to {build_dir} (site: {site_code})...", flush=True)
        subprocess.run(
            ['rsync', '-a',
             '--exclude=node_modules',
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
            timeout=600,  # 10 minutes timeout
            env={**os.environ, 'NODE_ENV': 'production'}
        )

        duration = round(time.time() - start_time, 2)

        # Write full build log to file
        full_output = result.stdout + result.stderr
        log_filename = write_build_log(full_output)

        if result.returncode == 0:

            return JSONResponse({
                'success': True,
                'message': f'Build completed successfully in {duration}s',
                'output': get_output(result),
                'log_file': log_filename
            })
        else:
            return JSONResponse({
                'success': False,
                'error': 'Build failed',
                'output': get_output(result),
                'log_file': log_filename
            }, status_code=500)

    except subprocess.TimeoutExpired:
        return JSONResponse({
            'success': False,
            'error': 'Build timeout - operation took too long',
            'output': 'The build operation exceeded 10 minutes.'
        }, status_code=500)

    except Exception as e:
        return JSONResponse({
            'success': False,
            'error': f'Build error: {str(e)}',
            'output': str(e)
        }, status_code=500)


@app.post("/suggest-commit-message")
async def suggest_commit_message(request: Request):
    """
    Generate a commit message suggestion using LLM based on git diff.
    Handles large diffs by chunking and summarizing.
    """
    try:
        body = await request.json()
        files = body.get('files', [])

        source_dir = Path('/source')

        # Get git diff for the changes
        print(f"[COMMIT-MSG] Getting diff for files...", flush=True)

        # Get diff with context
        diff_result = subprocess.run(
            ['git', 'diff', '--staged', '--unified=3'],
            cwd=str(source_dir),
            capture_output=True,
            text=True,
            timeout=10
        )

        diff_output = diff_result.stdout

        # If no staged changes, try unstaged changes
        if not diff_output:
            diff_result = subprocess.run(
                ['git', 'diff', '--unified=3'],
                cwd=str(source_dir),
                capture_output=True,
                text=True,
                timeout=10
            )
            diff_output = diff_result.stdout

        if not diff_output:
            return JSONResponse({
                'error': 'No changes found to generate commit message'
            }, status_code=400)

        # Get file list for context
        file_list = "\n".join([f"- {f['file']} ({f['status']})" for f in files]) if files else "Multiple files"

        # Estimate token count (rough: 1 token ≈ 4 characters)
        diff_tokens = len(diff_output) // 4
        max_tokens = 6000  # Leave room for response and system prompt

        print(f"[COMMIT-MSG] Diff size: ~{diff_tokens} tokens", flush=True)

        # If diff is too large, summarize by file
        if diff_tokens > max_tokens:
            print(f"[COMMIT-MSG] Diff too large, chunking by file...", flush=True)

            # Get per-file diffs
            file_summaries = []
            for file_info in files[:20]:  # Limit to first 20 files
                file_path = file_info['file']
                file_diff = subprocess.run(
                    ['git', 'diff', '--unified=1', '--', file_path],
                    cwd=str(source_dir),
                    capture_output=True,
                    text=True,
                    timeout=5
                )

                if file_diff.stdout:
                    # Truncate individual file diffs if needed
                    truncated_diff = file_diff.stdout[:2000]
                    file_summaries.append(f"File: {file_path}\n{truncated_diff}")

            diff_context = "\n\n---\n\n".join(file_summaries)
        else:
            diff_context = diff_output

        # Prepare LLM prompt
        prompt = f"""Write a single git commit message for these changes. Be specific about WHAT changed, not just WHERE.

Files changed:
{file_list}

Git diff:
{diff_context}

Rules:
- ONE message only, not multiple options
- Use imperative mood ("Add" not "Added")
- Be specific: mention actual features/fixes, not vague words like "improvements" or "updates"
- If multiple changes, list the key ones (max 2-3 specific things)
- Keep total length under 120 characters
- NO quotes, NO preamble, NO options

Good examples (specific):
- Add HTTPS support with self-signed cert handling to build service LLM calls
- Strip quote wrapping from LLM responses and improve commit message prompt
- Add build log download API and empty default commit message field

Bad examples (too vague):
- Update build service and LLM integration
- Add new features and improvements
- Update multiple files

Your commit message:"""

        # Call blog's LLM API (uses existing provider logic)
        print(f"[COMMIT-MSG] Calling blog LLM API...", flush=True)

        llm_response = await call_blog_llm_api(prompt)

        if llm_response:
            return JSONResponse({
                'message': llm_response.strip(),
                'generated_by': 'llm'
            })
        else:
            # Fallback to basic message
            return JSONResponse({
                'message': generate_basic_commit_message(files),
                'generated_by': 'fallback'
            })

    except subprocess.TimeoutExpired:
        return JSONResponse({
            'error': 'Timeout getting git diff'
        }, status_code=500)
    except Exception as e:
        print(f"[COMMIT-MSG] Error: {e}", flush=True)
        return JSONResponse({
            'error': f'Failed to generate commit message: {str(e)}'
        }, status_code=500)


async def call_blog_llm_api(prompt: str) -> str:
    """Call the blog's LLM API to generate text. Delegates to existing provider logic."""
    import httpx

    try:
        # Call blog service's LLM API endpoint (internal Docker network)
        # Use HTTPS with self-signed certificate verification disabled (safe for internal Docker network)
        async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
            response = await client.post(
                "https://blog:4321/api/llm/text",
                json={
                    "operation": "generate",
                    "prompt": prompt,
                    "maxTokens": 200,
                    "temperature": 0.3,
                }
            )

            if response.status_code == 200:
                result = response.json()
                message = result.get('result', '')
                # Strip surrounding quotes if present
                if message.startswith('"') and message.endswith('"'):
                    message = message[1:-1]
                elif message.startswith("'") and message.endswith("'"):
                    message = message[1:-1]
                return message
            else:
                print(f"[LLM] Blog API error: {response.status_code} - {response.text}", flush=True)
                return None

    except Exception as e:
        print(f"[LLM] Error calling blog LLM API: {e}", flush=True)
        return None


def generate_basic_commit_message(files: list) -> str:
    """Generate a basic commit message based on file patterns when LLM is not available."""
    if not files:
        return "Update content"

    # Categorize files by type and path
    content_files = []
    code_files = []
    config_files = []
    docker_files = []
    style_files = []

    # Track file statuses
    added = []
    modified = []
    deleted = []

    for file_info in files:
        file_path = file_info['file']
        status = file_info.get('status', 'M')

        # Track status
        if 'A' in status:
            added.append(file_path)
        elif 'D' in status:
            deleted.append(file_path)
        else:
            modified.append(file_path)

        # Categorize by type
        if any(ext in file_path for ext in ['.md', '.mdx', '.txt']):
            content_files.append(file_path)
        elif 'docker' in file_path.lower() or 'Dockerfile' in file_path:
            docker_files.append(file_path)
        elif any(ext in file_path for ext in ['.css', '.scss', '.sass']):
            style_files.append(file_path)
        elif any(ext in file_path for ext in ['.ts', '.tsx', '.js', '.jsx', '.py', '.astro']):
            code_files.append(file_path)
        elif any(ext in file_path for ext in ['.json', '.yaml', '.yml', '.toml']):
            config_files.append(file_path)

    # Determine primary action
    action = "Update"
    if len(added) > len(modified) + len(deleted):
        action = "Add"
    elif len(deleted) > len(modified) + len(added):
        action = "Remove"

    # Generate specific message based on file types and patterns
    if docker_files:
        return f"{action.lower()}: Update Docker configuration"
    elif content_files and not code_files and not config_files:
        if len(content_files) == 1:
            filename = content_files[0].split('/')[-1].replace('.md', '').replace('.mdx', '')
            return f"docs: {action} {filename}"
        else:
            return f"docs: {action} {len(content_files)} content files"
    elif style_files and not code_files:
        return f"style: {action} styling"
    elif code_files and not content_files:
        # Try to identify the area being worked on
        if len(code_files) == 1:
            filename = code_files[0].split('/')[-1]
            # Extract component/module name
            name = filename.split('.')[0]
            if 'deploy' in code_files[0].lower():
                return f"{action} deploy page functionality"
            elif 'admin' in code_files[0].lower():
                return f"{action} admin interface"
            else:
                return f"{action} {name}"
        else:
            # Look for common directories
            paths = [f.split('/') for f in code_files]
            if all('admin' in p or 'deploy' in p for p in paths):
                return f"{action} deploy/admin functionality"
            elif all('api' in p for p in paths):
                return f"{action} API endpoints"
            else:
                return f"{action} {len(code_files)} code files"
    elif config_files and not code_files and not content_files:
        return f"chore: {action} configuration"
    else:
        # Mixed changes
        parts = []
        if code_files:
            parts.append(f"{len(code_files)} code")
        if content_files:
            parts.append(f"{len(content_files)} content")
        if config_files:
            parts.append(f"{len(config_files)} config")

        if parts:
            return f"{action} {' and '.join(parts[:2])} files"
        return f"{action} {len(files)} files"


@app.get("/build-log/{log_filename}")
async def get_build_log(log_filename: str):
    """
    Download a build log file.
    """
    log_dir = Path('/tmp/build-logs')
    log_path = log_dir / log_filename

    # Security: Only allow filenames that match expected pattern
    if not log_filename.startswith('build_') or not log_filename.endswith('.log'):
        return JSONResponse({
            'error': 'Invalid log filename'
        }, status_code=400)

    if not log_path.exists():
        return JSONResponse({
            'error': 'Log file not found'
        }, status_code=404)

    return FileResponse(
        path=str(log_path),
        filename=log_filename,
        media_type='text/plain'
    )


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

        # SECURITY: Ensure .env files are in .gitignore and not tracked
        print(f"[PUSH] Running .env security checks...", flush=True)
        ensure_env_in_gitignore(source_dir)

        # Also check submodule if it exists
        site_code = get_site_code()
        submodule_path = get_submodule_path(site_code)
        submodule_full_path = source_dir / submodule_path
        if submodule_full_path.exists():
            ensure_env_in_gitignore(submodule_full_path)

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

                # Configure git credentials for submodule BEFORE any operations
                github_token = os.getenv('GITHUB_TOKEN')
                if github_token:
                    print('[PUSH] Configuring git credentials for submodule...', flush=True)

                    # Get submodule's remote URL
                    result = subprocess.run(
                        ['git', 'remote', 'get-url', 'origin'],
                        cwd=str(submodule_full_path),
                        capture_output=True,
                        text=True,
                        timeout=10
                    )

                    if result.returncode == 0:
                        import re
                        remote_url = result.stdout.strip()
                        clean_url = re.sub(r'https://[^@]*@', 'https://', remote_url)

                        # Set clean URL
                        subprocess.run(
                            ['git', 'config', '--local', 'remote.origin.url', clean_url],
                            cwd=str(submodule_full_path),
                            capture_output=True,
                            text=True
                        )

                        # Configure credential helper
                        subprocess.run(
                            ['git', 'config', '--local', 'credential.helper', 'store'],
                            cwd=str(submodule_full_path),
                            capture_output=True,
                            text=True
                        )

                        # Set up credential helper with token
                        credential_input = f"url={clean_url}\nusername={github_token}\npassword=x-oauth-basic\n"
                        subprocess.run(
                            ['git', 'credential', 'approve'],
                            cwd=str(submodule_full_path),
                            input=credential_input,
                            text=True,
                            capture_output=True
                        )

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

                # Configure git user for submodule commits
                git_author_name = os.getenv('GIT_AUTHOR_NAME', 'Build Service')
                git_author_email = os.getenv('GIT_AUTHOR_EMAIL', 'build@hiivelabs.com')

                subprocess.run(['git', 'config', 'user.name', git_author_name], cwd=str(submodule_full_path), check=True)
                subprocess.run(['git', 'config', 'user.email', git_author_email], cwd=str(submodule_full_path), check=True)

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

        # FINAL SECURITY CHECK: Verify no .env files are staged
        print(f"[PUSH] Final security check for .env files...", flush=True)
        env_files_staged = check_for_env_files_in_changes(source_dir)
        if env_files_staged:
            error_msg = f"SECURITY BLOCK: Cannot commit .env files!\n\nThe following .env files are staged:\n"
            for env_file in env_files_staged:
                error_msg += f"  - {env_file}\n"
            error_msg += "\n.env files contain sensitive credentials and must NEVER be committed to git."
            error_msg += "\nThese files have been automatically added to .gitignore."
            error_msg += "\nPlease remove them from the staging area manually if needed."

            print(f"[PUSH] BLOCKED: {error_msg}", flush=True)
            return JSONResponse({
                'error': error_msg,
                'blocked_files': env_files_staged
            }, status_code=403)

        # Configure git user for main repo commits
        git_author_name = os.getenv('GIT_AUTHOR_NAME', 'Build Service')
        git_author_email = os.getenv('GIT_AUTHOR_EMAIL', 'build@hiivelabs.com')

        subprocess.run(['git', 'config', 'user.name', git_author_name], cwd=str(source_dir), check=True)
        subprocess.run(['git', 'config', 'user.email', git_author_email], cwd=str(source_dir), check=True)

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


@app.post("/deploy-wisp")
async def deploy_wisp(request: Request):
    """
    Deploy production build to wisp.place using wisp-cli.
    Expects JSON body with deployment configuration.
    """
    try:
        body = await request.json()
        handle = body.get('handle')
        app_password = body.get('app_password')
        site_name = body.get('site_name')

        print(f"[WISP] Received deployment request for handle: {handle}, site: {site_name}", flush=True)

        if not handle or not app_password:
            return JSONResponse({
                'error': 'Missing required fields: handle and app_password are required'
            }, status_code=400)

        # Default site name to site code if not provided
        if not site_name:
            site_name = get_site_code()

        # Path to the production build output
        # The build process creates output in /tmp/build-workspace/build/dist
        build_output_dir = Path('/tmp/build-workspace/build/dist')

        if not build_output_dir.exists():
            return JSONResponse({
                'error': 'Production build not found. Please run a test build first.',
                'hint': 'Run the "Test Build" before deploying to wisp.place'
            }, status_code=400)

        print(f"[WISP] Deploying from {build_output_dir} to wisp.place...", flush=True)

        # Call wisp-cli to deploy
        # wisp-cli deploy <handle> --path <build_dir> --site <site_name> --password <app_password>
        deploy_result = subprocess.run(
            [
                '/build-service/wisp-cli',
                'deploy',
                handle,
                '--path', str(build_output_dir),
                '--site', site_name,
                '--password', app_password
            ],
            capture_output=True,
            text=True,
            timeout=120  # 2 minutes timeout for deployment
        )

        if deploy_result.returncode == 0:
            # Construct the wisp.place URL
            # Format: https://{site_name}.wisp.place
            wisp_url = f"https://{site_name}.wisp.place"

            print(f"[WISP] Deployment successful! Site available at: {wisp_url}", flush=True)

            return JSONResponse({
                'success': True,
                'message': f'Successfully deployed to wisp.place',
                'url': wisp_url,
                'site_name': site_name,
                'handle': handle,
                'output': deploy_result.stdout + deploy_result.stderr
            })
        else:
            # Capture full output for debugging
            full_output = deploy_result.stdout + deploy_result.stderr
            print(f"[WISP] Deployment failed with return code {deploy_result.returncode}", flush=True)
            print(f"[WISP] stdout: {deploy_result.stdout}", flush=True)
            print(f"[WISP] stderr: {deploy_result.stderr}", flush=True)

            return JSONResponse({
                'success': False,
                'error': 'wisp.place deployment failed',
                'output': full_output,
                'return_code': deploy_result.returncode
            }, status_code=500)

    except subprocess.TimeoutExpired:
        return JSONResponse({
            'success': False,
            'error': 'Deployment timeout - operation took too long',
            'output': 'The deployment operation exceeded 2 minutes.'
        }, status_code=500)
    except Exception as e:
        print(f"[WISP] Deployment error: {e}", flush=True)
        return JSONResponse({
            'success': False,
            'error': f'Deployment error: {str(e)}',
            'output': str(e)
        }, status_code=500)


if __name__ == '__main__':
    print('Running build service.')
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000, log_level='info')
