import * as vscode from 'vscode';
import { FunctionAnalysisResult } from './analyzer/types';
import { analyzeTextDocument } from './analyzer/analyzeDocument';
import { getAnalyzerSettings } from './utils/config';
import { AnalysisStore } from './utils/store';
import { createDiagnostics } from './ui/diagnostics';
import { RiskDecorationManager } from './ui/decorations';
import { MaintainabilityHoverProvider } from './ui/hoverProvider';
import { showSummaryPanel } from './ui/summaryPanel';
import { showExplanationPanel } from './ui/explanationPanel';
import { explainWithLLM, testLLMProxy } from './llm/llmClient';

const store = new AnalysisStore();
let diagnostics: vscode.DiagnosticCollection;
let decorations: RiskDecorationManager;
const pendingAnalyses = new Map<string, NodeJS.Timeout>();

function isJavaScriptDocument(document: vscode.TextDocument): boolean {
  const path = document.uri.fsPath.toLowerCase();
  return document.languageId === 'javascript' || path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.cjs');
}

function updateVisibleDecorations(document: vscode.TextDocument): void {
  const file = store.getFile(document.uri.toString());
  for (const editor of vscode.window.visibleTextEditors) {
    if (editor.document.uri.toString() === document.uri.toString()) {
      decorations.update(editor, file);
    }
  }
}

async function analyzeDocument(document: vscode.TextDocument): Promise<void> {
  if (!isJavaScriptDocument(document)) {
    return;
  }

  const settings = getAnalyzerSettings();
  const result = analyzeTextDocument(document, settings);

  store.upsert(result);
  diagnostics.set(document.uri, createDiagnostics(result, settings.showLowRiskDiagnostics));
  updateVisibleDecorations(document);
}

function scheduleAnalyzeDocument(document: vscode.TextDocument, delayMs = 350): void {
  if (!isJavaScriptDocument(document)) {
    return;
  }

  const key = document.uri.toString();
  const existing = pendingAnalyses.get(key);
  if (existing) {
    clearTimeout(existing);
  }

  const timer = setTimeout(() => {
    pendingAnalyses.delete(key);
    void analyzeDocument(document);
  }, delayMs);

  pendingAnalyses.set(key, timer);
}

async function ensureDocumentAnalyzed(document: vscode.TextDocument): Promise<void> {
  if (!store.getFile(document.uri.toString())) {
    await analyzeDocument(document!);
  }
}

async function analyzeCurrentFile(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('Tidak ada editor aktif.');
    return;
  }

  if (!isJavaScriptDocument(editor.document)) {
    vscode.window.showWarningMessage('File aktif bukan file JavaScript (.js/.mjs/.cjs).');
    return;
  }

  await analyzeDocument(editor.document);

  const file = store.getFile(editor.document.uri.toString());
  const functionCount = file?.functions.length ?? 0;
  vscode.window.showInformationMessage(`Analisis selesai: ${functionCount} fungsi JavaScript dianalisis.`);
}

async function analyzeWorkspace(): Promise<void> {
  const files = await vscode.workspace.findFiles('**/*.{js,mjs,cjs}', '**/{node_modules,dist,build,out,coverage}/**');

  if (files.length === 0) {
    vscode.window.showWarningMessage('Tidak ada file JavaScript yang ditemukan pada workspace.');
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Maintainability Risk Analyzer: menganalisis workspace...',
      cancellable: false
    },
    async (progress) => {
      let index = 0;

      for (const uri of files) {
        index += 1;
        progress.report({ message: `${index}/${files.length} ${uri.fsPath.split(/[\\/]/).pop()}` });

        const document = await vscode.workspace.openTextDocument(uri);
        await analyzeDocument(document!);
      }
    }
  );

  const totalFunctions = store.getAllFiles().reduce((sum, file) => sum + file.functions.length, 0);
  vscode.window.showInformationMessage(`Analisis workspace selesai: ${files.length} file, ${totalFunctions} fungsi dianalisis.`);
}

