/**
 * Client-side utility for image analysis via LLM
 * Handles automatic format conversion when needed
 */

export interface ImageAnalysisOptions {
    mode: 'alt' | 'description' | 'caption';
    context?: string;
    onStatusChange?: (status: string) => void;
}

export interface ImageAnalysisResult {
    success: boolean;
    text?: string;
    error?: string;
}

/**
 * Analyze an image using the LLM image-alt API
 * Automatically converts unsupported formats (webp, svg, etc.) to jpeg/png
 *
 * @param imageData - Base64 data URI of the image
 * @param options - Analysis options (mode, context, status callback)
 * @returns Analysis result with text or error
 */
export async function analyzeImage(
    imageData: string,
    options: ImageAnalysisOptions
): Promise<ImageAnalysisResult> {
    const { mode, context = '', onStatusChange } = options;

    onStatusChange?.('Analyzing image...');

    // First attempt
    const response = await fetch('/api/llm/image-alt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, mode, context })
    });

    const data = await response.json();

    // Check if we need to convert the image format
    const needsConversion = !data.success && (
        data.error?.includes('unknown format') ||
        data.error?.includes('Failed to load image')
    );

    if (needsConversion) {
        onStatusChange?.('Converting image format...');

        const convertResponse = await fetch('/api/build/convert-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image: imageData,
                format: 'jpeg',
                max_size: 1024
            })
        });

        const convertData = await convertResponse.json();

        if (!convertData.success || !convertData.image) {
            return {
                success: false,
                error: convertData.error || 'Image conversion failed'
            };
        }

        // Retry with converted image
        onStatusChange?.('Analyzing converted image...');

        const retryResponse = await fetch('/api/llm/image-alt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: convertData.image, mode, context })
        });

        const retryData = await retryResponse.json();

        if (retryData.success) {
            return {
                success: true,
                text: retryData.altText || retryData.result || ''
            };
        }

        return {
            success: false,
            error: retryData.error || 'Failed after conversion'
        };
    }

    if (data.success) {
        return {
            success: true,
            text: data.altText || data.result || ''
        };
    }

    return {
        success: false,
        error: data.error || 'Unknown error'
    };
}

/**
 * Fetch an image from a URL and convert to base64 data URI
 */
export async function fetchImageAsBase64(src: string): Promise<string> {
    const response = await fetch(src);
    if (!response.ok) throw new Error(`Failed to fetch image: ${src}`);
    const blob = await response.blob();

    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(blob);
    });
}