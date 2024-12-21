interface Redirect {
    timing?: number; // Optional timing in milliseconds
    toUrl: string;   // The URL to redirect to
}

/**
 * Adds a timed redirect using the History API.
 * @param redirect - An object containing the timing (in milliseconds) and target URL for the redirect.
 */
export function addTimedRedirect(redirect: Redirect): void {
    // remove any existing timeout.
    removeTimedRedirect();
    // set up new timeout
    const timing = redirect.timing ? redirect.timing * 1000 : 0; // Default to 0 milliseconds

    // Clear any existing redirect timers to prevent multiple redirects
    if ((window as any).__redirectTimeout) {
        clearTimeout((window as any).__redirectTimeout);
    }

    // Set a timeout to perform the redirect after the specified timing
    (window as any).__redirectTimeout = setTimeout(() => {
        // Use replaceState to update the URL without adding a new history entry
        history.replaceState(null, '', redirect.toUrl);
        window.location.href = redirect.toUrl;
        // Optionally, you can use location.assign or location.replace to perform the redirect
        // location.replace(redirect.toUrl); // This will perform a full page redirect
        // clean up
        removeTimedRedirect();
    }, timing);

    // console.log(`Scheduled redirect to "${redirect.toUrl}" in ${timing} milliseconds.`);
}

/**
 * Removes any scheduled timed redirects.
 */
export function removeTimedRedirect(): void {
    if ((window as any).__redirectTimeout) {
        clearTimeout((window as any).__redirectTimeout);
        delete (window as any).__redirectTimeout;
        // console.log('Cancelled scheduled redirect.');
    } else {
        // console.log('No scheduled redirect to cancel.');
    }
}
