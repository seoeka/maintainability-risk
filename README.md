# Maintainability Risk Analyzer

A Visual Studio Code extension for identifying JavaScript code that may present maintainability risks using software metrics and the Maintainability Index (MI), with an optional LLM-based explanation feature.

## Overview

Maintainability Risk Analyzer performs static analysis on JavaScript code and identifies maintainability risks based on calculated software metrics.

The extension supports:

- `.js`
- `.mjs`
- `.cjs`

The analysis is performed locally using an Abstract Syntax Tree (AST). The LLM is **not** used to calculate software metrics, the Maintainability Index, or risk categories. It is only used to provide contextual explanations and refactoring suggestions based on the analysis results.

## Metrics

The extension uses three main software metrics:

1. **Halstead Volume (HV)**
2. **Cyclomatic Complexity (CC)**
3. **Lines of Code (LOC)**

These metrics are used to calculate the Maintainability Index:

```text
MI = max(0, ((171 - 5.2 × ln(HV) - 0.23 × CC - 16.2 × ln(LOC)) × 100) / 171)
```

### Risk Classification

| Maintainability Index | Risk Level |
|---|---|
| MI >= 20 | Low Risk |
| 10 <= MI < 20 | Medium Risk |
| MI < 10 | High Risk |

## Features

### JavaScript Analysis

- Analyze the active JavaScript file.
- Analyze JavaScript files in the workspace.
- Parse source code using an AST.
- Calculate HV, CC, LOC, and MI.
- Classify maintainability risk as Low, Medium, or High.

### Editor Feedback

- Display diagnostics for identified risks.
- Highlight analyzed functions according to their risk level.
- View analysis details through hover information.
- View a summary of the analysis results.

Hover information can include:

- Maintainability Index
- Halstead Volume
- Cyclomatic Complexity
- Lines of Code
- Risk category
- Deterministic explanation of the identified risk

### LLM-Based Explanation

The **Explain Maintainability Risk** feature provides contextual explanations and refactoring suggestions for analyzed functions.

The LLM receives the relevant code snippet and the results produced by the local analysis, including:

- HV
- CC
- LOC
- MI
- Risk category
- Deterministic risk explanation

The LLM is used only to explain the existing analysis results. It does not determine the metric values or risk category.

### Export

Analysis results can be exported as a JSON workspace report.

## LLM Integration

The extension uses a Vercel backend as a proxy between the extension and the OpenAI API.

```text
VS Code Extension
        ↓
Vercel Backend
        ↓
OpenAI API
        ↓
Vercel Backend
        ↓
VS Code Extension
```

The backend is used to keep the OpenAI API key outside the extension.

## Commands

Open the Command Palette in Visual Studio Code (`Ctrl+Shift+P` / `Cmd+Shift+P`) and search for:

- `Maintainability: Analyze Current JavaScript File`
- `Maintainability: Analyze JavaScript Workspace`
- `Maintainability: Show Maintainability Summary`
- `Maintainability: Explain Maintainability Risk`
- `Maintainability: Explain Maintainability Risk at Cursor`
- `Maintainability: Export Workspace Report (JSON)`
- `Maintainability: Test LLM Proxy Connection`

## Installation

### From Visual Studio Code Marketplace

1. Open Visual Studio Code.
2. Open the **Extensions** view.
3. Search for **Maintainability Risk Analyzer**.
4. Select the extension and click **Install**.

### From VSIX

If a `.vsix` package is provided:

1. Open Visual Studio Code.
2. Open the **Extensions** view.
3. Click the `...` menu.
4. Select **Install from VSIX...**.
5. Select the `.vsix` file.
6. Reload Visual Studio Code if prompted.

## Usage

### 1. Open a JavaScript File

Open a JavaScript file with one of the supported extensions:

```text
.js
.mjs
.cjs
```

### 2. Run the Analysis

Use:

```text
Maintainability: Analyze Current JavaScript File
```

You can also use:

```text
Maintainability: Analyze JavaScript Workspace
```

to analyze JavaScript files in the workspace.

### 3. Review Maintainability Results

After the analysis is completed, review the metrics and risk information shown in the editor.

You can also:

- hover over an analyzed function,
- inspect diagnostics and highlights,
- open the maintainability summary.

### 4. Explain a Maintainability Risk

Select a function with an identified maintainability risk and run:

```text
Maintainability: Explain Maintainability Risk
```

or:

```text
Maintainability: Explain Maintainability Risk at Cursor
```

The extension sends the relevant code and locally calculated analysis results to the backend. The returned LLM response is then displayed as a contextual explanation and refactoring suggestion.

### 5. Export the Analysis

Use:

```text
Maintainability: Export Workspace Report (JSON)
```

to export the analysis results as a JSON report.

## Configuration

The extension provides several optional settings:

- `maintainabilityRiskAnalyzer.showLowRiskDiagnostics`  
  Display Low Risk functions as diagnostic information. Disabled by default.

- `maintainabilityRiskAnalyzer.analyzeOnSave`  
  Automatically analyze JavaScript files when they are saved. Enabled by default.

- `maintainabilityRiskAnalyzer.llm.model`  
  Model name passed to the LLM backend.

- `maintainabilityRiskAnalyzer.llm.maxSnippetCharacters`  
  Maximum length of a function snippet sent to the LLM.

- `maintainabilityRiskAnalyzer.privacy.sendCodeToLLM`  
  Controls whether the analyzed function snippet and metric results are sent to the LLM backend.

- `maintainabilityRiskAnalyzer.llm.proxyEndpoint`  
  Endpoint used for the LLM proxy backend.

- `maintainabilityRiskAnalyzer.llm.proxyToken`  
  Optional access token for the proxy backend.

- `maintainabilityRiskAnalyzer.llm.requestTimeoutMs`  
  Maximum waiting time for an LLM backend request.

## Development

Clone the repository and install the dependencies:

```bash
npm install
```

Compile the extension:

```bash
npm run compile
```

For development with automatic recompilation:

```bash
npm run watch
```

To create a VSIX package:

```bash
npm run package
```

This generates a `.vsix` file that can be installed manually in Visual Studio Code.

## Backend Development

The LLM proxy is located in the `backend-vercel` directory.

```bash
cd backend-vercel
npm install
```

Configure the required environment variables:

```text
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
ALLOWED_MODELS=gpt-4.1-mini,gpt-4o-mini
MAX_SNIPPET_CHARS=6000
```

## Limitations

- The extension analyzes JavaScript files only.
- The LLM explanation feature requires access to the configured backend.
- The LLM does not calculate software metrics, Maintainability Index values, or risk categories.
- The function code snippet may be sent to the configured LLM backend when the explanation feature is used.

## Academic Context

This extension was developed as part of an academic research project on JavaScript code maintainability analysis using software metrics and an LLM-based explanation feature.

The Maintainability Index and risk classification are calculated deterministically by the extension. The LLM is used as a supporting component to explain the analysis results and provide contextual refactoring suggestions.

## License

This project is licensed under the MIT License.
