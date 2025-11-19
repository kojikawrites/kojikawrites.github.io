import type { APIRoute } from 'astro';

// the following line will be automatically commented out
// by the build process for production builds.
export const prerender = false; // ![DEV-ONLY]

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
