/**
 * Image Filter Utilities
 *
 * Provides utilities for analyzing background images and generating CSS filters
 * to color-shift them to match theme colors.
 */

import { parseRgbString } from './colorUtils';

/**
 * Cache key prefix for image analysis results
 */
const CACHE_PREFIX = 'image-analysis:';

/**
 * Cached image analysis result
 */
export interface ImageAnalysisCache {
  imageUrl: string;
  imageHash: string; // Simple hash of image URL for cache invalidation
  predominantColor: { r: number; g: number; b: number };
  analyzedAt: number;
}

/**
 * Get cached image analysis from localStorage
 *
 * @param imageUrl - URL of the image
 * @returns Cached analysis or null if not found/expired
 */
export function getCachedImageAnalysis(imageUrl: string): ImageAnalysisCache | null {
  try {
    const cacheKey = CACHE_PREFIX + imageUrl;
    const cached = localStorage.getItem(cacheKey);

    if (!cached) return null;

    const data: ImageAnalysisCache = JSON.parse(cached);

    // Verify the image URL matches (in case of hash collision)
    if (data.imageUrl !== imageUrl) return null;

    // Cache is valid for 30 days
    const maxAge = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - data.analyzedAt > maxAge) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return data;
  } catch (error) {
    console.warn('[ImageFilter] Failed to read cache:', error);
    return null;
  }
}

/**
 * Store image analysis in localStorage cache
 *
 * @param imageUrl - URL of the image
 * @param predominantColor - The predominant RGB color found in the image
 */
export function cacheImageAnalysis(
  imageUrl: string,
  predominantColor: { r: number; g: number; b: number }
): void {
  try {
    const cacheKey = CACHE_PREFIX + imageUrl;
    const data: ImageAnalysisCache = {
      imageUrl,
      imageHash: simpleHash(imageUrl),
      predominantColor,
      analyzedAt: Date.now(),
    };

    localStorage.setItem(cacheKey, JSON.stringify(data));
  } catch (error) {
    console.warn('[ImageFilter] Failed to write cache:', error);
  }
}

/**
 * Simple string hash function for cache keys
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return [h, s, l];
}

/**
 * Analyze image to find the darkest pixels using histogram approach
 *
 * @param imageBlob - The image data as a Blob
 * @returns Promise resolving to the RGB color of the darkest pixels
 */
export async function getDarkestColor(imageBlob: Blob): Promise<{ r: number; g: number; b: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageBlob);

    img.onload = () => {
      try {
        // Create canvas to analyze image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Draw image at reduced size for performance (max 200px)
        const maxSize = 200;
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Get pixel data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        // Build histogram of brightness values with associated colors
        const brightnessMap = new Map<number, { r: number; g: number; b: number; count: number }>();

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];

          // Skip transparent pixels
          if (a < 128) continue;

          // Calculate brightness (perceived luminance)
          const brightness = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

          const existing = brightnessMap.get(brightness);
          if (existing) {
            // Average the RGB values for this brightness level
            existing.r = Math.round((existing.r * existing.count + r) / (existing.count + 1));
            existing.g = Math.round((existing.g * existing.count + g) / (existing.count + 1));
            existing.b = Math.round((existing.b * existing.count + b) / (existing.count + 1));
            existing.count++;
          } else {
            brightnessMap.set(brightness, { r, g, b, count: 1 });
          }
        }

        // Find the DARKEST level that has significant pixels (bottom 10%)
        const sortedBrightness = Array.from(brightnessMap.keys()).sort((a, b) => a - b); // Sort ascending for darkest
        const totalPixels = pixels.length / 4;
        const threshold = totalPixels * 0.1;

        let accumulatedCount = 0;
        let targetBrightness = sortedBrightness[0];

        for (const brightness of sortedBrightness) {
          const data = brightnessMap.get(brightness)!;
          accumulatedCount += data.count;
          targetBrightness = brightness;
          if (accumulatedCount >= threshold) break;
        }

        const darkestColor = brightnessMap.get(targetBrightness)!;

        console.log('[ImageFilter] Darkest color found:', darkestColor, 'at brightness level:', targetBrightness);

        URL.revokeObjectURL(url);
        resolve({ r: darkestColor.r, g: darkestColor.g, b: darkestColor.b });
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Analyze image to find the brightest pixels using histogram approach
 *
 * @param imageBlob - The image data as a Blob
 * @returns Promise resolving to the RGB color of the brightest pixels
 */
