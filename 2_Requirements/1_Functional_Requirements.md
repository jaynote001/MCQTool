# MCQ Tool — Functional Requirements

> Derived from: `1_Idea/1_Idea_MCQTool.txt` and `1_Idea/2_Expanded_Idea_MCQTool.txt`

---

## FR-1: Problem Set Loading

### FR-1.1: Upload Problem Set
- The system shall allow the learner to upload a Problem Set from their local device.
- The system shall support three upload methods:
  1. **JSON file** — a single `.json` file (no images).
  2. **ZIP archive** — a `.zip` containing a `Problems.json` and an optional `assets/` folder.
  3. **Directory** — a folder selected via the browser's directory picker containing `Problems.json` and an optional `assets/` folder.

### FR-1.2: Problem Set Directory Convention
- The canonical input file consumed by the application shall be named **`Problems.json`**.
- When a zip or directory is uploaded, the system shall locate `Problems.json` at the root of the archive/directory.
- Static assets (images, charts, SVGs) shall reside in an `assets/` folder alongside `Problems.json`.
- Image paths in the JSON shall be interpreted as relative to `Problems.json` (e.g., `assets/chart.svg`).

### FR-1.3: Single-Set File Support
- The system shall accept a JSON file containing a single Problem Set as a root object.

### FR-1.4: Multi-Set File Support
- The system shall accept a JSON file containing multiple Problem Sets as a root array.

### FR-1.5: Format Auto-Detection
- The system shall automatically detect whether the uploaded file is a single-set (object) or multi-set (array) format and handle both seamlessly.

### FR-1.6: Problem Set Selection
- When a multi-set file is uploaded, the system shall display a list of available Problem Sets.
- Each entry in the list shall show: **Title**, **Concepts Covered**, and **Problem Count**.
- The learner shall select one Problem Set to practice.

### FR-1.7: Problem Set Validation
- The system shall validate that each Problem Set contains the required fields:
  - `ID`, `Title`, `Concepts_Covered`, `Problems[]`
- The system shall validate that each Problem contains:
  - `Problem_ID`, `Concept_Map`, `Problem_Statement`, `Options`, `Answer.Correct_Option`, `Answer.Explanation`
- If `Context_Groups` is present, the system shall validate:
  - Each group has a unique `Group_ID`, a `Title`, and a non-empty `Content` array.
  - Every `Problem.Context_Group` value (when not `null`) references a valid `Group_ID`.
- If a `Content` array is present (on a context group or problem), each block shall have a valid `type` (`text`, `markdown`, `latex`, `image`, `code`) and a non-empty `value`.
- For `image` content blocks referencing local files, the system shall verify the file exists when loaded from a zip or directory.
- The system shall display a clear error message if validation fails.

---

## FR-2: Practice Modes

### FR-2.1: Straight Mode
- The system shall present problems in their authored order (as sequenced in the JSON file), single pass.

### FR-2.2: Jumbled Mode
- The system shall present problems in a randomized order, single pass.
- If chunking is active, the full set shall be shuffled first, then chunks carved from the shuffled order.
- **Context Group–aware shuffling**: Problems that share a `Context_Group` shall stay together as a contiguous block. The system shall shuffle the groups (and standalone problems) while preserving in-group problem order.

### FR-2.3: Corrective Mode
- The system shall require the learner to upload **both** a Problem Set JSON **and** a previous Attempt JSON file.
- The system shall read the Attempt file and filter problems to include only those that were **NOT** "Correct + Sure" in the previous attempt.
- Included categories:
  - Correct + Semi-Sure
  - Correct + Doubtful
  - Correct + Guess
  - Incorrect + Sure
  - Incorrect + Semi-Sure
  - Incorrect + Doubtful
  - Incorrect + Guess
- Excluded: Correct + Sure (solid grip).

### FR-2.4: Corrective Mode Flow
- Filtered problems shall be presented one at a time.
- If the learner answers correctly → the problem is cleared from the queue.
- If the learner answers incorrectly → the correct option and reasoning are displayed immediately, and the problem stays in the queue.
- The session shall keep running until all problems are answered correctly.
- The learner shall have the option to exit the Corrective session early at any point.

