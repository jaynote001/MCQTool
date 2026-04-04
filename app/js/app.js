// app.js — Main application: state management, screen rendering, navigation
import { shuffle, shuffleWithContextGroups, readJSONFile, downloadJSON, formatPercent, formatTime, generateTimestamp, formatDate, escapeHtml } from './utils.js';
import { parseAndValidate, validateAttemptFile, filterForCorrective } from './fileParser.js';
import { computeAnalysisReport, computeLongitudinalTrends, getReviewProblems, getReinforcementQueue, CONFIDENCE_LEVELS } from './analysisEngine.js';
import { SAMPLE_PROBLEM_SET, SAMPLE_PROBLEM_SETS, SAMPLE_ATTEMPT } from './sampleData.js';
import { renderContentBlocks, renderInlineRichText, activateLatex, renderContextGroup } from './richContentRenderer.js';
import { AssetLoader, loadFromZip, loadFromDirectory } from './assetLoader.js';

class MCQApp {
    constructor() {
        this.container = document.getElementById('app');
        const restored = this.restoreFromStorage();
        this.state = {
            // Data
            problemSets: restored.problemSets || [],
            selectedSet: null,
            assetLoader: null,
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
            // Persisted across sessions
            completedAttempts: restored.completedAttempts || [],
        };
        this.navigate('upload');
    }

    navigate(screen) {
        this.state.currentScreen = screen;
        this.render();
    }

    // ---- SessionStorage persistence ----
    persistToStorage() {
        try {
            const data = {
                problemSets: this.state.problemSets,
                completedAttempts: this.state.completedAttempts,
            };
            sessionStorage.setItem('mcq_app_state', JSON.stringify(data));
        } catch (e) { /* storage full or unavailable */ }
    }

