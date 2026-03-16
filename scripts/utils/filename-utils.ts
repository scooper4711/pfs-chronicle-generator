/**
 * Filename Utilities
 * 
 * This module provides utility functions for sanitizing and generating filenames
 * for PFS Chronicle PDFs. These functions ensure that filenames are safe for
 * cross-platform file systems by removing or replacing invalid characters.
 */

/**
 * Sanitizes a filename by replacing invalid characters with underscores.
 * 
 * This function removes characters that are not alphanumeric, dots, hyphens, or underscores.
 * This ensures the filename is safe for use across different operating systems and file systems.
 * 
 * @param name - The filename to sanitize
 * @returns The sanitized filename with invalid characters replaced by underscores
 * 
 * @example
 * ```typescript
 * sanitizeFilename("John's Character!.pdf") // Returns: "John_s_Character_.pdf"
 * sanitizeFilename("Chronicle #1-2.pdf")    // Returns: "Chronicle__1-2.pdf"
 * ```
 */
export function sanitizeFilename(name: string): string {
    return name.replaceAll(/[^a-zA-Z0-9_.-]/g, '_');
}

/**
 * Generates a chronicle filename by combining actor name and chronicle template name.
 * 
 * This function creates a standardized filename format for chronicle PDFs by:
 * 1. Sanitizing the actor's name
 * 2. Extracting the chronicle template filename from the full path
 * 3. Sanitizing the chronicle template filename
 * 4. Combining them in the format: "{actorName}_{chronicleFileName}"
 * 
 * @param actorName - The name of the actor/character
 * @param blankChroniclePath - The full path to the blank chronicle template
 * @returns A sanitized filename in the format "{actorName}_{chronicleFileName}"
 * 
 * @example
 * ```typescript
 * generateChronicleFilename(
 *   "Valeros the Fighter",
 *   "modules/pfs-chronicles/season-1/1-01.pdf"
 * )
 * // Returns: "Valeros_the_Fighter_1-01.pdf"
 * ```
 */
export function generateChronicleFilename(actorName: string, blankChroniclePath: string): string {
    const chronicleFileName = blankChroniclePath.split('/').pop() || 'chronicle.pdf';
    const sanitizedActorName = sanitizeFilename(actorName);
    const sanitizedChronicleFileName = sanitizeFilename(chronicleFileName);
    return `${sanitizedActorName}_${sanitizedChronicleFileName}`;
}
