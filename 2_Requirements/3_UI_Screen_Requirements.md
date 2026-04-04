# MCQ Tool — UI / Screen Requirements

> Derived from: `1_Idea/1_Idea_MCQTool.txt` and `1_Idea/2_Expanded_Idea_MCQTool.txt`

---

## UI-1: Screen Inventory

The application consists of the following screens, visited in sequence:

| # | Screen | Purpose | Ref |
|---|--------|---------|-----|
| S1 | Upload & Select | Upload Problem Set file, select a set | FR-1 |
| S2 | Session Setup | Choose mode, chunk size; upload Attempt file for Corrective | FR-2, FR-3 |
| S3 | Practice | Answer problems with confidence tags | FR-4 |
| S4 | Analysis Dashboard | View session statistics and matrix | FR-7 |
| S5 | Review | Passive feedback in priority order | FR-6.1 |
| S6 | Reinforcement | Active re-attempt until all correct | FR-6.2 |
| S7 | Chunk Transition | Continue next chunk or stop | FR-5.2 |
| S8 | Export | Download Attempt Record JSON | FR-8 |
| S9 | Longitudinal Analysis | Upload multiple attempts, view trends | FR-9 |

---

## UI-2: S1 — Upload & Select Screen

### UI-2.1: File / Directory Upload
- The upload area shall accept three input methods:
  1. **JSON file** — standard file picker accepting `.json` files.
  2. **ZIP archive** — file picker accepting `.zip` files.
  3. **Directory** — a “Select Folder” button using the browser’s directory picker (File System Access API / `<input webkitdirectory>`).
- The system shall auto-detect the upload type and locate `Problems.json` accordingly.
- On upload, the system validates the file structure (FR-1.7).
- On validation failure, display an error message describing what is wrong.

### UI-2.2: Problem Set List (Multi-Set Files)
- If the file contains multiple sets, display a selectable list.
- Each list item shows:
  - **Title**
  - **Concepts Covered** (comma-separated or tags)
  - **Number of Problems**
- Learner clicks/taps a set to select it and proceed.

### UI-2.3: Single-Set Auto-Proceed
- If the file contains a single set, skip the selection list and proceed directly to Setup (S2).

---

## UI-3: S2 — Session Setup Screen

### UI-3.1: Mode Selector
- Three clearly labelled options: **Straight**, **Jumbled**, **Corrective**.
- Default: Straight.

### UI-3.2: Corrective Mode — Attempt File Upload
- When Corrective is selected, an additional file upload control appears.
- Label: "Upload Previous Attempt JSON".
- The system validates that `Problem_Set_ID` in the Attempt file matches the selected Problem Set's `ID`.

### UI-3.3: Chunk Size Selector (Straight / Jumbled Only)
- Options: **All**, **5**, **10**.
- Default: All.
- Hidden when Corrective mode is selected.

### UI-3.4: Start Button
- A "Start Practice" button that begins the session.
- Disabled until all required inputs are provided.

---

## UI-4: S3 — Practice Screen

### UI-4.1: Problem Display
- **Context Group block** (if the problem has a `Context_Group`):
  - Rendered above the problem in a distinct card/section.
  - Shown in full for the first problem in the group.
  - Collapsible (expanded by default) for subsequent problems in the same group.
- **Problem-level content** (if the problem has a `Content` array):
  - Rendered between the context block and the problem statement.
- **Problem Statement** displayed prominently, with Markdown and inline LaTeX rendered.
- **Options** listed vertically with radio buttons (A, B, C, D).
  - Option text supports Markdown and inline LaTeX.
  - Only one option selectable at a time.
- **Images** from `assets/` rendered inline at their natural size with alt text.

### UI-4.2: Confidence Selector
- Four clearly labelled buttons or radio group:
  - **S** — Sure
  - **SS** — Semi-Sure
  - **D** — Doubtful
  - **G** — Guess
- Must be selected before proceeding.

### UI-4.3: Navigation Controls
- **Next** button: proceeds to the next problem.
  - Disabled until both option and confidence are selected.
- On the last problem of a chunk: button label changes to **Submit**.

### UI-4.4: Progress Bar
- Shows current position within the chunk: "Question X of Y".

### UI-4.5: Corrective Mode Variant
- On incorrect answer: immediately display the correct option and explanation inline before moving to the next problem / re-queuing.

---

## UI-5: S4 — Analysis Dashboard Screen

### UI-5.1: Summary Statistics
- Display all 7 core metrics (FR-7.1) in a clear layout:
  1. Attempted Questions
  2. Total Accuracy %
  3. Accuracy across Sure %
  4. Accuracy across Semi-Sure %
  5. Accuracy across Doubtful %
  6. Sure % in Correct Questions
  7. Semi-Sure % in Correct Questions

