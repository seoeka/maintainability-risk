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
exports.showSummaryPanel = showSummaryPanel;
const vscode = __importStar(require("vscode"));
const html_1 = require("../utils/html");
function badge(level) {
    const className = level.toLowerCase();
    return `<span class="badge ${className}">${(0, html_1.escapeHtml)(level)}</span>`;
}
function riskRank(level) {
    if (level === 'High') {
        return 0;
    }
    if (level === 'Medium') {
        return 1;
    }
    return 2;
}
function flattenFunctions(files) {
    const rows = [];
    for (const file of files) {
        for (const fn of file.functions) {
            rows.push({ file, fn });
        }
    }
    return rows.sort((a, b) => {
        const rankDiff = riskRank(a.fn.risk.level) - riskRank(b.fn.risk.level);
        if (rankDiff !== 0) {
            return rankDiff;
        }
        return a.fn.risk.maintainabilityIndex - b.fn.risk.maintainabilityIndex;
    });
}
function buildHtml(files) {
    const rows = flattenFunctions(files);
    const totalFunctions = rows.length;
    const high = rows.filter((row) => row.fn.risk.level === 'High').length;
    const medium = rows.filter((row) => row.fn.risk.level === 'Medium').length;
    const low = rows.filter((row) => row.fn.risk.level === 'Low').length;
    const tableRows = rows.map(({ file, fn }) => `
    <tr>
      <td>${(0, html_1.escapeHtml)(file.fileName.split(/[\\/]/).pop() ?? file.fileName)}</td>
      <td>${(0, html_1.escapeHtml)(fn.functionName)}</td>
      <td>${badge(fn.risk.level)}</td>
      <td class="num">${fn.risk.maintainabilityIndex}</td>
      <td class="num">${fn.metrics.halsteadVolume}</td>
      <td class="num">${fn.metrics.cyclomaticComplexity}</td>
      <td class="num">${fn.metrics.loc}</td>
      <td>${(0, html_1.escapeHtml)(fn.risk.deterministicExplanation.join(' '))}</td>
    </tr>`).join('');
    const parseErrors = files.filter((file) => file.parseError).map((file) => `
    <li><strong>${(0, html_1.escapeHtml)(file.fileName)}</strong>: ${(0, html_1.escapeHtml)(file.parseError ?? '')}</li>`).join('');
    return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Maintainability Summary</title>
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 16px; }
  .cards { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 12px; margin-bottom: 18px; }
  .card { border: 1px solid var(--vscode-panel-border); border-radius: 8px; padding: 12px; background: var(--vscode-editor-background); }
  .card .value { font-size: 26px; font-weight: 700; }
  .card .label { opacity: .8; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border-bottom: 1px solid var(--vscode-panel-border); padding: 8px; text-align: left; vertical-align: top; }
  th { position: sticky; top: 0; background: var(--vscode-editor-background); }
  .num { text-align: right; }
  .badge { padding: 2px 8px; border-radius: 999px; font-weight: 700; }
  .badge.high { color: var(--vscode-errorForeground); border: 1px solid var(--vscode-errorForeground); }
  .badge.medium { color: var(--vscode-editorWarning-foreground); border: 1px solid var(--vscode-editorWarning-foreground); }
  .badge.low { color: var(--vscode-terminal-ansiGreen); border: 1px solid var(--vscode-terminal-ansiGreen); }
  .note { opacity: .8; margin-bottom: 16px; }
</style>
</head>
<body>
  <h1>Maintainability Summary</h1>
  <p class="note">Maintainability Index dan risk level dihitung secara deterministik dari Halstead Volume, Cyclomatic Complexity, dan Lines of Code. LLM hanya digunakan untuk menjelaskan hasil analisis.</p>
  <div class="cards">
    <div class="card"><div class="value">${totalFunctions}</div><div class="label">Fungsi dianalisis</div></div>
    <div class="card"><div class="value">${high}</div><div class="label">High Risk</div></div>
    <div class="card"><div class="value">${medium}</div><div class="label">Medium Risk</div></div>
    <div class="card"><div class="value">${low}</div><div class="label">Low Risk</div></div>
  </div>
  ${parseErrors ? `<h2>Parse Error</h2><ul>${parseErrors}</ul>` : ''}
  <h2>Daftar Fungsi</h2>
  <table>
    <thead>
      <tr>
        <th>File</th><th>Function</th><th>Risk</th><th>MI</th><th>HV</th><th>CC</th><th>LOC</th><th>Alasan</th>
      </tr>
    </thead>
    <tbody>${tableRows || '<tr><td colspan="8">Belum ada hasil analisis. Jalankan Analyze Current File atau Analyze Workspace.</td></tr>'}</tbody>
  </table>
</body>
</html>`;
}
function showSummaryPanel(context, store) {
    const panel = vscode.window.createWebviewPanel('maintainabilitySummary', 'Maintainability Summary', vscode.ViewColumn.Beside, { enableScripts: false, retainContextWhenHidden: true });
    panel.webview.html = buildHtml(store.getAllFiles());
}
//# sourceMappingURL=summaryPanel.js.map