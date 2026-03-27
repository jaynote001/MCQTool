# MCQ Tool — Data Model & Entity Relationship Diagram

> Derived from: Data Model Requirements (DM-1 to DM-5), Sample JSON files

---

## 1. Entity Relationship Diagram

```mermaid
erDiagram
    PROBLEM_SET ||--o{ PROBLEM : contains
    PROBLEM_SET {
        string ID
        string Title
        string Source
        string Source_Content
        string[] Concepts_Covered
        string Creation_Date
    }

    PROBLEM {
        string Problem_Number
        string Problem_Statement
        object Options
        string Correct_Option
        string Explanation
        string Concept_Map
    }

    ATTEMPT_RECORD ||--|| PROBLEM_SET : references
    ATTEMPT_RECORD ||--o{ RESPONSE : contains
    ATTEMPT_RECORD ||--|| ANALYSIS_REPORT : produces
    ATTEMPT_RECORD {
        string Problem_Set_ID
        string Practice_Mode
        string Attempt_Date
        int Chunk_Size
    }

    RESPONSE {
        string Problem_Number
        string Selected_Option
        string Confidence
        float time_seconds
    }

    RESPONSE }o--|| PROBLEM : maps_to

    ANALYSIS_REPORT ||--|| SESSION_STATISTICS : contains
    ANALYSIS_REPORT ||--o{ PER_QUESTION_RESULT : contains
    ANALYSIS_REPORT ||--|| FEEDBACK_REVIEW_ORDER : contains

    SESSION_STATISTICS {
        int Total_Problems
        int Total_Correct
        int Total_Incorrect
        float Accuracy_Percentage
        int Sure_Count
        int SemiSure_Count
        int Doubtful_Count
        int Guess_Count
        float Total_Time_Spent_Seconds
        float Total_Time_Spent_Minutes
        object Confidence_Wise_Accuracy
        object Confidence_Distribution_In_Correct
    }

    PER_QUESTION_RESULT {
        string Problem_Number
        string Selected_Option
        string Correct_Option
        string Confidence
        boolean Is_Correct
        float time_seconds
    }

    FEEDBACK_REVIEW_ORDER {
        array Correct_SemiSure
        array Correct_Doubtful
        array Correct_Guess
        array Incorrect_Sure
        array Incorrect_SemiSure
        array Incorrect_Doubtful
        array Incorrect_Guess
    }
```

---

## 2. Entity Descriptions

### 2.1 Problem Set (Input Data)

The core content entity. Loaded from JSON file at session start. Immutable during session.

| Field | Type | Description |
|-------|------|-------------|
| ID | String | Unique identifier (e.g., "DV001") |
| Title | String | Human-readable title |
| Source | String | Origin of the problems |
| Source_Content | String | Chapter/topic/reference |
| Concepts_Covered | String[] | List of concept labels |
| Creation_Date | String | ISO date |
| Problems | Problem[] | Array of Problem entities |

### 2.2 Problem

Individual question within a Problem Set.

| Field | Type | Description |
|-------|------|-------------|
| Problem_Number | String | Unique within the set (e.g., "P1") |
| Problem_Statement | String | Question text |
| Options | Object | Key-value pairs: {"A": "...", "B": "...", ...} |
| Correct_Option | String | Key of the correct option (e.g., "B") |
| Explanation | String | Reasoning for correct answer |
| Concept_Map | String | Concept this problem tests |

### 2.3 Attempt Record (Output Data)

Generated during a practice session. Contains all responses and computed analytics.

| Field | Type | Description |
|-------|------|-------------|
| Problem_Set_ID | String | References the attempted Problem Set |
| Practice_Mode | String | "Straight" / "Jumbled" / "Corrective" |
| Attempt_Date | String | ISO date-time |
| Chunk_Size | Integer | "All" / 5 / 10 |
| Responses | Response[] | Array of per-problem responses |
| Analysis_Report | Object | Computed statistics and feedback |

### 2.4 Response

Per-problem attempt record.

| Field | Type | Description |
|-------|------|-------------|
| Problem_Number | String | References Problem.Problem_Number |
| Selected_Option | String | Learner's chosen option key |
| Confidence | String | One of: "Sure", "SemiSure", "Doubtful", "Guess" |
| time_seconds | Float | Seconds spent on this problem |

### 2.5 Confidence Enum

