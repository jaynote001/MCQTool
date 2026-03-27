// app.js — Main application: state management, screen rendering, navigation
import { shuffle, readJSONFile, downloadJSON, formatPercent, formatTime, generateTimestamp, formatDate, escapeHtml } from './utils.js';
import { parseAndValidate, validateAttemptFile, filterForCorrective } from './fileParser.js';
import { computeAnalysisReport, computeLongitudinalTrends, getReviewProblems, getReinforcementQueue, CONFIDENCE_LEVELS } from './analysisEngine.js';

class MCQApp {
    constructor() {
        this.container = document.getElementById('app');
        this.state = {
            // Data
            problemSets: [],
            selectedSet: null,
            // Session config
            mode: 'Straight',
            chunkSize: 'All',
            priorAttempt: null,
            // Session
            chunks: [],
            currentChunkIndex: 0,
            allResponses: [],
            // Current chunk practice
            currentProblemIndex: 0,
            problemQueue: [],
            responses: [],
            selectedOption: null,
            selectedConfidence: null,
            // Timer
            timerStart: null,
            // Analysis
            analysisReport: null,
            // Review
            reviewGroups: [],
            currentReviewGroupIndex: 0,
            currentReviewItemIndex: 0,
            // Reinforcement
            reinforcementQueue: [],
            reinforcementTotal: 0,
            reinforcementSelectedOption: null,
            reinforcementFeedback: null,
            // Corrective
            correctiveFirstResponses: new Map(),
            // Longitudinal
            longitudinalAttempts: [],
        };
        this.navigate('upload');
    }

    navigate(screen) {
        this.state.currentScreen = screen;
        this.render();
    }

    render() {
        switch (this.state.currentScreen) {
            case 'upload': this.renderUploadScreen(); break;
            case 'setup': this.renderSetupScreen(); break;
            case 'practice': this.renderPracticeScreen(); break;
            case 'corrective': this.renderCorrectivePracticeScreen(); break;
            case 'dashboard': this.renderDashboardScreen(); break;
            case 'review': this.renderReviewScreen(); break;
            case 'reinforcement': this.renderReinforcementScreen(); break;
            case 'chunkTransition': this.renderChunkTransitionScreen(); break;
            case 'export': this.renderExportScreen(); break;
            case 'longitudinal': this.renderLongitudinalScreen(); break;
        }
        window.scrollTo(0, 0);
    }

    // ======================== S1: Upload & Select ========================

