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
    "Problems": [
        {
            "Problem_ID": 1,
            "Concept_Map": "Histograms",
            "Problem_Statement": "You have a column salary with 10,000 continuous numeric values and want to see its overall shape (peaks, spread, skew). Best plot?",
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
            "Concept_Map": "Kernel Density Estimate (KDE)",
            "Problem_Statement": "Same salary column — you want to see the shape AND a smooth curve overlaid on the bars. What do you add?",
            "Options": {
                "A": "hue='department'",
                "B": "kde=True",
                "C": "kind='reg'",
                "D": "style='dashed'"
            },
            "Answer": {
                "Correct_Option": "B",
                "Explanation": "Adding `kde=True` to `sns.histplot()` overlays a smooth Kernel Density Estimate curve on the histogram bars. This gives you both the bin-based shape and a continuous density estimate in one plot."
            }
        }
    ]
};

export const SAMPLE_PROBLEM_SETS = [
    {
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
        "Problems": [
            {
                "Problem_ID": 1,
                "Concept_Map": "Histograms",
                "Problem_Statement": "You have a column salary with 10,000 continuous numeric values and want to see its overall shape (peaks, spread, skew). Best plot?",
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
                "Concept_Map": "Kernel Density Estimate (KDE)",
                "Problem_Statement": "Same salary column — you want to see the shape AND a smooth curve overlaid on the bars. What do you add?",
                "Options": {
                    "A": "hue='department'",
                    "B": "kde=True",
                    "C": "kind='reg'",
                    "D": "style='dashed'"
                },
                "Answer": {
                    "Correct_Option": "B",
                    "Explanation": "Adding `kde=True` to `sns.histplot()` overlays a smooth Kernel Density Estimate curve on the histogram bars. This gives you both the bin-based shape and a continuous density estimate in one plot."
                }
            }
        ]
    }
];

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
        }
    ],
    "Analysis_Report": {
        "Session_Statistics": {
            "Total_Questions": 2,
            "Attempted_Questions": 2,
            "Total_Correct": 1,
            "Total_Incorrect": 1,
            "Total_Accuracy_Percent": 50.0,
            "Total_Time_Spent_Seconds": 12,
            "Total_Time_Spent_Minutes": 0.2,
            "Confidence_Wise_Accuracy": {
                "Sure": { "Total": 1, "Correct": 1, "Incorrect": 0, "Accuracy_Percent": 100.0 },
                "Semi-Sure": { "Total": 1, "Correct": 0, "Incorrect": 1, "Accuracy_Percent": 0.0 },
                "Doubtful": { "Total": 0, "Correct": 0, "Incorrect": 0, "Accuracy_Percent": null },
                "Guess": { "Total": 0, "Correct": 0, "Incorrect": 0, "Accuracy_Percent": null }
            },
            "Confidence_Distribution_In_Correct": {
                "Sure_Percent": 100.0,
                "Semi-Sure_Percent": 0.0,
                "Doubtful_Percent": 0.0,
                "Guess_Percent": 0.0
            }
        },
        "Feedback_Review_Order": [
            { "Priority": 1, "Category": "Correct-Semi-Sure", "Problem_IDs": [] },
            { "Priority": 2, "Category": "Correct-Doubtful", "Problem_IDs": [] },
            { "Priority": 3, "Category": "Incorrect-Sure", "Problem_IDs": [] },
            { "Priority": 4, "Category": "Incorrect-Doubtful", "Problem_IDs": [] },
            { "Priority": 5, "Category": "Correct-Guess", "Problem_IDs": [] },
            { "Priority": 6, "Category": "Incorrect-Guess", "Problem_IDs": [] },
            { "Priority": 7, "Category": "Incorrect-Semi-Sure", "Problem_IDs": [2] }
        ]
    }
};
