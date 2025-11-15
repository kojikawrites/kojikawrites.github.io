import type { APIRoute } from 'astro';

export const POST: APIRoute = async () => {
  try {
    // Call the build service container - it handles all the copying and building
    const response = await fetch('http://build-service:8000/build', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to communicate with build service',
      output: error.message || 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
