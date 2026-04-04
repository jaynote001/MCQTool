# MCQ Tool — System Architecture Overview

> Derived from: Functional Requirements (FR-1 to FR-10), Data Model (DM-0 to DM-5), UI Screens (UI-1 to UI-10), Non-Functional Requirements (NFR-1 to NFR-6)

---

## 1. Architecture Style

**Single-Page Application (SPA) — Client-Side Only**

Per NFR-1, the entire application runs in the browser with zero server dependency. All processing — file parsing, validation, session management, analysis computation, and export — happens client-side.

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                  │
│                                                                  │
│  ┌────────────┐  ┌────────────────┐  ┌───────────────────────┐  │
│  │  UI Layer  │→ │ Application    │→ │  Data / File          │  │
│  │  (Screens) │← │ Logic Layer    │← │  Layer                │  │
│  └────────────┘  └────────────────┘  └───────────────────────┘  │
│                                                                  │
│  Client-side libraries: KaTeX, Marked, JSZip                     │
│  No server. No database. No authentication.                      │
└─────────────────────────────────────────────────────────────────┘
         ↕                                       ↕
    User Input                      JSON / ZIP / Directory (upload/download)
```

---

## 2. High-Level Component Diagram

```mermaid
graph TB
    subgraph UI["UI Layer (Screens)"]
        S1[S1: Upload & Select]
        S2[S2: Session Setup]
        S3[S3: Practice]
        S4[S4: Analysis Dashboard]
        S5[S5: Review]
        S6[S6: Reinforcement]
        S7[S7: Chunk Transition]
        S8[S8: Export]
        S9[S9: Longitudinal Analysis]
    end

    subgraph APP["Application Logic Layer"]
        FP[File Parser & Validator]
        AL[Asset Loader]
        SM[Session Manager]
        PE[Practice Engine]
        AE[Analysis Engine]
        FE[Feedback Engine]
        RE[Reinforcement Engine]
        RC[Rich Content Renderer]
        EX[Export Manager]
        LA[Longitudinal Analyzer]
    end

    subgraph DATA["Data Layer (In-Memory)"]
        PS[(Problem Set + Context Groups)]
        AS[(Asset Store — images/files)]
        SS[(Session State)]
        AR[(Attempt Record)]
        HA[(Historical Attempts)]
    end

    S1 --> FP
    S1 --> AL
    S2 --> SM
    S3 --> PE
    S3 --> RC
    S4 --> AE
    S5 --> FE
    S5 --> RC
    S6 --> RE
    S7 --> SM
    S8 --> EX
    S9 --> LA

    FP --> PS
    AL --> AS
    SM --> SS
    PE --> SS
    AE --> AR
    FE --> AR
    RE --> SS
    RC --> PS
    RC --> AS
    EX --> AR
    LA --> HA
```

---

## 3. Layer Responsibilities

### 3.1 UI Layer
Responsible for rendering screens and capturing user input. No business logic.

| Screen | Component | Drives |
|--------|-----------|--------|
| S1 | Upload & Select | File Parser & Validator |
| S2 | Session Setup | Session Manager |
| S3 | Practice | Practice Engine |
| S4 | Analysis Dashboard | Analysis Engine |
| S5 | Review | Feedback Engine |
| S6 | Reinforcement | Reinforcement Engine |
| S7 | Chunk Transition | Session Manager |
| S8 | Export | Export Manager |
| S9 | Longitudinal Analysis | Longitudinal Analyzer |

### 3.2 Application Logic Layer
Contains all business rules. Stateless functions that operate on data.

| Component | Responsibility | Key Requirements |
|-----------|---------------|-----------------|
| **File Parser & Validator** | Parse uploaded JSON/ZIP/directory, detect single/multi-set format, validate schema including Context_Groups and Content blocks | FR-1.1 to FR-1.7 |
| **Asset Loader** | Extract and store images/files from ZIP archives or directory uploads; resolve asset paths relative to Problems.json | FR-1.2, FR-10.3 |
| **Session Manager** | Manage session lifecycle: mode, chunk division, context group–aware shuffling, phase transitions, chunk continuation | FR-3.1 to FR-3.3, FR-5.1 to FR-5.2, FR-2.2 |
| **Practice Engine** | Serve problems in mode order, collect responses (option + confidence + time), handle Corrective mode re-queue logic | FR-2.1 to FR-2.4, FR-4.1 to FR-4.7 |
| **Analysis Engine** | Compute all statistics: core metrics, confidence-wise accuracy, matrix, concept breakdown, feedback review order | FR-7.1 to FR-7.6 |
| **Feedback Engine** | Sort problems into priority-ordered review categories, serve review cards | FR-6.1 to FR-6.3 |
| **Reinforcement Engine** | Manage re-attempt queue, track cleared/remaining problems, enforce stats isolation | FR-6.4 to FR-6.9 |
| **Rich Content Renderer** | Render Content block arrays (text, markdown, latex, image, code); render inline Markdown + LaTeX in Problem_Statement, Options, Explanation | FR-10.1 to FR-10.5 |
| **Export Manager** | Serialize Attempt Record to JSON, generate filename, trigger download | FR-8.1 to FR-8.3 |
| **Longitudinal Analyzer** | Load multiple Attempt files, compute cross-attempt trends | FR-9.1 to FR-9.3 |

### 3.3 Data Layer (In-Memory State)
All data lives in memory during a session. No persistence beyond explicit file export.

| Store | Contents | Lifecycle |
|-------|----------|-----------|
| **Problem Set** | Parsed problem set (problems, metadata, concepts, context groups) | Loaded on upload, read-only during session |
| **Asset Store** | Extracted images/files from ZIP or directory (as Blob URLs) | Loaded with problem set, read-only, revoked on session end |
| **Session State** | Current mode, chunk config, current chunk index, problem queue, per-problem timer state | Created at session start, mutated during practice |
| **Attempt Record** | Responses array + Analysis Report | Built during practice, finalized on submission, exported as JSON |
| **Historical Attempts** | Multiple loaded Attempt Records for longitudinal analysis | Loaded on-demand in S9 |

---

## 4. Component Interaction Detail

### 4.1 File Parser & Validator

```mermaid
flowchart TD
    A[Upload received] --> B{Upload type?}
    B -->|.json file| C[Read JSON directly]
    B -->|.zip file| D[Extract with JSZip]
    B -->|Directory| E[Read via File System Access API]
    D --> F[Locate Problems.json in archive root]
    E --> G[Locate Problems.json in directory]
    F --> H[Extract assets/ files → Asset Store]
    G --> H
    C --> I{Root is Array?}
    F --> I
    G --> I
    I -->|Yes| J[Multi-Set: parse each element as Problem Set]
    I -->|No| K{Root is Object with 'Problems' key?}
    K -->|Yes| L[Single-Set: parse as Problem Set]
    K -->|No| M[Validation Error: invalid format]
    J --> N[Validate each Problem Set schema]
    L --> N
    N --> O{Context_Groups present?}
    O -->|Yes| P[Validate Group_IDs, Content blocks, problem references]
    O -->|No| Q[Continue]
    P --> R{All valid?}
    Q --> R
    R -->|Yes| S[Store in Problem Set data store]
    R -->|No| T[Validation Error: list missing/invalid fields]