### FR-2.5: Mode Selection
- The system shall present a mode selection screen with three options: **Straight**, **Jumbled**, **Corrective**.
- Selecting Corrective shall trigger an additional file upload prompt for the previous Attempt JSON.

---

## FR-3: Practice Session — Phase 1: Setup

### FR-3.1: Session Configuration
- After file upload and Problem Set selection, the system shall present session configuration options.

### FR-3.2: Chunk Size Selection (Straight / Jumbled Only)
- The system shall allow the learner to select a chunk size:
  - **All** — entire Problem Set in one go
  - **5** — 5 questions per chunk
  - **10** — 10 questions per chunk
- Chunking shall not apply to Corrective mode.

### FR-3.3: Chunk Division
- In Straight mode: problems shall be divided into sequential chunks in authored order.
- In Jumbled mode: problems shall be shuffled first, then divided into sequential chunks from the shuffled order.
- Example: 20 problems with chunk size 5 → Chunk 1 (1–5), Chunk 2 (6–10), Chunk 3 (11–15), Chunk 4 (16–20).

---

## FR-4: Practice Session — Phase 2: Attempt

### FR-4.1: Problem Display
- For each problem, the system shall display:
  - **Context Group content** (if the problem has a `Context_Group`): Rendered once above the first problem in the group and kept visible (or collapsible) for subsequent problems in the same group.
  - **Problem-level content** (if the problem has a `Content` array): Rendered immediately above the problem statement.
  - The **Problem Statement** text, with Markdown and inline LaTeX rendered.
  - All **Options** (A, B, C, D) with radio buttons for selection, with Markdown and inline LaTeX rendered in option text.

### FR-4.2: Option Selection
- The learner shall select exactly one option per problem via radio button.
- Selection shall be changeable before submission.

### FR-4.3: Confidence Level Selection
- For each problem, the learner shall select a Confidence Level from:
  - **S** — Sure
  - **SS** — Semi-Sure
  - **D** — Doubtful
  - **G** — Guess
- Confidence selection shall be mandatory before moving to the next problem.

### FR-4.4: Navigation
- The system shall provide a "Next" control to move to the next problem.
- After the last problem in a chunk, the system shall provide a "Submit" control.

### FR-4.5: Progress Indicator
- The system shall display progress within the current chunk (e.g. "Question 3 of 10").

### FR-4.6: Per-Problem Time Tracking
- The system shall automatically track time spent on each problem in seconds.
- The timer shall start when the problem is displayed and stop when the learner navigates to the next problem or submits the chunk.

### FR-4.7: Total Session Time
- The system shall compute the total time spent as the sum of all per-problem times.
- Both per-problem time (`time_seconds`) and total time (`Total_Time_Spent_Seconds`, `Total_Time_Spent_Minutes`) shall be stored in the Attempt Record.

---

## FR-5: Practice Session — Phase 3: Post-Attempt

### FR-5.1: Phase 3 Sequence
- After chunk submission, the system shall execute three steps in sequence:
  1. Display Analysis Statistics (FR-7)
  2. Run Review Session (FR-6.1)
  3. Run Reinforcement Session (FR-6.2)

### FR-5.2: Chunk Continuation
- After completing all three steps, if more chunks remain, the system shall prompt:
  - **"Continue to next chunk"** — begins Phase 2 with the next chunk.
  - **"Stop here"** — ends the session and proceeds to Export (FR-8).

---

## FR-6: Feedback & Reinforcement

### FR-6.1: Review Session (Passive)
- After each chunk submission, the system shall display problems in the following priority order along with the correct option and reasoning:

| Priority | Category |
|----------|----------|
| 1 | Correct + Semi-Sure |
| 2 | Correct + Doubtful |
| 3 | Incorrect + Sure |
| 4 | Incorrect + Doubtful |
| 5 | Correct + Guess |
| 6 | Incorrect + Guess |

