import type { APIRoute } from 'astro';
export const prerender = false;

export const POST: APIRoute = async ({ url, params, request}) => {
  try {
    // Read the message from request body
    const body = await request.json();
    const message = body.message;

    if (!message) {
      return new Response(JSON.stringify({
        error: 'Commit message is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Forward the request to the build service container
    const response = await fetch('http://build-service:8000/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message })
    });

    // Check if response is ok before trying to parse JSON
    if (!response.ok) {
      const text = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(text);
      } catch {
        errorData = { error: 'Build service error', output: text };
      }
      return new Response(JSON.stringify(errorData), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({
      error: 'Failed to communicate with build service',
      details: error.message || 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