### UI-5.2: Confidence-Wise Accuracy Table
- A table with rows for each confidence level (Sure, Semi-Sure, Doubtful, Guess).
- Columns: Total, Correct, Incorrect, Accuracy %.

### UI-5.3: Accuracy–Confidence Matrix
- A visual 4×2 grid (Confidence × Correctness).
- Each cell shows count, percentage, and a category label (e.g. "Blind Spot", "Solid Grip").
- Blind Spot cells (Incorrect + Sure) shall be visually highlighted as high-alert.

### UI-5.4: Concept-Wise Breakdown
- A table grouped by concept: Concept Name, Total Problems, Correct, Accuracy %.

### UI-5.5: Proceed Button
- "Continue to Review" button that navigates to S5.

---

## UI-6: S5 — Review Screen

### UI-6.1: Category Headers
- Problems grouped under visible category headings in priority order:
  1. Correct + Semi-Sure
  2. Correct + Doubtful
  3. Incorrect + Sure
  4. Incorrect + Doubtful
  5. Correct + Guess
  6. Incorrect + Guess

### UI-6.2: Problem Review Card
- For each problem, display:
  - Context Group content (if applicable) — collapsible
  - Problem-level content (if applicable)
  - Problem Statement (Markdown/LaTeX rendered)
  - All Options (Markdown/LaTeX rendered):
    - Learner's selected option highlighted (e.g. blue background)
    - Correct option highlighted (e.g. green background)
    - If learner was wrong, their selection additionally marked (e.g. red)
  - Full Explanation text (Markdown/LaTeX rendered)
  - Confidence tag badge (S / SS / D / G)

### UI-6.3: Navigation
- **Previous** / **Next** buttons to move between problems.
- Category headers visible as the learner scrolls or navigates.

### UI-6.4: Proceed Button
- "Continue to Reinforcement" button at the end that navigates to S6.

---

## UI-7: S6 — Reinforcement Screen

### UI-7.1: Problem Display
- Same layout as Practice Screen (UI-4.1) but for re-attempt.
- Only option selection required — no confidence tag selection in this mode.

### UI-7.2: Correct Answer — Clear
- On correct answer: show a brief "Correct!" confirmation, then automatically proceed to the next queued problem.

### UI-7.3: Incorrect Answer — Show Reasoning
- On incorrect answer: display the correct option and full explanation inline.
- A "Continue" button to proceed (problem remains in queue).

### UI-7.4: Progress
- Display: "Remaining: X problems" showing how many are left in the queue.

### UI-7.5: Exit Early
- An "Exit Reinforcement" button always visible.
- On click: confirm with the learner, then skip to Chunk Transition (S7) or Export (S8).

### UI-7.6: Completion
- When queue is empty, display "All problems answered correctly!" message.
- Auto-proceed to S7 or S8.

---

## UI-8: S7 — Chunk Transition Screen

### UI-8.1: Chunk Status
- Display: "Chunk X of Y completed."
- Show how many problems remain in the next chunk.

### UI-8.2: Options
- **"Continue to Next Chunk"** — returns to Practice Screen (S3) with next chunk.
- **"Stop & Export"** — proceeds to Export Screen (S8).

---

## UI-9: S8 — Export Screen

### UI-9.1: Session Summary
- Brief summary: Problem Set Title, Date, Total Accuracy, Problems Attempted.

### UI-9.2: Download Button
- "Download Attempt JSON" button.
- Downloads the full Attempt Record file with all responses and Analysis_Report.
- Filename follows convention: `{SetID}_{Date}_{Time}_Attempted.json`.

### UI-9.3: Actions After Export
- **"Start New Session"** — returns to S1.
- **"View Longitudinal Analysis"** — navigates to S9.

---

## UI-10: S9 — Longitudinal Analysis Screen

### UI-10.1: Upload Multiple Attempts
- File upload control accepting multiple `.json` Attempt files.
- The system validates all files reference the same `Problem_Set_ID`.

### UI-10.2: Trend Display
- Display the following trends across uploaded attempts (ordered by `Attempt_Date`):
  - Total Accuracy over time
  - Accuracy in Sure over time
  - Sure % in Correct over time
  - Blind Spot count over time
  - Concept-wise accuracy over time
  - Confidence distribution shift over time

### UI-10.3: Corrective Mode Shortcut
- "Start Corrective Practice" button that pre-loads the most recent Attempt file and navigates to S2 in Corrective mode.
