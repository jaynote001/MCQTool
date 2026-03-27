// fileParser.js — Parse and validate Problem Set and Attempt JSON files

/**
 * Parse uploaded JSON and return validated Problem Sets.
 * Handles both single-set (object) and multi-set (array) formats.
 * @param {object|array} json - Parsed JSON content
 * @returns {{ sets: object[], errors: string[] }}
 */
export function parseAndValidate(json) {
    if (Array.isArray(json)) {
        const sets = [];
        const errors = [];
        json.forEach((item, i) => {
            const result = validateProblemSet(item);
            if (result.errors.length > 0) {
                errors.push(...result.errors.map(e => `Set ${i + 1} (${item.ID || 'unknown'}): ${e}`));
            } else {
                sets.push(item);
            }
        });
        return { sets: errors.length > 0 ? [] : sets, errors };
    } else if (json && typeof json === 'object') {
        const result = validateProblemSet(json);
        return { sets: result.errors.length > 0 ? [] : [json], errors: result.errors };
    }
    return { sets: [], errors: ['File must contain a JSON object or array.'] };
}

/**
 * Validate a single Problem Set object.
 * @param {object} obj
 * @returns {{ errors: string[] }}
 */
function validateProblemSet(obj) {
    const errors = [];
    if (!obj.ID) errors.push('Missing required field: ID');
    if (!obj.Title) errors.push('Missing required field: Title');
    if (!Array.isArray(obj.Concepts_Covered)) {
        errors.push('Missing or invalid field: Concepts_Covered (must be an array)');
    }
    if (!Array.isArray(obj.Problems) || obj.Problems.length === 0) {
        errors.push('Missing or empty field: Problems (must be a non-empty array)');
        return { errors };
    }
    obj.Problems.forEach((p, i) => {
        const prefix = `Problem ${p.Problem_ID ?? i + 1}`;
        if (p.Problem_ID === undefined && p.Problem_ID !== 0) errors.push(`${prefix}: Missing Problem_ID`);
        if (!p.Problem_Statement) errors.push(`${prefix}: Missing Problem_Statement`);
        if (!p.Concept_Map) errors.push(`${prefix}: Missing Concept_Map`);
        if (!p.Options || typeof p.Options !== 'object') errors.push(`${prefix}: Missing or invalid Options`);
        if (!p.Answer || !p.Answer.Correct_Option) errors.push(`${prefix}: Missing Answer.Correct_Option`);
        if (!p.Answer || !p.Answer.Explanation) errors.push(`${prefix}: Missing Answer.Explanation`);
    });
    return { errors };
}

/**
 * Validate an Attempt JSON file against a Problem Set ID.
 * @param {object} attemptJson
 * @param {string} problemSetId
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateAttemptFile(attemptJson, problemSetId) {
    const errors = [];
    if (!attemptJson.Problem_Set_ID) {
        errors.push('Missing Problem_Set_ID in attempt file.');
    } else if (attemptJson.Problem_Set_ID !== problemSetId) {
        errors.push(`Problem_Set_ID mismatch: expected "${problemSetId}", got "${attemptJson.Problem_Set_ID}".`);
    }
    if (!Array.isArray(attemptJson.Attempt)) {
        errors.push('Missing or invalid Attempt array.');
    }
    return { valid: errors.length === 0, errors };
}

/**
 * Filter problems for Corrective mode: return problems NOT marked Correct+Sure.
 * @param {object[]} problems - Problem Set problems
 * @param {object} attemptJson - Previous attempt record
 * @returns {object[]} Filtered problems
 */
export function filterForCorrective(problems, attemptJson) {
    const correctSureIds = new Set();
    const problemMap = new Map();
    problems.forEach(p => problemMap.set(p.Problem_ID, p));

    attemptJson.Attempt.forEach(a => {
        const problem = problemMap.get(a.Problem_ID);
        if (problem) {
            const isCorrect = a.Response.Selected_Option === problem.Answer.Correct_Option;
            const isSure = a.Response.Confidence_Level === 'Sure';
            if (isCorrect && isSure) {
                correctSureIds.add(a.Problem_ID);
            }
        }
    });

    return problems.filter(p => !correctSureIds.has(p.Problem_ID));
}
