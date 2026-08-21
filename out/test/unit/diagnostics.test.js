"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = require("node:test");
const diagnostics_1 = require("../../ui/diagnostics");
const settings = {
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
function analysis(level) {
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
                    maintainabilityIndex: level === 'Low'
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
(0, node_test_1.describe)('diagnostics', () => {
    (0, node_test_1.it)('should create diagnostic for Medium Risk', () => {
        const result = (0, diagnostics_1.createDiagnostics)(analysis('Medium'), false);
        node_assert_1.default.strictEqual(result.length, 1);
        node_assert_1.default.strictEqual(result[0].severity, 1);
    });
    (0, node_test_1.it)('should create diagnostic for High Risk', () => {
        const result = (0, diagnostics_1.createDiagnostics)(analysis('High'), false);
        node_assert_1.default.strictEqual(result.length, 1);
        node_assert_1.default.strictEqual(result[0].severity, 0);
    });
    (0, node_test_1.it)('should hide Low Risk diagnostic when disabled', () => {
        const result = (0, diagnostics_1.createDiagnostics)(analysis('Low'), false);
        node_assert_1.default.strictEqual(result.length, 0);
    });
    (0, node_test_1.it)('should show Low Risk diagnostic when enabled', () => {
        const result = (0, diagnostics_1.createDiagnostics)(analysis('Low'), true);
        node_assert_1.default.strictEqual(result.length, 1);
        node_assert_1.default.strictEqual(result[0].severity, 2);
    });
    (0, node_test_1.it)('should include function name in diagnostic message', () => {
        const result = (0, diagnostics_1.createDiagnostics)(analysis('High'), false);
        node_assert_1.default.strictEqual(result.length, 1);
        node_assert_1.default.ok(result[0].message.includes('testFunction'));
    });
    (0, node_test_1.it)('should include maintainability metrics in diagnostic message', () => {
        const result = (0, diagnostics_1.createDiagnostics)(analysis('Medium'), false);
        node_assert_1.default.strictEqual(result.length, 1);
        node_assert_1.default.ok(result[0].message.includes('MI'));
        node_assert_1.default.ok(result[0].message.includes('HV'));
        node_assert_1.default.ok(result[0].message.includes('CC'));
        node_assert_1.default.ok(result[0].message.includes('LOC'));
    });
    (0, node_test_1.it)('should set diagnostic source', () => {
        const result = (0, diagnostics_1.createDiagnostics)(analysis('High'), false);
        node_assert_1.default.strictEqual(result[0].source, 'Maintainability Risk Analyzer');
    });
    (0, node_test_1.it)('should set diagnostic code', () => {
        const result = (0, diagnostics_1.createDiagnostics)(analysis('High'), false);
        node_assert_1.default.strictEqual(result[0].code, 'maintainability-index-risk');
    });
    (0, node_test_1.it)('should create error diagnostic for parse error', () => {
        const file = {
            uri: 'file:///test/example.js',
            fileName: 'example.js',
            analyzedAt: new Date().toISOString(),
            parseError: 'Unexpected token',
            functions: [],
            dependencies: []
        };
        const result = (0, diagnostics_1.createDiagnostics)(file, false);
        node_assert_1.default.strictEqual(result.length, 1);
        node_assert_1.default.strictEqual(result[0].severity, 0);
        node_assert_1.default.ok(result[0].message.includes('Unexpected token'));
    });
});
//# sourceMappingURL=diagnostics.test.js.map