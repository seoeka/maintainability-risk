import * as vscode from 'vscode';
import { parse } from '@babel/parser';
import { AnalyzerSettings, FileAnalysisResult, FunctionAnalysisResult } from './types';
import { analyzeDependencies } from './dependencyAnalyzer';
import { attachParents, getFunctionName, isFunctionNode, walkAst } from './astUtils';
import { calculateFunctionMetrics } from './metrics';
import { calculateRisk } from './riskEngine';

type AnyNode = Record<string, any>;

function isSupportedJavaScriptDocument(document: vscode.TextDocument): boolean {
  const path = document.uri.fsPath.toLowerCase();
  return document.languageId === 'javascript' || path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.cjs');
}

function rangeFromNode(node: AnyNode): vscode.Range {
  const startLine = Math.max((node.loc?.start?.line ?? 1) - 1, 0);
  const startColumn = Math.max(node.loc?.start?.column ?? 0, 0);
  const endLine = Math.max((node.loc?.end?.line ?? node.loc?.start?.line ?? 1) - 1, 0);
  const endColumn = Math.max(node.loc?.end?.column ?? startColumn, startColumn);
  return new vscode.Range(new vscode.Position(startLine, startColumn), new vscode.Position(endLine, endColumn));
}

function snippetFromNode(document: vscode.TextDocument, node: AnyNode): string {
  return document.getText(rangeFromNode(node));
}

function collectAnalyzableFunctions(programNode: AnyNode): AnyNode[] {
  const functions: AnyNode[] = [];
  walkAst(programNode, (node, parent) => {
    if (!isFunctionNode(node)) {
      return;
    }

    // Hitung semua function, termasuk nested function, karena risiko maintainability dapat muncul di fungsi mana pun.
    const functionParent = parent;
    functions.push({ ...node, __analysisParent: functionParent });
  });
  return functions;
}

export function analyzeTextDocument(document: vscode.TextDocument, settings: AnalyzerSettings): FileAnalysisResult {
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
    const ast = parse(source, {
      sourceType: 'unambiguous',
      plugins: ['jsx'],
      errorRecovery: true,
      ranges: true,
      tokens: false,
      allowReturnOutsideFunction: true
    }) as unknown as AnyNode;

    if (Array.isArray(ast.errors) && ast.errors.length > 0) {
      const first = ast.errors[0];
      return {
        uri: document.uri.toString(),
        fileName: document.fileName,
        analyzedAt: new Date().toISOString(),
        parseError: `${first.reasonCode ?? 'ParseError'}: ${first.message ?? 'Kode tidak dapat diparse.'}`,
        dependencies: [],
        functions: []
      };
    }

    const programNode = ast.program;
    attachParents(programNode);
    const dependencyResult = analyzeDependencies(programNode);
    const functions = collectAnalyzableFunctions(programNode);

    const analyzedFunctions: FunctionAnalysisResult[] = functions.map((fn, index) => {
      const parent = fn.__analysisParent;
      const functionName = getFunctionName(fn, parent, index + 1);
      const metrics = calculateFunctionMetrics(fn, source);
      const risk = calculateRisk(metrics, settings);
      const range = rangeFromNode(fn);

      return {
        id: `${document.uri.toString()}#${functionName}:${range.start.line + 1}:${range.start.character}`,
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
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