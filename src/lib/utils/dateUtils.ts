/**
 * Creates a Date object from day, month, and year strings.
 *
 * @param dayStr - The day as a string (e.g., "15").
 * @param monthStr - The month as a string (e.g., "08" for August).
 * @param yearStr - The year as a string (e.g., "2023").
 * @returns A Date object representing the specified date.
 * @throws Will throw an error if the inputs are invalid.
 */
export function createDateFromStrings(dayStr: string, monthStr: string, yearStr: string): Date {
    // Parse the strings to integers
    const day: number = parseInt(dayStr, 10);
    const month: number = parseInt(monthStr, 10) - 1; // Adjust for zero-based indexing
    const year: number = parseInt(yearStr, 10);

    // Validate parsed numbers
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
        throw new Error("Invalid date components: Day, month, and year must be numeric strings.");
    }

    const utcTimestamp: number = Date.UTC(year, month, day);
    return new Date(utcTimestamp);
}
