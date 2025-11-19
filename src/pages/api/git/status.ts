import type { APIRoute } from 'astro';

// the following line will be automatically commented out
// by the build process for production builds.
export const prerender = false; // ![DEV-ONLY]

export const GET: APIRoute = async () => {
  try {
    // Call build-service for git status (all git operations happen there)
    const response = await fetch('http://build-service:8000/git-status');

    if (!response.ok) {
      const error = await response.json();
      return new Response(JSON.stringify(error), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to get git status from build service',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
