# MCQ Tool — Non-Functional Requirements

> Constraints, qualities, and boundaries for v1.

---

## NFR-1: Offline & Local-First

### NFR-1.1
- The application shall run entirely in the browser with no server dependency.
- All processing (file parsing, analysis computation, export) shall happen client-side.

### NFR-1.2
- No user accounts or authentication required.

### NFR-1.3
- No internet connection required after the initial page load.

---

## NFR-2: Data & Storage

### NFR-2.1
- All data shall be file-based (JSON + optional `assets/` folder). No database required.

### NFR-2.2
- The application shall not persist any data between sessions unless the learner explicitly exports and re-uploads files.

### NFR-2.3
- JSON file parsing and validation shall complete within 2 seconds for files up to 500 problems.

### NFR-2.4
- ZIP archive extraction and asset loading shall complete within 5 seconds for archives up to 50 MB.

---

## NFR-3: Dependencies

### NFR-3.1: Client-Side Libraries
- **KaTeX** — for rendering LaTeX equations (inline and display mode).
- **Marked** (or equivalent) — for Markdown → HTML rendering.
- **JSZip** — for extracting `.zip` problem set archives in the browser.
- All libraries shall be loaded from a CDN or bundled locally for offline use.

---

## NFR-4: Portability

### NFR-4.1
- The application shall run in modern browsers (Chrome, Firefox, Safari, Edge — latest 2 major versions).

### NFR-4.2
- The application shall be responsive and usable on both desktop and tablet screen sizes.

### NFR-4.3
- Directory upload via File System Access API shall degrade gracefully: if the browser does not support it, the directory picker button shall be hidden and only JSON/ZIP upload shall be available.

---

## NFR-5: Usability

### NFR-5.1
- The learner shall be able to complete the full flow (upload → practice → review → export) without reading documentation.

### NFR-5.2
- Error messages for invalid JSON files shall clearly state which field is missing or malformed.

### NFR-5.3
- All navigation between screens shall use explicit buttons — no hidden gestures or keyboard-only shortcuts required.

---

## NFR-6: v1 Scope Boundaries

### In Scope
- Single-select MCQ only (A/B/C/D)
- JSON-based Problem Sets (single and multi-set files)
- Problem Set directory structure (`Problems.json` + `assets/`)
- Upload via JSON file, ZIP archive, or directory (folder) picker
- Context Groups — shared context blocks across problem chains
- Rich Content blocks (`text`, `markdown`, `latex`, `image`, `code`) in context groups and problems
- Markdown + inline LaTeX in Problem_Statement, Options, and Explanation
- Image rendering from `assets/` folder (relative paths) and base64 data URIs
- Three practice modes: Straight, Jumbled (context group–aware), Corrective
- Chunk-based practice (All, 5, 10)
- Confidence tagging (S, SS, D, G)
- Full Analysis Report with 7 core metrics + matrix + concept breakdown
- Priority-ordered Review Session
- Reinforcement Session (re-attempt until correct, no stats impact)
- Session export as JSON (Attempt Record)
- Longitudinal analysis (upload multiple attempts, view trends)
- Offline / local-first, no authentication
- KaTeX for LaTeX rendering, Marked for Markdown, JSZip for zip extraction

### Out of Scope for v1
- Multi-select / fill-in-the-blank / code-based question types
- Timed mode (countdown per question or session)
- In-tool Problem Set editor/authoring
- Spaced repetition / adaptive question selection algorithms
- Vega-Lite / interactive chart rendering
- User accounts / cloud sync / shared sessions
- Collaborative features
- Mobile-native app (web-only for v1)
