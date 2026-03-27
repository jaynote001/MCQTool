# MCQ Practice Tool

A browser-based, offline-first MCQ practice tool with metacognitive confidence tracking and analytics.

No server, no database, no accounts — everything runs in your browser using JSON files.

## Features

- **3 Practice Modes**: Straight (authored order), Jumbled (randomized), Corrective (re-practice weak areas)
- **Confidence Tagging**: Rate each answer as Sure / Semi-Sure / Doubtful / Guess
- **Analytics Dashboard**: Accuracy-confidence matrix, concept-wise breakdown, 9 core metrics
- **Priority-Ordered Review**: Problems sorted by learning priority (blind spots first)
- **Reinforcement Loop**: Re-attempt missed problems until all correct (doesn't affect stats)
- **Chunked Practice**: Split large sets into chunks of 5 or 10
- **Time Tracking**: Per-problem and total session time
- **Export**: Download attempt records as JSON
- **Longitudinal Analysis**: Upload multiple attempts to view performance trends over time

## Run Locally

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

3. **Open in browser**
   ```
   http://localhost:8080
   ```

4. **Upload a Problem Set** — use the sample files in `1_Idea/`:
   - `Sample_Problem_Set.json` (single set)
   - `Sample_Problem_Sets.json` (multi-set array)
   - `Sample_Problem_Set_Attempted.json` (for Corrective mode or Longitudinal Analysis)

## Deploy to GitHub Pages

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

## Project Structure

```
MCQTool/
├── 1_Idea/                  # Concept documents & sample JSON files
├── 2_Requirements/          # Functional, data model, UI, NFR specs
├── 3_Architecture/          # System architecture & flow diagrams
└── app/                     # Application code
    ├── index.html
    ├── css/styles.css
    └── js/
        ├── app.js           # Main app — screens, state, navigation
        ├── analysisEngine.js # Statistics, matrix, review ordering
        ├── fileParser.js     # JSON parsing & validation
        └── utils.js          # Shuffle, file I/O, formatting
```

## Problem Set JSON Format

```json
{
    "ID": "DV001",
    "Title": "Data Visualization",
    "Concepts_Covered": ["Histograms", "KDE"],
    "Problems": [
        {
            "Problem_ID": 1,
            "Concept_Map": "Histograms",
            "Problem_Statement": "Your question here?",
            "Options": { "A": "...", "B": "...", "C": "...", "D": "..." },
            "Answer": {
                "Correct_Option": "C",
                "Explanation": "Why C is correct..."
            }
        }
    ]
}
```
