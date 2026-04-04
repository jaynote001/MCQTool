# Context Groups & Rich Content — Design Ideas

## 0. Problem Set Directory Structure

Each problem set lives in its own self-contained directory. The directory bundles the JSON data with all static assets (images, charts, diagrams) it references.

### Required Layout

```
<Problem_Set_Name>/
├── assets/                    # All static files (images, charts, SVGs, etc.)
│   ├── salary_dataframe_head.svg
│   ├── salary_histogram_kde.svg
│   └── ...
├── Problems.json              # The primary file consumed by the application
├── <other_reference_files>    # Optional: single-set examples, attempted records, etc.
```

### Rules

- **`Problems.json`** is the canonical filename the application loads. It contains an array of one or more problem sets.
- **`assets/`** holds every static file referenced by `Problems.json`. Image paths inside the JSON are relative to the JSON file itself (e.g., `"value": "assets/salary_histogram_kde.svg"`).
- The directory is **self-contained** — copying or zipping the folder gives you everything needed to run the problem set.
- When uploading, the app accepts either:
  - A single `Problems.json` file (no images), or
  - A `.zip` of the entire directory (JSON + assets).

### Example

```
Sample_Problem_Set/
├── assets/
│   ├── histplot_code_output.svg
│   ├── salary_dataframe_head.svg
│   ├── salary_histogram.svg
│   └── salary_histogram_kde.svg
├── Problems.json
├── Sample_Problem_Set.json
└── Sample_Problem_Set_Attempted.json
```

---

## 1. Context Groups (Composite MCQ Chains)

Problems can share context — a description, dataset, diagram, equation, or chart that multiple questions refer to.

### Schema

Context groups are defined at the problem set level. Problems reference them by ID.

```json
{
  "ID": "DS001",
  "Title": "Exploratory Data Analysis",
  "Context_Groups": [
    {
      "Group_ID": "CG1",
      "Title": "Employee attrition dataset",
      "Content": [
        { "type": "text", "value": "A company collected data on 1,470 employees including age, salary, department, satisfaction score, and attrition status." },
        { "type": "image", "value": "assets/attrition_table.png", "alt": "Sample rows from the attrition dataset" }
      ]
    },
    {
      "Group_ID": "CG2",
      "Title": "Correlation heatmap",
      "Content": [
        { "type": "text", "value": "Below is the Pearson correlation heatmap for all numeric variables:" },
        { "type": "image", "value": "assets/heatmap.png", "alt": "Correlation heatmap" },
        { "type": "latex", "value": "r_{xy} = \\frac{\\sum (x_i - \\bar{x})(y_i - \\bar{y})}{(n-1) s_x s_y}" }
      ]
    }
  ],
  "Problems": [
    {
      "Problem_ID": 1,
      "Context_Group": null,
      "Problem_Statement": "Standalone question with no shared context..."
    },
    {
      "Problem_ID": 2,
      "Context_Group": "CG1",
      "Problem_Statement": "Based on the dataset above, which plot best shows the distribution of salary?"
    },
    {
      "Problem_ID": 3,
      "Context_Group": "CG1",
      "Problem_Statement": "The HR team now asks you to compare attrition rates across departments. Best approach?"
    },
    {
      "Problem_ID": 4,
      "Context_Group": "CG2",
      "Problem_Statement": "Which pair of variables has the strongest negative correlation?"
    }
  ]
}
```

### Key Rules

- `Context_Group` on a problem is optional. `null` or absent = standalone problem.
- `Context_Groups` on a problem set is optional. Old problem sets without it work unchanged.
- In **Jumbled mode**, problems within the same context group stay together — shuffle groups, not individual problems within a group.
- In the UI, the context block is shown above the first problem in the group and stays visible (or collapsible) for subsequent problems in the chain.

---

## 2. Rich Content

Rich content can appear in three places:
1. **Context Group content** — shared across a chain of problems
2. **Problem-level content** — specific to one problem (shown above the question)
3. **Inline in text fields** — Problem_Statement, Options, Explanation (Markdown + LaTeX)

### 2.1 Content Block Array

Any place that supports rich content uses a `Content` array of typed blocks:

```json
"Content": [
  { "type": "text", "value": "Observe the following output:" },
  { "type": "markdown", "value": "The **p-value** was `0.03`, below the threshold $\\alpha = 0.05$." },
  { "type": "latex", "value": "H_0: \\mu_1 = \\mu_2 \\quad H_a: \\mu_1 \\neq \\mu_2" },
  { "type": "image", "value": "assets/boxplot.png", "alt": "Side-by-side boxplots" },
  { "type": "code", "value": "sns.boxplot(x='group', y='score', data=df)", "language": "python" },
  { "type": "vega-lite", "value": { "mark": "bar", "encoding": {} } }
]
```

#### Supported Content Types