async function explainFunction(fn: FunctionAnalysisResult): Promise<void> {
  const settings = getAnalyzerSettings();

  const explanation = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Membuat penjelasan maintainability risk...',
      cancellable: false
    },
    () => explainWithLLM(fn, settings)
  );

  showExplanationPanel(fn, explanation);
}

async function explainRisk(_context: vscode.ExtensionContext): Promise<void> {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showWarningMessage('Tidak ada editor aktif.');
    return;
  }

  await ensureDocumentAnalyzed(editor.document);

  const position = editor.selection.active;
  const fn = store.findFunctionAt(editor.document.uri.toString(), position);

  if (!fn) {
    vscode.window.showWarningMessage('Letakkan kursor di dalam fungsi JavaScript yang sudah dianalisis.');
    return;
  }

  await explainFunction(fn);
}

type ExplainRiskAtArg = {
  uri?: string;
  functionId?: string;
  functionName?: string;
  startLine?: number;
  endLine?: number;
  startColumn?: number;
  endColumn?: number;
};

function normalizeExplainRiskAtArg(raw?: unknown): ExplainRiskAtArg | undefined {
  if (!raw) {
    return undefined;
  }

  if (Array.isArray(raw)) {
    return normalizeExplainRiskAtArg(raw[0]);
  }

  if (typeof raw === 'string') {
    try {
      return normalizeExplainRiskAtArg(JSON.parse(raw));
    } catch {
      return undefined;
    }
  }

  if (typeof raw === 'object') {
    return raw as ExplainRiskAtArg;
  }

  return undefined;
}

async function explainRiskAt(rawArg?: unknown): Promise<void> {
  const arg = normalizeExplainRiskAtArg(rawArg);
  let fn: FunctionAnalysisResult | undefined;

  // Kalau argumen dari command URL masuk, tetap coba pakai.
  if (arg?.uri) {
    const targetUriString = arg.uri;
    let document: vscode.TextDocument | undefined;

    const visibleEditor = vscode.window.visibleTextEditors.find(
      (editor) => editor.document.uri.toString() === targetUriString
    );

    if (visibleEditor) {
      document = visibleEditor.document;
    } else {
      document = await vscode.workspace.openTextDocument(vscode.Uri.parse(targetUriString));
    }

    await analyzeDocument(document!);

    const file = store.getFile(targetUriString);

    if (arg.functionId) {
      fn = store.findFunctionById(targetUriString, arg.functionId);
    }

    if (!fn && file && typeof arg.startLine === 'number') {
      fn = file.functions.find((candidate) => {
        const sameName = arg.functionName ? candidate.functionName === arg.functionName : true;
        const sameStart = candidate.location.startLine === arg.startLine;
        return sameName && sameStart;
      });
    }

    if (!fn && file && typeof arg.startLine === 'number') {
      fn = file.functions.find((candidate) => {
        return arg.startLine! >= candidate.location.startLine && arg.startLine! <= candidate.location.endLine;
      });
    }
  }

  // Ini yang penting: kalau argumen gagal, ambil fungsi terakhir yang di-hover.
  if (!fn) {
    fn = store.getLastHoveredFunction();
  }

  // Fallback terakhir: cari dari posisi kursor aktif.
  if (!fn) {
    const activeEditor = vscode.window.activeTextEditor;

    if (activeEditor) {
      await ensureDocumentAnalyzed(activeEditor.document);
      fn = store.findFunctionAt(activeEditor.document.uri.toString(), activeEditor.selection.active);
    }
  }

  if (!fn) {
    vscode.window.showWarningMessage(
      'Fungsi tidak ditemukan. Arahkan mouse ke fungsi yang terkena highlight sampai hover muncul, lalu klik Explain Maintainability Risk.'
    );
    return;
  }

  await explainFunction(fn);
}

