export default function toSafeId(input: string = "", makeUnique:boolean = true) : string {
    // Convert to lowercase
    let safeId = input.toLowerCase();

    // Replace any character not a-z, 0-9, underscore, or hyphen with a hyphen
    safeId = safeId.replace(/[^a-z0-9_-]+/g, '-');

    // Remove leading or trailing hyphens/underscores
    safeId = safeId.replace(/^[-_]+|[-_]+$/g, '');
    // If the ID doesn't start with a letter, prepend one
    if (!/^[a-z]/.test(safeId)) {
        safeId = 'id-' + safeId;
        makeUnique = true;
    }

    if (makeUnique) {
        const randomNumber = Math.floor(Math.random() * 100000);
        safeId += '-' + randomNumber;
    }

    return safeId.replace(/-+/g, '-');
}