- Problems categorized as **Correct + Sure** shall be **skipped** (no review needed).

### FR-6.2: Review Session — Problem Display
- For each reviewed problem, the system shall display:
  - Context Group content (if applicable) — collapsible
  - Problem-level content (if applicable)
  - Problem Statement (with Markdown/LaTeX rendered)
  - All Options (with Markdown/LaTeX rendered; learner's selected option highlighted)
  - Correct Option (highlighted distinctly from the learner's selection)
  - Full Explanation/Reasoning from the Problem Set (with Markdown/LaTeX rendered)
  - The learner's Confidence Tag for that problem

### FR-6.3: Review Session — Navigation
- The system shall provide "Next" / "Previous" navigation between reviewed problems.
- Problems shall be grouped by category with visible category headers.

### FR-6.4: Reinforcement Session (Active)
- After the Review Session, the system shall present the same problems for re-attempt.
- All problems from FR-6.1 (everything except Correct + Sure) shall be queued.
- Problems shall be presented one at a time.

### FR-6.5: Reinforcement Session — Correct Answer Handling
- If the learner answers correctly → the problem is cleared from the queue.

### FR-6.6: Reinforcement Session — Incorrect Answer Handling
- If the learner answers incorrectly → the correct option and reasoning are displayed immediately, and the problem remains in the queue for another attempt.

### FR-6.7: Reinforcement Session — Completion
- The session shall continue looping through remaining problems until all are answered correctly (queue is empty).

### FR-6.8: Reinforcement Session — Early Exit
- The learner shall have the option to exit the Reinforcement Session early at any point.

### FR-6.9: Reinforcement Session — Statistics Isolation
- **Responses in the Reinforcement Session shall NOT affect the Analysis Statistics.**
- Analysis Statistics shall reflect only the original attempt from Phase 2.
- The Reinforcement Session is purely a learning exercise, not a scoring one.

---

## FR-7: Analysis Statistics

### FR-7.1: Session Statistics — Core Metrics
- After each chunk submission, the system shall compute and display:

| # | Metric | Formula |
|---|--------|---------|
| 1 | Attempted Questions | Count of problems where an option was selected |
| 2 | Total Accuracy (%) | Correct / Attempted × 100 |
| 3 | Accuracy across Sure (%) | Correct among Sure / Total Sure × 100 |
| 4 | Accuracy across Semi-Sure (%) | Correct among Semi-Sure / Total Semi-Sure × 100 |
| 5 | Accuracy across Doubtful (%) | Correct among Doubtful / Total Doubtful × 100 |
| 6 | Sure % in Correct Questions | Sure-and-Correct / Total Correct × 100 |
| 7 | Semi-Sure % in Correct Questions | Semi-Sure-and-Correct / Total Correct × 100 |
| 8 | Total Time Spent (seconds) | Sum of per-problem `time_seconds` |
| 9 | Total Time Spent (minutes) | Total seconds / 60 |

### FR-7.2: Confidence-Wise Accuracy Breakdown
- For each confidence level (Sure, Semi-Sure, Doubtful, Guess), the system shall display:
  - Total count of problems at that confidence level
  - Correct count
  - Incorrect count
  - Accuracy percentage
- If no problems exist at a confidence level, accuracy shall display as null/N/A.

### FR-7.3: Confidence Distribution in Correct Answers
- The system shall display the percentage of each confidence level among correct answers:
  - Sure % in Correct
  - Semi-Sure % in Correct
  - Doubtful % in Correct
  - Guess % in Correct

### FR-7.4: Accuracy–Confidence Matrix
- The system shall display a visual 4×2 matrix mapping Confidence (rows) × Correctness (columns):

|  | Correct | Incorrect |
|--|---------|-----------|
| **Sure** | Solid Grip | Blind Spot !! |
| **Semi-Sure** | Nearly There | Near-Miss |
| **Doubtful** | Underconfident | Expected Gap |
| **Guess** | Lucky | Expected Gap |

- Each cell shall display the count and percentage of problems in that category.

### FR-7.5: Concept-Wise Breakdown
- The system shall group statistics by `Concept_Map` and display per-concept:
  - Total problems
  - Correct count
  - Accuracy percentage

### FR-7.6: Feedback Review Order
- The system shall generate an ordered list of review categories with the Problem IDs falling into each, as stored in `Analysis_Report.Feedback_Review_Order`.

---

## FR-8: Export

### FR-8.1: Download Attempt Record
- The system shall allow the learner to download the completed session as a JSON file.
- The exported file shall follow the format specified in `Sample_Problem_Set_Attempted.json`.

### FR-8.2: Attempt Record Contents
- The exported JSON shall contain:
  - `Problem_Set_ID` — links back to the Problem Set
  - `ID` — unique session identifier (timestamp or UUID)
  - `Attempt_Date` — date of the session
  - `Attempt[]` — per-problem responses:
    - `Problem_ID`
    - `Response.Selected_Option`
    - `Response.Confidence_Level`
    - `time_seconds` — time spent on this problem
  - `Analysis_Report` — full statistics (including `Total_Time_Spent_Seconds` and `Total_Time_Spent_Minutes`) and feedback review order as defined in FR-7

### FR-8.3: File Naming
- Suggested download filename: `{SetID}_{Date}_{Time}_Attempted.json`
- Example: `DV001_20240612_143022_Attempted.json`

---

## FR-9: Longitudinal Analysis

### FR-9.1: Upload Multiple Attempt Files
- The system shall allow the learner to upload multiple Attempt JSON files for the same Problem Set.

### FR-9.2: Cross-Attempt Trend Metrics
- The system shall compute and display the following trends across uploaded attempts:

| Metric | What It Shows |
|--------|---------------|
| Total Accuracy trend | "Am I learning the content?" |
| Accuracy in Sure trend | "Am I reducing my blind spots?" |
| Sure % in Correct trend | "Is more of my knowledge genuine?" |
| Blind Spot count trend | "Are my dangerous gaps shrinking?" |
| Concept-wise accuracy over time | "Which concepts are improving?" |
| Confidence distribution shift | "Am I moving from Guess → Sure?" |

### FR-9.3: Corrective Mode Integration
- The system shall support using Corrective mode (FR-2.3) with any previously exported Attempt JSON file.
- This enables the cycle: Practice → Export → Correct → Export → Compare.

---

## FR-10: Rich Content Rendering

### FR-10.1: Content Block Rendering
- The system shall render `Content` block arrays wherever they appear (Context Groups, Problem-level `Content`).
- Each block shall be rendered according to its `type`:

| Type | Rendering |
|------|-----------|
| `text` | Plain text (HTML-escaped) |
| `markdown` | Markdown → HTML; inline LaTeX `$...$` rendered via KaTeX |
| `latex` | Display-mode LaTeX `$$...$$` rendered via KaTeX |
| `image` | `<img>` element. `value` resolved relative to `Problems.json`. `alt` used for accessibility. |
| `code` | Syntax-highlighted code block. Optional `language` key for highlighting. |

### FR-10.2: Inline Markdown & LaTeX in Text Fields
- `Problem_Statement`, `Options` values, and `Answer.Explanation` shall be treated as Markdown with inline LaTeX support.
- Inline LaTeX is denoted by `$...$`; display LaTeX by `$$...$$`.

### FR-10.3: Image Resolution
- Image `value` paths shall be resolved relative to the `Problems.json` file location.
- For zip uploads: images are extracted from the archive and referenced by their archive-relative path.
- For directory uploads: images are read via the File System Access API from the selected directory.
- For base64 data URIs (`data:image/...`): rendered directly without path resolution.

### FR-10.4: Context Group Display
- When a problem references a `Context_Group`, the system shall render the group's `Content` blocks above the problem.
- The context block shall be shown in full above the **first** problem in the group.
- For subsequent problems in the same group, the context block shall remain visible but be **collapsible** (expanded by default).

### FR-10.5: Problem-Level Content
- If a problem has its own `Content` array (independent of any context group), it shall be rendered between the context group content (if any) and the problem statement.