```
Confidence ∈ { "Sure", "SemiSure", "Doubtful", "Guess" }
```

Abbreviations used in submission: S, SS, D, G.

---

## 3. Analysis Report Structure

### 3.1 Session Statistics

| Metric | Type | Derivation |
|--------|------|-----------|
| Total_Problems | int | Count of responses |
| Total_Correct | int | Count where Selected_Option == Correct_Option |
| Total_Incorrect | int | Total_Problems − Total_Correct |
| Accuracy_Percentage | float | (Total_Correct / Total_Problems) × 100 |
| Sure_Count | int | Count where Confidence == "Sure" |
| SemiSure_Count | int | Count where Confidence == "SemiSure" |
| Doubtful_Count | int | Count where Confidence == "Doubtful" |
| Guess_Count | int | Count where Confidence == "Guess" |
| Total_Time_Spent_Seconds | float | Sum of all time_seconds |
| Total_Time_Spent_Minutes | float | Total_Time_Spent_Seconds / 60 |

### 3.2 Confidence-Wise Accuracy

Accuracy computed per confidence level:

```
Confidence_Wise_Accuracy = {
    "Sure":     { Correct: n, Incorrect: m, Accuracy: % },
    "SemiSure": { Correct: n, Incorrect: m, Accuracy: % },
    "Doubtful": { Correct: n, Incorrect: m, Accuracy: % },
    "Guess":    { Correct: n, Incorrect: m, Accuracy: % }
}
```

### 3.3 Confidence Distribution in Correct Answers

Among all correct answers, the distribution of confidence levels:

```
Confidence_Distribution_In_Correct = {
    "Sure":     { Count: n, Percentage: % },
    "SemiSure": { Count: n, Percentage: % },
    "Doubtful": { Count: n, Percentage: % },
    "Guess":    { Count: n, Percentage: % }
}
```

### 3.4 Feedback Review Order

7 priority categories (Correct+Sure is excluded):

| Priority | Category | Meaning |
|----------|----------|---------|
| 1 | Correct + SemiSure | Incomplete grip |
| 2 | Correct + Doubtful | Lucky or partial reasoning |
| 3 | Correct + Guess | No real understanding |
| 4 | Incorrect + Sure | Dangerous blind spot |
| 5 | Incorrect + SemiSure | Near-miss confusion |
| 6 | Incorrect + Doubtful | Expected knowledge gap |
| 7 | Incorrect + Guess | Expected knowledge gap |

---

## 4. Data Lifecycle

```mermaid
flowchart LR
    subgraph INPUT
        PS_JSON[Problem Set JSON file]
    end

    subgraph IN_MEMORY
        PS[Problem Set store]
        SS[Session State]
        AR[Attempt Record]
    end

    subgraph OUTPUT
        AT_JSON[Attempt Record JSON file]
    end

    subgraph LONGITUDINAL
        AT1[Attempt 1 JSON]
        AT2[Attempt 2 JSON]
        AT3[Attempt N JSON]
    end

    PS_JSON -->|Upload & Parse| PS
    PS -->|Feed to| SS
    SS -->|Responses collected| AR
    AR -->|Serialize & Download| AT_JSON

    AT1 -->|Upload for trends| LA[Longitudinal Analyzer]
    AT2 --> LA
    AT3 --> LA
    LA --> TRENDS[Cross-attempt analytics]
```

### 4.1 Lifecycle Rules

1. **Problem Set** — Loaded once, read-only throughout session
2. **Session State** — Created at setup, mutated during practice, discarded on session end
3. **Attempt Record** — Built incrementally during practice, finalized on submission, immutable after finalization
4. **Historical Attempts** — Loaded on-demand in longitudinal screen, read-only
5. **No implicit persistence** — All data lost on page close unless explicitly exported

---

## 5. Format Detection Logic

```mermaid
flowchart TD
    A[JSON file uploaded] --> B{typeof root}
    B -->|Array| C[Multi-Set format]
    B -->|Object| D{has 'Problems' key?}
    D -->|Yes| E[Single-Set format]
    D -->|No| F[Invalid format — reject]
    C --> G[Iterate: validate each element as Problem Set]
    E --> H[Validate as Problem Set]
```

Single Set: root is an object with `ID`, `Title`, `Problems[]`, etc.
Multi Set: root is an array where each element is a valid Problem Set object.