```

### 4.2 Session Manager

```mermaid
flowchart TD
    A[Session Config Received] --> B{Mode?}
    B -->|Straight| C[Order: authored sequence]
    B -->|Jumbled| D[Group problems by Context_Group]
    B -->|Corrective| E[Filter: non Correct+Sure from Attempt file]
    D --> D2[Shuffle groups + standalone problems]
    D2 --> D3[Preserve in-group problem order]
    D3 --> F{Chunk Size?}
    C --> F
    F -->|All| G[Single chunk = full set]
    F -->|5 or 10| H[Divide into sequential chunks]
    E --> I[Single queue, no chunking]
    G --> J[Begin Phase 2: chunk 1]
    H --> J
    I --> K[Begin Corrective loop]
```

### 4.3 Practice Engine

```mermaid
flowchart TD
    A[Display Problem N] --> A2{Has Context_Group?}
    A2 -->|Yes, first in group| B1[Render Context Group content blocks]
    A2 -->|Yes, subsequent| B2[Show collapsible Context Group]
    A2 -->|No| B3[Skip context]
    B1 --> B4{Has problem-level Content?}
    B2 --> B4
    B3 --> B4
    B4 -->|Yes| B5[Render problem Content blocks]
    B4 -->|No| B6[Skip]
    B5 --> C[Render Problem Statement with Markdown/LaTeX]
    B6 --> C
    C --> D[Render Options with Markdown/LaTeX]
    D --> E[Start Timer]
    E --> F[Learner selects Option]
    F --> G[Learner selects Confidence]
    G --> H[Learner clicks Next / Submit]
    H --> I[Stop Timer — record time_seconds]
    I --> J[Store Response: Problem_ID + Option + Confidence + time_seconds]
    J --> K{More problems in chunk?}
    K -->|Yes| A
    K -->|No| L[Submit Chunk → Phase 3]
```

### 4.4 Analysis Engine

```mermaid
flowchart TD
    A[Receive Responses + Problem Set answers] --> B[Compare each response to answer key]
    B --> C[Classify each: Correct/Incorrect × S/SS/D/G]
    C --> D[Compute Core Metrics 1-9]
    C --> E[Compute Confidence-Wise Accuracy per level]
    C --> F[Compute Confidence Distribution in Correct]
    C --> G[Build 4×2 Accuracy-Confidence Matrix]
    C --> H[Group by Concept_Map → concept breakdown]
    C --> I[Sort into Feedback Review Order by priority]
    D --> J[Assemble Analysis_Report]
    E --> J
    F --> J
    G --> J
    H --> J
    I --> J
    J --> K[Store in Attempt Record]
```

### 4.5 Reinforcement Engine

```mermaid
flowchart TD
    A[Load Review problems — all except Correct+Sure] --> B[Build Queue]
    B --> C[Present next problem from queue]
    C --> D[Learner selects option]
    D --> E{Correct?}
    E -->|Yes| F[Remove from queue]
    E -->|No| G[Show correct option + reasoning]
    G --> H[Keep in queue]
    F --> I{Queue empty?}
    H --> I
    I -->|No| C
    I -->|Yes| J[Reinforcement Complete]
    C --> K{Learner exits early?}
    K -->|Yes| J
```

Note: Reinforcement responses do **NOT** flow back to Analysis Engine (FR-6.9).

---

## 5. Technology Constraints

Per NFR requirements:

| Constraint | Detail |
|-----------|--------|
| Runtime | Browser-only, no server |
| Storage | In-memory + JSON file I/O (FileReader API for upload, Blob/URL for download) |
| Persistence | None — learner must export to retain data |
| Auth | None |
| Offline | Fully functional after initial page load |
| Browsers | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| Responsive | Desktop + Tablet |
