# MCQ Tool — Data Model Requirements

> Derived from: `1_Idea/Sample_Problem_Set/Problems.json`, `1_Idea/Sample_Problem_Set/Sample_Problem_Set.json`, `1_Idea/Sample_Problem_Set/Sample_Problem_Set_Attempted.json`, `1_Idea/3_Context_Groups_Rich_Content.md`

---

## DM-0: Problem Set Directory Structure

### DM-0.1: Directory Layout

Each problem set is a self-contained directory:

```
<Problem_Set_Name>/
├── assets/          # Static files (images, charts, SVGs)
├── Problems.json    # Canonical file consumed by the application
└── ...              # Optional reference files
```

### DM-0.2: File Conventions

| Item | Convention |
|------|------------|
| Primary data file | `Problems.json` (array of problem set objects) |
| Static assets folder | `assets/` |
| Image path format | Relative to `Problems.json` (e.g., `assets/chart.svg`) |
| Upload formats accepted | `.json` file, `.zip` archive, or directory (folder) |

---

## DM-1: Problem Set Schema

### DM-1.1: Problem Set Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ID` | String | Yes | Unique identifier for the set (e.g. "DV001") |
| `Title` | String | Yes | Human-readable name |
| `Source` | String | No | Author/origin (e.g. "ChatGPT") |
| `Source_Content` | String | No | How the set was created |
| `Concepts_Covered` | String[] | Yes | Master list of concepts tested in this set |
| `Creation_Date` | String (Date) | No | Authoring date (YYYY-MM-DD) |
| `Number_of_Problems` | Integer | No | Count of problems in the set (informational) |
| `Context_Groups` | ContextGroup[] | No | Shared context blocks referenced by problems (see DM-1.3) |
| `Problems` | Problem[] | Yes | Ordered list of problems |

### DM-1.2: Problem Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `Problem_ID` | Integer | Yes | Unique within the set |
| `Context_Group` | String \| null | No | `Group_ID` of the shared context (null = standalone) |
| `Concept_Map` | String | Yes | Which concept this tests (must be in `Concepts_Covered`) |
| `Content` | ContentBlock[] | No | Problem-specific rich content shown above the question |
| `Problem_Statement` | String | Yes | The question text (supports Markdown + inline LaTeX) |
| `Options` | Object | Yes | Key-value pairs: `{"A": "...", ...}` (values support Markdown + inline LaTeX) |
| `Answer.Correct_Option` | String | Yes | The correct option letter (e.g. "C") |
| `Answer.Explanation` | String | Yes | Why correct is right and why others are wrong (supports Markdown + inline LaTeX) |

### DM-1.3: Context Group Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `Group_ID` | String | Yes | Unique within the problem set (e.g. "CG1") |
| `Title` | String | Yes | Human-readable label for the context group |
| `Content` | ContentBlock[] | Yes | Ordered array of rich content blocks |

### DM-1.4: Content Block Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | String | Yes | One of: `text`, `markdown`, `latex`, `image`, `code` |
| `value` | String | Yes | The content payload (see table below) |
| `alt` | String | No | Alt text (for `image` type) |
| `language` | String | No | Programming language (for `code` type) |

#### Content Type Definitions

| Type | `value` contents | Rendering |
|------|------------------|----------|
| `text` | Plain string | Rendered as-is (HTML-escaped) |
| `markdown` | Markdown string | Parsed as Markdown; inline LaTeX `$...$` rendered via KaTeX |
| `latex` | LaTeX string | Rendered as display-mode equation `$$...$$` |
| `image` | File path or data URI | `<img>` tag; paths relative to `Problems.json` |
| `code` | Code string | Syntax-highlighted code block |

### DM-1.5: File Format — Single Set
```json
{
    "ID": "...",
    "Title": "...",
    "Problems": [...]
}
```
Root is a single JSON object.

### DM-1.6: File Format — Multi Set (Problems.json)
```json
[
    { "ID": "...", "Title": "...", "Context_Groups": [...], "Problems": [...] },
    { "ID": "...", "Title": "...", "Problems": [...] }
]
```
Root is a JSON array of Problem Set objects. This is the canonical `Problems.json` format.

---

## DM-2: Attempt Record Schema

### DM-2.1: Attempt Record Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `Problem_Set_ID` | String | Yes | References `Problem Set.ID` |
| `ID` | String | Yes | Unique session identifier (timestamp/UUID) |
| `Attempt_Date` | String (Date) | Yes | Date of the session (YYYY-MM-DD) |
| `Attempt` | Response[] | Yes | Per-problem responses |
| `Analysis_Report` | Object | Yes | Computed analytics (see DM-3) |

