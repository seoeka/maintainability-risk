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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const analyzeDocument_1 = require("./analyzer/analyzeDocument");
const config_1 = require("./utils/config");
const store_1 = require("./utils/store");
const diagnostics_1 = require("./ui/diagnostics");
const decorations_1 = require("./ui/decorations");
const hoverProvider_1 = require("./ui/hoverProvider");
const summaryPanel_1 = require("./ui/summaryPanel");
const explanationPanel_1 = require("./ui/explanationPanel");
const llmClient_1 = require("./llm/llmClient");
const store = new store_1.AnalysisStore();
let diagnostics;
let decorations;
const pendingAnalyses = new Map();
function isJavaScriptDocument(document) {
    const path = document.uri.fsPath.toLowerCase();
    return document.languageId === 'javascript' || path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.cjs');
}
function updateVisibleDecorations(document) {
    const file = store.getFile(document.uri.toString());
    for (const editor of vscode.window.visibleTextEditors) {
        if (editor.document.uri.toString() === document.uri.toString()) {
            decorations.update(editor, file);
        }
    }
}
async function analyzeDocument(document) {
    if (!isJavaScriptDocument(document)) {
        return;
    }
    const settings = (0, config_1.getAnalyzerSettings)();
    const result = (0, analyzeDocument_1.analyzeTextDocument)(document, settings);
    store.upsert(result);
    diagnostics.set(document.uri, (0, diagnostics_1.createDiagnostics)(result, settings.showLowRiskDiagnostics));
    updateVisibleDecorations(document);
}
function scheduleAnalyzeDocument(document, delayMs = 350) {
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
async function ensureDocumentAnalyzed(document) {
    if (!store.getFile(document.uri.toString())) {
        await analyzeDocument(document);
    }
}
async function analyzeCurrentFile() {
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
async function analyzeWorkspace() {
    const files = await vscode.workspace.findFiles('**/*.{js,mjs,cjs}', '**/{node_modules,dist,build,out,coverage}/**');
    if (files.length === 0) {
        vscode.window.showWarningMessage('Tidak ada file JavaScript yang ditemukan pada workspace.');
        return;
    }
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Maintainability Risk Analyzer: menganalisis workspace...',
        cancellable: false
    }, async (progress) => {
        let index = 0;
        for (const uri of files) {
            index += 1;
            progress.report({ message: `${index}/${files.length} ${uri.fsPath.split(/[\\/]/).pop()}` });
            const document = await vscode.workspace.openTextDocument(uri);
            await analyzeDocument(document);
        }
    });
    const totalFunctions = store.getAllFiles().reduce((sum, file) => sum + file.functions.length, 0);
    vscode.window.showInformationMessage(`Analisis workspace selesai: ${files.length} file, ${totalFunctions} fungsi dianalisis.`);
}
async function explainFunction(fn) {
    const settings = (0, config_1.getAnalyzerSettings)();
    const explanation = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Membuat penjelasan maintainability risk...',
        cancellable: false
    }, () => (0, llmClient_1.explainWithLLM)(fn, settings));
    (0, explanationPanel_1.showExplanationPanel)(fn, explanation);
}
async function explainRisk(_context) {
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
function normalizeExplainRiskAtArg(raw) {
    if (!raw) {
        return undefined;
    }
    if (Array.isArray(raw)) {
        return normalizeExplainRiskAtArg(raw[0]);
    }
    if (typeof raw === 'string') {
        try {
            return normalizeExplainRiskAtArg(JSON.parse(raw));
        }
        catch {
            return undefined;
        }
    }
    if (typeof raw === 'object') {
        return raw;
    }
    return undefined;
}
async function explainRiskAt(rawArg) {
    const arg = normalizeExplainRiskAtArg(rawArg);
    let fn;
    // Kalau argumen dari command URL masuk, tetap coba pakai.
    if (arg?.uri) {
        const targetUriString = arg.uri;
        let document;
        const visibleEditor = vscode.window.visibleTextEditors.find((editor) => editor.document.uri.toString() === targetUriString);
        if (visibleEditor) {
            document = visibleEditor.document;
        }
        else {
            document = await vscode.workspace.openTextDocument(vscode.Uri.parse(targetUriString));
        }
        await analyzeDocument(document);
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
                return arg.startLine >= candidate.location.startLine && arg.startLine <= candidate.location.endLine;
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
        vscode.window.showWarningMessage('Fungsi tidak ditemukan. Arahkan mouse ke fungsi yang terkena highlight sampai hover muncul, lalu klik Explain Maintainability Risk.');
        return;
    }
    await explainFunction(fn);
}
async function exportReport() {
    const target = await vscode.window.showSaveDialog({
        title: 'Export Maintainability Report',
        defaultUri: vscode.Uri.file('maintainability-report.json'),
        filters: { JSON: ['json'] }
    });
    if (!target) {
        return;
    }
    const serializable = JSON.stringify(store.getWorkspaceResult(), (_key, value) => {
        if (value instanceof vscode.Range) {
            return {
                start: { line: value.start.line, character: value.start.character },
                end: { line: value.end.line, character: value.end.character }
            };
        }
        return value;
    }, 2);
    await vscode.workspace.fs.writeFile(target, Buffer.from(serializable, 'utf8'));
    vscode.window.showInformationMessage(`Report berhasil diekspor: ${target.fsPath}`);
}
function activate(context) {
    diagnostics = vscode.languages.createDiagnosticCollection('maintainability-risk-analyzer');
    decorations = new decorations_1.RiskDecorationManager();
    context.subscriptions.push(diagnostics, decorations, vscode.commands.registerCommand('maintainability.analyzeCurrentFile', analyzeCurrentFile), vscode.commands.registerCommand('maintainability.analyzeWorkspace', analyzeWorkspace), vscode.commands.registerCommand('maintainability.showSummary', () => (0, summaryPanel_1.showSummaryPanel)(context, store)), vscode.commands.registerCommand('maintainability.explainRisk', () => explainRisk(context)), vscode.commands.registerCommand('maintainability.explainRiskAt', explainRiskAt), vscode.commands.registerCommand('maintainability.testLLMProxy', async () => {
        const result = await (0, llmClient_1.testLLMProxy)((0, config_1.getAnalyzerSettings)());
        if (result.ok) {
            vscode.window.showInformationMessage(result.message);
        }
        else {
            vscode.window.showWarningMessage(result.message);
        }
    }), vscode.commands.registerCommand('maintainability.exportReport', exportReport), vscode.languages.registerHoverProvider({ language: 'javascript' }, new hoverProvider_1.MaintainabilityHoverProvider(store)), vscode.workspace.onDidOpenTextDocument((document) => {
        if (isJavaScriptDocument(document)) {
            scheduleAnalyzeDocument(document, 0);
        }
    }), vscode.workspace.onDidChangeTextDocument((event) => {
        if (isJavaScriptDocument(event.document)) {
            scheduleAnalyzeDocument(event.document, 350);
        }
    }), vscode.workspace.onDidSaveTextDocument((document) => {
        const settings = (0, config_1.getAnalyzerSettings)();
        if (settings.analyzeOnSave && isJavaScriptDocument(document)) {
            void analyzeDocument(document);
        }
    }), vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (!editor) {
            return;
        }
        if (isJavaScriptDocument(editor.document)) {
            scheduleAnalyzeDocument(editor.document, 0);
        }
        updateVisibleDecorations(editor.document);
    }), vscode.workspace.onDidCloseTextDocument((document) => {
        const key = document.uri.toString();
        const pending = pendingAnalyses.get(key);
        if (pending) {
            clearTimeout(pending);
            pendingAnalyses.delete(key);
        }
        diagnostics.delete(document.uri);
        store.remove(key);
    }));
    for (const editor of vscode.window.visibleTextEditors) {
        if (isJavaScriptDocument(editor.document)) {
            scheduleAnalyzeDocument(editor.document, 0);
        }
    }
    if (vscode.window.activeTextEditor && isJavaScriptDocument(vscode.window.activeTextEditor.document)) {
        scheduleAnalyzeDocument(vscode.window.activeTextEditor.document, 0);
    }
}
function deactivate() {
    for (const timer of pendingAnalyses.values()) {
        clearTimeout(timer);
    }
    pendingAnalyses.clear();
    diagnostics?.dispose();
    decorations?.dispose();
}
//# sourceMappingURL=extension.js.map