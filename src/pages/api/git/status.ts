import type { APIRoute } from 'astro';
import { execSync } from 'child_process';

// Note: This endpoint can be prerendered (static) in production since it will
// always return a 403 error. In development it works as a dynamic endpoint.
export const GET: APIRoute = async () => {
  // Only allow in development mode
  if (import.meta.env.PROD) {
    return new Response(JSON.stringify({ error: 'Not available in production' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get git status
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    const hasChanges = status.trim().length > 0;

    // Parse status output
    const files = status.trim().split('\n').filter(Boolean).map(line => {
      const status = line.substring(0, 2);
      // Skip the status (2 chars) and any following whitespace
      const file = line.substring(2).trim();
      return { status, file };
    });

    return new Response(JSON.stringify({
      branch,
      hasChanges,
      files
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to get git status',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
