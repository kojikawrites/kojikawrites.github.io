import type { APIRoute } from 'astro';

// the following line will be automatically commented out
// by the build process for production builds.
export const prerender = false; // ![DEV-ONLY]

interface PushResponse {
  success: boolean;
  message?: string;
  branch?: string;
  submodule_pushed?: boolean;
  site_code?: string | null;
  main_commit?: string | null;
  submodule_commit?: string | null;
  output?: string;
  error?: string;
  hint?: string;
}

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

    const data = await response.json() as PushResponse;

    // Validate response structure
    if (typeof data.success !== 'boolean') {
      console.error('Invalid response from build service - missing success field');
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid response from build service',
        output: JSON.stringify(data)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Ensure all fields are present (even if undefined)
    const validatedData: PushResponse = {
      success: data.success,
      message: data.message,
      branch: data.branch,
      submodule_pushed: data.submodule_pushed ?? false,
      site_code: data.site_code ?? null,
      main_commit: data.main_commit ?? null,
      submodule_commit: data.submodule_commit ?? null,
      output: data.output,
      error: data.error,
      hint: data.hint
    };

    return new Response(JSON.stringify(validatedData), {
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
