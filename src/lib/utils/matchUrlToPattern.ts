export function matchUrlToPattern(pattern: string, url: string): Record<string, string> {
    const patternParts = pattern.split('/').filter(Boolean);
    const urlParts = url.replace(/\.html$/i, '').split('/').filter(Boolean);

    const result: Record<string, string> = {};
    let urlIndex = 0;

    for (let i = 0; i < patternParts.length; i++) {
        const part = patternParts[i];
        if (!part.startsWith('[')) {
            // Static segment
            result[part] = urlParts[urlIndex];
            urlIndex++;
        } else {
            // Variable segment
            const isSplat = part.startsWith('[...') && part.endsWith(']');
            if (isSplat) {
                const remainingPatternVars = patternParts.slice(i + 1).filter((p) => p.startsWith('['));
                let endIndex = urlParts.length;

                if (remainingPatternVars.length > 0) {
                    const variableCount = remainingPatternVars.length;
                    endIndex = urlParts.length - variableCount;
                }

                result[part] = urlParts.slice(urlIndex, endIndex).join('/');
                urlIndex = endIndex;
            } else {
                // Single variable
                result[part] = urlParts[urlIndex];
                urlIndex++;
            }
        }
    }

    return result;
}

// // Example usage
// const pattern = '/blog/[...categories]/[year]/[month]/[day]/[slug]';
// const url = '/blog/gamedev/machine-learning/artificial-intelligence/fuzzy-logic/2024/10/30/ml-experiments-pt-1/';
// console.log(matchUrlToPattern(pattern, url));
