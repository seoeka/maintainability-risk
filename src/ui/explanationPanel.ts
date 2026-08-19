import * as vscode from 'vscode';
import { FunctionAnalysisResult } from '../analyzer/types';
import { escapeHtml } from '../utils/html';
import { LLMExplanationResult } from '../llm/llmClient';

function renderList(items: string[], emptyText: string): string {
  if (!items.length) {
    return `<p class="muted">${escapeHtml(emptyText)}</p>`;
  }

  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

export function showExplanationPanel(fn: FunctionAnalysisResult, explanation: LLMExplanationResult): void {
  const panel = vscode.window.createWebviewPanel(
    'maintainabilityExplanation',
    `Explain Risk: ${fn.functionName}`,
    vscode.ViewColumn.Beside,
    { enableScripts: false, retainContextWhenHidden: true }
  );

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
    <p class="muted">${escapeHtml(codeDescription)}</p>
    <pre><code>${escapeHtml(codeToDisplay)}</code></pre>
  </div>

  <div class="box">
    <h2>${suggestionTitle}</h2>
    ${suggestionContent}
  </div>

  <div class="box">
    <h2>${summaryTitle}</h2>
    <p>${escapeHtml(explanation.summary)}</p>
  </div>

  <div class="box">
    <h2>4. Detail Metrics</h2>
    <div class="meta">
      <strong>Fungsi</strong>
      <span>${escapeHtml(fn.functionName)}</span>

      <strong>Risk Level</strong>
      <span>${escapeHtml(fn.risk.level)}</span>

      <strong>Maintainability Index</strong>
      <span><span class="badge">${fn.risk.maintainabilityIndex}/100</span></span>

      <strong>Halstead Volume</strong>
      <span>${fn.metrics.halsteadVolume}</span>

      <strong>Cyclomatic Complexity</strong>
      <span>${fn.metrics.cyclomaticComplexity}</span>

      <strong>Lines of Code</strong>
      <span>${fn.metrics.loc}</span>

      <strong>Lokasi</strong>
      <span>${escapeHtml(fn.location.fileName)}:${fn.location.startLine}-${fn.location.endLine}</span>
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
    <p>${escapeHtml(explanation.maintainabilityImpact || 'Dampak maintainability tidak tersedia.')}</p>
  </div>

  <div class="box">
    <h2>7. Catatan</h2>
    <p>${escapeHtml(explanation.notes || 'Contoh kode dan saran refactoring bersifat rekomendasi dan perlu diperiksa kembali oleh developer.')}</p>
    ${explanation.model ? `<p class="muted">Model: ${escapeHtml(explanation.model)}</p>` : ''}
    ${explanation.source ? `<p class="muted">Source: ${escapeHtml(explanation.source)}</p>` : ''}
  </div>

  <p class="note">
    <strong>Catatan akademik:</strong>
    LLM hanya digunakan sebagai fitur penjelas. Maintainability Index dan risk level tetap berasal dari perhitungan software metrics.
  </p>
</body>
</html>`;
}