    restoreFromStorage() {
        try {
            const raw = sessionStorage.getItem('mcq_app_state');
            if (raw) return JSON.parse(raw);
        } catch (e) { /* corrupted — ignore */ }
        return {};
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

    /**
     * Merge new sets into existing problemSets, replacing duplicates by ID.
     */
    mergeProblemSets(newSets) {
        const existing = new Map(this.state.problemSets.map(s => [s.ID, s]));
        for (const s of newSets) {
            existing.set(s.ID, s);
        }
        this.state.problemSets = [...existing.values()];
    }

    // ======================== S1: Upload & Select ========================

    renderUploadScreen() {
        const attempts = this.state.completedAttempts;
        const hasAttempts = attempts.length > 0;
        const loadedSets = this.state.problemSets;
        const hasLoadedSets = loadedSets.length > 0;
        const hasAnyData = hasAttempts || hasLoadedSets;

        let loadedSetsHtml = '';
        if (hasLoadedSets) {
            loadedSetsHtml = `
            <div class="card">
                <h2>Loaded Problem Sets</h2>
                <div class="set-list">
                    ${loadedSets.map((s, i) => `
                        <div class="set-item" data-loaded-index="${i}">
                            <div>
                                <div class="set-title">${escapeHtml(s.Title)}</div>
                                <div class="set-meta">${escapeHtml(s.Concepts_Covered.join(', '))}</div>
                            </div>
                            <span class="set-count">${s.Problems.length} Qs</span>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        }

        let attemptsHtml = '';
        if (hasAttempts) {
            attemptsHtml = `
            <div class="card">
                <div class="section-header-row">
                    <h2>Completed Attempts (${attempts.length})</h2>
                    <div class="section-header-actions">
                        ${attempts.length > 1 ? `<button class="btn btn-outline btn-sm" id="btn-download-all">Download All</button>` : ''}
                    </div>
                </div>
                <div class="attempts-list">
                    ${attempts.map((a, i) => {
                        const stats = a.record.Analysis_Report?.Session_Statistics;
                        const acc = stats ? formatPercent(stats.Total_Accuracy_Percent) : 'N/A';
                        const qs = stats ? stats.Attempted_Questions : '?';
                        return `
                        <div class="attempt-item">
                            <div class="attempt-info">
                                <div class="attempt-name">${escapeHtml(a.filename)}</div>
                                <div class="attempt-meta">${escapeHtml(a.record.Problem_Set_ID)} &middot; ${a.record.Attempt_Date} &middot; ${qs} Qs &middot; ${acc}</div>
                            </div>
                            <button class="btn btn-outline btn-sm" data-dl-attempt="${i}">Download</button>
                        </div>`;
                    }).join('')}
                </div>
            </div>`;
        } else {
            attemptsHtml = '';
        }

        const supportsDirectoryPicker = 'showDirectoryPicker' in window;

        this.container.innerHTML = `
            <div class="card upload-card">
                <h2>Upload Problem Set</h2>
                <div class="upload-btn-row">
                    <input type="file" id="file-input" accept=".json" hidden>
                    <button class="btn btn-primary" id="btn-upload-json">Upload JSON</button>
                    <input type="file" id="file-input-zip" accept=".zip" hidden>
                    <button class="btn btn-outline" id="btn-upload-zip">Upload ZIP</button>
                    ${supportsDirectoryPicker ? `
                    <button class="btn btn-outline" id="btn-upload-dir">Upload Folder</button>
                    ` : ''}
                </div>
                <div class="file-drop-area" id="drop-area">
                    <div class="drop-icon">&#128449;</div>
                    <div class="drop-label">Drag &amp; drop a JSON or ZIP file here</div>
                </div>
                <div id="upload-error"></div>
                <div id="set-list-container"></div>
            </div>

            ${loadedSetsHtml}

            ${attemptsHtml}

            ${hasAnyData ? `
            <div class="card" style="text-align:center;">
                <button class="btn btn-danger" id="btn-refresh-memory">Refresh Memory — Clear All Data</button>
            </div>
            ` : ''}

            <div class="card" style="text-align:center;">
                <h2>Longitudinal Analysis</h2>
                <p style="color:var(--text-muted);margin-bottom:0.75rem;">Upload multiple Attempt files to view performance trends over time.</p>
                <button class="btn btn-outline" id="btn-longitudinal">Open Longitudinal Analysis</button>
            </div>

            <div class="card">
                <details class="sample-files-details">
                    <summary class="sample-files-summary">
                        <span class="sample-files-title">Sample Files</span>
                        <span class="sample-files-hint">View or download sample JSON files to get started</span>
                    </summary>
                    <div class="sample-files-grid">

                        <div class="sample-file-card">
                            <div class="sample-file-icon">&#128196;</div>
                            <div class="sample-file-info">
                                <div class="sample-file-name">Sample_Problem_Set.json</div>
                                <div class="sample-file-desc">Single problem set &mdash; Data Visualization (2 problems)</div>
                            </div>
                            <div class="sample-file-actions">
                                <button class="btn btn-outline btn-sm" data-view="single">View</button>
                                <button class="btn btn-outline btn-sm" data-dl="single">Download</button>
                            </div>
                        </div>
                        <pre class="sample-json-preview" id="preview-single" hidden></pre>

                        <div class="sample-file-card">
                            <div class="sample-file-icon">&#128196;</div>
                            <div class="sample-file-info">
                                <div class="sample-file-name">Sample_Problem_Sets.json</div>
                                <div class="sample-file-desc">Multi-set array format &mdash; demonstrates multi-set loading</div>
                            </div>
                            <div class="sample-file-actions">
                                <button class="btn btn-outline btn-sm" data-view="multi">View</button>
                                <button class="btn btn-outline btn-sm" data-dl="multi">Download</button>
                            </div>
                        </div>
                        <pre class="sample-json-preview" id="preview-multi" hidden></pre>

                        <div class="sample-file-card">
                            <div class="sample-file-icon">&#128203;</div>
                            <div class="sample-file-info">
                                <div class="sample-file-name">Sample_Problem_Set_Attempted.json</div>
                                <div class="sample-file-desc">Sample attempt record &mdash; use for Corrective mode or Longitudinal Analysis</div>
                            </div>
                            <div class="sample-file-actions">
                                <button class="btn btn-outline btn-sm" data-view="attempt">View</button>
                                <button class="btn btn-outline btn-sm" data-dl="attempt">Download</button>
                            </div>
                        </div>
                        <pre class="sample-json-preview" id="preview-attempt" hidden></pre>

                    </div>
                </details>
            </div>
        `;

        // Upload button handlers
        const fileInput = this.container.querySelector('#file-input');
        const fileInputZip = this.container.querySelector('#file-input-zip');

        this.container.querySelector('#btn-upload-json').addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length) this.handleProblemSetUpload(fileInput.files[0]);
        });

        this.container.querySelector('#btn-upload-zip').addEventListener('click', () => fileInputZip.click());
        fileInputZip.addEventListener('change', () => {
            if (fileInputZip.files.length) this.handleZipUpload(fileInputZip.files[0]);
        });

        const dirBtn = this.container.querySelector('#btn-upload-dir');
        if (dirBtn) {
            dirBtn.addEventListener('click', () => this.handleDirectoryUpload());
        }

        // Drag & drop zone
        const dropArea = this.container.querySelector('#drop-area');
        dropArea.addEventListener('dragover', (e) => { e.preventDefault(); dropArea.classList.add('drop-active'); });
        dropArea.addEventListener('dragleave', () => { dropArea.classList.remove('drop-active'); });
        dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            dropArea.classList.remove('drop-active');
            if (e.dataTransfer.files.length) {
                const file = e.dataTransfer.files[0];
                if (file.name.endsWith('.zip')) {
                    this.handleZipUpload(file);
                } else {
                    this.handleProblemSetUpload(file);
                }
            }
        });

        // Loaded sets — click to start new session
        this.container.querySelectorAll('[data-loaded-index]').forEach(item => {
            item.addEventListener('click', () => {
                this.state.selectedSet = loadedSets[parseInt(item.dataset.loadedIndex)];
                this.navigate('setup');
            });
        });

        // Sample file — View toggles
        const viewData = { single: SAMPLE_PROBLEM_SET, multi: SAMPLE_PROBLEM_SETS, attempt: SAMPLE_ATTEMPT };
        this.container.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.view;
                const pre = this.container.querySelector(`#preview-${key}`);
                if (pre.hidden) {
                    pre.textContent = JSON.stringify(viewData[key], null, 2);
                    pre.hidden = false;
                    btn.textContent = 'Hide';
                } else {
                    pre.hidden = true;
                    btn.textContent = 'View';
                }
            });
        });

        // Sample file — Download buttons
        this.container.querySelector('[data-dl="single"]').addEventListener('click', () => {
            downloadJSON(SAMPLE_PROBLEM_SET, 'Sample_Problem_Set.json');
        });
        this.container.querySelector('[data-dl="multi"]').addEventListener('click', () => {
            downloadJSON(SAMPLE_PROBLEM_SETS, 'Sample_Problem_Sets.json');
        });
        this.container.querySelector('[data-dl="attempt"]').addEventListener('click', () => {
            downloadJSON(SAMPLE_ATTEMPT, 'Sample_Problem_Set_Attempted.json');
        });

        this.container.querySelector('#btn-longitudinal').addEventListener('click', () => {
            this.navigate('longitudinal');
        });

        // Completed attempts — download individual
        this.container.querySelectorAll('[data-dl-attempt]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.dlAttempt);
                const a = this.state.completedAttempts[idx];
                if (a) downloadJSON(a.record, a.filename);
            });
        });

        // Download all attempts
        const dlAllBtn = this.container.querySelector('#btn-download-all');
        if (dlAllBtn) {
            dlAllBtn.addEventListener('click', () => {
                this.state.completedAttempts.forEach(a => downloadJSON(a.record, a.filename));
            });
        }

        // Refresh memory
        const refreshBtn = this.container.querySelector('#btn-refresh-memory');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.clearAllMemory());
        }
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
            this.mergeProblemSets(sets);
            this.persistToStorage();
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

    async handleZipUpload(file) {
        const errorEl = this.container.querySelector('#upload-error');
        errorEl.innerHTML = '';
        try {
            const { json, assetLoader } = await loadFromZip(file);
            const { sets, errors } = parseAndValidate(json);
            if (errors.length > 0) {
                errorEl.innerHTML = `<div class="error-msg"><strong>Validation Error:</strong><ul>${errors.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul></div>`;
                assetLoader.revokeAll();
                return;
            }
            // Revoke old assets if any
            if (this.state.assetLoader) this.state.assetLoader.revokeAll();
            this.state.assetLoader = assetLoader;
            this.mergeProblemSets(sets);
            this.persistToStorage();
            if (sets.length === 1) {
                this.state.selectedSet = sets[0];
                this.navigate('setup');
            } else {
                this.navigate('upload');
            }
        } catch (err) {
            errorEl.innerHTML = `<div class="error-msg">${escapeHtml(err.message)}</div>`;
        }
    }

    async handleDirectoryUpload() {
        const errorEl = this.container.querySelector('#upload-error');
        errorEl.innerHTML = '';
        try {
            const dirHandle = await window.showDirectoryPicker();
            const { json, assetLoader } = await loadFromDirectory(dirHandle);
            const { sets, errors } = parseAndValidate(json);
            if (errors.length > 0) {
                errorEl.innerHTML = `<div class="error-msg"><strong>Validation Error:</strong><ul>${errors.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul></div>`;
                assetLoader.revokeAll();
                return;
            }
            if (this.state.assetLoader) this.state.assetLoader.revokeAll();
            this.state.assetLoader = assetLoader;
            this.mergeProblemSets(sets);
            this.persistToStorage();
            if (sets.length === 1) {
                this.state.selectedSet = sets[0];
                this.navigate('setup');
            } else {
                this.navigate('upload');
            }
        } catch (err) {
            if (err.name === 'AbortError') return; // User cancelled picker
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
            if (s.mode === 'Jumbled') {
                // Context-group-aware shuffle: keeps grouped problems together
                const hasContextGroups = set.Context_Groups && set.Context_Groups.length > 0;
                problems = hasContextGroups ? shuffleWithContextGroups(problems) : shuffle(problems);
            }
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

    /**
     * Get context group info for the current problem in the queue.
     * Returns { group, isFirst } or null if no context group.
     */
    getContextForProblem(problemIndex, problemQueue) {
        const problem = problemQueue[problemIndex];
        if (!problem.Context_Group) return null;
        const set = this.state.selectedSet;
        if (!set.Context_Groups) return null;
        const group = set.Context_Groups.find(cg => cg.Group_ID === problem.Context_Group);
        if (!group) return null;
        // Is this the first problem in the queue with this Context_Group?
        const isFirst = !problemQueue.slice(0, problemIndex).some(p => p.Context_Group === problem.Context_Group);
        return { group, isFirst };
    }

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

                <div id="context-group-container"></div>
                <div id="problem-content-container"></div>

                <div class="problem-statement" style="font-size:1.05rem;font-weight:600;margin-bottom:1rem;line-height:1.5;" id="problem-statement-el">
                </div>

                <div class="option-list" id="option-list-el">
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

        // Render context group
        const ctxInfo = this.getContextForProblem(s.currentProblemIndex, s.problemQueue);
        const ctxContainer = this.container.querySelector('#context-group-container');
        if (ctxInfo) {
            ctxContainer.appendChild(renderContextGroup(ctxInfo.group, ctxInfo.isFirst, s.assetLoader));
        }

        // Render problem-level Content blocks
        const problemContentContainer = this.container.querySelector('#problem-content-container');
        if (problem.Content && problem.Content.length > 0) {
            problemContentContainer.appendChild(renderContentBlocks(problem.Content, s.assetLoader));
        }

        // Render problem statement with rich text
        const stmtEl = this.container.querySelector('#problem-statement-el');
        stmtEl.innerHTML = renderInlineRichText(problem.Problem_Statement);
        activateLatex(stmtEl);

        // Render options with rich text
        const optListEl = this.container.querySelector('#option-list-el');
        Object.entries(problem.Options).forEach(([key, text]) => {
            const div = document.createElement('div');
            div.className = `option-item ${s.selectedOption === key ? 'selected' : ''}`;
            div.dataset.option = key;
            div.innerHTML = `<span class="option-key">${key}</span><span class="option-text"></span>`;
            const textSpan = div.querySelector('.option-text');
            textSpan.innerHTML = renderInlineRichText(text);
            activateLatex(textSpan);
            optListEl.appendChild(div);
        });

        // Option selection
        this.container.querySelectorAll('.option-item').forEach(item => {
            item.addEventListener('click', () => {
                this.state.selectedOption = item.dataset.option;
                this.container.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                this.updatePracticeSubmitBtn();
            });
        });
        // Confidence selection
        this.container.querySelectorAll('.confidence-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.state.selectedConfidence = btn.dataset.confidence;
                this.container.querySelectorAll('.confidence-btn').forEach(el => el.className = 'confidence-btn');
                const clsMap = { 'Sure': 'active-sure', 'Semi-Sure': 'active-semisure', 'Doubtful': 'active-doubtful', 'Guess': 'active-guess' };
                btn.classList.add(clsMap[btn.dataset.confidence]);
                this.updatePracticeSubmitBtn();
            });
        });
        // Next/Submit
        this.container.querySelector('#btn-next').addEventListener('click', () => this.handlePracticeNext());
    }

    updatePracticeSubmitBtn() {
        const btn = this.container.querySelector('#btn-next');
        if (btn) btn.disabled = !(this.state.selectedOption && this.state.selectedConfidence);
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

                <div id="context-group-container"></div>
                <div id="problem-content-container"></div>

                <div class="problem-statement" style="font-size:1.05rem;font-weight:600;margin-bottom:1rem;line-height:1.5;" id="problem-statement-el">
                </div>

                <div class="option-list" id="option-list-el">
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

        // Render context group
        const ctxInfo = this.getContextForProblem(s.currentProblemIndex % s.problemQueue.length, s.problemQueue);
        const ctxContainer = this.container.querySelector('#context-group-container');
        if (ctxInfo) {
            ctxContainer.appendChild(renderContextGroup(ctxInfo.group, ctxInfo.isFirst, s.assetLoader));
        }

        // Render problem-level Content
        const problemContentContainer = this.container.querySelector('#problem-content-container');
        if (problem.Content && problem.Content.length > 0) {
            problemContentContainer.appendChild(renderContentBlocks(problem.Content, s.assetLoader));
        }

        // Render problem statement with rich text
        const stmtEl = this.container.querySelector('#problem-statement-el');
        stmtEl.innerHTML = renderInlineRichText(problem.Problem_Statement);
        activateLatex(stmtEl);

        // Render options with rich text
        const optListEl = this.container.querySelector('#option-list-el');
        Object.entries(problem.Options).forEach(([key, text]) => {
            const div = document.createElement('div');
            div.className = `option-item ${s.selectedOption === key ? 'selected' : ''}`;
            div.dataset.option = key;
            div.innerHTML = `<span class="option-key">${key}</span><span class="option-text"></span>`;
            const textSpan = div.querySelector('.option-text');
            textSpan.innerHTML = renderInlineRichText(text);
            activateLatex(textSpan);
            optListEl.appendChild(div);
        });

        this.container.querySelectorAll('.option-item').forEach(item => {
            item.addEventListener('click', () => {
                this.state.selectedOption = item.dataset.option;
                this.container.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                this.updateCorrectiveSubmitBtn();
            });
        });
        this.container.querySelectorAll('.confidence-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.state.selectedConfidence = btn.dataset.confidence;
                this.container.querySelectorAll('.confidence-btn').forEach(el => el.className = 'confidence-btn');
                const clsMap = { 'Sure': 'active-sure', 'Semi-Sure': 'active-semisure', 'Doubtful': 'active-doubtful', 'Guess': 'active-guess' };
                btn.classList.add(clsMap[btn.dataset.confidence]);
                this.updateCorrectiveSubmitBtn();
            });
        });
        this.container.querySelector('#btn-corrective-submit').addEventListener('click', () => this.handleCorrectiveSubmit());
        this.container.querySelector('#btn-exit-corrective').addEventListener('click', () => this.correctiveComplete());
    }

    updateCorrectiveSubmitBtn() {
        const btn = this.container.querySelector('#btn-corrective-submit');
        if (btn) btn.disabled = !(this.state.selectedOption && this.state.selectedConfidence);
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
                        <div class="feedback-explanation"></div>
                    </div>
                    <button class="btn btn-primary mt-1" id="btn-corrective-continue">Continue</button>
                `;
                const explEl = fb.querySelector('.feedback-explanation');
                explEl.innerHTML = renderInlineRichText(problem.Answer.Explanation);
                activateLatex(explEl);
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
                    <div id="review-context-container"></div>
                    <div id="review-problem-content"></div>
                    <div class="problem-statement" id="review-stmt"></div>
                    <div class="option-list" id="review-options"></div>
                    <div class="explanation" id="review-explanation"><strong>Explanation:</strong> <span id="review-expl-text"></span></div>
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

        // Render context group for review item
        const reviewProblem = this.state.selectedSet.Problems.find(p => p.Problem_ID === item.Problem_ID);
        if (reviewProblem) {
            const ctxContainer = this.container.querySelector('#review-context-container');
            if (reviewProblem.Context_Group && this.state.selectedSet.Context_Groups) {
                const group = this.state.selectedSet.Context_Groups.find(cg => cg.Group_ID === reviewProblem.Context_Group);
                if (group) {
                    ctxContainer.appendChild(renderContextGroup(group, false, this.state.assetLoader));
                }
            }
            // Render problem-level Content
            const probContentEl = this.container.querySelector('#review-problem-content');
            if (reviewProblem.Content && reviewProblem.Content.length > 0) {
                probContentEl.appendChild(renderContentBlocks(reviewProblem.Content, this.state.assetLoader));
            }
        }

        // Render problem statement with rich text
        const stmtEl = this.container.querySelector('#review-stmt');
        stmtEl.innerHTML = renderInlineRichText(item.Problem_Statement);
        activateLatex(stmtEl);

        // Render options with rich text
        const optEl = this.container.querySelector('#review-options');
        Object.entries(item.Options).forEach(([key, text]) => {
            let cls = '';
            if (key === item.Correct_Option) cls = 'correct';
            else if (key === item.Selected_Option && key !== item.Correct_Option) cls = 'incorrect';
            const div = document.createElement('div');
            div.className = `option-item ${cls}`;
            div.style.cursor = 'default';
            div.innerHTML = `<span class="option-key">${key}</span><span class="option-text"></span>
                ${key === item.Selected_Option ? '<span class="badge badge-semisure">Your Answer</span>' : ''}
                ${key === item.Correct_Option ? '<span class="badge badge-sure">Correct</span>' : ''}`;
            const textSpan = div.querySelector('.option-text');
            textSpan.innerHTML = renderInlineRichText(text);
            activateLatex(textSpan);
            optEl.appendChild(div);
        });

        // Render explanation with rich text
        const explEl = this.container.querySelector('#review-expl-text');
        explEl.innerHTML = renderInlineRichText(item.Explanation);
        activateLatex(explEl);

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

                <div id="reinf-context-container"></div>
                <div id="reinf-problem-content"></div>

                <div class="problem-statement" style="font-size:1.05rem;font-weight:600;margin-bottom:1rem;line-height:1.5;" id="reinf-stmt">
                </div>

                <div class="option-list" id="reinf-options">
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

        // Render context group (always collapsible in reinforcement)
        if (problem.Context_Group && s.selectedSet.Context_Groups) {
            const group = s.selectedSet.Context_Groups.find(cg => cg.Group_ID === problem.Context_Group);
            if (group) {
                this.container.querySelector('#reinf-context-container')
                    .appendChild(renderContextGroup(group, false, s.assetLoader));
            }
        }
        // Render problem-level Content
        if (problem.Content && problem.Content.length > 0) {
            this.container.querySelector('#reinf-problem-content')
                .appendChild(renderContentBlocks(problem.Content, s.assetLoader));
        }

        // Problem statement with rich text
        const stmtEl = this.container.querySelector('#reinf-stmt');
        stmtEl.innerHTML = renderInlineRichText(problem.Problem_Statement);
        activateLatex(stmtEl);

        // Options with rich text
        const optEl = this.container.querySelector('#reinf-options');
        Object.entries(problem.Options).forEach(([key, text]) => {
            const div = document.createElement('div');
            div.className = `option-item ${s.reinforcementSelectedOption === key ? 'selected' : ''}`;
            div.dataset.option = key;
            div.innerHTML = `<span class="option-key">${key}</span><span class="option-text"></span>`;
            const textSpan = div.querySelector('.option-text');
            textSpan.innerHTML = renderInlineRichText(text);
            activateLatex(textSpan);
            optEl.appendChild(div);
        });

        if (!s.reinforcementFeedback) {
            this.container.querySelectorAll('.option-item').forEach(item => {
                item.addEventListener('click', () => {
                    s.reinforcementSelectedOption = item.dataset.option;
                    this.container.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected'));
                    item.classList.add('selected');
                    const btn = this.container.querySelector('#btn-reinf-submit');
                    if (btn) btn.disabled = false;
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
                        <div class="feedback-explanation"></div>
                    </div>
                `;
                const explEl = fb.querySelector('.feedback-explanation');
                explEl.innerHTML = renderInlineRichText(problem.Answer.Explanation);
                activateLatex(explEl);
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
            this.saveCurrentAttempt();
            this.navigate('export');
        } else {
            this.navigate('chunkTransition');
        }
    }

    saveCurrentAttempt() {
        const s = this.state;
        const set = s.selectedSet;
        if (!set || s.allResponses.length === 0) return;
        // Avoid saving duplicates for the same session
        if (s._exportSaved) return;

        let finalReport = s.analysisReport;
        if (s.allResponses.length !== (finalReport?.Session_Statistics?.Total_Questions || 0)) {
            finalReport = computeAnalysisReport(s.allResponses, set.Problems);
        }
        const timestamp = generateTimestamp();
        const attemptRecord = this.buildAttemptRecord(finalReport, timestamp);
        const filename = `${set.ID}_${timestamp}_Attempted.json`;
        s.completedAttempts.push({ record: attemptRecord, filename });
        s._exportSaved = true;
        s._currentExport = { record: attemptRecord, filename, report: finalReport };
        this.persistToStorage();
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
        this.container.querySelector('#btn-stop-export').addEventListener('click', () => {
            this.saveCurrentAttempt();
            this.navigate('export');
        });
    }

    // ======================== S8: Export Screen ========================

    renderExportScreen() {
        const s = this.state;
        const set = s.selectedSet;

        // Save attempt if not already saved (e.g. stop & export from chunk transition)
        if (!s._exportSaved) this.saveCurrentAttempt();

        const { record: attemptRecord, filename, report: finalReport } = s._currentExport;
        const stats = finalReport.Session_Statistics;

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
        const preserved = {
            completedAttempts: this.state.completedAttempts,
            problemSets: this.state.problemSets,
            selectedSet: this.state.selectedSet,
            assetLoader: this.state.assetLoader,
        };
        this.state = {
            problemSets: preserved.problemSets,
            selectedSet: preserved.selectedSet,
            assetLoader: preserved.assetLoader,
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
            completedAttempts: preserved.completedAttempts,
            _exportSaved: false,
            _currentExport: null,
        };
        this.persistToStorage();
    }

    clearAllMemory() {
        if (!confirm('This will clear all loaded problem sets and completed attempts. Continue?')) return;
        if (this.state.assetLoader) this.state.assetLoader.revokeAll();
        this.state.completedAttempts = [];
        this.state.problemSets = [];
        this.state.selectedSet = null;
        this.state.assetLoader = null;
        this.state.longitudinalAttempts = [];
        this.persistToStorage();
        this.navigate('upload');
    }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
    window.mcqApp = new MCQApp();
});