    renderUploadScreen() {
        this.container.innerHTML = `
            <div class="card">
                <h2>Upload Problem Set</h2>
                <div class="file-upload-area" id="upload-area">
                    <input type="file" id="file-input" accept=".json">
                    <span class="upload-label">
                        <strong>Click to upload</strong> or drag & drop a Problem Set JSON file
                    </span>
                </div>
                <div id="upload-error"></div>
                <div id="set-list-container"></div>
            </div>
            <div class="card">
                <h2>Or: Longitudinal Analysis</h2>
                <p style="color:var(--text-muted);margin-bottom:0.75rem;">Upload multiple Attempt files to view performance trends.</p>
                <button class="btn btn-outline" id="btn-longitudinal">Open Longitudinal Analysis</button>
            </div>
        `;
        const uploadArea = this.container.querySelector('#upload-area');
        const fileInput = this.container.querySelector('#file-input');
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = 'var(--primary)'; });
        uploadArea.addEventListener('dragleave', () => { uploadArea.style.borderColor = ''; });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '';
            if (e.dataTransfer.files.length) this.handleProblemSetUpload(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length) this.handleProblemSetUpload(fileInput.files[0]);
        });
        this.container.querySelector('#btn-longitudinal').addEventListener('click', () => {
            this.navigate('longitudinal');
        });
    }

    async handleProblemSetUpload(file) {
        const errorEl = this.container.querySelector('#upload-error');
        const listEl = this.container.querySelector('#set-list-container');
        errorEl.innerHTML = '';
        listEl.innerHTML = '';
        try {
            const json = await readJSONFile(file);
            const { sets, errors } = parseAndValidate(json);
            if (errors.length > 0) {
                errorEl.innerHTML = `<div class="error-msg"><strong>Validation Error:</strong><ul>${errors.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul></div>`;
                return;
            }
            this.state.problemSets = sets;
            if (sets.length === 1) {
                this.state.selectedSet = sets[0];
                this.navigate('setup');
            } else {
                listEl.innerHTML = `
                    <h3 class="mt-2">Select a Problem Set</h3>
                    <div class="set-list">${sets.map((s, i) => `
                        <div class="set-item" data-index="${i}">
                            <div>
                                <div class="set-title">${escapeHtml(s.Title)}</div>
                                <div class="set-meta">${escapeHtml(s.Concepts_Covered.join(', '))}</div>
                            </div>
                            <span class="set-count">${s.Problems.length} Qs</span>
                        </div>
                    `).join('')}</div>
                `;
                listEl.querySelectorAll('.set-item').forEach(item => {
                    item.addEventListener('click', () => {
                        this.state.selectedSet = sets[parseInt(item.dataset.index)];
                        this.navigate('setup');
                    });
                });
            }
        } catch (err) {
            errorEl.innerHTML = `<div class="error-msg">${escapeHtml(err.message)}</div>`;
        }
    }

    // ======================== S2: Session Setup ========================

    renderSetupScreen() {
        const set = this.state.selectedSet;
        const s = this.state;
        this.container.innerHTML = `
            <div class="card">
                <h2>Session Setup</h2>
                <div class="info-box">
                    <strong>${escapeHtml(set.Title)}</strong> — ${set.Problems.length} problems<br>
                    <span style="color:var(--text-muted)">${escapeHtml(set.Concepts_Covered.join(', '))}</span>
                </div>

                <h3>Practice Mode</h3>
                <div class="mode-selector">
                    <div class="mode-btn ${s.mode === 'Straight' ? 'active' : ''}" data-mode="Straight">
                        <div class="mode-name">Straight</div>
                        <div class="mode-desc">Authored order, single pass</div>
                    </div>
                    <div class="mode-btn ${s.mode === 'Jumbled' ? 'active' : ''}" data-mode="Jumbled">
                        <div class="mode-name">Jumbled</div>
                        <div class="mode-desc">Randomized order, single pass</div>
                    </div>
                    <div class="mode-btn ${s.mode === 'Corrective' ? 'active' : ''}" data-mode="Corrective">
                        <div class="mode-name">Corrective</div>
                        <div class="mode-desc">Re-practice from prior attempt</div>
                    </div>
                </div>

                <div id="corrective-upload" style="display:${s.mode === 'Corrective' ? 'block' : 'none'}">
                    <h3>Upload Previous Attempt JSON</h3>
                    <div class="file-upload-area" id="attempt-upload-area">
                        <input type="file" id="attempt-file-input" accept=".json">
                        <span class="upload-label"><strong>Click to upload</strong> previous Attempt JSON</span>
                    </div>
                    <div id="attempt-status"></div>
                </div>

                <div id="chunk-section" style="display:${s.mode === 'Corrective' ? 'none' : 'block'}">
                    <h3>Chunk Size</h3>
                    <div class="chunk-selector">
                        <div class="chunk-btn ${s.chunkSize === 'All' ? 'active' : ''}" data-chunk="All">All</div>
                        <div class="chunk-btn ${s.chunkSize === '5' ? 'active' : ''}" data-chunk="5">5</div>
                        <div class="chunk-btn ${s.chunkSize === '10' ? 'active' : ''}" data-chunk="10">10</div>
                    </div>
                </div>

                <div class="btn-group mt-3">
                    <button class="btn btn-muted" id="btn-back">Back</button>
                    <button class="btn btn-primary btn-lg" id="btn-start" ${s.mode === 'Corrective' && !s.priorAttempt ? 'disabled' : ''}>Start Practice</button>
                </div>
            </div>
        `;

        // Mode selection
        this.container.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.state.mode = btn.dataset.mode;
                this.state.priorAttempt = null;
                this.render();
            });
        });
        // Chunk selection
        this.container.querySelectorAll('.chunk-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.state.chunkSize = btn.dataset.chunk;
                this.render();
            });
        });
        // Attempt file upload for corrective
        const attemptArea = this.container.querySelector('#attempt-upload-area');
        const attemptInput = this.container.querySelector('#attempt-file-input');
        if (attemptArea) {
            attemptArea.addEventListener('click', () => attemptInput.click());
            attemptInput.addEventListener('change', () => {
                if (attemptInput.files.length) this.handleAttemptUpload(attemptInput.files[0]);
            });
        }
        this.container.querySelector('#btn-back').addEventListener('click', () => this.navigate('upload'));
        this.container.querySelector('#btn-start').addEventListener('click', () => this.startSession());
    }

    async handleAttemptUpload(file) {
        const statusEl = this.container.querySelector('#attempt-status');
        try {
            const json = await readJSONFile(file);
            const { valid, errors } = validateAttemptFile(json, this.state.selectedSet.ID);
            if (!valid) {
                statusEl.innerHTML = `<div class="error-msg">${errors.map(e => escapeHtml(e)).join('<br>')}</div>`;
                this.state.priorAttempt = null;
                this.container.querySelector('#btn-start').disabled = true;
                return;
            }
            this.state.priorAttempt = json;
            const filtered = filterForCorrective(this.state.selectedSet.Problems, json);
            statusEl.innerHTML = `<div class="success-msg">Loaded attempt. <strong>${filtered.length}</strong> problems to re-practice (${this.state.selectedSet.Problems.length - filtered.length} Correct+Sure excluded).</div>`;
            this.container.querySelector('#btn-start').disabled = filtered.length === 0;
            if (filtered.length === 0) {
                statusEl.innerHTML = `<div class="info-box">All problems were Correct+Sure. Nothing to correct!</div>`;
            }
        } catch (err) {
            statusEl.innerHTML = `<div class="error-msg">${escapeHtml(err.message)}</div>`;
        }
    }

    // ======================== Session Management ========================

    startSession() {
        const s = this.state;
        const set = s.selectedSet;
        s.allResponses = [];
        s.currentChunkIndex = 0;
        s.correctiveFirstResponses = new Map();

        if (s.mode === 'Corrective') {
            const filtered = filterForCorrective(set.Problems, s.priorAttempt);
            s.chunks = [filtered];
            s.problemQueue = [...filtered];
            s.currentProblemIndex = 0;
            s.responses = [];
            s.selectedOption = null;
            s.selectedConfidence = null;
            s.timerStart = Date.now();
            this.navigate('corrective');
        } else {
            let problems = [...set.Problems];
            if (s.mode === 'Jumbled') problems = shuffle(problems);
            const chunkSize = s.chunkSize === 'All' ? problems.length : parseInt(s.chunkSize);
            s.chunks = [];
            for (let i = 0; i < problems.length; i += chunkSize) {
                s.chunks.push(problems.slice(i, i + chunkSize));
            }
            this.startChunk();
        }
    }

    startChunk() {
        const s = this.state;
        s.problemQueue = s.chunks[s.currentChunkIndex];
        s.currentProblemIndex = 0;
        s.responses = [];
        s.selectedOption = null;
        s.selectedConfidence = null;
        s.timerStart = Date.now();
        this.navigate('practice');
    }

    // ======================== S3: Practice Screen ========================

    renderPracticeScreen() {
        const s = this.state;
        const problem = s.problemQueue[s.currentProblemIndex];
        const total = s.problemQueue.length;
        const current = s.currentProblemIndex + 1;
        const isLast = current === total;
        const canProceed = s.selectedOption && s.selectedConfidence;

        this.container.innerHTML = `
            <div class="card">
                <div class="progress-bar-container">
                    <span class="progress-text">Question ${current} of ${total}</span>
                    <div class="progress-bar">
                        <div class="progress-bar-fill" style="width:${(current / total) * 100}%"></div>
                    </div>
                    <span class="progress-text">Chunk ${s.currentChunkIndex + 1}/${s.chunks.length}</span>
                </div>

                <div class="problem-statement" style="font-size:1.05rem;font-weight:600;margin-bottom:1rem;line-height:1.5;">
                    ${escapeHtml(problem.Problem_Statement)}
                </div>

                <div class="option-list">
                    ${Object.entries(problem.Options).map(([key, text]) => `
                        <div class="option-item ${s.selectedOption === key ? 'selected' : ''}" data-option="${key}">
                            <span class="option-key">${key}</span>
                            <span class="option-text">${escapeHtml(text)}</span>
                        </div>
                    `).join('')}
                </div>

                <h3>Confidence Level</h3>
                <div class="confidence-selector">
                    ${[['Sure', 'S', 'sure'], ['Semi-Sure', 'SS', 'semisure'], ['Doubtful', 'D', 'doubtful'], ['Guess', 'G', 'guess']].map(([val, label, cls]) => `
                        <div class="confidence-btn ${s.selectedConfidence === val ? `active-${cls}` : ''}" data-confidence="${val}">${label} — ${val}</div>
                    `).join('')}
                </div>

                <div class="btn-group mt-3" style="justify-content:flex-end;">
                    <button class="btn ${isLast ? 'btn-success' : 'btn-primary'} btn-lg" id="btn-next" ${!canProceed ? 'disabled' : ''}>
                        ${isLast ? 'Submit Chunk' : 'Next'}
                    </button>
                </div>
            </div>
        `;

        // Option selection
        this.container.querySelectorAll('.option-item').forEach(item => {
            item.addEventListener('click', () => {
                this.state.selectedOption = item.dataset.option;
                this.render();
            });
        });
        // Confidence selection
        this.container.querySelectorAll('.confidence-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.state.selectedConfidence = btn.dataset.confidence;
                this.render();
            });
        });
        // Next/Submit
        this.container.querySelector('#btn-next').addEventListener('click', () => this.handlePracticeNext());
    }

    handlePracticeNext() {
        const s = this.state;
        const problem = s.problemQueue[s.currentProblemIndex];
        const timeSeconds = Math.round((Date.now() - s.timerStart) / 1000 * 10) / 10;

        s.responses.push({
            Problem_ID: problem.Problem_ID,
            Response: {
                Selected_Option: s.selectedOption,
                Confidence_Level: s.selectedConfidence,
            },
            time_seconds: timeSeconds,
        });

        s.selectedOption = null;
        s.selectedConfidence = null;

        if (s.currentProblemIndex < s.problemQueue.length - 1) {
            s.currentProblemIndex++;
            s.timerStart = Date.now();
            this.render();
        } else {
            this.submitChunk();
        }
    }

    submitChunk() {
        const s = this.state;
        s.allResponses.push(...s.responses);
        s.analysisReport = computeAnalysisReport(s.responses, s.problemQueue);
        this.navigate('dashboard');
    }

    // ======================== S3-C: Corrective Practice ========================

    renderCorrectivePracticeScreen() {
        const s = this.state;
        if (s.problemQueue.length === 0) {
            this.correctiveComplete();
            return;
        }
        const problem = s.problemQueue[s.currentProblemIndex % s.problemQueue.length];
        const canProceed = s.selectedOption && s.selectedConfidence;

        this.container.innerHTML = `
            <div class="card">
                <div class="progress-bar-container">
                    <span class="progress-text">Remaining: ${s.problemQueue.length} problems</span>
                    <div class="progress-bar">
                        <div class="progress-bar-fill" style="width:${((s.correctiveFirstResponses.size) / s.chunks[0].length) * 100}%"></div>
                    </div>
                </div>

                <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.5rem;">CORRECTIVE MODE</div>
                <div class="problem-statement" style="font-size:1.05rem;font-weight:600;margin-bottom:1rem;line-height:1.5;">
                    ${escapeHtml(problem.Problem_Statement)}
                </div>

                <div class="option-list">
                    ${Object.entries(problem.Options).map(([key, text]) => `
                        <div class="option-item ${s.selectedOption === key ? 'selected' : ''}" data-option="${key}">
                            <span class="option-key">${key}</span>
                            <span class="option-text">${escapeHtml(text)}</span>
                        </div>
                    `).join('')}
                </div>

                <h3>Confidence Level</h3>
                <div class="confidence-selector">
                    ${[['Sure', 'S', 'sure'], ['Semi-Sure', 'SS', 'semisure'], ['Doubtful', 'D', 'doubtful'], ['Guess', 'G', 'guess']].map(([val, label, cls]) => `
                        <div class="confidence-btn ${s.selectedConfidence === val ? `active-${cls}` : ''}" data-confidence="${val}">${label} — ${val}</div>
                    `).join('')}
                </div>

                <div id="corrective-feedback"></div>

                <div class="btn-group mt-3">
                    <button class="btn btn-danger btn-sm" id="btn-exit-corrective">Exit Corrective</button>
                    <div style="flex:1"></div>
                    <button class="btn btn-primary btn-lg" id="btn-corrective-submit" ${!canProceed ? 'disabled' : ''}>Submit Answer</button>
                </div>
            </div>
        `;

        this.container.querySelectorAll('.option-item').forEach(item => {
            item.addEventListener('click', () => { this.state.selectedOption = item.dataset.option; this.render(); });
        });
        this.container.querySelectorAll('.confidence-btn').forEach(btn => {
            btn.addEventListener('click', () => { this.state.selectedConfidence = btn.dataset.confidence; this.render(); });
        });
        this.container.querySelector('#btn-corrective-submit').addEventListener('click', () => this.handleCorrectiveSubmit());
        this.container.querySelector('#btn-exit-corrective').addEventListener('click', () => this.correctiveComplete());
    }

    handleCorrectiveSubmit() {
        const s = this.state;
        const problem = s.problemQueue[s.currentProblemIndex % s.problemQueue.length];
        const timeSeconds = Math.round((Date.now() - s.timerStart) / 1000 * 10) / 10;
        const isCorrect = s.selectedOption === problem.Answer.Correct_Option;

        // Track first response per problem for analysis
        if (!s.correctiveFirstResponses.has(problem.Problem_ID)) {
            s.correctiveFirstResponses.set(problem.Problem_ID, {
                Problem_ID: problem.Problem_ID,
                Response: { Selected_Option: s.selectedOption, Confidence_Level: s.selectedConfidence },
                time_seconds: timeSeconds,
            });
        }

        if (isCorrect) {
            s.problemQueue = s.problemQueue.filter(p => p.Problem_ID !== problem.Problem_ID);
            s.currentProblemIndex = s.problemQueue.length > 0 ? s.currentProblemIndex % s.problemQueue.length : 0;
            s.selectedOption = null;
            s.selectedConfidence = null;
            s.timerStart = Date.now();
            if (s.problemQueue.length === 0) {
                this.correctiveComplete();
            } else {
                this.render();
                // Show brief success feedback
                const fb = this.container.querySelector('#corrective-feedback');
                if (fb) fb.innerHTML = `<div class="feedback-correct">Correct! Problem cleared.</div>`;
            }
        } else {
            // Show reasoning inline
            const fb = this.container.querySelector('#corrective-feedback');
            if (fb) {
                fb.innerHTML = `
                    <div class="feedback-incorrect">
                        <div class="feedback-title">Incorrect — Correct answer: ${problem.Answer.Correct_Option}</div>
                        <div>${escapeHtml(problem.Answer.Explanation)}</div>
                    </div>
                    <button class="btn btn-primary mt-1" id="btn-corrective-continue">Continue</button>
                `;
                fb.querySelector('#btn-corrective-continue').addEventListener('click', () => {
                    s.currentProblemIndex = (s.currentProblemIndex + 1) % s.problemQueue.length;
                    s.selectedOption = null;
                    s.selectedConfidence = null;
                    s.timerStart = Date.now();
                    this.render();
                });
            }
        }
    }

    correctiveComplete() {
        const s = this.state;
        s.responses = Array.from(s.correctiveFirstResponses.values());
        s.allResponses = [...s.responses];
        const originalProblems = s.chunks[0]; // The filtered problem set
        s.analysisReport = computeAnalysisReport(s.responses, originalProblems);
        this.navigate('dashboard');
    }

    // ======================== S4: Analysis Dashboard ========================

    renderDashboardScreen() {
        const report = this.state.analysisReport;
        const stats = report.Session_Statistics;
        const cwa = stats.Confidence_Wise_Accuracy;
        const dist = stats.Confidence_Distribution_In_Correct;
        const matrix = report.Accuracy_Confidence_Matrix;
        const concepts = report.Concept_Breakdown;

        this.container.innerHTML = `
            <div class="card">
                <h2>Analysis Dashboard</h2>
                <div class="stats-grid">
                    ${this.statCard(stats.Attempted_Questions, 'Attempted')}
                    ${this.statCard(formatPercent(stats.Total_Accuracy_Percent), 'Total Accuracy')}
                    ${this.statCard(formatPercent(cwa.Sure?.Accuracy_Percent), 'Accuracy in Sure')}
                    ${this.statCard(formatPercent(cwa['Semi-Sure']?.Accuracy_Percent), 'Accuracy in Semi-Sure')}
                    ${this.statCard(formatPercent(cwa.Doubtful?.Accuracy_Percent), 'Accuracy in Doubtful')}
                    ${this.statCard(formatPercent(dist.Sure_Percent), 'Sure % in Correct')}
                    ${this.statCard(formatPercent(dist['Semi-Sure_Percent']), 'Semi-Sure % in Correct')}
                    ${this.statCard(formatTime(stats.Total_Time_Spent_Seconds), 'Total Time')}
                    ${this.statCard(stats.Total_Time_Spent_Minutes + 'm', 'Time (minutes)')}
                </div>
            </div>

            <div class="card">
                <h2>Confidence-Wise Accuracy</h2>
                <table class="data-table">
                    <thead><tr><th>Confidence</th><th class="text-center">Total</th><th class="text-center">Correct</th><th class="text-center">Incorrect</th><th class="text-center">Accuracy</th></tr></thead>
                    <tbody>
                        ${CONFIDENCE_LEVELS.map(level => {
                            const d = cwa[level];
                            return `<tr><td><strong>${level}</strong></td><td class="text-center">${d.Total}</td><td class="text-center">${d.Correct}</td><td class="text-center">${d.Incorrect}</td><td class="text-center">${formatPercent(d.Accuracy_Percent)}</td></tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <div class="card">
                <h2>Accuracy–Confidence Matrix</h2>
                <div class="matrix-grid">
                    <div class="matrix-header"></div>
                    <div class="matrix-header">Correct</div>
                    <div class="matrix-header">Incorrect</div>
                    ${CONFIDENCE_LEVELS.map(level => {
                        const c = matrix[`${level}-Correct`];
                        const ic = matrix[`${level}-Incorrect`];
                        return `
                            <div class="matrix-row-header">${level}</div>
                            <div class="matrix-cell ${this.matrixCellClass(level, true)}">
                                <div class="cell-count">${c.Count}</div>
                                <div class="cell-percent">${formatPercent(c.Percent)}</div>
                                <div class="cell-label">${c.Label}</div>
                            </div>
                            <div class="matrix-cell ${this.matrixCellClass(level, false)}">
                                <div class="cell-count">${ic.Count}</div>
                                <div class="cell-percent">${formatPercent(ic.Percent)}</div>
                                <div class="cell-label">${ic.Label}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <div class="card">
                <h2>Concept-Wise Breakdown</h2>
                <table class="data-table">
                    <thead><tr><th>Concept</th><th class="text-center">Total</th><th class="text-center">Correct</th><th class="text-center">Accuracy</th></tr></thead>
                    <tbody>
                        ${Object.entries(concepts).map(([name, d]) => `
                            <tr><td>${escapeHtml(name)}</td><td class="text-center">${d.Total}</td><td class="text-center">${d.Correct}</td><td class="text-center">${formatPercent(d.Accuracy_Percent)}</td></tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="btn-group btn-group-center mt-2">
                <button class="btn btn-primary btn-lg" id="btn-to-review">Continue to Review</button>
            </div>
        `;

        this.container.querySelector('#btn-to-review').addEventListener('click', () => {
            this.state.reviewGroups = getReviewProblems(report.Per_Question_Results);
            this.state.currentReviewGroupIndex = 0;
            this.state.currentReviewItemIndex = 0;
            this.navigate('review');
        });
    }

    statCard(value, label) {
        return `<div class="stat-card"><div class="stat-value">${value}</div><div class="stat-label">${label}</div></div>`;
    }

    matrixCellClass(level, correct) {
        const map = {
            'Sure-true': 'cell-solid-grip',
            'Sure-false': 'cell-blind-spot',
            'Semi-Sure-true': 'cell-nearly-there',
            'Semi-Sure-false': 'cell-near-miss',
            'Doubtful-true': 'cell-underconfident',
            'Doubtful-false': 'cell-expected-gap-d',
            'Guess-true': 'cell-lucky',
            'Guess-false': 'cell-expected-gap-g',
        };
        return map[`${level}-${correct}`] || '';
    }

    // ======================== S5: Review Screen ========================

    renderReviewScreen() {
        const s = this.state;
        const groups = s.reviewGroups;

        if (groups.length === 0) {
            this.container.innerHTML = `
                <div class="card">
                    <h2>Review</h2>
                    <div class="success-msg">All problems were Correct + Sure. No review needed!</div>
                    <div class="btn-group mt-2">
                        <button class="btn btn-primary" id="btn-skip-review">Continue</button>
                    </div>
                </div>
            `;
            this.container.querySelector('#btn-skip-review').addEventListener('click', () => this.afterReview());
            return;
        }

        // Flatten all review items with group info for sequential navigation
        const allItems = [];
        groups.forEach(g => g.items.forEach(item => allItems.push({ ...item, categoryLabel: g.category })));
        const totalItems = allItems.length;
        const flatIndex = this.getFlatReviewIndex();
        const item = allItems[flatIndex] || allItems[0];

        this.container.innerHTML = `
            <div class="card">
                <h2>Review — Problem ${flatIndex + 1} of ${totalItems}</h2>
                <div class="progress-bar-container">
                    <div class="progress-bar"><div class="progress-bar-fill" style="width:${((flatIndex + 1) / totalItems) * 100}%"></div></div>
                </div>

                <div class="review-card">
                    <div class="category-header">${item.categoryLabel} ${this.confidenceBadge(item.Confidence)}</div>
                    <div class="problem-statement">${escapeHtml(item.Problem_Statement)}</div>
                    <div class="option-list">
                        ${Object.entries(item.Options).map(([key, text]) => {
                            let cls = '';
                            if (key === item.Correct_Option) cls = 'correct';
                            else if (key === item.Selected_Option && key !== item.Correct_Option) cls = 'incorrect';
                            return `<div class="option-item ${cls}" style="cursor:default;">
                                <span class="option-key">${key}</span>
                                <span class="option-text">${escapeHtml(text)}</span>
                                ${key === item.Selected_Option ? '<span class="badge badge-semisure">Your Answer</span>' : ''}
                                ${key === item.Correct_Option ? '<span class="badge badge-sure">Correct</span>' : ''}
                            </div>`;
                        }).join('')}
                    </div>
                    <div class="explanation"><strong>Explanation:</strong> ${escapeHtml(item.Explanation)}</div>
                </div>

                <div class="btn-group mt-2">
                    <button class="btn btn-muted" id="btn-review-prev" ${flatIndex === 0 ? 'disabled' : ''}>Previous</button>
                    <div style="flex:1"></div>
                    ${flatIndex < totalItems - 1
                        ? `<button class="btn btn-primary" id="btn-review-next">Next</button>`
                        : `<button class="btn btn-success" id="btn-review-done">Continue to Reinforcement</button>`
                    }
                </div>
            </div>
        `;

        const prevBtn = this.container.querySelector('#btn-review-prev');
        if (prevBtn) prevBtn.addEventListener('click', () => { this.moveFlatReviewIndex(-1); this.render(); });
        const nextBtn = this.container.querySelector('#btn-review-next');
        if (nextBtn) nextBtn.addEventListener('click', () => { this.moveFlatReviewIndex(1); this.render(); });
        const doneBtn = this.container.querySelector('#btn-review-done');
        if (doneBtn) doneBtn.addEventListener('click', () => this.afterReview());
    }

    getFlatReviewIndex() {
        const s = this.state;
        let idx = 0;
        for (let g = 0; g < s.currentReviewGroupIndex && g < s.reviewGroups.length; g++) {
            idx += s.reviewGroups[g].items.length;
        }
        idx += s.currentReviewItemIndex;
        return idx;
    }

    moveFlatReviewIndex(delta) {
        const s = this.state;
        const allItems = [];
        s.reviewGroups.forEach(g => g.items.forEach(() => allItems.push(1)));
        let flat = this.getFlatReviewIndex() + delta;
        flat = Math.max(0, Math.min(flat, allItems.length - 1));
        // Convert back to group/item indices
        let remaining = flat;
        for (let g = 0; g < s.reviewGroups.length; g++) {
            if (remaining < s.reviewGroups[g].items.length) {
                s.currentReviewGroupIndex = g;
                s.currentReviewItemIndex = remaining;
                return;
            }
            remaining -= s.reviewGroups[g].items.length;
        }
    }

    afterReview() {
        const s = this.state;
        const queue = getReinforcementQueue(s.analysisReport.Per_Question_Results);
        s.reinforcementQueue = queue.map(r => r.Problem_ID);
        s.reinforcementTotal = queue.length;
        s.reinforcementSelectedOption = null;
        s.reinforcementFeedback = null;
        this.navigate('reinforcement');
    }

    confidenceBadge(level) {
        const map = { 'Sure': 'sure', 'Semi-Sure': 'semisure', 'Doubtful': 'doubtful', 'Guess': 'guess' };
        const abbr = { 'Sure': 'S', 'Semi-Sure': 'SS', 'Doubtful': 'D', 'Guess': 'G' };
        return `<span class="badge badge-${map[level] || 'semisure'}">${abbr[level] || level}</span>`;
    }

    // ======================== S6: Reinforcement Screen ========================

    renderReinforcementScreen() {
        const s = this.state;
        const report = s.analysisReport;
        const problemMap = new Map();
        s.selectedSet.Problems.forEach(p => problemMap.set(p.Problem_ID, p));

        if (s.reinforcementQueue.length === 0) {
            this.container.innerHTML = `
                <div class="card">
                    <h2>Reinforcement Complete</h2>
                    <div class="feedback-correct" style="font-size:1.2rem;padding:1.5rem;">
                        All problems answered correctly!
                    </div>
                    <div class="btn-group btn-group-center mt-2">
                        <button class="btn btn-primary btn-lg" id="btn-reinf-done">Continue</button>
                    </div>
                </div>
            `;
            this.container.querySelector('#btn-reinf-done').addEventListener('click', () => this.afterReinforcement());
            return;
        }

        const problemId = s.reinforcementQueue[0];
        const problem = problemMap.get(problemId);
        const cleared = s.reinforcementTotal - s.reinforcementQueue.length;

        this.container.innerHTML = `
            <div class="card">
                <h2>Reinforcement</h2>
                <div class="progress-bar-container">
                    <span class="progress-text">Cleared: ${cleared}/${s.reinforcementTotal}</span>
                    <div class="progress-bar">
                        <div class="progress-bar-fill" style="width:${(cleared / s.reinforcementTotal) * 100}%"></div>
                    </div>
                    <span class="progress-text">Remaining: ${s.reinforcementQueue.length}</span>
                </div>

                <div class="problem-statement" style="font-size:1.05rem;font-weight:600;margin-bottom:1rem;line-height:1.5;">
                    ${escapeHtml(problem.Problem_Statement)}
                </div>

                <div class="option-list">
                    ${Object.entries(problem.Options).map(([key, text]) => `
                        <div class="option-item ${s.reinforcementSelectedOption === key ? 'selected' : ''}" data-option="${key}">
                            <span class="option-key">${key}</span>
                            <span class="option-text">${escapeHtml(text)}</span>
                        </div>
                    `).join('')}
                </div>

                <div id="reinf-feedback"></div>

                <div class="btn-group mt-3">
                    <button class="btn btn-danger btn-sm" id="btn-exit-reinf">Exit Reinforcement</button>
                    <div style="flex:1"></div>
                    ${s.reinforcementFeedback
                        ? `<button class="btn btn-primary" id="btn-reinf-continue">Continue</button>`
                        : `<button class="btn btn-primary btn-lg" id="btn-reinf-submit" ${!s.reinforcementSelectedOption ? 'disabled' : ''}>Submit</button>`
                    }
                </div>
            </div>
        `;

        if (!s.reinforcementFeedback) {
            this.container.querySelectorAll('.option-item').forEach(item => {
                item.addEventListener('click', () => {
                    s.reinforcementSelectedOption = item.dataset.option;
                    this.render();
                });
            });
            this.container.querySelector('#btn-reinf-submit').addEventListener('click', () => {
                this.handleReinforcementSubmit(problem);
            });
        } else {
            const fb = this.container.querySelector('#reinf-feedback');
            if (s.reinforcementFeedback === 'correct') {
                fb.innerHTML = `<div class="feedback-correct">Correct! Problem cleared.</div>`;
            } else {
                fb.innerHTML = `
                    <div class="feedback-incorrect">
                        <div class="feedback-title">Incorrect — Correct answer: ${problem.Answer.Correct_Option}</div>
                        <div>${escapeHtml(problem.Answer.Explanation)}</div>
                    </div>
                `;
            }
            this.container.querySelector('#btn-reinf-continue').addEventListener('click', () => {
                s.reinforcementFeedback = null;
                s.reinforcementSelectedOption = null;
                this.render();
            });
        }

        this.container.querySelector('#btn-exit-reinf').addEventListener('click', () => this.afterReinforcement());
    }

    handleReinforcementSubmit(problem) {
        const s = this.state;
        const isCorrect = s.reinforcementSelectedOption === problem.Answer.Correct_Option;
        if (isCorrect) {
            s.reinforcementQueue.shift();
            s.reinforcementFeedback = 'correct';
        } else {
            // Move to end of queue
            const id = s.reinforcementQueue.shift();
            s.reinforcementQueue.push(id);
            s.reinforcementFeedback = 'incorrect';
        }
        this.render();
    }

    afterReinforcement() {
        const s = this.state;
        if (s.mode === 'Corrective' || s.currentChunkIndex >= s.chunks.length - 1) {
            this.navigate('export');
        } else {
            this.navigate('chunkTransition');
        }
    }

    // ======================== S7: Chunk Transition ========================

    renderChunkTransitionScreen() {
        const s = this.state;
        const completed = s.currentChunkIndex + 1;
        const total = s.chunks.length;
        const nextChunkSize = s.chunks[completed] ? s.chunks[completed].length : 0;

        this.container.innerHTML = `
            <div class="card">
                <h2>Chunk ${completed} of ${total} Completed</h2>
                <div class="info-box">
                    Next chunk has <strong>${nextChunkSize}</strong> problems.
                </div>
                <div class="btn-group btn-group-center mt-3">
                    <button class="btn btn-primary btn-lg" id="btn-next-chunk">Continue to Next Chunk</button>
                    <button class="btn btn-warning" id="btn-stop-export">Stop & Export</button>
                </div>
            </div>
        `;

        this.container.querySelector('#btn-next-chunk').addEventListener('click', () => {
            this.state.currentChunkIndex++;
            this.startChunk();
        });
        this.container.querySelector('#btn-stop-export').addEventListener('click', () => this.navigate('export'));
    }

    // ======================== S8: Export Screen ========================

    renderExportScreen() {
        const s = this.state;
        const set = s.selectedSet;
        // Build cumulative analysis for all responses if multiple chunks
        let finalReport = s.analysisReport;
        if (s.allResponses.length !== (s.analysisReport?.Session_Statistics?.Total_Questions || 0)) {
            finalReport = computeAnalysisReport(s.allResponses, set.Problems);
        }

        const stats = finalReport.Session_Statistics;
        const timestamp = generateTimestamp();

        this.container.innerHTML = `
            <div class="card">
                <h2>Export Session</h2>
                <div class="info-box">
                    <strong>${escapeHtml(set.Title)}</strong><br>
                    Date: ${formatDate()}<br>
                    Mode: ${s.mode} | Problems: ${stats.Attempted_Questions} | Accuracy: ${formatPercent(stats.Total_Accuracy_Percent)} | Time: ${formatTime(stats.Total_Time_Spent_Seconds)}
                </div>
                <div class="btn-group btn-group-center mt-3">
                    <button class="btn btn-success btn-lg" id="btn-download">Download Attempt JSON</button>
                </div>
                <div id="download-status" class="mt-2"></div>
            </div>
            <div class="card">
                <h2>What's Next?</h2>
                <div class="btn-group">
                    <button class="btn btn-primary" id="btn-new-session">Start New Session</button>
                    <button class="btn btn-outline" id="btn-longitudinal">View Longitudinal Analysis</button>
                </div>
            </div>
        `;

        this.container.querySelector('#btn-download').addEventListener('click', () => {
            const attemptRecord = this.buildAttemptRecord(finalReport, timestamp);
            const filename = `${set.ID}_${timestamp}_Attempted.json`;
            downloadJSON(attemptRecord, filename);
            this.container.querySelector('#download-status').innerHTML = `<div class="success-msg">Downloaded: ${filename}</div>`;
        });
        this.container.querySelector('#btn-new-session').addEventListener('click', () => {
            this.resetState();
            this.navigate('upload');
        });
        this.container.querySelector('#btn-longitudinal').addEventListener('click', () => this.navigate('longitudinal'));
    }

    buildAttemptRecord(report, timestamp) {
        const s = this.state;
        return {
            Problem_Set_ID: s.selectedSet.ID,
            ID: timestamp,
            Attempt_Date: formatDate(),
            Attempt: s.allResponses.map(r => ({
                Problem_ID: r.Problem_ID,
                Response: { Selected_Option: r.Response.Selected_Option, Confidence_Level: r.Response.Confidence_Level },
                time_seconds: r.time_seconds,
            })),
            Analysis_Report: {
                Session_Statistics: report.Session_Statistics,
                Feedback_Review_Order: report.Feedback_Review_Order,
            },
        };
    }

    // ======================== S9: Longitudinal Analysis ========================

    renderLongitudinalScreen() {
        const s = this.state;
        const hasData = s.longitudinalAttempts.length >= 2;

        let trendsHtml = '';
        if (hasData) {
            const { trends, conceptTrends } = computeLongitudinalTrends(s.longitudinalAttempts);
            trendsHtml = this.renderTrendsContent(trends, conceptTrends);
        }

        this.container.innerHTML = `
            <div class="card">
                <h2>Longitudinal Analysis</h2>
                <p style="color:var(--text-muted);margin-bottom:0.75rem;">Upload 2 or more Attempt JSON files for the same Problem Set to view performance trends.</p>
                <div class="file-upload-area" id="long-upload-area">
                    <input type="file" id="long-file-input" accept=".json" multiple>
                    <span class="upload-label"><strong>Click to upload</strong> multiple Attempt JSON files</span>
                </div>
                <div id="long-status"></div>
            </div>
            ${trendsHtml}
            <div class="btn-group mt-2">
                <button class="btn btn-muted" id="btn-long-back">Back to Upload</button>
                ${hasData ? `<button class="btn btn-primary" id="btn-corrective-shortcut">Start Corrective Practice (latest attempt)</button>` : ''}
            </div>
        `;

        const uploadArea = this.container.querySelector('#long-upload-area');
        const fileInput = this.container.querySelector('#long-file-input');
        uploadArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length) this.handleLongitudinalUpload(fileInput.files);
        });
        this.container.querySelector('#btn-long-back').addEventListener('click', () => {
            this.state.longitudinalAttempts = [];
            this.navigate('upload');
        });
        const corrBtn = this.container.querySelector('#btn-corrective-shortcut');
        if (corrBtn) {
            corrBtn.addEventListener('click', () => {
                const sorted = [...s.longitudinalAttempts].sort((a, b) => b.Attempt_Date.localeCompare(a.Attempt_Date));
                s.priorAttempt = sorted[0];
                s.mode = 'Corrective';
                this.navigate('setup');
            });
        }
    }

    async handleLongitudinalUpload(files) {
        const statusEl = this.container.querySelector('#long-status');
        const attempts = [];
        const errors = [];
        for (const file of files) {
            try {
                const json = await readJSONFile(file);
                if (!json.Problem_Set_ID || !json.Analysis_Report) {
                    errors.push(`${file.name}: Not a valid Attempt file (missing Problem_Set_ID or Analysis_Report).`);
                } else {
                    attempts.push(json);
                }
            } catch (err) {
                errors.push(`${file.name}: ${err.message}`);
            }
        }
        if (errors.length > 0) {
            statusEl.innerHTML = `<div class="error-msg"><ul>${errors.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul></div>`;
            return;
        }
        if (attempts.length < 2) {
            statusEl.innerHTML = `<div class="error-msg">Please upload at least 2 Attempt files.</div>`;
            return;
        }
        // Check all have same Problem_Set_ID
        const ids = new Set(attempts.map(a => a.Problem_Set_ID));
        if (ids.size > 1) {
            statusEl.innerHTML = `<div class="error-msg">All files must be for the same Problem Set. Found: ${[...ids].join(', ')}</div>`;
            return;
        }
        this.state.longitudinalAttempts = attempts;
        statusEl.innerHTML = `<div class="success-msg">Loaded ${attempts.length} attempt files for ${attempts[0].Problem_Set_ID}.</div>`;
        this.render();
    }

    renderTrendsContent(trends, conceptTrends) {
        if (!trends || trends.length === 0) return '';

        const maxAcc = Math.max(...trends.map(t => t.totalAccuracy || 0), 1);
        const trendArrow = (vals, key) => {
            const valid = vals.filter(v => v[key] !== null && v[key] !== undefined);
            if (valid.length < 2) return '<span class="trend-flat">—</span>';
            const last = valid[valid.length - 1][key];
            const prev = valid[valid.length - 2][key];
            if (last > prev) return `<span class="trend-up">▲ ${(last - prev).toFixed(1)}</span>`;
            if (last < prev) return `<span class="trend-down">▼ ${(prev - last).toFixed(1)}</span>`;
            return '<span class="trend-flat">—</span>';
        };

        let html = `
            <div class="card">
                <h2>Performance Trends</h2>
                <table class="data-table">
                    <thead><tr><th>Date</th><th class="text-center">Accuracy</th><th class="text-center">Sure Acc.</th><th class="text-center">Sure% in Correct</th><th class="text-center">Blind Spots</th><th class="text-center">Time</th></tr></thead>
                    <tbody>
                        ${trends.map(t => `
                            <tr>
                                <td>${escapeHtml(t.date)}</td>
                                <td class="text-center">
                                    <div class="trend-row" style="justify-content:center;">
                                        <span class="mini-bar" style="width:${Math.round((t.totalAccuracy / maxAcc) * 80)}px;"></span>
                                        ${formatPercent(t.totalAccuracy)}
                                    </div>
                                </td>
                                <td class="text-center">${formatPercent(t.sureAccuracy)}</td>
                                <td class="text-center">${formatPercent(t.surePercentInCorrect)}</td>
                                <td class="text-center">${t.blindSpotCount}</td>
                                <td class="text-center">${formatTime(t.totalTime)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="mt-2 gap-row" style="font-size:0.9rem;">
                    <strong>Trends:</strong>
                    Accuracy ${trendArrow(trends, 'totalAccuracy')} |
                    Sure Accuracy ${trendArrow(trends, 'sureAccuracy')} |
                    Blind Spots ${trendArrow(trends, 'blindSpotCount')}
                </div>
            </div>
        `;

        // Concept trends
        if (Object.keys(conceptTrends).length > 0) {
            html += `
                <div class="card">
                    <h2>Concept-Wise Trends</h2>
                    <table class="data-table">
                        <thead><tr><th>Concept</th>${trends.map(t => `<th class="text-center">${t.date}</th>`).join('')}</tr></thead>
                        <tbody>
                            ${Object.entries(conceptTrends).map(([concept, data]) => {
                                const dateMap = {};
                                data.forEach(d => dateMap[d.date] = d.accuracy);
                                return `<tr><td>${escapeHtml(concept)}</td>${trends.map(t => `<td class="text-center">${formatPercent(dateMap[t.date] ?? null)}</td>`).join('')}</tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        return html;
    }

    // ======================== Helpers ========================

    resetState() {
        this.state = {
            problemSets: [],
            selectedSet: this.state.selectedSet, // Keep selected set for convenience
            mode: 'Straight',
            chunkSize: 'All',
            priorAttempt: null,
            chunks: [],
            currentChunkIndex: 0,
            allResponses: [],
            currentProblemIndex: 0,
            problemQueue: [],
            responses: [],
            selectedOption: null,
            selectedConfidence: null,
            timerStart: null,
            analysisReport: null,
            reviewGroups: [],
            currentReviewGroupIndex: 0,
            currentReviewItemIndex: 0,
            reinforcementQueue: [],
            reinforcementTotal: 0,
            reinforcementSelectedOption: null,
            reinforcementFeedback: null,
            correctiveFirstResponses: new Map(),
            longitudinalAttempts: [],
        };
    }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
    window.mcqApp = new MCQApp();
});
