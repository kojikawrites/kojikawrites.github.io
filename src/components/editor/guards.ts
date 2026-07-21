/**
 * Runtime guards for editor components - DEV ONLY
 * Ensures components can only be used in Keystatic/development context
 */

/**
 * Check if we're in development mode
 */
export function isDevMode(): boolean {
  return import.meta.env.DEV;
}

/**
 * Check if we're in a Keystatic context
 * Keystatic components should be the only consumers of editor components
 */
export function isKeystaticContext(): boolean {
  // Check if we're in dev mode first
  if (!isDevMode()) {
    return false;
  }

  // Check for Keystatic-specific window properties or URL patterns
  if (typeof window !== 'undefined') {
    // Keystatic runs at /keystatic path
    return window.location.pathname.startsWith('/keystatic');
  }

  return false;
}

/**
 * Throw an error if not in allowed context
 * Call this at the top of component functions
 */
export function assertKeystaticContext(componentName: string): void {
  if (!isDevMode()) {
    throw new Error(
      `${componentName} is a development-only component and cannot be used in production builds.`
    );
  }

  if (typeof window !== 'undefined' && !isKeystaticContext()) {
    console.warn(
      `${componentName} should only be used within Keystatic editor context (/keystatic).`
    );
  }
}