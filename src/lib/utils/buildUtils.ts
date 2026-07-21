/**
 * Format commit IDs into a build code string
 * @param mainCommit - The main repository commit ID (short hash)
 * @param submoduleCommit - The submodule commit ID (short hash), optional
 * @returns Formatted build code like "[abc123f]" or "[abc123f/def456a]", or empty string if no commits
 */
export function formatBuildCode(mainCommit: string | null | undefined, submoduleCommit?: string | null): string {
  if (!mainCommit) {
    return '';
  }

  let buildCode = mainCommit;
  if (submoduleCommit) {
    buildCode = `${buildCode}/${submoduleCommit}`;
  }
  return `[${buildCode}]`;
}