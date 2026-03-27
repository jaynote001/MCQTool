# MCQ Tool — Data Model Requirements

> Derived from: `1_Idea/Sample_Problem_Set.json`, `1_Idea/Sample_Problem_Sets.json`, `1_Idea/Sample_Problem_Set_Attempted.json`

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
| `Problems` | Problem[] | Yes | Ordered list of problems |

### DM-1.2: Problem Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `Problem_ID` | Integer | Yes | Unique within the set |
| `Concept_Map` | String | Yes | Which concept this tests (must be in `Concepts_Covered`) |
| `Problem_Statement` | String | Yes | The question text |
| `Options` | Object | Yes | Key-value pairs: `{"A": "...", "B": "...", "C": "...", "D": "..."}` |
| `Answer.Correct_Option` | String | Yes | The correct option letter (e.g. "C") |
| `Answer.Explanation` | String | Yes | Why correct is right and why others are wrong |

### DM-1.3: File Format — Single Set
```json
{
    "ID": "...",
    "Title": "...",
    "Problems": [...]
}
```
Root is a single JSON object.

### DM-1.4: File Format — Multi Set
```json
[
    { "ID": "...", "Title": "...", "Problems": [...] },
    { "ID": "...", "Title": "...", "Problems": [...] }
]
```
Root is a JSON array of Problem Set objects.

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
Problem Set (1) ──────── (*) Problem
     │                         │
     │ ID                      │ Problem_ID
     │                         │
Attempt Record (*) ──── (1) Problem Set
     │
     │
     └──── (*) Response ──── (1) Problem
     │
     └──── (1) Analysis Report
                 │
                 ├── Session Statistics
                 └── Feedback Review Order[]
```

- One Problem Set has many Problems.
- One Problem Set can have many Attempt Records (one per session).
- One Attempt Record has many Responses (one per problem attempted).
- One Attempt Record has exactly one Analysis Report.
- `Attempt Record.Problem_Set_ID` must match a valid `Problem Set.ID`.
- `Response.Problem_ID` must match a valid `Problem.Problem_ID` in the referenced set.
