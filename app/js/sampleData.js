// sampleData.js — Embedded sample JSON files for quick access on the upload screen

export const SAMPLE_PROBLEM_SET = {
    "ID": "DV001",
    "Title": "Data Visualization Problem Set",
    "Source": "ChatGPT",
    "Source_Content": "Created by ChatGPT based on common data visualization concepts and best practices.",
    "Concepts_Covered": [
        "Data Visualization",
        "Histograms",
        "Kernel Density Estimate (KDE)"
    ],
    "Creation_Date": "2024-06-12",
    "Number_of_Problems": 4,
    "Context_Groups": [
        {
            "Group_ID": "CG1",
            "Title": "Employee salary dataset",
            "Content": [
                { "type": "markdown", "value": "A company has a DataFrame `df` with **10,000 employee records**. The key columns are: `employee_id`, `department`, `salary`, `years_experience`." },
                { "type": "markdown", "value": "You are asked to explore the `salary` column, which contains continuous numeric values ranging from $25{,}000$ to $120{,}000$." }
            ]
        },
        {
            "Group_ID": "CG2",
            "Title": "Histogram with KDE output",
            "Content": [
                { "type": "markdown", "value": "A colleague ran the following code and got the output below:" },
                { "type": "code", "value": "sns.histplot(data=df, x='salary', kde=True)\nplt.show()", "language": "python" }
            ]
        }
    ],
    "Problems": [
        {
            "Problem_ID": 1,
            "Context_Group": "CG1",
            "Concept_Map": "Histograms",
            "Problem_Statement": "You want to see the overall shape of the `salary` column (peaks, spread, skew). Best plot?",
            "Options": {
                "A": "Scatterplot",
                "B": "Countplot",
                "C": "Histogram",
                "D": "Lineplot"
            },
            "Answer": {
                "Correct_Option": "C",
                "Explanation": "Histograms are the go-to for visualizing the shape of a single continuous numeric variable — they show peaks, spread, skew, and gaps. Scatterplots need two variables. Countplots are for categorical data. Lineplots are for trends over time."
            }
        },
        {
            "Problem_ID": 2,
            "Context_Group": "CG1",
            "Concept_Map": "Kernel Density Estimate (KDE)",
            "Problem_Statement": "Same salary column — you want to see the shape AND a smooth curve overlaid on the bars. What do you add?",
            "Options": {
                "A": "`hue='department'`",
                "B": "`kde=True`",
                "C": "`kind='reg'`",
                "D": "`style='dashed'`"
            },
            "Answer": {
                "Correct_Option": "B",
                "Explanation": "Adding `kde=True` to `sns.histplot()` overlays a smooth **Kernel Density Estimate** curve on the histogram bars. This gives you both the bin-based shape and a continuous density estimate in one plot."
            }
        },
        {
            "Problem_ID": 3,
            "Context_Group": "CG2",
            "Concept_Map": "Kernel Density Estimate (KDE)",
            "Problem_Statement": "Looking at the output, the KDE curve peaks around $60{,}000$. What does the height of the curve at that point represent?",
            "Options": {
                "A": "The number of employees earning exactly $60{,}000$",
                "B": "The estimated probability density at salary = $60{,}000$",
                "C": "The cumulative percentage of employees below $60{,}000$",
                "D": "The z-score of $60{,}000$ relative to the mean"
            },
            "Answer": {
                "Correct_Option": "B",
                "Explanation": "The KDE curve shows the estimated **probability density function**. The height at any point is the density, not a count or probability. The area under the curve between two values gives the probability of falling in that range."
            }
        },
        {
            "Problem_ID": 4,
            "Context_Group": null,
            "Concept_Map": "Data Visualization",
            "Content": [
                { "type": "markdown", "value": "You want to compare the salary distributions of **two departments** side by side." }
            ],
            "Problem_Statement": "Which `sns.histplot()` parameter lets you split the histogram by a categorical column?",
            "Options": {
                "A": "`col='dept'`",
                "B": "`hue='dept'`",
                "C": "`group='dept'`",
                "D": "`split='dept'`"
            },
            "Answer": {
                "Correct_Option": "B",
                "Explanation": "The `hue` parameter in `sns.histplot()` splits the data by a categorical variable and overlays separate distributions with different colors. `col` is for faceting (separate subplots), not overlaying."
            }
        }
    ]
};

export const SAMPLE_PROBLEM_SETS = [SAMPLE_PROBLEM_SET];

export const SAMPLE_ATTEMPT = {
    "Problem_Set_ID": "DV001",
    "ID": "20240612_143022",
    "Attempt_Date": "2024-06-12",
    "Attempt": [
        {
            "Problem_ID": 1,
            "Response": {
                "Selected_Option": "C",
                "Confidence_Level": "Sure"
            },
            "time_seconds": 5
        },
        {
            "Problem_ID": 2,
            "Response": {
                "Selected_Option": "B",
                "Confidence_Level": "Semi-Sure"
            },
            "time_seconds": 7
        },
        {
            "Problem_ID": 3,
            "Response": {
                "Selected_Option": "A",
                "Confidence_Level": "Doubtful"
            },
            "time_seconds": 12
        },
        {
            "Problem_ID": 4,
            "Response": {
                "Selected_Option": "B",
                "Confidence_Level": "Sure"
            },
            "time_seconds": 8
        }
    ],
    "Analysis_Report": {
        "Session_Statistics": {
            "Total_Questions": 4,
            "Attempted_Questions": 4,
            "Total_Correct": 3,
            "Total_Incorrect": 1,
            "Total_Accuracy_Percent": 75.0,
            "Total_Time_Spent_Seconds": 32,
            "Total_Time_Spent_Minutes": 0.5,
            "Confidence_Wise_Accuracy": {
                "Sure": { "Total": 2, "Correct": 2, "Incorrect": 0, "Accuracy_Percent": 100.0 },
                "Semi-Sure": { "Total": 1, "Correct": 1, "Incorrect": 0, "Accuracy_Percent": 100.0 },
                "Doubtful": { "Total": 1, "Correct": 0, "Incorrect": 1, "Accuracy_Percent": 0.0 },
                "Guess": { "Total": 0, "Correct": 0, "Incorrect": 0, "Accuracy_Percent": null }
            },
            "Confidence_Distribution_In_Correct": {
                "Sure_Percent": 66.7,
                "Semi-Sure_Percent": 33.3,
                "Doubtful_Percent": 0.0,
                "Guess_Percent": 0.0
            }
        },
        "Feedback_Review_Order": [
            { "Priority": 1, "Category": "Correct-Semi-Sure", "Problem_IDs": [2] },
            { "Priority": 2, "Category": "Correct-Doubtful", "Problem_IDs": [] },
            { "Priority": 3, "Category": "Incorrect-Sure", "Problem_IDs": [] },
            { "Priority": 4, "Category": "Incorrect-Semi-Sure", "Problem_IDs": [] },
            { "Priority": 5, "Category": "Incorrect-Doubtful", "Problem_IDs": [3] },
            { "Priority": 6, "Category": "Correct-Guess", "Problem_IDs": [] },
            { "Priority": 7, "Category": "Incorrect-Guess", "Problem_IDs": [] }
        ]
    }
};
