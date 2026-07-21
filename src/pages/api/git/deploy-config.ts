import type { APIRoute } from 'astro';

// Dev-only route: runs on-demand in dev; excludeDevPages forces it to
// prerender in production builds and deletes its output from dist.
export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    // Call build-service for deployment configuration
    const response = await fetch('http://build-service:8000/deploy-config');

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
      error: 'Failed to get deployment config from build service',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};