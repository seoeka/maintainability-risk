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
exports.analyzeTextDocument = analyzeTextDocument;
const vscode = __importStar(require("vscode"));
const parser_1 = require("@babel/parser");
const dependencyAnalyzer_1 = require("./dependencyAnalyzer");
const astUtils_1 = require("./astUtils");
const metrics_1 = require("./metrics");
const riskEngine_1 = require("./riskEngine");
function isSupportedJavaScriptDocument(document) {
    const path = document.uri.fsPath.toLowerCase();
    return (document.languageId === 'javascript' ||
        path.endsWith('.js') ||
        path.endsWith('.mjs') ||
        path.endsWith('.cjs'));
}
function rangeFromNode(node) {
    const startLine = Math.max((node.loc?.start?.line ?? 1) - 1, 0);
    const startColumn = Math.max(node.loc?.start?.column ?? 0, 0);
    const endLine = Math.max((node.loc?.end?.line ??
        node.loc?.start?.line ??
        1) - 1, 0);
    const endColumn = Math.max(node.loc?.end?.column ?? startColumn, startColumn);
    return new vscode.Range(new vscode.Position(startLine, startColumn), new vscode.Position(endLine, endColumn));
}
function snippetFromNode(document, node) {
    return document.getText(rangeFromNode(node));
}
function analyzeTextDocument(document, settings) {
    if (!isSupportedJavaScriptDocument(document)) {
        return {
            uri: document.uri.toString(),
            fileName: document.fileName,
            analyzedAt: new Date().toISOString(),
            dependencies: [],
            functions: []
        };
    }
    const source = document.getText();
    try {
        const ast = (0, parser_1.parse)(source, {
            sourceType: 'unambiguous',
            plugins: ['jsx'],
            errorRecovery: true,
            ranges: true,
            tokens: false,
            allowReturnOutsideFunction: true
        });
        if (Array.isArray(ast.errors) &&
            ast.errors.length > 0) {
            const first = ast.errors[0];
            return {
                uri: document.uri.toString(),
                fileName: document.fileName,
                analyzedAt: new Date().toISOString(),
                parseError: `${first.reasonCode ?? 'ParseError'}: ` +
                    `${first.message ?? 'Kode tidak dapat diparse.'}`,
                dependencies: [],
                functions: []
            };
        }
        const programNode = ast.program;
        (0, astUtils_1.attachParents)(programNode);
        const dependencyResult = (0, dependencyAnalyzer_1.analyzeDependencies)(programNode);
        const functions = (0, astUtils_1.collectAnalyzableFunctions)(programNode);
        const analyzedFunctions = functions.map((fn, index) => {
            const parent = fn.__analysisParent;
            const functionName = (0, astUtils_1.getFunctionName)(fn, parent, index + 1);
            const metrics = (0, metrics_1.calculateFunctionMetrics)(fn, source);
            const risk = (0, riskEngine_1.calculateRisk)(metrics, settings);
            const range = rangeFromNode(fn);
            return {
                id: `${document.uri.toString()}#` +
                    `${functionName}:` +
                    `${range.start.line + 1}:` +
                    `${range.start.character}`,
                functionName,
                kind: fn.type,
                location: {
                    uri: document.uri.toString(),
                    fileName: document.fileName,
                    startLine: range.start.line + 1,
                    endLine: range.end.line + 1,
                    startColumn: range.start.character,
                    endColumn: range.end.character,
                    range
                },
                snippet: snippetFromNode(document, fn),
                metrics,
                risk
            };
        });
        return {
            uri: document.uri.toString(),
            fileName: document.fileName,
            analyzedAt: new Date().toISOString(),
            dependencies: dependencyResult.dependencies,
            functions: analyzedFunctions
        };
    }
    catch (error) {
        const message = error instanceof Error
            ? error.message
            : String(error);
        return {
            uri: document.uri.toString(),
            fileName: document.fileName,
            analyzedAt: new Date().toISOString(),
            parseError: message,
            dependencies: [],
            functions: []
        };
    }
}
//# sourceMappingURL=analyzeDocument.js.map