export async function getBrightestColor(imageBlob: Blob): Promise<{ r: number; g: number; b: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageBlob);

    img.onload = () => {
      try {
        // Create canvas to analyze image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Draw image at reduced size for performance (max 200px)
        const maxSize = 200;
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Get pixel data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        // Build histogram of brightness values with associated colors
        const brightnessMap = new Map<number, { r: number; g: number; b: number; count: number }>();

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];

          // Skip transparent pixels
          if (a < 128) continue;

          // Calculate brightness (perceived luminance)
          const brightness = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

          const existing = brightnessMap.get(brightness);
          if (existing) {
            // Average the RGB values for this brightness level
            existing.r = Math.round((existing.r * existing.count + r) / (existing.count + 1));
            existing.g = Math.round((existing.g * existing.count + g) / (existing.count + 1));
            existing.b = Math.round((existing.b * existing.count + b) / (existing.count + 1));
            existing.count++;
          } else {
            brightnessMap.set(brightness, { r, g, b, count: 1 });
          }
        }

        // Find the brightest level that has significant pixels (top 10%)
        const sortedBrightness = Array.from(brightnessMap.keys()).sort((a, b) => b - a);
        const totalPixels = pixels.length / 4;
        const threshold = totalPixels * 0.1;

        let accumulatedCount = 0;
        let targetBrightness = sortedBrightness[0];

        for (const brightness of sortedBrightness) {
          const data = brightnessMap.get(brightness)!;
          accumulatedCount += data.count;
          targetBrightness = brightness;
          if (accumulatedCount >= threshold) break;
        }

        const brightestColor = brightnessMap.get(targetBrightness)!;

        console.log('[ImageFilter] Brightest color found:', brightestColor, 'at brightness level:', targetBrightness);

        URL.revokeObjectURL(url);
        resolve({ r: brightestColor.r, g: brightestColor.g, b: brightestColor.b });
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Calculate CSS filters to match brightest/darkest pixels in image to target color
 *
 * The filter is calculated such that when targetBgColor equals initialBgColor,
 * the filter is "none" (the zero point). As the target diverges from initial,
 * the filter transforms the image to maintain color harmony.
 *
 * Strategy:
 * 1. If target matches initial, return "none"
 * 2. Apply sepia to inject color information
 * 3. Calculate hue rotation to match target
 * 4. Adjust saturation with 5x boost for vibrancy
 * 5. Restore original brightness (preserve image values)
 *
 * Dark mode: Targets brightest pixels directly
 * Light mode: Inverts colors, applies filter, then inverts back (targets darkest pixels)
 *
 * @param imageRgb - The brightest (dark mode) or darkest (light mode) color in the image
 * @param initialBgColor - The original background color (zero point for filter)
 * @param targetBgColor - The target background color
 * @param mode - 'light' or 'dark' mode
 * @returns CSS filter string
 */
