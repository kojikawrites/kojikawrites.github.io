import type { APIRoute } from 'astro';
import { execSync } from 'child_process';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // Only allow in development mode
  if (import.meta.env.PROD) {
    return new Response(JSON.stringify({ error: 'Not available in production' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Commit message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get current branch
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();

    // Check if there are any changes to commit
    const status = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
    if (!status) {
      return new Response(JSON.stringify({
        error: 'No changes to commit'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Add all changes
    execSync('git add -A', { encoding: 'utf-8' });

    // Create commit
    const commitMessage = message.replace(/"/g, '\\"');
    execSync(`git commit -m "${commitMessage}"`, { encoding: 'utf-8' });

    // Configure git to use token if available
    const githubToken = process.env.GITHUB_TOKEN;

    if (githubToken) {
      // Configure git credential helper to use token
      // This works better with fine-grained tokens than embedding in URL
      execSync('git config --local credential.helper store', { encoding: 'utf-8' });

      // Get the current remote URL and ensure it's HTTPS
      const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();

      // Remove any existing credentials from URL
      const cleanUrl = remoteUrl.replace(/https:\/\/[^@]*@/, 'https://');

      // Set clean URL
      if (remoteUrl !== cleanUrl) {
        execSync(`git config --local remote.origin.url "${cleanUrl}"`, { encoding: 'utf-8' });
      }

      // Set up credential helper with token
      // For fine-grained tokens, use the token as both username and password
      const credentialInput = `url=${cleanUrl}\nusername=${githubToken}\npassword=x-oauth-basic\n`;
      execSync(`git credential approve`, {
        encoding: 'utf-8',
        input: credentialInput
      });
    } else {
      // No token available - warn that push might fail
      console.warn('No GITHUB_TOKEN found - push may require SSH keys or fail');
    }

    // Push to origin with detailed error output and timeout
    try {
      const pushOutput = execSync(`git push origin ${branch} 2>&1`, {
        encoding: 'utf-8',
        timeout: 30000, // 30 second timeout
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: '0', // Disable interactive prompts
        }
      });

      return new Response(JSON.stringify({
        success: true,
        message: 'Changes committed and pushed successfully',
        branch,
        output: pushOutput
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (pushError: any) {
      // Push failed - return detailed error
      const errorDetails = pushError.stderr || pushError.stdout || pushError.message;

      // Check if timeout occurred
      if (pushError.killed || pushError.signal === 'SIGTERM') {
        return new Response(JSON.stringify({
          error: 'Push timeout - operation took too long',
          details: 'The push operation exceeded 30 seconds. Check your network connection and GitHub token permissions.',
          branch
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        error: 'Failed to push to GitHub',
        details: errorDetails,
        branch,
        hint: 'Check that your GITHUB_TOKEN has correct permissions (Contents: Read and write) and repository access'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error: any) {
    return new Response(JSON.stringify({
      error: 'Failed to commit and push',
      details: error.stderr || error.stdout || error.message || String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
