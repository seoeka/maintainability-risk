"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const riskEngine_1 = require("../../analyzer/riskEngine");
const mocha_1 = require("mocha");
const settings = {
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
function createMetrics(halsteadVolume, cyclomaticComplexity, loc) {
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
function expectedMI(halsteadVolume, cyclomaticComplexity, loc) {
    const hv = Math.max(halsteadVolume, 1);
    const cc = Math.max(cyclomaticComplexity, 0);
    const lines = Math.max(loc, 1);
    const raw = 171 -
        5.2 * Math.log(hv) -
        0.23 * cc -
        16.2 * Math.log(lines);
    return Math.round(Math.max(0, (raw * 100) / 171) * 100) / 100;
}
(0, mocha_1.describe)('riskEngine', () => {
    (0, mocha_1.it)('should classify a highly maintainable function as Low Risk', () => {
        const metrics = createMetrics(1, 0, 1);
        const result = (0, riskEngine_1.calculateRisk)(metrics, settings);
        node_assert_1.default.strictEqual(result.maintainabilityIndex, expectedMI(1, 0, 1));
        node_assert_1.default.strictEqual(result.level, 'Low');
        node_assert_1.default.strictEqual(result.violations.length, 0);
    });
    (0, mocha_1.it)('should classify a medium maintainability function as Medium Risk', () => {
        const metrics = createMetrics(5000, 30, 200);
        const result = (0, riskEngine_1.calculateRisk)(metrics, settings);
        node_assert_1.default.strictEqual(result.level, 'Medium');
        node_assert_1.default.ok(result.maintainabilityIndex >= 10 &&
            result.maintainabilityIndex < 20);
        node_assert_1.default.strictEqual(result.violations.length, 1);
        node_assert_1.default.strictEqual(result.violations[0].level, 'warning');
    });
    (0, mocha_1.it)('should classify a low maintainability function as High Risk', () => {
        const metrics = createMetrics(1000000, 100, 1000);
        const result = (0, riskEngine_1.calculateRisk)(metrics, settings);
        const expected = expectedMI(1000000, 100, 1000);
        node_assert_1.default.strictEqual(result.maintainabilityIndex, expected);
        node_assert_1.default.ok(expected < 10);
        node_assert_1.default.strictEqual(result.level, 'High');
        node_assert_1.default.strictEqual(result.violations.length, 1);
        node_assert_1.default.strictEqual(result.violations[0].level, 'high');
    });
    (0, mocha_1.it)('should return the Maintainability Index as the risk score', () => {
        const metrics = createMetrics(100, 5, 20);
        const result = (0, riskEngine_1.calculateRisk)(metrics, settings);
        node_assert_1.default.strictEqual(result.score, result.maintainabilityIndex);
    });
    (0, mocha_1.it)('should provide deterministic explanation based on the calculated metrics', () => {
        const metrics = createMetrics(100, 5, 20);
        const result = (0, riskEngine_1.calculateRisk)(metrics, settings);
        node_assert_1.default.ok(result.deterministicExplanation.length > 0);
        node_assert_1.default.ok(result.deterministicExplanation[0].includes('Halstead Volume 100'));
        node_assert_1.default.ok(result.deterministicExplanation[0].includes('Cyclomatic Complexity 5'));
        node_assert_1.default.ok(result.deterministicExplanation[0].includes('LOC 20'));
    });
});
//# sourceMappingURL=riskEngine.test.js.map