"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.showExplanationPanel = showExplanationPanel;
const vscode = __importStar(require("vscode"));
const html_1 = require("../utils/html");
function renderList(items, emptyText) {
    if (!items.length) {
        return `<p class="muted">${(0, html_1.escapeHtml)(emptyText)}</p>`;
    }
    return `<ul>${items.map((item) => `<li>${(0, html_1.escapeHtml)(item)}</li>`).join('')}</ul>`;
}
function showExplanationPanel(fn, explanation) {
    const panel = vscode.window.createWebviewPanel('maintainabilityExplanation', `Explain Risk: ${fn.functionName}`, vscode.ViewColumn.Beside, { enableScripts: false, retainContextWhenHidden: true });
    const isLowRisk = fn.risk.level === 'Low';
    const codeTitle = isLowRisk ? '1. Kode Saat Ini' : '1. Contoh Kode Refactor';
    const codeDescription = isLowRisk
        ? 'Kode berikut tidak memerlukan refactoring khusus karena nilai Maintainability Index masih berada pada rentang aman.'
        : 'Kode berikut adalah rekomendasi dari LLM dan tidak mengubah file secara otomatis.';
    const codeToDisplay = isLowRisk
        ? fn.snippet
        : explanation.refactoredCode?.trim()
            ? explanation.refactoredCode.trim()
            : '// Contoh kode refactor tidak tersedia.';
    const suggestionTitle = isLowRisk ? '2. Hal yang Sudah Baik' : '2. Saran Refactoring';
    const suggestionContent = isLowRisk
        ? renderList(explanation.positiveFindings, 'Hal positif tidak tersedia.')
        : renderList(explanation.refactoringSuggestions, 'Saran refactoring tidak tersedia.');
    const summaryTitle = isLowRisk ? '3. Ringkasan Maintainability' : '3. Ringkasan Risiko';
    const impactTitle = isLowRisk
        ? '6. Dampak Positif terhadap Maintainability'
        : '6. Dampak terhadap Maintainability';
    panel.webview.html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Maintainability Explanation</title>
<style>
  body {
    font-family: var(--vscode-font-family);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    padding: 20px;
    line-height: 1.55;
  }

  h1 {
    margin-top: 0;
    font-size: 24px;
  }

  h2 {
    font-size: 18px;
    margin-top: 0;
  }

  .box {
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    padding: 14px;
    margin-bottom: 14px;
    background: var(--vscode-editor-background);
  }

  .code-first {
    border-color: var(--vscode-focusBorder);
  }

  pre {
    background: var(--vscode-textCodeBlock-background);
    padding: 14px;
    border-radius: 6px;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }

  code {
    font-family: var(--vscode-editor-font-family);
  }

  .meta {
    display: grid;
    grid-template-columns: 180px 1fr;
    gap: 6px 12px;
  }

  .muted {
    color: var(--vscode-descriptionForeground);
  }

  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid var(--vscode-panel-border);
    margin-left: 6px;
  }

  .note {
    color: var(--vscode-editorWarning-foreground);
  }
</style>
</head>
<body>
  <h1>Explain Maintainability Risk</h1>

  <div class="box code-first">
    <h2>${codeTitle}</h2>
    <p class="muted">${(0, html_1.escapeHtml)(codeDescription)}</p>
    <pre><code>${(0, html_1.escapeHtml)(codeToDisplay)}</code></pre>
  </div>

  <div class="box">
    <h2>${suggestionTitle}</h2>
    ${suggestionContent}
  </div>

  <div class="box">
    <h2>${summaryTitle}</h2>
    <p>${(0, html_1.escapeHtml)(explanation.summary)}</p>
  </div>

  <div class="box">
    <h2>4. Detail Metrics</h2>
    <div class="meta">
      <strong>Fungsi</strong>
      <span>${(0, html_1.escapeHtml)(fn.functionName)}</span>

      <strong>Risk Level</strong>
      <span>${(0, html_1.escapeHtml)(fn.risk.level)}</span>

      <strong>Maintainability Index</strong>
      <span><span class="badge">${fn.risk.maintainabilityIndex}/100</span></span>

      <strong>Halstead Volume</strong>
      <span>${fn.metrics.halsteadVolume}</span>

      <strong>Cyclomatic Complexity</strong>
      <span>${fn.metrics.cyclomaticComplexity}</span>

      <strong>Lines of Code</strong>
      <span>${fn.metrics.loc}</span>

      <strong>Lokasi</strong>
      <span>${(0, html_1.escapeHtml)(fn.location.fileName)}:${fn.location.startLine}-${fn.location.endLine}</span>
    </div>
  </div>

  <div class="box">
    <h2>5. Alasan Berdasarkan Metrics</h2>

    <h3>Alasan dari Sistem</h3>
    ${renderList(fn.risk.deterministicExplanation, 'Alasan deterministik tidak tersedia.')}

    <h3>Alasan dari LLM</h3>
    ${renderList(explanation.reasons, 'Alasan tambahan dari LLM tidak tersedia.')}
  </div>

  <div class="box">
    <h2>${impactTitle}</h2>
    <p>${(0, html_1.escapeHtml)(explanation.maintainabilityImpact || 'Dampak maintainability tidak tersedia.')}</p>
  </div>

  <div class="box">
    <h2>7. Catatan</h2>
    <p>${(0, html_1.escapeHtml)(explanation.notes || 'Contoh kode dan saran refactoring bersifat rekomendasi dan perlu diperiksa kembali oleh developer.')}</p>
    ${explanation.model ? `<p class="muted">Model: ${(0, html_1.escapeHtml)(explanation.model)}</p>` : ''}
    ${explanation.source ? `<p class="muted">Source: ${(0, html_1.escapeHtml)(explanation.source)}</p>` : ''}
  </div>

  <p class="note">
    <strong>Catatan akademik:</strong>
    LLM hanya digunakan sebagai fitur penjelas. Maintainability Index dan risk level tetap berasal dari perhitungan software metrics.
  </p>
</body>
</html>`;
}
//# sourceMappingURL=explanationPanel.js.map