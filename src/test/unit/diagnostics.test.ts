import assert from 'node:assert';
import { describe, it } from 'node:test';

import { createDiagnostics } from '../../ui/diagnostics';
import { AnalyzerSettings } from '../../analyzer/types';

const settings: AnalyzerSettings = {
  showLowRiskDiagnostics: false,
  analyzeOnSave: true,

  llm: {
    model: 'test-model',
    maxSnippetCharacters: 6000,
    proxyEndpoint: '',
    proxyToken: '',
    requestTimeoutMs: 30000
  },

  privacy: {
    sendCodeToLLM: true
  }
};

function analysis(
  level: 'Low' | 'Medium' | 'High'
): any {
  return {
    uri: 'file:///test/example.js',
    fileName: 'example.js',
    analyzedAt: new Date().toISOString(),

    functions: [
      {
        functionName: 'testFunction',

        location: {
          uri: 'file:///test/example.js',
          fileName: 'example.js',

          startLine: 1,
          endLine: 5,
          startColumn: 0,
          endColumn: 10,

          range: {}
        },

        risk: {
          level,

          maintainabilityIndex:
            level === 'Low'
              ? 80
              : level === 'Medium'
                ? 50
                : 20,

          violations: [],
          deterministicExplanation: []
        },

        metrics: {
          halsteadVolume: 100,
          cyclomaticComplexity: 5,
          loc: 10,
          halstead: {}
        }
      }
    ],

    dependencies: []
  };
}

describe('diagnostics', () => {

  it('should create diagnostic for Medium Risk', () => {
    const result = createDiagnostics(
      analysis('Medium'),
      false
    );

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].severity, 1);
  });

  it('should create diagnostic for High Risk', () => {
    const result = createDiagnostics(
      analysis('High'),
      false
    );

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].severity, 0);
  });

  it('should hide Low Risk diagnostic when disabled', () => {
    const result = createDiagnostics(
      analysis('Low'),
      false
    );

    assert.strictEqual(result.length, 0);
  });

  it('should show Low Risk diagnostic when enabled', () => {
    const result = createDiagnostics(
      analysis('Low'),
      true
    );

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].severity, 2);
  });

  it('should include function name in diagnostic message', () => {
    const result = createDiagnostics(
      analysis('High'),
      false
    );

    assert.strictEqual(result.length, 1);

    assert.ok(
      result[0].message.includes('testFunction')
    );
  });

  it('should include maintainability metrics in diagnostic message', () => {
    const result = createDiagnostics(
      analysis('Medium'),
      false
    );

    assert.strictEqual(result.length, 1);

    assert.ok(result[0].message.includes('MI'));
    assert.ok(result[0].message.includes('HV'));
    assert.ok(result[0].message.includes('CC'));
    assert.ok(result[0].message.includes('LOC'));
  });

  it('should set diagnostic source', () => {
    const result = createDiagnostics(
      analysis('High'),
      false
    );

    assert.strictEqual(
      result[0].source,
      'Maintainability Risk Analyzer'
    );
  });

  it('should set diagnostic code', () => {
    const result = createDiagnostics(
      analysis('High'),
      false
    );

    assert.strictEqual(
      result[0].code,
      'maintainability-index-risk'
    );
  });

  it('should create error diagnostic for parse error', () => {
    const file = {
      uri: 'file:///test/example.js',
      fileName: 'example.js',
      analyzedAt: new Date().toISOString(),

      parseError: 'Unexpected token',

      functions: [],
      dependencies: []
    };

    const result = createDiagnostics(
      file,
      false
    );

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].severity, 0);

    assert.ok(
      result[0].message.includes('Unexpected token')
    );
  });

});