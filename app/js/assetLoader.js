// assetLoader.js — Manage Blob URLs for images extracted from ZIP/directory uploads

/**
 * AssetLoader holds a map of relative paths to Blob URLs.
 * It resolves image paths referenced in Content blocks.
 */
export class AssetLoader {
    constructor() {
        /** @type {Map<string, string>} path → Blob URL */
        this.assets = new Map();
    }

    /**
     * Add an asset from a Blob/File.
     * @param {string} path - Relative path (e.g., "assets/image.svg")
     * @param {Blob} blob - The file blob
     */
    add(path, blob) {
        const url = URL.createObjectURL(blob);
        this.assets.set(this.normalizePath(path), url);
    }

    /**
     * Resolve a path to a Blob URL.
     * @param {string} path
     * @returns {string|null} Blob URL or null if not found
     */
    resolve(path) {
        if (!path) return null;
        return this.assets.get(this.normalizePath(path)) || null;
    }

    /**
     * Check if any assets are loaded.
     * @returns {boolean}
     */
    hasAssets() {
        return this.assets.size > 0;
    }

    /**
     * Revoke all Blob URLs to free memory.
     */
    revokeAll() {
        for (const url of this.assets.values()) {
            URL.revokeObjectURL(url);
        }
        this.assets.clear();
    }

    normalizePath(path) {
        // Strip leading ./ and normalize
        return path.replace(/^\.\//, '').replace(/\\/g, '/');
    }
}

/**
 * Extract assets from a JSZip instance.
 * @param {JSZip} zip - Parsed ZIP file
 * @returns {Promise<{json: object, assetLoader: AssetLoader}>}
 */
export async function loadFromZip(zipFile) {
    if (typeof JSZip === 'undefined') {
        throw new Error('JSZip library not loaded. Cannot open ZIP files.');
    }
    const zip = await JSZip.loadAsync(zipFile);

    // Find the JSON file (Problems.json or any .json file)
    let jsonFile = null;
    let basePath = '';

    // Check for nested directory structure (e.g., MySet/Problems.json)
    for (const [path, entry] of Object.entries(zip.files)) {
        if (!entry.dir && path.toLowerCase().endsWith('.json')) {
            // Prefer Problems.json
            if (path.toLowerCase().endsWith('problems.json') || !jsonFile) {
                jsonFile = entry;
                // Get the directory prefix
                const lastSlash = path.lastIndexOf('/');
                basePath = lastSlash >= 0 ? path.substring(0, lastSlash + 1) : '';
            }
        }
    }

    if (!jsonFile) {
        throw new Error('No JSON file found in ZIP archive.');
    }

    const jsonText = await jsonFile.async('string');
    let json;
    try {
        json = JSON.parse(jsonText);
    } catch (e) {
        throw new Error('Invalid JSON in ZIP: ' + e.message);
    }

    // Load all non-JSON files as assets
    const assetLoader = new AssetLoader();
    const imageExtensions = ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];

    for (const [path, entry] of Object.entries(zip.files)) {
        if (entry.dir) continue;
        const lowerPath = path.toLowerCase();
        if (lowerPath.endsWith('.json')) continue;

        const isImage = imageExtensions.some(ext => lowerPath.endsWith(ext));
        if (isImage) {
            const blob = await entry.async('blob');
            // Store with path relative to the JSON file's directory
            let relativePath = path;
            if (basePath && path.startsWith(basePath)) {
                relativePath = path.substring(basePath.length);
            }
            assetLoader.add(relativePath, blob);
        }
    }

    return { json, assetLoader };
}

/**
 * Load assets from a directory using File System Access API.
 * @param {FileSystemDirectoryHandle} dirHandle
 * @returns {Promise<{json: object, assetLoader: AssetLoader}>}
 */
export async function loadFromDirectory(dirHandle) {
    let jsonFile = null;
    let jsonFileName = '';
    const assetLoader = new AssetLoader();
    const imageExtensions = ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];

    // Recursively traverse directory
    async function traverse(handle, pathPrefix) {
        for await (const [name, entry] of handle.entries()) {
            const fullPath = pathPrefix ? `${pathPrefix}/${name}` : name;
            if (entry.kind === 'file') {
                const lowerName = name.toLowerCase();
                if (lowerName.endsWith('.json')) {
                    // Prefer Problems.json
                    if (lowerName === 'problems.json' || !jsonFile) {
                        jsonFile = await entry.getFile();
                        jsonFileName = fullPath;
                    }
                } else if (imageExtensions.some(ext => lowerName.endsWith(ext))) {
                    const file = await entry.getFile();
                    assetLoader.add(fullPath, file);
                }
            } else if (entry.kind === 'directory') {
                await traverse(entry, fullPath);
            }
        }
    }

    await traverse(dirHandle, '');

    if (!jsonFile) {
        throw new Error('No JSON file found in directory.');
    }

    const text = await jsonFile.text();
    let json;
    try {
        json = JSON.parse(text);
    } catch (e) {
        throw new Error('Invalid JSON in directory: ' + e.message);
    }

    return { json, assetLoader };
}
