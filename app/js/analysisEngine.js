// analysisEngine.js — Compute all session statistics, matrices, and feedback order

const CONFIDENCE_LEVELS = ['Sure', 'Semi-Sure', 'Doubtful', 'Guess'];

/** Review categories in priority order (Correct+Sure excluded) */
const REVIEW_CATEGORIES = [
    { priority: 1, category: 'Correct-Semi-Sure',   correct: true,  confidence: 'Semi-Sure' },
    { priority: 2, category: 'Correct-Doubtful',     correct: true,  confidence: 'Doubtful' },
    { priority: 3, category: 'Incorrect-Sure',        correct: false, confidence: 'Sure' },
    { priority: 4, category: 'Incorrect-Semi-Sure',   correct: false, confidence: 'Semi-Sure' },
    { priority: 5, category: 'Incorrect-Doubtful',    correct: false, confidence: 'Doubtful' },
    { priority: 6, category: 'Correct-Guess',         correct: true,  confidence: 'Guess' },
    { priority: 7, category: 'Incorrect-Guess',        correct: false, confidence: 'Guess' },
];

/** Matrix cell labels */
const MATRIX_LABELS = {
    'Sure-Correct': 'Solid Grip',
    'Sure-Incorrect': 'Blind Spot !!',
    'Semi-Sure-Correct': 'Nearly There',
    'Semi-Sure-Incorrect': 'Near-Miss',
    'Doubtful-Correct': 'Underconfident',
    'Doubtful-Incorrect': 'Expected Gap',
    'Guess-Correct': 'Lucky',
    'Guess-Incorrect': 'Expected Gap',
};

/**
 * Compute the full Analysis Report from responses and problems.
 * @param {object[]} responses - Array of { Problem_ID, Response: { Selected_Option, Confidence_Level }, time_seconds }
 * @param {object[]} problems - Problem Set problems array
 * @returns {object} Full Analysis Report matching DM-3 schema
 */
export function computeAnalysisReport(responses, problems) {
    const problemMap = new Map();
    problems.forEach(p => problemMap.set(p.Problem_ID, p));

    // Build per-question results with correctness classification
    const perQuestionResults = responses.map(r => {
        const problem = problemMap.get(r.Problem_ID);
        const isCorrect = r.Response.Selected_Option === problem.Answer.Correct_Option;
        return {
            Problem_ID: r.Problem_ID,
            Selected_Option: r.Response.Selected_Option,
            Correct_Option: problem.Answer.Correct_Option,
            Confidence: r.Response.Confidence_Level,
            Is_Correct: isCorrect,
            time_seconds: r.time_seconds,
            Concept_Map: problem.Concept_Map,
            Explanation: problem.Answer.Explanation,
            Problem_Statement: problem.Problem_Statement,
            Options: problem.Options,
        };
    });

    const total = perQuestionResults.length;
    const totalCorrect = perQuestionResults.filter(r => r.Is_Correct).length;
    const totalIncorrect = total - totalCorrect;
    const totalAccuracy = total > 0 ? (totalCorrect / total) * 100 : 0;
    const totalTimeSeconds = perQuestionResults.reduce((sum, r) => sum + (r.time_seconds || 0), 0);

    // Confidence-Wise Accuracy (DM-3.3)
    const confidenceWiseAccuracy = {};
    for (const level of CONFIDENCE_LEVELS) {
        const atLevel = perQuestionResults.filter(r => r.Confidence === level);
        const correct = atLevel.filter(r => r.Is_Correct).length;
        confidenceWiseAccuracy[level] = {
            Total: atLevel.length,
            Correct: correct,
            Incorrect: atLevel.length - correct,
            Accuracy_Percent: atLevel.length > 0 ? round1((correct / atLevel.length) * 100) : null,
        };
    }

    // Confidence Distribution in Correct (DM-3.4)
    const correctResults = perQuestionResults.filter(r => r.Is_Correct);
    const confidenceDistInCorrect = {};
    for (const level of CONFIDENCE_LEVELS) {
        const count = correctResults.filter(r => r.Confidence === level).length;
        const key = level + '_Percent'; // "Sure_Percent", "Semi-Sure_Percent", etc.
        confidenceDistInCorrect[key] = totalCorrect > 0 ? round1((count / totalCorrect) * 100) : 0;
    }

    // Feedback Review Order (DM-3.5)
    const feedbackReviewOrder = REVIEW_CATEGORIES.map(cat => ({
        Priority: cat.priority,
        Category: cat.category,
        Problem_IDs: perQuestionResults
            .filter(r => r.Is_Correct === cat.correct && r.Confidence === cat.confidence)
            .map(r => r.Problem_ID),
    }));

    // Concept-Wise Breakdown
    const conceptMap = new Map();
    perQuestionResults.forEach(r => {
        if (!conceptMap.has(r.Concept_Map)) {
            conceptMap.set(r.Concept_Map, { Total: 0, Correct: 0 });
        }
        const c = conceptMap.get(r.Concept_Map);
        c.Total++;
        if (r.Is_Correct) c.Correct++;
    });
    const conceptBreakdown = {};
    for (const [concept, data] of conceptMap) {
        conceptBreakdown[concept] = {
            Total: data.Total,
            Correct: data.Correct,
            Accuracy_Percent: data.Total > 0 ? round1((data.Correct / data.Total) * 100) : 0,
        };
    }

    // Accuracy-Confidence Matrix (FR-7.4)
    const matrix = {};
    for (const level of CONFIDENCE_LEVELS) {
        for (const correctness of ['Correct', 'Incorrect']) {
            const key = `${level}-${correctness}`;
            const items = perQuestionResults.filter(
                r => r.Confidence === level && r.Is_Correct === (correctness === 'Correct')
            );
            matrix[key] = {
                Count: items.length,
                Percent: total > 0 ? round1((items.length / total) * 100) : 0,
                Label: MATRIX_LABELS[key],
                Problem_IDs: items.map(r => r.Problem_ID),
            };
        }
    }

    return {
        Session_Statistics: {
            Total_Questions: total,
            Attempted_Questions: total,
            Total_Correct: totalCorrect,
            Total_Incorrect: totalIncorrect,
            Total_Accuracy_Percent: round1(totalAccuracy),
            Total_Time_Spent_Seconds: Math.round(totalTimeSeconds),
            Total_Time_Spent_Minutes: round1(totalTimeSeconds / 60),
            Confidence_Wise_Accuracy: confidenceWiseAccuracy,
            Confidence_Distribution_In_Correct: confidenceDistInCorrect,
        },
        Per_Question_Results: perQuestionResults,
        Feedback_Review_Order: feedbackReviewOrder,
        Concept_Breakdown: conceptBreakdown,
        Accuracy_Confidence_Matrix: matrix,
    };
}

