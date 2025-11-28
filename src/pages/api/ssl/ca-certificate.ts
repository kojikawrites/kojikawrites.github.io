import type { APIRoute } from 'astro';
import { readFileSync, existsSync } from 'fs';

// the following line will be automatically commented out
// by the build process for production builds.
export const prerender = false; // ![DEV-ONLY]

export const GET: APIRoute = async () => {
  const certPath = '/app/.cache/ssl/ca.crt';

  if (!existsSync(certPath)) {
    return new Response(JSON.stringify({
      error: 'CA certificate not found. Please restart the container to generate certificates.'
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const certContent = readFileSync(certPath, 'utf-8');

    return new Response(certContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-pem-file',
        'Content-Disposition': `attachment"`
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to read CA certificate',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
