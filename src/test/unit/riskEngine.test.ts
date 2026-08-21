import assert from 'node:assert';

import { calculateRisk } from '../../analyzer/riskEngine';
import { AnalyzerSettings, RawMetrics } from '../../analyzer/types';
import { describe, it } from 'node:test';

const settings: AnalyzerSettings = {
  showLowRiskDiagnostics: false,
  analyzeOnSave: true,
  llm: {
    model: 'test-model',
    maxSnippetCharacters: 6000,
    proxyEndpoint: 'http://localhost/test',
    proxyToken: '',
    requestTimeoutMs: 30000
  },
  privacy: {
    sendCodeToLLM: true
  }
};

function createMetrics(
  halsteadVolume: number,
  cyclomaticComplexity: number,
  loc: number
): RawMetrics {
  return {
    halsteadVolume,
    cyclomaticComplexity,
    loc,
    halstead: {
      uniqueOperators: 1,
      uniqueOperands: 1,
      totalOperators: 1,
      totalOperands: 1,
      vocabulary: 2,
      length: 2,
      volume: halsteadVolume
    }
  };
}

function expectedMI(
  halsteadVolume: number,
  cyclomaticComplexity: number,
  loc: number
): number {
  const hv = Math.max(halsteadVolume, 1);
  const cc = Math.max(cyclomaticComplexity, 0);
  const lines = Math.max(loc, 1);

  const raw =
    171 -
    5.2 * Math.log(hv) -
    0.23 * cc -
    16.2 * Math.log(lines);

  return Math.round(
    Math.max(0, (raw * 100) / 171) * 100
  ) / 100;
}

describe('riskEngine', () => {

  it('should classify a highly maintainable function as Low Risk', () => {
    const metrics = createMetrics(1, 0, 1);

    const result = calculateRisk(metrics, settings);

    assert.strictEqual(
      result.maintainabilityIndex,
      expectedMI(1, 0, 1)
    );

    assert.strictEqual(result.level, 'Low');
    assert.strictEqual(result.violations.length, 0);
  });

  it('should classify a medium maintainability function as Medium Risk', () => {
    const metrics = createMetrics(5000, 30, 200);

    const result = calculateRisk(metrics, settings);

    assert.strictEqual(result.level, 'Medium');
    assert.ok(
      result.maintainabilityIndex >= 10 &&
      result.maintainabilityIndex < 20
    );

    assert.strictEqual(result.violations.length, 1);
    assert.strictEqual(result.violations[0].level, 'warning');
  });

  it('should classify a low maintainability function as High Risk', () => {
    const metrics = createMetrics(1000000, 100, 1000);

    const result = calculateRisk(metrics, settings);
    const expected = expectedMI(1000000, 100, 1000);

    assert.strictEqual(
      result.maintainabilityIndex,
      expected
    );

    assert.ok(expected < 10);
    assert.strictEqual(result.level, 'High');

    assert.strictEqual(result.violations.length, 1);
    assert.strictEqual(result.violations[0].level, 'high');
  });

  it('should return the Maintainability Index as the risk score', () => {
    const metrics = createMetrics(100, 5, 20);

    const result = calculateRisk(metrics, settings);

    assert.strictEqual(
      result.score,
      result.maintainabilityIndex
    );
  });

  it('should provide deterministic explanation based on the calculated metrics', () => {
    const metrics = createMetrics(100, 5, 20);

    const result = calculateRisk(metrics, settings);

    assert.ok(result.deterministicExplanation.length > 0);

    assert.ok(
      result.deterministicExplanation[0].includes('Halstead Volume 100')
    );

    assert.ok(
      result.deterministicExplanation[0].includes(
        'Cyclomatic Complexity 5'
      )
    );

    assert.ok(
      result.deterministicExplanation[0].includes('LOC 20')
    );
  });

});