| Type | Value | Description |
|------|-------|-------------|
| `text` | Plain string | Rendered as-is (escaped) |
| `markdown` | Markdown string | Rendered with Markdown parser; supports inline LaTeX `$...$` |
| `latex` | LaTeX string | Rendered as a display-mode equation `$$...$$` |
| `image` | File path or data URI | Image from assets folder or base64-embedded |
| `code` | Code string | Rendered in a syntax-highlighted code block; optional `language` key |
| `vega-lite` | Vega-Lite spec object | Interactive chart rendered in-browser (future) |

### 2.2 Inline Rich Text

`Problem_Statement`, `Options` values, and `Answer.Explanation` support Markdown with inline LaTeX:

```json
{
  "Problem_Statement": "Given $\\bar{x} = 52.3$ and $s = 4.1$, what is the z-score for $x = 60$?",
  "Options": {
    "A": "$z = 1.88$",
    "B": "$z = 2.15$",
    "C": "$z = 1.12$",
    "D": "$z = 0.73$"
  },
  "Answer": {
    "Correct_Option": "A",
    "Explanation": "$$z = \\frac{x - \\bar{x}}{s} = \\frac{60 - 52.3}{4.1} = 1.88$$"
  }
}
```

### 2.3 Image Delivery Strategies

| Strategy | How | Pros | Cons |
|----------|-----|------|------|
| **Bundled directory/zip** | Problem set directory with `assets/` folder; upload as `.zip` or serve from disk | Clean separation, easy to author, self-contained | Needs JSZip for zip upload in browser |
| **Base64 embedded** | `"value": "data:image/png;base64,iVBOR..."` | Single JSON file, no extra files | Large file size, hard to author |
| **External URL** | `"value": "https://example.com/chart.png"` | No bundling needed | Requires internet, links can break |

**Recommended default**: Bundled directory with `assets/` folder (see Section 0). Image paths in JSON are relative to `Problems.json` (e.g., `assets/chart.svg`). Base64 is acceptable for small inline diagrams. External URLs are discouraged.

---

## 3. Full Example — Problem with Context Group + Rich Content

```json
{
  "ID": "STATS101",
  "Title": "Hypothesis Testing",
  "Context_Groups": [
    {
      "Group_ID": "CG1",
      "Title": "Drug trial results",
      "Content": [
        { "type": "markdown", "value": "A pharmaceutical company ran a **randomized controlled trial** with 200 patients split into treatment and control groups." },
        { "type": "image", "value": "data:image/png;base64,iVBOR...", "alt": "Trial results summary table" },
        { "type": "latex", "value": "H_0: \\mu_T = \\mu_C \\quad H_a: \\mu_T > \\mu_C" },
        { "type": "markdown", "value": "The observed test statistic was $t = 2.41$ with $df = 198$." }
      ]
    }
  ],
  "Problems": [
    {
      "Problem_ID": 1,
      "Context_Group": "CG1",
      "Concept_Map": "Hypothesis Testing",
      "Content": [
        { "type": "markdown", "value": "Refer to the trial data above." }
      ],
      "Problem_Statement": "At $\\alpha = 0.05$, what is the correct conclusion?",
      "Options": {
        "A": "Fail to reject $H_0$ — insufficient evidence",
        "B": "Reject $H_0$ — treatment mean is significantly higher",
        "C": "Accept $H_0$ — means are equal",
        "D": "Cannot determine without the raw data"
      },
      "Answer": {
        "Correct_Option": "B",
        "Explanation": "With $t = 2.41$ and $df = 198$, the one-tailed p-value is approximately $0.008 < 0.05$. We reject $H_0$."
      }
    },
    {
      "Problem_ID": 2,
      "Context_Group": "CG1",
      "Concept_Map": "Hypothesis Testing",
      "Problem_Statement": "If the significance level were changed to $\\alpha = 0.01$, would the conclusion change?",
      "Options": {
        "A": "Yes — we would now fail to reject $H_0$",
        "B": "No — $p = 0.008 < 0.01$, still reject",
        "C": "Yes — one-tailed tests are invalid at $\\alpha = 0.01$",
        "D": "Cannot determine without recalculating"
      },
      "Answer": {
        "Correct_Option": "B",
        "Explanation": "The p-value ($\\approx 0.008$) is still below $0.01$, so the conclusion remains: reject $H_0$."
      }
    }
  ]
}
```

---

## 4. Backward Compatibility

All new fields are optional:

| Field | Default if absent |
|-------|-------------------|
| `Context_Groups` | No context groups — all problems are standalone |
| `Problem.Context_Group` | `null` — standalone problem |
| `Problem.Content` | No rich content block — just the Problem_Statement text |
| Markdown/LaTeX in text fields | Plain text rendered as before |

Existing problem sets work without any changes.

---

## 5. Implementation Phases

| Phase | What | Effort |
|-------|------|--------|
| **Phase 1** | Markdown + KaTeX rendering in all text fields | Small |
| **Phase 2** | Context Groups with chain-aware shuffling | Medium |
| **Phase 3** | Content block array renderer (text, markdown, latex, image, code) | Medium |
| **Phase 4** | Image support — base64 first, then zip bundle | Medium |
| **Phase 5** | Interactive charts via Vega-Lite (optional) | Large |
