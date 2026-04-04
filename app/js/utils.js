// utils.js — Shared utilities (ShuffleUtil, FileIOUtil, FormatUtil)

/** Fisher-Yates shuffle — returns a new array */
export function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Context-group-aware shuffle for Jumbled mode.
 * Groups problems sharing a Context_Group together, shuffles the groups,
 * and preserves in-group problem order. Standalone problems (null Context_Group)
 * are each treated as their own group.
 * @param {object[]} problems
 * @returns {object[]} Shuffled problems array
 */
export function shuffleWithContextGroups(problems) {
    const groupMap = new Map(); // Group_ID → [problems]
    const standalones = [];

    for (const p of problems) {
        if (p.Context_Group) {
            if (!groupMap.has(p.Context_Group)) {
                groupMap.set(p.Context_Group, []);
            }
            groupMap.get(p.Context_Group).push(p);
        } else {
            standalones.push(p);
        }
    }

    // Build units: each group is one unit, each standalone is one unit
    const units = [];
    for (const [, groupProblems] of groupMap) {
        units.push(groupProblems); // Array of problems (preserved order)
    }
    for (const p of standalones) {
        units.push([p]);
    }

    // Shuffle units
    const shuffled = shuffle(units);

    // Flatten back into a single array
    return shuffled.flat();
}

/** Read a File object as parsed JSON */
export function readJSONFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                resolve(JSON.parse(e.target.result));
            } catch (err) {
                reject(new Error('Invalid JSON: ' + err.message));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

/** Trigger a JSON file download in the browser */
export function downloadJSON(data, filename) {
    const json = JSON.stringify(data, null, 4);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/** Format a number as a percentage string */
export function formatPercent(value) {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    return value.toFixed(1) + '%';
}

/** Format seconds into a human-readable time string */
export function formatTime(seconds) {
    if (seconds == null) return 'N/A';
    if (seconds < 60) return Math.round(seconds) + 's';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
}

/** Generate a timestamp-based ID string */
export function generateTimestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

/** Format a Date as YYYY-MM-DD */
export function formatDate(date) {
    const d = date || new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Sanitize text for safe HTML insertion */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
