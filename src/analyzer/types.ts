import * as vscode from 'vscode';

export type SupportedDocumentLanguage = 'javascript';

export type RiskLevel = 'Low' | 'Medium' | 'High';

export interface AnalyzerSettings {
  showLowRiskDiagnostics: boolean;
  analyzeOnSave: boolean;
  llm: {
    model: string;
    maxSnippetCharacters: number;
    proxyEndpoint: string;
    proxyToken: string;
    requestTimeoutMs: number;
  };
  privacy: {
    sendCodeToLLM: boolean;
  };
}

export interface FunctionLocation {
  uri: string;
  fileName: string;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  range: vscode.Range;
}

export interface HalsteadMetrics {
  uniqueOperators: number;
  uniqueOperands: number;
  totalOperators: number;
  totalOperands: number;
  vocabulary: number;
  length: number;
  volume: number;
}

export interface RawMetrics {
  halsteadVolume: number;
  halstead: HalsteadMetrics;
  cyclomaticComplexity: number;
  loc: number;
}

export interface MetricViolation {
  metric: 'maintainabilityIndex';
  value: number;
  warningThreshold: number;
  highThreshold: number;
  level: 'warning' | 'high';
  message: string;
}

export interface RiskResult {
  level: RiskLevel;
  /**
   * Backward-compatible numeric field for sorting/export.
   * Nilainya sama dengan Maintainability Index. Semakin tinggi semakin maintainable.
   */
  score: number;
  maintainabilityIndex: number;
  violations: MetricViolation[];
  deterministicExplanation: string[];
}

export interface FunctionAnalysisResult {
  id: string;
  functionName: string;
  kind: string;
  location: FunctionLocation;
  snippet: string;
  metrics: RawMetrics;
  risk: RiskResult;
}

export interface FileAnalysisResult {
  uri: string;
  fileName: string;
  analyzedAt: string;
  parseError?: string;
  dependencies: string[];
  functions: FunctionAnalysisResult[];
}

export interface WorkspaceAnalysisResult {
  analyzedAt: string;
  files: FileAnalysisResult[];
}
