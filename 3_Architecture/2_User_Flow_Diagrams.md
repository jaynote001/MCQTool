# MCQ Tool — User Flow Diagrams

> Derived from: UI Screens (S1–S9), Functional Requirements (FR-1 to FR-9)

---

## 1. Master Application Flow

```mermaid
flowchart TD
    START([Open Application]) --> S1[S1: Upload & Select Problem Set]
    S1 -->|File validated| S2[S2: Session Setup]
    S2 -->|Config confirmed| S3[S3: Practice — Phase 2]

    S3 -->|Chunk submitted| S4[S4: Analysis Dashboard — Phase 3]
    S4 --> S5[S5: Passive Review]
    S5 --> S6[S6: Reinforcement — active re-practice]
    S6 -->|Done or Exited| CHKCHUNK{More chunks?}

    CHKCHUNK -->|Yes| S7[S7: Chunk Transition]
    S7 --> S3
    CHKCHUNK -->|No| S8[S8: Export Attempt Record]

    S8 -->|Optional| S9[S9: Longitudinal Analysis]
    S8 --> NEWQ{New session?}
    S9 --> NEWQ
    NEWQ -->|Yes| S1
    NEWQ -->|No| END([Exit])
```

---

## 2. Phase-Level Flow (Per Chunk)

### Phase 1: Setup

```mermaid
flowchart TD
    A[Select Problem Set from loaded sets] --> B[Choose Practice Mode]
    B --> C{Mode?}
    C -->|Straight| D[Keep authored order]
    C -->|Jumbled| E[Randomize order]
    C -->|Corrective| F[Upload prior Attempt JSON]
    F --> F2[Filter: keep problems NOT Correct+Sure]
    D --> G[Choose Chunk Size: All / 5 / 10]
    E --> G
    F2 --> H[No chunking — single queue]
    G --> I[Confirm → Begin Practice]
    H --> I
```

### Phase 2: Attempt (per chunk)

```mermaid
flowchart TD
    A([Chunk starts]) --> B[Display Problem]
    B --> C[Timer starts automatically]
    C --> D[Learner reads problem & options]
    D --> E[Learner selects one option]
    E --> F[Learner selects confidence: S / SS / D / G]
    F --> G{Last problem in chunk?}
    G -->|No| H[Click Next]
    H --> I[Timer stops — record time_seconds]
    I --> B
    G -->|Yes| J[Click Submit]
    J --> K[Timer stops — record time_seconds]
    K --> L([Chunk submitted → Phase 3])
```

### Phase 3: Post-Attempt (per chunk)

```mermaid
flowchart TD
    A([Chunk submitted]) --> B[Analysis Engine computes statistics]
    B --> C[S4: Display Analysis Dashboard]
    C --> D[S5: Passive Review — priority ordered]
    D --> E{Learner proceeds to Reinforcement?}
    E -->|Yes| F[S6: Reinforcement loop]
    F --> G{All problems cleared or exit?}
    G -->|Cleared| H[Display Reinforcement Complete]
    G -->|Exit| H
    E -->|Skip| H
    H --> I{More chunks remaining?}
    I -->|Yes| J[S7: Chunk Transition screen]
    J --> K([Next chunk → Phase 2])
    I -->|No| L[S8: Export screen]
```

---

## 3. Corrective Mode Flow

```mermaid
flowchart TD
    A[S1: Upload original Problem Set] --> B[S2: Select Corrective Mode]
    B --> C[Upload previous Attempt JSON]
    C --> D[System matches Attempt to Problem Set]
    D --> E{Match valid?}
    E -->|No| F[Error: Attempt does not match Problem Set]
    F --> C
    E -->|Yes| G[Filter: remove Correct+Sure responses]
    G --> H[Build corrective queue]
    H --> I{Queue empty?}
    I -->|Yes| J[Message: No problems need correction — all Correct+Sure]
    I -->|No| K[Begin Corrective Practice — single chunk, no chunking]
    K --> L[Phase 2: Attempt with corrective queue]
    L --> M[Phase 3: Analysis only on corrective subset]
    M --> N[Review + Reinforcement on corrective subset]
    N --> O[Export updated Attempt Record]
```

---

## 4. Reinforcement Session Detail

```mermaid
flowchart TD
    A([Enter Reinforcement]) --> B[Load all problems NOT Correct+Sure from chunk]
    B --> C[Present problem — show question + options]
    C --> D[Learner selects answer]
    D --> E{Correct?}
    E -->|Yes| F["✓ Mark cleared — remove from queue"]
    E -->|No| G["✗ Show correct answer + explanation"]
    G --> H[Problem stays in queue]
    F --> I{Queue empty?}
    H --> I
    I -->|No| C
    I -->|Yes| J([All cleared — Complete])

    C --> K{Learner clicks Exit?}
    K -->|Yes| L([Exit Reinforcement early])

    style J fill:#c8e6c9
    style L fill:#fff9c4
```

> **Critical Rule**: Reinforcement responses are NOT written back to the Analysis Report. The original attempt statistics remain unchanged (FR-6.9).

---

## 5. Export & Longitudinal Flow

```mermaid
flowchart TD
    A[S8: Export Screen] --> B[System compiles Attempt Record JSON]
    B --> C[Auto-generate filename]
    C --> D[Learner clicks Download]
    D --> E[File saved to local machine]

    F[S9: Longitudinal Analysis] --> G[Upload 2+ Attempt JSONs for same Problem Set]
    G --> H[System validates Problem_Set_ID match]
    H --> I[Compute trends across attempts]
    I --> J[Display: accuracy trend, confidence trend, time trend]
    J --> K[Identify persistent weak concepts]
```

---

## 6. Screen Navigation Map

```mermaid
stateDiagram-v2
    [*] --> S1_Upload
    S1_Upload --> S2_Setup: Set selected
    S2_Setup --> S3_Practice: Config confirmed
    S3_Practice --> S4_Dashboard: Chunk submitted
    S4_Dashboard --> S5_Review: View review
    S5_Review --> S6_Reinforcement: Enter reinforcement
    S6_Reinforcement --> S7_ChunkTransition: More chunks
    S6_Reinforcement --> S8_Export: Last chunk
    S5_Review --> S7_ChunkTransition: Skip reinforcement + more chunks
    S5_Review --> S8_Export: Skip reinforcement + last chunk
    S7_ChunkTransition --> S3_Practice: Next chunk
    S8_Export --> S9_Longitudinal: Analyze trends
    S8_Export --> S1_Upload: New session
    S9_Longitudinal --> S1_Upload: New session
    S8_Export --> [*]
    S9_Longitudinal --> [*]
```
