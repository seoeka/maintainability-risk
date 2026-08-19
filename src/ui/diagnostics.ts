import * as vscode from 'vscode';
import { FileAnalysisResult, FunctionAnalysisResult } from '../analyzer/types';

const sourceName = 'Maintainability Risk Analyzer';

function severityOf(fn: FunctionAnalysisResult, showLowRisk: boolean): vscode.DiagnosticSeverity | undefined {
  if (fn.risk.level === 'High') {
    return vscode.DiagnosticSeverity.Error;
  }
  if (fn.risk.level === 'Medium') {
    return vscode.DiagnosticSeverity.Warning;
  }
  if (showLowRisk) {
    return vscode.DiagnosticSeverity.Information;
  }
  return undefined;
}

export function createDiagnostics(file: FileAnalysisResult, showLowRisk: boolean): vscode.Diagnostic[] {
  if (file.parseError) {
    return [
      new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 1),
        `Kode JavaScript tidak dapat dianalisis: ${file.parseError}`,
        vscode.DiagnosticSeverity.Error
      )
    ];
  }

  const diagnostics: vscode.Diagnostic[] = [];

  for (const fn of file.functions) {
    const severity = severityOf(fn, showLowRisk);
    if (severity === undefined) {
      continue;
    }

    const metricText = `MI ${fn.risk.maintainabilityIndex}/100, HV ${fn.metrics.halsteadVolume}, CC ${fn.metrics.cyclomaticComplexity}, LOC ${fn.metrics.loc}`;
    const message = `${fn.risk.level} maintainability risk pada fungsi ${fn.functionName}. ${metricText}.`;
    const diagnostic = new vscode.Diagnostic(fn.location.range, message, severity);
    diagnostic.source = sourceName;
    diagnostic.code = 'maintainability-index-risk';
    diagnostics.push(diagnostic);
  }

  return diagnostics;
}