export function calculateColorFilter(
  imageRgb: { r: number; g: number; b: number },
  initialBgColor: { r: number; g: number; b: number },
  targetBgColor: { r: number; g: number; b: number },
  mode: 'light' | 'dark' = 'dark'
): string {
  // For light mode, invert the target and initial colors so we can use the same logic as dark mode
  // The filter will be wrapped with invert() on both sides
  let workingInitialColor = initialBgColor;
  let workingTargetColor = targetBgColor;

  if (mode === 'light') {
    // Invert the colors: 255 - RGB
    workingInitialColor = {
      r: 255 - initialBgColor.r,
      g: 255 - initialBgColor.g,
      b: 255 - initialBgColor.b
    };
    workingTargetColor = {
      r: 255 - targetBgColor.r,
      g: 255 - targetBgColor.g,
      b: 255 - targetBgColor.b
    };
  }

  // Convert colors to HSL
  const [imageH, imageS, imageL] = rgbToHsl(imageRgb.r, imageRgb.g, imageRgb.b);
  const [initialH, initialS, initialL] = rgbToHsl(workingInitialColor.r, workingInitialColor.g, workingInitialColor.b);
  const [targetH, targetS, targetL] = rgbToHsl(workingTargetColor.r, workingTargetColor.g, workingTargetColor.b);

  // If image is nearly black, we can't calculate meaningful filters
  if (imageL < 0.01) {
    console.warn('[ImageFilter] Image too dark - cannot calculate filter');
    return 'none';
  }

  // Check if target is very close to initial (within 1% on all HSL components)
  const isNearInitial =
    Math.abs(targetH - initialH) < 0.01 &&
    Math.abs(targetS - initialS) < 0.01 &&
    Math.abs(targetL - initialL) < 0.01;

  if (isNearInitial) {
    return 'none';
  }

  const filters: string[] = [];

  // Step 1: Apply sepia to inject color (gives hue-rotate something to work with)
  filters.push('sepia(100%)');

  // Step 2: Calculate sepia offset for hue rotation - use the same logic for both modes
  // (Light mode uses inverted colors, so this works the same way as dark mode)
  const sepiaR = 0.393 * imageRgb.r + 0.769 * imageRgb.g + 0.189 * imageRgb.b;
  const sepiaG = 0.349 * imageRgb.r + 0.686 * imageRgb.g + 0.168 * imageRgb.b;
  const sepiaB = 0.272 * imageRgb.r + 0.534 * imageRgb.g + 0.131 * imageRgb.b;

  const [sepiaHue, , sepiaL] = rgbToHsl(sepiaR, sepiaG, sepiaB);

  // Step 3: Calculate hue rotation from sepia to target
  let hueDiff = (targetH - sepiaHue) * 360;

  // Normalize to -180 to 180 range (shortest path)
  if (hueDiff > 180) hueDiff -= 360;
  if (hueDiff < -180) hueDiff += 360;

  if (Math.abs(hueDiff) > 1) {
    filters.push(`hue-rotate(${hueDiff.toFixed(1)}deg)`);
  }

  // Step 4: Adjust saturation to match target with 5x boost for vibrant colors
  if (targetS > 0.01) {
    const saturationMultiplier = targetS * 500; // 5x boost
    filters.push(`saturate(${saturationMultiplier.toFixed(1)}%)`);
  }

  // Step 5: Restore original image brightness
  // Sepia changes the brightness, so we need to restore it back to the original image brightness
  // We don't want to match the target brightness - we want to preserve the image's original values
  const brightnessRestoreMultiplier = (imageL / sepiaL) * 100;
  if (Math.abs(brightnessRestoreMultiplier - 100) > 1) {
    filters.push(`brightness(${brightnessRestoreMultiplier.toFixed(1)}%)`);
  }

  const cssFilterString = filters.length > 0 ? filters.join(' ') : 'none';

  // For light mode, wrap the filter with invert() to target dark pixels instead of bright ones
  // 1. invert(100%) - dark pixels become bright, colors are inverted
  // 2. apply color filter calculated for inverted target color (affects the now-bright pixels)
  // 3. invert(100%) - restore original brightness distribution and colors
  if (mode === 'light' && cssFilterString !== 'none') {
    const wrappedFilter = `invert(100%) ${cssFilterString} invert(100%)`;
    console.log(`[calculateColorFilter] ${mode} mode filter (wrapped):`, wrappedFilter);
    return wrappedFilter;
  }

  // Dark mode: affects brightest pixels (WORKING - DON'T TOUCH!)
  console.log(`[calculateColorFilter] ${mode} mode filter:`, cssFilterString);
  return cssFilterString;
}
