 import type { APIRoute } from 'astro';

// Dev-only route: runs on-demand in dev; excludeDevPages forces it to
// prerender in production builds and deletes its output from dist.
export const prerender = false;

// Required for static builds - this page is excluded from production anyway
export async function getStaticPaths() {
  return [];
}

export const GET: APIRoute = async ({ params }) => {
  const { filename } = params;

  if (!filename) {
    return new Response(JSON.stringify({
      error: 'Filename is required'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Proxy request to build service
    const response = await fetch(`http://build-service:8000/build-log/${filename}`);

    if (!response.ok) {
      const error = await response.json();
      return new Response(JSON.stringify(error), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Return the log file
    const logContent = await response.text();
    return new Response(logContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({
      error: 'Failed to retrieve build log',
      message: error.message || 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
