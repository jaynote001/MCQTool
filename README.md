# MCQ Practice Tool

A browser-based, offline-first MCQ practice tool with **metacognitive confidence tracking**, **rich content rendering**, and **analytics** — built entirely client-side with vanilla JavaScript.

No server, no database, no accounts — everything runs in your browser using JSON files.

---

## Index

1. [Features](#1-features)
2. [Ingestion Methods](#2-ingestion-methods)
3. [Problem Set JSON Format](#3-problem-set-json-format)
4. [Context Groups & Rich Content](#4-context-groups--rich-content)
5. [Run Locally](#5-run-locally)
6. [Deploy to GitHub Pages](#6-deploy-to-github-pages)
7. [Project Structure](#7-project-structure)
8. [Documentation](#8-documentation)
   - 8.1 [Idea & Concept](#81-idea--concept)
   - 8.2 [Requirements](#82-requirements)
   - 8.3 [Architecture](#83-architecture)
9. [Application Modules](#9-application-modules)

---

## 1. Features

### Practice Modes
- **Straight** — Authored order, single pass
- **Jumbled** — Randomized order with [Context Group–aware shuffling](#context-groups--rich-content) (grouped problems stay together)
- **Corrective** — Re-practice from a prior attempt; excludes Correct+Sure problems

### Confidence Tracking
- Tag each answer with a confidence level: **Sure (S)** · **Semi-Sure (SS)** · **Doubtful (D)** · **Guess (G)**
- Confidence data feeds into the analytics matrix and priority-ordered review

### Analytics Dashboard
- **9 core metrics** including accuracy, confidence-wise breakdown, and "Sure % in Correct"
- **Accuracy–Confidence Matrix** (4×2 grid) highlights **Blind Spots** (Incorrect + Sure)
- **Concept-wise breakdown** tracking performance per concept tag

### Review & Reinforcement
- **Priority-Ordered Review** — Problems sorted by learning priority (blind spots first, Correct+Sure skipped)
- **Active Reinforcement Loop** — Re-attempt missed problems until all correct (does not affect session stats)

### Session Management
- **Chunked Practice** — Split large sets into chunks of 5 or 10
- **Optional Session Timer** — Set a countdown timer at setup; session auto-stops when time expires, leaving remaining questions unattempted
- **Per-problem time tracking** — Each problem's response time is recorded

### Rich Content
- **Markdown + LaTeX** in problem statements, options, and explanations (via [Marked](https://github.com/markedjs/marked) + [KaTeX](https://katex.org/))
- **Context Groups** — Shared rich content blocks (text, markdown, LaTeX, images, code) displayed across related problems
- **Content Blocks** — Problem-level rich content arrays with 5 types: `text`, `markdown`, `latex`, `image`, `code`
- **Image assets** — Embedded via ZIP/directory upload with Blob URL resolution

### Data & Export
- **Export** — Download attempt records as JSON for archival
- **Longitudinal Analysis** — Upload multiple attempt files to view performance trends over time
- **SessionStorage persistence** — Loaded problem sets and completed attempts survive page reloads

[↑ Back to Index](#index)

---

## 2. Ingestion Methods

The tool supports three ways to load problem sets:

| Method | Format | How | Use Case |
|--------|--------|-----|----------|
| **JSON File** | `.json` | Click "Upload JSON" button or drag & drop | Plain text problems, no images |
| **ZIP Archive** | `.zip` | Click "Upload ZIP" button or drag & drop | Problems + image assets bundled together |
| **Directory** | Folder | Click "Upload Folder" button (File System Access API) | Local development with `Problems.json` + `assets/` folder |

### JSON File Upload
Upload a single Problem Set object or a JSON array of multiple sets. The tool auto-detects the format:
- **Single set** → `{ "ID": "...", "Problems": [...] }`
- **Multi-set array** → `[ { "ID": "...", ... }, { "ID": "...", ... } ]`

### ZIP Archive Upload
Bundle a `Problems.json` file with image assets in a ZIP:
```
MyProblemSet.zip
├── Problems.json
└── assets/
    ├── diagram.svg
    └── chart.png
```
The tool extracts the JSON and creates Blob URLs for images, which are resolved when rendering `image` content blocks.

### Directory Upload
Using the browser's File System Access API (Chrome/Edge), select a folder containing:
```
MyProblemSet/
├── Problems.json
└── assets/
    ├── diagram.svg
    └── chart.png
```
Falls back gracefully on browsers that don't support the Directory Picker API.

### Drag & Drop
A dedicated drop zone accepts both `.json` and `.zip` files — the tool detects the file type and routes to the appropriate handler.

### Accumulation
Uploading new problem sets **merges** them with previously loaded sets (matched by `ID`). Re-uploading the same set updates it. Use "Refresh Memory — Clear All Data" to start fresh.

[↑ Back to Index](#index)

---

## 3. Problem Set JSON Format

```json
{
    "ID": "DV001",
    "Title": "Data Visualization",
    "Source": "ChatGPT",
    "Concepts_Covered": ["Histograms", "KDE"],
    "Number_of_Problems": 4,
    "Context_Groups": [
        {
            "Group_ID": "CG1",
            "Title": "Employee salary dataset",
            "Content": [
                { "type": "markdown", "value": "A company has a DataFrame `df` with **10,000 employee records**." },
                { "type": "code", "value": "df.head()", "language": "python" }
            ]
        }
    ],
    "Problems": [
        {
            "Problem_ID": 1,
            "Context_Group": "CG1",
            "Concept_Map": "Histograms",
            "Problem_Statement": "Best plot to see the shape of the `salary` column?",
            "Content": [
                { "type": "markdown", "value": "Consider peaks, spread, and skew." }
            ],
            "Options": { "A": "Scatterplot", "B": "Countplot", "C": "Histogram", "D": "Lineplot" },
            "Answer": {
                "Correct_Option": "C",
                "Explanation": "Histograms show the distribution shape of a single continuous variable."
            }
        }
    ]
}
```

Key fields:
- **`Context_Groups`** *(optional)* — Array of shared content blocks referenced by problems via `Context_Group`
- **`Content`** *(optional, on Context Groups and Problems)* — Array of typed content blocks (`text`, `markdown`, `latex`, `image`, `code`)
- **`Context_Group`** *(optional, on Problems)* — Reference to a `Group_ID`; `null` for standalone problems
- **`Concept_Map`** — Tag for concept-wise analytics breakdown

[↑ Back to Index](#index)

---

## 4. Context Groups & Rich Content

**Context Groups** let you share rich content (paragraphs, code snippets, images, LaTeX) across a chain of related problems. During practice:

- **First problem** in a group shows the context fully expanded
- **Subsequent problems** show it in a collapsible `<details>` block, open by default
- In **Jumbled mode**, grouped problems stay contiguous — groups themselves are shuffled

**Content Block types:**

| Type | Description | Extra Fields |
|------|-------------|--------------|
| `text` | Plain text | — |
| `markdown` | Markdown with inline LaTeX (`$...$`, `$$...$$`) | — |
| `latex` | Display-mode LaTeX equation | — |
| `image` | Image file path (resolved from ZIP/directory assets) | `alt` |
| `code` | Fenced code block | `language` |

[↑ Back to Index](#index)

---

## 5. Run Locally

1. **Clone the repository**
   ```bash
   git clone https://github.com/<your-username>/MCQTool.git
   cd MCQTool
   ```

2. **Start a local server** (ES modules require HTTP, not `file://`)
   ```bash
   cd app
   python3 -m http.server 8080
   ```
   Or with Node.js:
   ```bash
   npx serve app
   ```
   Or with livereload (auto-refreshes on file changes):
   ```bash
   pip install livereload
   livereload app -p 8080
   ```

3. **Open in browser**
   ```
   http://localhost:8080
   ```

4. **Upload a Problem Set** — use the samples in [`1_Idea/Sample_Problem_Set/`](1_Idea/Sample_Problem_Set/):
   - [`Problems.json`](1_Idea/Sample_Problem_Set/Problems.json) — Problem set with Context Groups and rich content (for ZIP/directory upload)
   - [`Sample_Problem_Set.json`](1_Idea/Sample_Problem_Set/Sample_Problem_Set.json) — Standalone JSON (for JSON upload)
   - [`Sample_Problem_Set_Attempted.json`](1_Idea/Sample_Problem_Set/Sample_Problem_Set_Attempted.json) — Attempted record (for Corrective mode or Longitudinal Analysis)

[↑ Back to Index](#index)

---

## 6. Deploy to GitHub Pages

1. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/<your-username>/MCQTool.git
   git push -u origin main
   ```

2. **Configure GitHub Pages**
   - Go to your repo on GitHub → **Settings** → **Pages**
   - Under **Source**, select **GitHub Actions**

3. **Create the workflow file** at `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: [main]

   permissions:
     contents: read
     pages: write
     id-token: write

   jobs:
     deploy:
       runs-on: ubuntu-latest
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       steps:
         - uses: actions/checkout@v4
         - uses: actions/configure-pages@v5
         - uses: actions/upload-pages-artifact@v3
           with:
             path: app
         - id: deployment
           uses: actions/deploy-pages@v4
   ```

4. **Push the workflow**
   ```bash
   git add .github/workflows/deploy.yml
   git commit -m "Add GitHub Pages deploy workflow"
   git push
   ```

5. **Access your site** at `https://<your-username>.github.io/MCQTool/`

[↑ Back to Index](#index)

---

## 7. Project Structure

```
MCQTool/
├── README.md
├── 1_Idea/                          # Concept & design documents
│   ├── 1_Idea_MCQTool.txt           # Core concept & workflow
│   ├── 2_Expanded_Idea_MCQTool.txt  # Detailed feature specifications
│   ├── 3_Context_Groups_Rich_Content.md  # Context Groups & Rich Content design
│   └── Sample_Problem_Set/          # Sample files for testing
│       ├── Problems.json            # Problem set with Context Groups
│       ├── Sample_Problem_Set.json  # Standalone JSON format
│       ├── Sample_Problem_Set_Attempted.json
│       └── assets/                  # Image assets (SVG)
├── 2_Requirements/                  # Specifications
│   ├── 1_Functional_Requirements.md
│   ├── 2_Data_Model_Requirements.md
│   ├── 3_UI_Screen_Requirements.md
│   └── 4_Non_Functional_Requirements.md
├── 3_Architecture/                  # Architecture & diagrams
│   ├── 1_System_Architecture.md
│   ├── 2_User_Flow_Diagrams.md
│   ├── 3_Data_Model_ER_Diagram.md
│   └── 4_Component_Architecture.md
└── app/                             # Application code
    ├── index.html                   # SPA shell + CDN dependencies
    ├── css/styles.css               # All styles
    └── js/
        ├── app.js                   # Main app — screens, state, navigation
        ├── analysisEngine.js        # Statistics, matrix, review ordering
        ├── fileParser.js            # JSON parsing & validation
        ├── richContentRenderer.js   # Markdown, LaTeX, Content Block rendering
        ├── assetLoader.js           # Blob URL management for ZIP/directory images
        ├── sampleData.js            # Embedded sample JSON for quick access
        └── utils.js                 # Shuffle, file I/O, formatting utilities
```

[↑ Back to Index](#index)

---

## 8. Documentation

### 8.1 Idea & Concept

| Document | Description |
|----------|-------------|
| [1_Idea_MCQTool.txt](1_Idea/1_Idea_MCQTool.txt) | Core concept — problem set structure, 3 practice modes, confidence tagging, 3-phase session workflow, 7 core metrics, export & longitudinal analysis |
| [2_Expanded_Idea_MCQTool.txt](1_Idea/2_Expanded_Idea_MCQTool.txt) | Detailed specifications — rich content blocks, context groups, accuracy-confidence matrix, corrective mode as longitudinal learning tool |
| [3_Context_Groups_Rich_Content.md](1_Idea/3_Context_Groups_Rich_Content.md) | Design document for Context Groups & Rich Content feature — content block types, rendering strategy, shuffling rules, sample data with SVGs |

### 8.2 Requirements

| Document | Covers |
|----------|--------|
| [1_Functional_Requirements.md](2_Requirements/1_Functional_Requirements.md) | FR-1 to FR-10 — loading (3 upload methods), practice modes (context-group-aware shuffling), session phases, review/reinforcement, analysis stats, rich content rendering |
| [2_Data_Model_Requirements.md](2_Requirements/2_Data_Model_Requirements.md) | DM-0 to DM-5 — directory convention, Problem Set schema (with Context_Groups), Attempt Record, Analysis Report, Content Block object, entity relationships |
| [3_UI_Screen_Requirements.md](2_Requirements/3_UI_Screen_Requirements.md) | UI-1 to UI-10 — 9 screens with layouts, context group collapsing, markdown+LaTeX rendering, matrix UI, review categories, longitudinal trends |
| [4_Non_Functional_Requirements.md](2_Requirements/4_Non_Functional_Requirements.md) | NFR-1 to NFR-6 — offline-first, no server, client-side only, KaTeX/Marked/JSZip dependencies, browser support, v1 scope boundaries |

### 8.3 Architecture

| Document | Covers |
|----------|--------|
| [1_System_Architecture.md](3_Architecture/1_System_Architecture.md) | Three-layer SPA design (UI → Application Logic → Data), 9 component interaction flows, technology constraints |
| [2_User_Flow_Diagrams.md](3_Architecture/2_User_Flow_Diagrams.md) | Screen-by-screen navigation flows, phase-level sequences, corrective/reinforcement loops, chunk transitions |
| [3_Data_Model_ER_Diagram.md](3_Architecture/3_Data_Model_ER_Diagram.md) | Entity Relationship diagram (mermaid), entity descriptions, data lifecycle (input → in-memory → output → longitudinal) |
| [4_Component_Architecture.md](3_Architecture/4_Component_Architecture.md) | 11 core modules + interfaces, dependency matrix, state machine (Empty → Exported), critical design rules |

[↑ Back to Index](#index)

---

## 9. Application Modules

| Module | File | Responsibility |
|--------|------|---------------|
| **Main App** | [app.js](app/js/app.js) | SPA shell — screen rendering, state management, navigation, all user interactions |
| **Analysis Engine** | [analysisEngine.js](app/js/analysisEngine.js) | Computes session statistics, accuracy-confidence matrix, concept breakdown, review ordering, longitudinal trends |
| **File Parser** | [fileParser.js](app/js/fileParser.js) | Validates Problem Set JSON (including Context_Groups and Content blocks), Attempt files, corrective filtering |
| **Rich Content Renderer** | [richContentRenderer.js](app/js/richContentRenderer.js) | Renders Content block arrays, inline Markdown+LaTeX, Context Group blocks (expanded/collapsible) |
| **Asset Loader** | [assetLoader.js](app/js/assetLoader.js) | Manages Blob URLs for images from ZIP/directory uploads; resolves image paths in Content blocks |
| **Sample Data** | [sampleData.js](app/js/sampleData.js) | Embedded sample Problem Set (with Context Groups), sample Attempt record for quick testing |
| **Utilities** | [utils.js](app/js/utils.js) | Fisher-Yates shuffle, Context Group–aware shuffle, file I/O helpers, formatting (percent, time, date, HTML escaping) |

### External Dependencies (loaded via CDN)

| Library | Version | Purpose |
|---------|---------|---------|
| [KaTeX](https://katex.org/) | 0.16.11 | LaTeX math rendering |
| [Marked](https://github.com/markedjs/marked) | 14.0.0 | Markdown parsing |
| [JSZip](https://stuk.github.io/jszip/) | 3.10.1 | ZIP file extraction |

[↑ Back to Index](#index)
