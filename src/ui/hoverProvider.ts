import * as vscode from 'vscode';
import { AnalysisStore } from '../utils/store';

function commandUri(command: string): string {
  return `command:${command}`;
}

export class MaintainabilityHoverProvider implements vscode.HoverProvider {
  constructor(private readonly store: AnalysisStore) {}

  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
    const file = this.store.getFile(document.uri.toString());

    if (!file) {
      const md = new vscode.MarkdownString(undefined, true);
      md.isTrusted = {
        enabledCommands: ['maintainability.analyzeCurrentFile']
      };

      md.appendMarkdown('**Maintainability Risk Analyzer**\n\n');
      md.appendMarkdown('File ini belum dianalisis. Analisis biasanya berjalan otomatis saat file JavaScript dibuka atau diubah.\n\n');
      md.appendMarkdown(`[🔍 Analyze Now](${commandUri('maintainability.analyzeCurrentFile')})`);

      return new vscode.Hover(md);
    }

    const fn = file.functions.find((candidate) => candidate.location.range.contains(position));

    if (!fn) {
      return undefined;
    }

    this.store.setLastHoveredFunction(fn);

    const md = new vscode.MarkdownString(undefined, true);
    md.isTrusted = {
      enabledCommands: [
        'maintainability.explainRiskAt',
        'maintainability.showSummary',
        'maintainability.analyzeCurrentFile'
      ]
    };

    md.supportHtml = true;

    md.appendMarkdown(`**Maintainability Risk Analyzer**\n\n`);
    md.appendMarkdown(`Fungsi: \`${fn.functionName}\`  \n`);
    md.appendMarkdown(`Risk Level: **${fn.risk.level}**  \n`);
    md.appendMarkdown(`Maintainability Index: **${fn.risk.maintainabilityIndex}/100**\n\n`);

    md.appendMarkdown(`| Metric | Value |\n|---|---:|\n`);
    md.appendMarkdown(`| Halstead Volume | ${fn.metrics.halsteadVolume} |\n`);
    md.appendMarkdown(`| Cyclomatic Complexity | ${fn.metrics.cyclomaticComplexity} |\n`);
    md.appendMarkdown(`| Lines of Code | ${fn.metrics.loc} |\n\n`);

    md.appendMarkdown(`**Alasan deterministik:**\n`);

    for (const reason of fn.risk.deterministicExplanation) {
      md.appendMarkdown(`- ${reason}\n`);
    }

    md.appendMarkdown(`\n---\n`);
    md.appendMarkdown(`[🤖 Explain Maintainability Risk](${commandUri('maintainability.explainRiskAt')})`);
    md.appendMarkdown(` &nbsp; `);
    md.appendMarkdown(`[📊 Show Summary](${commandUri('maintainability.showSummary')})`);

    return new vscode.Hover(md, fn.location.range);
  }
}