async function exportReport(): Promise<void> {
  const target = await vscode.window.showSaveDialog({
    title: 'Export Maintainability Report',
    defaultUri: vscode.Uri.file('maintainability-report.json'),
    filters: { JSON: ['json'] }
  });

  if (!target) {
    return;
  }

  const serializable = JSON.stringify(
    store.getWorkspaceResult(),
    (_key, value) => {
      if (value instanceof vscode.Range) {
        return {
          start: { line: value.start.line, character: value.start.character },
          end: { line: value.end.line, character: value.end.character }
        };
      }
      return value;
    },
    2
  );

  await vscode.workspace.fs.writeFile(target, Buffer.from(serializable, 'utf8'));
  vscode.window.showInformationMessage(`Report berhasil diekspor: ${target.fsPath}`);
}

export function activate(context: vscode.ExtensionContext): void {
  diagnostics = vscode.languages.createDiagnosticCollection('maintainability-risk-analyzer');
  decorations = new RiskDecorationManager();

  context.subscriptions.push(
    diagnostics,
    decorations,

    vscode.commands.registerCommand('maintainability.analyzeCurrentFile', analyzeCurrentFile),
    vscode.commands.registerCommand('maintainability.analyzeWorkspace', analyzeWorkspace),
    vscode.commands.registerCommand('maintainability.showSummary', () => showSummaryPanel(context, store)),
    vscode.commands.registerCommand('maintainability.explainRisk', () => explainRisk(context)),
    vscode.commands.registerCommand('maintainability.explainRiskAt', explainRiskAt),

    vscode.commands.registerCommand('maintainability.testLLMProxy', async () => {
      const result = await testLLMProxy(getAnalyzerSettings());

      if (result.ok) {
        vscode.window.showInformationMessage(result.message);
      } else {
        vscode.window.showWarningMessage(result.message);
      }
    }),

    vscode.commands.registerCommand('maintainability.exportReport', exportReport),

    vscode.languages.registerHoverProvider(
      { language: 'javascript' },
      new MaintainabilityHoverProvider(store)
    ),

    vscode.workspace.onDidOpenTextDocument((document) => {
      if (isJavaScriptDocument(document)) {
        scheduleAnalyzeDocument(document, 0);
      }
    }),

    vscode.workspace.onDidChangeTextDocument((event) => {
      if (isJavaScriptDocument(event.document)) {
        scheduleAnalyzeDocument(event.document, 350);
      }
    }),

    vscode.workspace.onDidSaveTextDocument((document) => {
      const settings = getAnalyzerSettings();

      if (settings.analyzeOnSave && isJavaScriptDocument(document)) {
        void analyzeDocument(document);
      }
    }),

    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (!editor) {
        return;
      }

      if (isJavaScriptDocument(editor.document)) {
        scheduleAnalyzeDocument(editor.document, 0);
      }

      updateVisibleDecorations(editor.document);
    }),

    vscode.workspace.onDidCloseTextDocument((document) => {
      const key = document.uri.toString();
      const pending = pendingAnalyses.get(key);

      if (pending) {
        clearTimeout(pending);
        pendingAnalyses.delete(key);
      }

      diagnostics.delete(document.uri);
      store.remove(key);
    })
  );

  for (const editor of vscode.window.visibleTextEditors) {
    if (isJavaScriptDocument(editor.document)) {
      scheduleAnalyzeDocument(editor.document, 0);
    }
  }

  if (vscode.window.activeTextEditor && isJavaScriptDocument(vscode.window.activeTextEditor.document)) {
    scheduleAnalyzeDocument(vscode.window.activeTextEditor.document, 0);
  }
}

export function deactivate(): void {
  for (const timer of pendingAnalyses.values()) {
    clearTimeout(timer);
  }

  pendingAnalyses.clear();
  diagnostics?.dispose();
  decorations?.dispose();
}