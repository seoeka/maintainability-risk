"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const parser_1 = require("@babel/parser");
const metrics_1 = require("../../analyzer/metrics");
const node_test_1 = require("node:test");
function parseFunction(source) {
    const ast = (0, parser_1.parse)(source, {
        sourceType: 'unambiguous'
    });
    return ast.program.body[0];
}
(0, node_test_1.describe)('metrics', () => {
    (0, node_test_1.it)('should calculate LOC correctly', () => {
        const source = `
function simple() {
  const value = 10;
  return value;
}
`;
        const functionNode = parseFunction(source);
        const result = (0, metrics_1.calculateFunctionMetrics)(functionNode, source);
        node_assert_1.default.strictEqual(result.loc, 4);
    });
    (0, node_test_1.it)('should calculate cyclomatic complexity for conditional code', () => {
        const source = `
function check(value) {
  if (value > 10) {
    return true;
  }

  return false;
}
`;
        const functionNode = parseFunction(source);
        const result = (0, metrics_1.calculateFunctionMetrics)(functionNode, source);
        node_assert_1.default.strictEqual(result.cyclomaticComplexity, 2);
    });
    (0, node_test_1.it)('should increase cyclomatic complexity for loops', () => {
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
        const result = (0, metrics_1.calculateFunctionMetrics)(functionNode, source);
        node_assert_1.default.strictEqual(result.cyclomaticComplexity, 3);
    });
    (0, node_test_1.it)('should calculate Halstead metrics', () => {
        const source = `
function add(a, b) {
  const result = a + b;
  return result;
}
`;
        const functionNode = parseFunction(source);
        const result = (0, metrics_1.calculateFunctionMetrics)(functionNode, source);
        node_assert_1.default.ok(result.halsteadVolume > 0);
        node_assert_1.default.ok(result.halstead.totalOperators > 0);
        node_assert_1.default.ok(result.halstead.totalOperands > 0);
        node_assert_1.default.ok(result.halstead.vocabulary > 0);
    });
    (0, node_test_1.it)('should return complete raw metrics', () => {
        const source = `
function example(value) {
  if (value) {
    return value + 1;
  }

  return 0;
}
`;
        const functionNode = parseFunction(source);
        const result = (0, metrics_1.calculateFunctionMetrics)(functionNode, source);
        node_assert_1.default.ok(typeof result.halsteadVolume === 'number');
        node_assert_1.default.ok(typeof result.cyclomaticComplexity === 'number');
        node_assert_1.default.ok(typeof result.loc === 'number');
        node_assert_1.default.ok(result.halstead);
    });
    (0, node_test_1.it)('should not count nested functions in the outer function metrics', () => {
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
        const result = (0, metrics_1.calculateFunctionMetrics)(functionNode, source);
        node_assert_1.default.strictEqual(result.cyclomaticComplexity, 1);
    });
});
//# sourceMappingURL=metrics.test.js.map