import assert from 'node:assert';
import { parse } from '@babel/parser';

import { calculateFunctionMetrics } from '../../analyzer/metrics';
import { describe, it } from 'node:test';

type AnyNode = Record<string, any>;

function parseFunction(source: string): AnyNode {
  const ast = parse(source, {
    sourceType: 'unambiguous'
  });

  return ast.program.body[0] as unknown as AnyNode;
}

describe('metrics', () => {

  it('should calculate LOC correctly', () => {
    const source = `
function simple() {
  const value = 10;
  return value;
}
`;

    const functionNode = parseFunction(source);
    const result = calculateFunctionMetrics(functionNode, source);

    assert.strictEqual(result.loc, 4);
  });

  it('should calculate cyclomatic complexity for conditional code', () => {
    const source = `
function check(value) {
  if (value > 10) {
    return true;
  }

  return false;
}
`;

    const functionNode = parseFunction(source);
    const result = calculateFunctionMetrics(functionNode, source);

    assert.strictEqual(result.cyclomaticComplexity, 2);
  });

  it('should increase cyclomatic complexity for loops', () => {
    const source = `
function calculate(items) {
  for (const item of items) {
    if (item.active) {
      console.log(item);
    }
  }
}
`;

    const functionNode = parseFunction(source);
    const result = calculateFunctionMetrics(functionNode, source);

    assert.strictEqual(result.cyclomaticComplexity, 3);
  });

  it('should calculate Halstead metrics', () => {
    const source = `
function add(a, b) {
  const result = a + b;
  return result;
}
`;

    const functionNode = parseFunction(source);
    const result = calculateFunctionMetrics(functionNode, source);

    assert.ok(result.halsteadVolume > 0);
    assert.ok(result.halstead.totalOperators > 0);
    assert.ok(result.halstead.totalOperands > 0);
    assert.ok(result.halstead.vocabulary > 0);
  });

  it('should return complete raw metrics', () => {
    const source = `
function example(value) {
  if (value) {
    return value + 1;
  }

  return 0;
}
`;

    const functionNode = parseFunction(source);
    const result = calculateFunctionMetrics(functionNode, source);

    assert.ok(typeof result.halsteadVolume === 'number');
    assert.ok(typeof result.cyclomaticComplexity === 'number');
    assert.ok(typeof result.loc === 'number');
    assert.ok(result.halstead);
  });

  it('should not count nested functions in the outer function metrics', () => {
    const source = `
function outer(value) {
  const helper = () => {
    if (value) {
      return true;
    }

    return false;
  };

  return helper();
}
`;

    const functionNode = parseFunction(source);
    const result = calculateFunctionMetrics(functionNode, source);

    assert.strictEqual(result.cyclomaticComplexity, 1);
  });
});