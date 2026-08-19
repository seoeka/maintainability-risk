import * as vscode from 'vscode';
import { FileAnalysisResult } from '../analyzer/types';

export class RiskDecorationManager implements vscode.Disposable {
  private readonly highRiskDecoration = vscode.window.createTextEditorDecorationType({
    overviewRulerColor: new vscode.ThemeColor('errorForeground'),
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    borderWidth: '0 0 0 3px',
    borderStyle: 'solid',
    borderColor: new vscode.ThemeColor('errorForeground'),
    backgroundColor: new vscode.ThemeColor('editorError.background')
  });

  private readonly mediumRiskDecoration = vscode.window.createTextEditorDecorationType({
    overviewRulerColor: new vscode.ThemeColor('editorWarning.foreground'),
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    borderWidth: '0 0 0 3px',
    borderStyle: 'solid',
    borderColor: new vscode.ThemeColor('editorWarning.foreground'),
    backgroundColor: new vscode.ThemeColor('editorWarning.background')
  });

  update(editor: vscode.TextEditor | undefined, file?: FileAnalysisResult): void {
    if (!editor || !file || editor.document.uri.toString() !== file.uri) {
      return;
    }

    const highRanges = file.functions
      .filter((fn) => fn.risk.level === 'High')
      .map((fn) => fn.location.range);
    const mediumRanges = file.functions
      .filter((fn) => fn.risk.level === 'Medium')
      .map((fn) => fn.location.range);

    editor.setDecorations(this.highRiskDecoration, highRanges);
    editor.setDecorations(this.mediumRiskDecoration, mediumRanges);
  }

  clear(editor: vscode.TextEditor | undefined): void {
    if (!editor) {
      return;
    }
    editor.setDecorations(this.highRiskDecoration, []);
    editor.setDecorations(this.mediumRiskDecoration, []);
  }

  dispose(): void {
    this.highRiskDecoration.dispose();
    this.mediumRiskDecoration.dispose();
  }
}