### DM-2.2: Response Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `Problem_ID` | Integer | Yes | References `Problem.Problem_ID` |
| `Response.Selected_Option` | String | Yes | Option letter chosen (A/B/C/D) |
| `Response.Confidence_Level` | String | Yes | One of: "Sure", "Semi-Sure", "Doubtful", "Guess" |
| `time_seconds` | Integer | Yes | Time spent on this problem in seconds |

---

## DM-3: Analysis Report Schema

### DM-3.1: Analysis Report Object

| Field | Type | Description |
|-------|------|-------------|
| `Session_Statistics` | Object | Aggregate metrics (see DM-3.2) |
| `Feedback_Review_Order` | Array | Priority-ordered review categories (see DM-3.4) |

### DM-3.2: Session Statistics Object

| Field | Type | Description |
|-------|------|-------------|
| `Total_Questions` | Integer | Total problems in the session |
| `Attempted_Questions` | Integer | Problems where an option was selected |
| `Total_Correct` | Integer | Correct answers count |
| `Total_Incorrect` | Integer | Incorrect answers count |
| `Total_Accuracy_Percent` | Float | Correct / Attempted × 100 |
| `Total_Time_Spent_Seconds` | Integer | Sum of all per-problem `time_seconds` |
| `Total_Time_Spent_Minutes` | Float | `Total_Time_Spent_Seconds` / 60 |
| `Confidence_Wise_Accuracy` | Object | Per-confidence-level breakdown (see DM-3.3) |
| `Confidence_Distribution_In_Correct` | Object | Confidence tag distribution among correct answers |

### DM-3.3: Confidence-Wise Accuracy Object (per level)

Repeated for each: `Sure`, `Semi-Sure`, `Doubtful`, `Guess`

| Field | Type | Description |
|-------|------|-------------|
| `Total` | Integer | Problems at this confidence level |
| `Correct` | Integer | Correct among these |
| `Incorrect` | Integer | Incorrect among these |
| `Accuracy_Percent` | Float \| null | Correct / Total × 100 (null if Total = 0) |

### DM-3.4: Confidence Distribution in Correct

| Field | Type | Description |
|-------|------|-------------|
| `Sure_Percent` | Float | % of correct answers tagged Sure |
| `Semi-Sure_Percent` | Float | % of correct answers tagged Semi-Sure |
| `Doubtful_Percent` | Float | % of correct answers tagged Doubtful |
| `Guess_Percent` | Float | % of correct answers tagged Guess |

### DM-3.5: Feedback Review Order Entry

| Field | Type | Description |
|-------|------|-------------|
| `Priority` | Integer | 1–7 (1 = highest priority for review) |
| `Category` | String | e.g. "Correct-Semi-Sure", "Incorrect-Sure" |
| `Problem_IDs` | Integer[] | List of Problem IDs in this category |

---

## DM-4: Confidence Level Enum

| Value | Abbreviation | Meaning |
|-------|-------------|---------|
| `"Sure"` | S | Learner is confident in their choice |
| `"Semi-Sure"` | SS | Leaning towards the choice but not certain |
| `"Doubtful"` | D | Low confidence, might be wrong |
| `"Guess"` | G | Pure guess, no understanding |

---

## DM-5: Entity Relationships

```
Problem Set (1) ──── (*) Context Group
     │                       │
     │                       │ Group_ID
     │                       │
     │               (*) Content Block
     │
     ├──── (*) Problem ──── (0..1) Context Group
     │         │
     │         └── (*) Content Block (problem-level)
     │
Attempt Record (*) ──── (1) Problem Set
     │
     └──── (*) Response ──── (1) Problem
     │
     └──── (1) Analysis Report
                 │
                 ├── Session Statistics
                 └── Feedback Review Order[]
```

- One Problem Set has many Problems.
- One Problem Set has zero or more Context Groups.
- One Context Group has one or more Content Blocks.
- One Problem may reference zero or one Context Group.
- One Problem may have zero or more problem-level Content Blocks.
- One Problem Set can have many Attempt Records (one per session).
- One Attempt Record has many Responses (one per problem attempted).
- One Attempt Record has exactly one Analysis Report.
- `Attempt Record.Problem_Set_ID` must match a valid `Problem Set.ID`.
- `Response.Problem_ID` must match a valid `Problem.Problem_ID` in the referenced set.
- `Problem.Context_Group` (when not null) must match a valid `Context Group.Group_ID` in the same set.
