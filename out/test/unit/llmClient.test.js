"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const mocha_1 = require("mocha");
const llmClient_1 = require("../../llm/llmClient");
const settings = {
    showLowRiskDiagnostics: false,
    analyzeOnSave: true,
    llm: {
        model: 'test-model',
        maxSnippetCharacters: 100,
        proxyEndpoint: 'https://example.test/api/explain',
        proxyToken: '',
        requestTimeoutMs: 30000
    },
    privacy: {
        sendCodeToLLM: true
    }
};
function createFunction(level = 'Medium') {
    return {
        id: 'test-function-1',
        functionName: 'calculateRisk',
        kind: 'FunctionDeclaration',
        location: {
            uri: 'file:///test/example.js',
            fileName: 'example.js',
            startLine: 1,
            endLine: 10,
            startColumn: 0,
            endColumn: 1,
            range: {}
        },
        snippet: `
function calculateRisk(metrics) {
  if (metrics.complexity > 10) {
    return 'High';
  }

  return 'Low';
}
`,
        metrics: {
            halsteadVolume: 100,
            cyclomaticComplexity: 5,
            loc: 10,
            halstead: {
                uniqueOperators: 5,
                uniqueOperands: 8,
                totalOperators: 10,
                totalOperands: 15,
                vocabulary: 13,
                length: 25,
                volume: 100
            }
        },
        risk: {
            level,
            score: level === 'Low' ? 80 : level === 'Medium' ? 15 : 5,
            maintainabilityIndex: level === 'Low' ? 80 :
                level === 'Medium' ? 15 :
                    5,
            violations: level === 'Low'
                ? []
                : [
                    {
                        metric: 'maintainabilityIndex',
                        value: level === 'Medium' ? 15 : 5,
                        warningThreshold: 20,
                        highThreshold: 10,
                        level: level === 'High' ? 'high' : 'warning',
                        message: 'Maintainability risk detected.'
                    }
                ],
            deterministicExplanation: [
                'Maintainability Index dihitung dari Halstead Volume, Cyclomatic Complexity, dan LOC.',
                `Nilai Maintainability Index termasuk ${level} Risk.`
            ]
        }
    };
}
const originalFetch = globalThis.fetch;
function mockFetch(response) {
    globalThis.fetch = (async () => ({
        ok: response.ok,
        status: response.status ?? 200,
        text: async () => response.text
    }));
}
(0, mocha_1.beforeEach)(() => {
    globalThis.fetch = originalFetch;
});
(0, mocha_1.afterEach)(() => {
    globalThis.fetch = originalFetch;
});
(0, mocha_1.describe)('llmClient', () => {
    (0, mocha_1.describe)('explainWithLLM', () => {
        (0, mocha_1.it)('should use deterministic fallback when privacy disables sending code', async () => {
            const privateSettings = {
                ...settings,
                privacy: {
                    sendCodeToLLM: false
                }
            };
            const result = await (0, llmClient_1.explainWithLLM)(createFunction('High'), privateSettings);
            node_assert_1.default.strictEqual(result.source, 'local-fallback');
            node_assert_1.default.ok(result.notes.includes('privacy.sendCodeToLLM'));
            node_assert_1.default.ok(result.summary.includes('calculateRisk'));
            node_assert_1.default.ok(result.reasons.length > 0);
        });
        (0, mocha_1.it)('should use deterministic fallback when proxy endpoint is empty', async () => {
            const invalidSettings = {
                ...settings,
                llm: {
                    ...settings.llm,
                    proxyEndpoint: ''
                }
            };
            const result = await (0, llmClient_1.explainWithLLM)(createFunction(), invalidSettings);
            node_assert_1.default.strictEqual(result.source, 'local-fallback');
            node_assert_1.default.ok(result.notes.includes('Endpoint backend proxy belum diisi'));
        });
        (0, mocha_1.it)('should send POST request to proxy endpoint', async () => {
            let capturedUrl = '';
            let capturedMethod = '';
            let capturedBody;
            globalThis.fetch = (async (input, init) => {
                capturedUrl = String(input);
                capturedMethod = init?.method ?? '';
                capturedBody = JSON.parse(String(init?.body));
                return {
                    ok: true,
                    status: 200,
                    text: async () => JSON.stringify({
                        summary: 'Penjelasan hasil analisis.',
                        refactoredCode: 'function improved() {}',
                        refactoringSuggestions: [
                            'Pecah fungsi menjadi beberapa bagian.'
                        ],
                        positiveFindings: [],
                        reasons: [
                            'Cyclomatic Complexity cukup tinggi.'
                        ],
                        maintainabilityImpact: 'Kode menjadi lebih sulit dipelihara.',
                        notes: 'Perlu dilakukan refactoring.',
                        model: 'test-model',
                        source: 'test'
                    })
                };
            });
            await (0, llmClient_1.explainWithLLM)(createFunction('Medium'), settings);
            node_assert_1.default.strictEqual(capturedUrl, settings.llm.proxyEndpoint);
            node_assert_1.default.strictEqual(capturedMethod, 'POST');
            node_assert_1.default.strictEqual(capturedBody.application, 'Maintainability Risk Analyzer');
            node_assert_1.default.strictEqual(capturedBody.role, 'explanation_layer_only');
            node_assert_1.default.strictEqual(capturedBody.functionName, 'calculateRisk');
        });
        (0, mocha_1.it)('should send calculated risk and metrics to proxy', async () => {
            let capturedBody;
            globalThis.fetch = (async (_input, init) => {
                capturedBody = JSON.parse(String(init?.body));
                return {
                    ok: true,
                    status: 200,
                    text: async () => JSON.stringify({
                        summary: 'Test explanation',
                        riskLevel: 'Low',
                        maintainabilityIndex: 99,
                        metrics: {
                            halsteadVolume: 999,
                            cyclomaticComplexity: 1,
                            loc: 1
                        }
                    })
                };
            });
            const fn = createFunction('High');
            const originalMetrics = JSON.parse(JSON.stringify(fn.metrics));
            const originalRisk = JSON.parse(JSON.stringify(fn.risk));
            const result = await (0, llmClient_1.explainWithLLM)(fn, settings);
            /*
             * KF9:
             * Memastikan konteks hasil analisis
             * dikirim kepada LLM.
             */
            node_assert_1.default.strictEqual(capturedBody.riskLevel, 'High');
            node_assert_1.default.strictEqual(capturedBody.maintainabilityIndex, 5);
            node_assert_1.default.deepStrictEqual(capturedBody.metrics, fn.metrics);
            node_assert_1.default.deepStrictEqual(capturedBody.violations, fn.risk.violations);
            node_assert_1.default.deepStrictEqual(capturedBody.deterministicReasons, fn.risk.deterministicExplanation);
            /*
             * Memastikan code snippet juga dikirim.
             */
            node_assert_1.default.strictEqual(capturedBody.codeSnippet, fn.snippet.slice(0, settings.llm.maxSnippetCharacters));
            /*
             * KNF4:
             * Respons LLM tidak boleh mengubah
             * hasil analisis deterministik.
             */
            node_assert_1.default.deepStrictEqual(fn.metrics, originalMetrics);
            node_assert_1.default.deepStrictEqual(fn.risk, originalRisk);
            node_assert_1.default.strictEqual(fn.risk.level, 'High');
            node_assert_1.default.strictEqual(fn.risk.maintainabilityIndex, 5);
            /*
             * Respons LLM tetap berhasil diproses
             * sebagai explanation.
             */
            node_assert_1.default.ok(result.summary.length > 0);
        });
        (0, mocha_1.it)('should limit code snippet according to maxSnippetCharacters', async () => {
            let capturedBody;
            globalThis.fetch = (async (_input, init) => {
                capturedBody = JSON.parse(String(init?.body));
                return {
                    ok: true,
                    status: 200,
                    text: async () => JSON.stringify({
                        summary: 'Test'
                    })
                };
            });
            await (0, llmClient_1.explainWithLLM)(createFunction(), {
                ...settings,
                llm: {
                    ...settings.llm,
                    maxSnippetCharacters: 20
                }
            });
            node_assert_1.default.ok(capturedBody.codeSnippet.length <= 20);
        });
        (0, mocha_1.it)('should parse structured LLM response', async () => {
            mockFetch({
                ok: true,
                text: JSON.stringify({
                    summary: 'Fungsi memiliki kompleksitas tinggi.',
                    refactoredCode: 'function improved() {}',
                    refactoringSuggestions: [
                        'Pisahkan fungsi besar.'
                    ],
                    positiveFindings: [
                        'Nama fungsi sudah jelas.'
                    ],
                    reasons: [
                        'Cyclomatic Complexity tinggi.'
                    ],
                    maintainabilityImpact: 'Kode sulit dipelihara.',
                    notes: 'Refactoring direkomendasikan.',
                    model: 'test-model',
                    source: 'llm'
                })
            });
            const result = await (0, llmClient_1.explainWithLLM)(createFunction('Medium'), settings);
            node_assert_1.default.strictEqual(result.summary, 'Fungsi memiliki kompleksitas tinggi.');
            node_assert_1.default.strictEqual(result.refactoredCode, 'function improved() {}');
            node_assert_1.default.deepStrictEqual(result.refactoringSuggestions, ['Pisahkan fungsi besar.']);
            node_assert_1.default.deepStrictEqual(result.positiveFindings, ['Nama fungsi sudah jelas.']);
            node_assert_1.default.deepStrictEqual(result.reasons, ['Cyclomatic Complexity tinggi.']);
            node_assert_1.default.strictEqual(result.source, 'llm');
        });
        (0, mocha_1.it)('should parse explanation field from response', async () => {
            mockFetch({
                ok: true,
                text: JSON.stringify({
                    explanation: 'Fungsi memiliki kompleksitas yang tinggi.'
                })
            });
            const result = await (0, llmClient_1.explainWithLLM)(createFunction('Medium'), settings);
            node_assert_1.default.strictEqual(result.maintainabilityImpact, 'Fungsi memiliki kompleksitas yang tinggi.');
            node_assert_1.default.strictEqual(result.rawText, 'Fungsi memiliki kompleksitas yang tinggi.');
        });
        (0, mocha_1.it)('should parse output_text response', async () => {
            mockFetch({
                ok: true,
                text: JSON.stringify({
                    output_text: 'Gunakan pemecahan fungsi untuk mengurangi kompleksitas.'
                })
            });
            const result = await (0, llmClient_1.explainWithLLM)(createFunction('Medium'), settings);
            node_assert_1.default.strictEqual(result.maintainabilityImpact, 'Gunakan pemecahan fungsi untuk mengurangi kompleksitas.');
            node_assert_1.default.strictEqual(result.rawText, 'Gunakan pemecahan fungsi untuk mengurangi kompleksitas.');
        });
        (0, mocha_1.it)('should parse nested output content response', async () => {
            mockFetch({
                ok: true,
                text: JSON.stringify({
                    output: [
                        {
                            content: [
                                {
                                    text: 'Penjelasan dari nested output.'
                                }
                            ]
                        }
                    ]
                })
            });
            const result = await (0, llmClient_1.explainWithLLM)(createFunction('Medium'), settings);
            node_assert_1.default.strictEqual(result.maintainabilityImpact, 'Penjelasan dari nested output.');
        });
        (0, mocha_1.it)('should parse JSON returned inside text response', async () => {
            const jsonText = JSON.stringify({
                summary: 'Penjelasan dari JSON text.',
                refactoredCode: 'function better() {}',
                refactoringSuggestions: [
                    'Kurangi kompleksitas.'
                ]
            });
            mockFetch({
                ok: true,
                text: JSON.stringify({
                    output_text: `\`\`\`json\n${jsonText}\n\`\`\``
                })
            });
            const result = await (0, llmClient_1.explainWithLLM)(createFunction('Medium'), settings);
            node_assert_1.default.strictEqual(result.summary, 'Penjelasan dari JSON text.');
            node_assert_1.default.strictEqual(result.refactoredCode, 'function better() {}');
        });
        (0, mocha_1.it)('should use default positive findings for Low Risk', async () => {
            mockFetch({
                ok: true,
                text: JSON.stringify({
                    summary: 'Kode relatif baik.'
                })
            });
            const result = await (0, llmClient_1.explainWithLLM)(createFunction('Low'), settings);
            node_assert_1.default.ok(result.positiveFindings.length > 0);
            node_assert_1.default.ok(result.positiveFindings.some((item) => item.includes('Maintainability Index')));
        });
        (0, mocha_1.it)('should use deterministic reasons when LLM reasons are missing', async () => {
            mockFetch({
                ok: true,
                text: JSON.stringify({
                    summary: 'Test explanation'
                })
            });
            const fn = createFunction('High');
            const result = await (0, llmClient_1.explainWithLLM)(fn, settings);
            node_assert_1.default.deepStrictEqual(result.reasons, fn.risk.deterministicExplanation);
        });
        (0, mocha_1.it)('should use fallback when backend returns invalid JSON', async () => {
            mockFetch({
                ok: true,
                text: 'this is not valid structured response'
            });
            const result = await (0, llmClient_1.explainWithLLM)(createFunction('High'), settings);
            node_assert_1.default.strictEqual(result.source, 'local-fallback');
            node_assert_1.default.ok(result.notes.includes('format penjelasan'));
        });
        (0, mocha_1.it)('should use fallback when backend returns empty response', async () => {
            mockFetch({
                ok: true,
                text: ''
            });
            const result = await (0, llmClient_1.explainWithLLM)(createFunction('Medium'), settings);
            node_assert_1.default.strictEqual(result.source, 'local-fallback');
        });
        (0, mocha_1.it)('should use fallback when backend returns HTTP error', async () => {
            mockFetch({
                ok: false,
                status: 500,
                text: JSON.stringify({
                    error: 'Internal Server Error'
                })
            });
            const result = await (0, llmClient_1.explainWithLLM)(createFunction('High'), settings);
            node_assert_1.default.strictEqual(result.source, 'local-fallback');
            node_assert_1.default.ok(result.notes.includes('Internal Server Error'));
        });
        (0, mocha_1.it)('should use fallback when backend throws an error', async () => {
            globalThis.fetch = (async () => {
                throw new Error('Network failure');
            });
            const result = await (0, llmClient_1.explainWithLLM)(createFunction('High'), settings);
            node_assert_1.default.strictEqual(result.source, 'local-fallback');
            node_assert_1.default.ok(result.notes.includes('Network failure'));
        });
        (0, mocha_1.it)('should include proxy token when configured', async () => {
            let capturedHeaders;
            globalThis.fetch = (async (_input, init) => {
                capturedHeaders = init?.headers;
                return {
                    ok: true,
                    status: 200,
                    text: async () => JSON.stringify({
                        summary: 'Authenticated request'
                    })
                };
            });
            await (0, llmClient_1.explainWithLLM)(createFunction(), {
                ...settings,
                llm: {
                    ...settings.llm,
                    proxyToken: 'secret-token'
                }
            });
            node_assert_1.default.strictEqual(capturedHeaders?.['x-maintainability-token'], 'secret-token');
        });
        (0, mocha_1.it)('should not include proxy token when token is empty', async () => {
            let capturedHeaders;
            globalThis.fetch = (async (_input, init) => {
                capturedHeaders = init?.headers;
                return {
                    ok: true,
                    status: 200,
                    text: async () => JSON.stringify({
                        summary: 'No token'
                    })
                };
            });
            await (0, llmClient_1.explainWithLLM)(createFunction(), settings);
            node_assert_1.default.strictEqual(capturedHeaders?.['x-maintainability-token'], undefined);
        });
    });
    (0, mocha_1.describe)('testLLMProxy', () => {
        (0, mocha_1.it)('should return false when endpoint is empty', async () => {
            const result = await (0, llmClient_1.testLLMProxy)({
                ...settings,
                llm: {
                    ...settings.llm,
                    proxyEndpoint: ''
                }
            });
            node_assert_1.default.strictEqual(result.ok, false);
            node_assert_1.default.ok(result.message.includes('Endpoint backend proxy belum diisi'));
        });
        (0, mocha_1.it)('should successfully perform health check', async () => {
            let capturedBody;
            globalThis.fetch = (async (_input, init) => {
                capturedBody = JSON.parse(String(init?.body));
                return {
                    ok: true,
                    status: 200,
                    text: async () => ''
                };
            });
            const result = await (0, llmClient_1.testLLMProxy)(settings);
            node_assert_1.default.strictEqual(result.ok, true);
            node_assert_1.default.ok(result.message.includes('berhasil dihubungi'));
            node_assert_1.default.strictEqual(capturedBody.healthCheck, true);
            node_assert_1.default.strictEqual(capturedBody.functionName, 'healthCheck');
            node_assert_1.default.strictEqual(capturedBody.maintainabilityIndex, 100);
        });
        (0, mocha_1.it)('should send model configuration during health check', async () => {
            let capturedBody;
            globalThis.fetch = (async (_input, init) => {
                capturedBody = JSON.parse(String(init?.body));
                return {
                    ok: true,
                    status: 200,
                    text: async () => ''
                };
            });
            await (0, llmClient_1.testLLMProxy)(settings);
            node_assert_1.default.strictEqual(capturedBody.model, 'test-model');
        });
        (0, mocha_1.it)('should return false when backend returns HTTP error', async () => {
            mockFetch({
                ok: false,
                status: 503,
                text: 'Service unavailable'
            });
            const result = await (0, llmClient_1.testLLMProxy)(settings);
            node_assert_1.default.strictEqual(result.ok, false);
            node_assert_1.default.ok(result.message.includes('503'));
            node_assert_1.default.ok(result.message.includes('Service unavailable'));
        });
        (0, mocha_1.it)('should return false when backend request throws error', async () => {
            globalThis.fetch = (async () => {
                throw new Error('Connection refused');
            });
            const result = await (0, llmClient_1.testLLMProxy)(settings);
            node_assert_1.default.strictEqual(result.ok, false);
            node_assert_1.default.ok(result.message.includes('Connection refused'));
        });
        (0, mocha_1.it)('should include authentication token in health check', async () => {
            let capturedHeaders;
            globalThis.fetch = (async (_input, init) => {
                capturedHeaders = init?.headers;
                return {
                    ok: true,
                    status: 200,
                    text: async () => ''
                };
            });
            await (0, llmClient_1.testLLMProxy)({
                ...settings,
                llm: {
                    ...settings.llm,
                    proxyToken: 'health-token'
                }
            });
            node_assert_1.default.strictEqual(capturedHeaders?.['x-maintainability-token'], 'health-token');
        });
    });
});
//# sourceMappingURL=llmClient.test.js.map