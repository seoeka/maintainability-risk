import * as vscode from 'vscode';
import { FileAnalysisResult, FunctionAnalysisResult, WorkspaceAnalysisResult } from '../analyzer/types';

export class AnalysisStore {
  private readonly files = new Map<string, FileAnalysisResult>();
  private lastHoveredFunction?: FunctionAnalysisResult;

  upsert(file: FileAnalysisResult): void {
    this.files.set(file.uri, file);
  }

  remove(uri: string): void {
    this.files.delete(uri);

    if (this.lastHoveredFunction?.location.uri === uri) {
      this.lastHoveredFunction = undefined;
    }
  }

  getFile(uri: string): FileAnalysisResult | undefined {
    return this.files.get(uri);
  }

  getAllFiles(): FileAnalysisResult[] {
    return Array.from(this.files.values()).sort((a, b) => a.fileName.localeCompare(b.fileName));
  }

  getWorkspaceResult(): WorkspaceAnalysisResult {
    return {
      analyzedAt: new Date().toISOString(),
      files: this.getAllFiles()
    };
  }

  findFunctionById(uri: string, id: string): FunctionAnalysisResult | undefined {
    const file = this.getFile(uri);
    return file?.functions.find((fn) => fn.id === id);
  }

  findFunctionAt(uri: string, position: vscode.Position): FunctionAnalysisResult | undefined {
    const file = this.getFile(uri);

    if (!file) {
      return undefined;
    }

    return file.functions.find((fn) => fn.location.range.contains(position));
  }

  setLastHoveredFunction(fn: FunctionAnalysisResult): void {
    this.lastHoveredFunction = fn;
  }

  getLastHoveredFunction(): FunctionAnalysisResult | undefined {
    return this.lastHoveredFunction;
  }
}