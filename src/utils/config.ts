import * as vscode from 'vscode';
import { AnalyzerSettings } from '../analyzer/types';

function getNumber(config: vscode.WorkspaceConfiguration, key: string, fallback: number): number {
  const value = config.get<number>(key);
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function getBoolean(config: vscode.WorkspaceConfiguration, key: string, fallback: boolean): boolean {
  const value = config.get<boolean>(key);
  return typeof value === 'boolean' ? value : fallback;
}

function getString(config: vscode.WorkspaceConfiguration, key: string, fallback: string): string {
  const value = config.get<string>(key);
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

export function getAnalyzerSettings(): AnalyzerSettings {
  const config = vscode.workspace.getConfiguration('maintainabilityRiskAnalyzer');

  return {
    showLowRiskDiagnostics: getBoolean(config, 'showLowRiskDiagnostics', false),
    analyzeOnSave: getBoolean(config, 'analyzeOnSave', true),
    llm: {
      model: getString(config, 'llm.model', 'gpt-4.1-mini'),
      maxSnippetCharacters: getNumber(config, 'llm.maxSnippetCharacters', 6000),
      proxyEndpoint: getString(config, 'llm.proxyEndpoint', 'https://maintainability-risk-proxy.vercel.app/api/explain'),
      proxyToken: getString(config, 'llm.proxyToken', ''),
      requestTimeoutMs: getNumber(config, 'llm.requestTimeoutMs', 30000)
    },
    privacy: {
      sendCodeToLLM: getBoolean(config, 'privacy.sendCodeToLLM', true)
    }
  };
}