/**
 * Compute longitudinal trends across multiple Attempt Records.
 * @param {object[]} attempts - Array of Attempt Record objects, sorted by date
 * @returns {object} Longitudinal analysis results
 */
export function computeLongitudinalTrends(attempts) {
    // Sort by Attempt_Date
    const sorted = [...attempts].sort((a, b) => a.Attempt_Date.localeCompare(b.Attempt_Date));

    const trends = sorted.map(attempt => {
        const stats = attempt.Analysis_Report?.Session_Statistics;
        if (!stats) return null;
        const cwa = stats.Confidence_Wise_Accuracy || {};
        return {
            date: attempt.Attempt_Date,
            id: attempt.ID,
            totalAccuracy: stats.Total_Accuracy_Percent,
            sureAccuracy: cwa.Sure?.Accuracy_Percent ?? null,
            semiSureAccuracy: cwa['Semi-Sure']?.Accuracy_Percent ?? null,
            surePercentInCorrect: stats.Confidence_Distribution_In_Correct?.Sure_Percent ?? null,
            blindSpotCount: cwa.Sure?.Incorrect ?? 0,
            totalTime: stats.Total_Time_Spent_Seconds,
            totalQuestions: stats.Total_Questions,
        };
    }).filter(Boolean);

    // Concept-wise trends
    const conceptTrends = {};
    sorted.forEach(attempt => {
        const report = attempt.Analysis_Report;
        if (!report?.Concept_Breakdown) return;
        for (const [concept, data] of Object.entries(report.Concept_Breakdown)) {
            if (!conceptTrends[concept]) conceptTrends[concept] = [];
            conceptTrends[concept].push({
                date: attempt.Attempt_Date,
                accuracy: data.Accuracy_Percent,
            });
        }
    });

    return { trends, conceptTrends };
}

/** Helper to get review problems in priority order (excluding Correct+Sure) */
export function getReviewProblems(perQuestionResults) {
    const problems = [];
    for (const cat of REVIEW_CATEGORIES) {
        const matching = perQuestionResults.filter(
            r => r.Is_Correct === cat.correct && r.Confidence === cat.confidence
        );
        if (matching.length > 0) {
            problems.push({ category: cat.category, priority: cat.priority, items: matching });
        }
    }
    return problems;
}

/** Helper to get reinforcement queue (all except Correct+Sure) */
export function getReinforcementQueue(perQuestionResults) {
    return perQuestionResults.filter(
        r => !(r.Is_Correct && r.Confidence === 'Sure')
    );
}

function round1(n) {
    return Math.round(n * 10) / 10;
}

export { CONFIDENCE_LEVELS, REVIEW_CATEGORIES, MATRIX_LABELS };
