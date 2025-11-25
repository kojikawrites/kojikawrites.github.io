/**
 * Proxy endpoint for image conversion via the build service.
 * Converts images (SVG, WebP, HEIC, etc.) to PNG/JPEG for LLM vision models.
 *
 * DEV MODE ONLY - Not available in production builds.
 *
 * POST /api/build/convert-image
 * Body: {
 *   image: string,        // Base64 data URI or file path starting with /
 *   format?: string,      // Output format: 'png' (default) or 'jpeg'
 *   max_size?: number     // Max dimension in pixels (default: 1024)
 * }
 */
import type { APIRoute } from 'astro';

// the following line will be automatically commented out
// by the build process for production builds.
export const prerender = false; // ![DEV-ONLY]

const BUILD_SERVICE_URL = 'http://build-service:8000';

export const POST: APIRoute = async ({ request }) => {
    // Only allow in development
    if (import.meta.env.PROD) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Image conversion API not available in production'
        }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await request.json();

        // Forward request to build service
        const response = await fetch(`${BUILD_SERVICE_URL}/convert-image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        // Get the response data
        const data = await response.json();

        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (error: any) {
        console.error('[convert-image] Error:', error);

        return new Response(JSON.stringify({
            success: false,
            error: `Image conversion proxy error: ${error.message}`,
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
};