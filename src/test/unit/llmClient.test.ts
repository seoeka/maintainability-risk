import assert from 'node:assert';
import { describe, it, beforeEach, afterEach } from 'node:test';

import {
  explainWithLLM,
  testLLMProxy
} from '../../llm/llmClient';

import {
  AnalyzerSettings,
  FunctionAnalysisResult
} from '../../analyzer/types';

const settings: AnalyzerSettings = {
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

function createFunction(
  level: 'Low' | 'Medium' | 'High' = 'Medium'
): FunctionAnalysisResult {
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
      range: {} as any
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

      maintainabilityIndex:
        level === 'Low' ? 80 :
        level === 'Medium' ? 15 :
        5,

      violations:
        level === 'Low'
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

function mockFetch(
  response: {
    ok: boolean;
    status?: number;
    text: string;
  }
) {
  globalThis.fetch = (async () => ({
      ok: response.ok,
      status: response.status ?? 200,
      text: async () => response.text
  })) as unknown as typeof fetch;
}

beforeEach(() => {
  globalThis.fetch = originalFetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('llmClient', () => {

  describe('explainWithLLM', () => {

    it('should use deterministic fallback when privacy disables sending code', async () => {
      const privateSettings: AnalyzerSettings = {
        ...settings,
        privacy: {
          sendCodeToLLM: false
        }
      };

      const result = await explainWithLLM(
        createFunction('High'),
        privateSettings
      );

      assert.strictEqual(result.source, 'local-fallback');

      assert.ok(
        result.notes.includes(
          'privacy.sendCodeToLLM'
        )
      );

      assert.ok(
        result.summary.includes('calculateRisk')
      );

      assert.ok(
        result.reasons.length > 0
      );
    });


    it('should use deterministic fallback when proxy endpoint is empty', async () => {
      const invalidSettings: AnalyzerSettings = {
        ...settings,
        llm: {
          ...settings.llm,
          proxyEndpoint: ''
        }
      };

      const result = await explainWithLLM(
        createFunction(),
        invalidSettings
      );

      assert.strictEqual(
        result.source,
        'local-fallback'
      );

      assert.ok(
        result.notes.includes(
          'Endpoint backend proxy belum diisi'
        )
      );
    });


    it('should send POST request to proxy endpoint', async () => {
      let capturedUrl = '';
      let capturedMethod = '';
      let capturedBody: any;

      globalThis.fetch = (async (
        input: RequestInfo | URL,
        init?: RequestInit
      ) => {
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
            maintainabilityImpact:
              'Kode menjadi lebih sulit dipelihara.',
            notes: 'Perlu dilakukan refactoring.',
            model: 'test-model',
            source: 'test'
          })
        };
      }) as typeof fetch;

      await explainWithLLM(
        createFunction('Medium'),
        settings
      );

      assert.strictEqual(
        capturedUrl,
        settings.llm.proxyEndpoint
      );

      assert.strictEqual(
        capturedMethod,
        'POST'
      );

      assert.strictEqual(
        capturedBody.application,
        'Maintainability Risk Analyzer'
      );

      assert.strictEqual(
        capturedBody.role,
        'explanation_layer_only'
      );

      assert.strictEqual(
        capturedBody.functionName,
        'calculateRisk'
      );
    });


    it('should send calculated risk and metrics to proxy', async () => {
      let capturedBody: any;

      globalThis.fetch = (async (
        _input: RequestInfo | URL,
        init?: RequestInit
      ) => {
        capturedBody = JSON.parse(String(init?.body));

        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({
            summary: 'Test explanation'
          })
        };
      }) as typeof fetch;

      const fn = createFunction('High');

      await explainWithLLM(
        fn,
        settings
      );

      assert.strictEqual(
        capturedBody.riskLevel,
        'High'
      );

      assert.strictEqual(
        capturedBody.maintainabilityIndex,
        5
      );

      assert.deepStrictEqual(
        capturedBody.metrics,
        fn.metrics
      );

      assert.deepStrictEqual(
        capturedBody.violations,
        fn.risk.violations
      );
    });


    it('should limit code snippet according to maxSnippetCharacters', async () => {
      let capturedBody: any;

      globalThis.fetch = (async (
        _input: RequestInfo | URL,
        init?: RequestInit
      ) => {
        capturedBody = JSON.parse(String(init?.body));

        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({
            summary: 'Test'
          })
        };
      }) as typeof fetch;

      await explainWithLLM(
        createFunction(),
        {
          ...settings,
          llm: {
            ...settings.llm,
            maxSnippetCharacters: 20
          }
        }
      );

      assert.ok(
        capturedBody.codeSnippet.length <= 20
      );
    });


    it('should parse structured LLM response', async () => {
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
          maintainabilityImpact:
            'Kode sulit dipelihara.',
          notes:
            'Refactoring direkomendasikan.',
          model: 'test-model',
          source: 'llm'
        })
      });

      const result = await explainWithLLM(
        createFunction('Medium'),
        settings
      );

      assert.strictEqual(
        result.summary,
        'Fungsi memiliki kompleksitas tinggi.'
      );

      assert.strictEqual(
        result.refactoredCode,
        'function improved() {}'
      );

      assert.deepStrictEqual(
        result.refactoringSuggestions,
        ['Pisahkan fungsi besar.']
      );

      assert.deepStrictEqual(
        result.positiveFindings,
        ['Nama fungsi sudah jelas.']
      );

      assert.deepStrictEqual(
        result.reasons,
        ['Cyclomatic Complexity tinggi.']
      );

      assert.strictEqual(
        result.source,
        'llm'
      );
    });


    it('should parse explanation field from response', async () => {
      mockFetch({
        ok: true,
        text: JSON.stringify({
          explanation:
            'Fungsi memiliki kompleksitas yang tinggi.'
        })
      });

      const result = await explainWithLLM(
        createFunction('Medium'),
        settings
      );

      assert.strictEqual(
        result.maintainabilityImpact,
        'Fungsi memiliki kompleksitas yang tinggi.'
      );

      assert.strictEqual(
        result.rawText,
        'Fungsi memiliki kompleksitas yang tinggi.'
      );
    });


    it('should parse output_text response', async () => {
      mockFetch({
        ok: true,
        text: JSON.stringify({
          output_text:
            'Gunakan pemecahan fungsi untuk mengurangi kompleksitas.'
        })
      });

      const result = await explainWithLLM(
        createFunction('Medium'),
        settings
      );

      assert.strictEqual(
        result.maintainabilityImpact,
        'Gunakan pemecahan fungsi untuk mengurangi kompleksitas.'
      );

      assert.strictEqual(
        result.rawText,
        'Gunakan pemecahan fungsi untuk mengurangi kompleksitas.'
      );
    });


    it('should parse nested output content response', async () => {
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

      const result = await explainWithLLM(
        createFunction('Medium'),
        settings
      );

      assert.strictEqual(
        result.maintainabilityImpact,
        'Penjelasan dari nested output.'
      );
    });


    it('should parse JSON returned inside text response', async () => {
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

      const result = await explainWithLLM(
        createFunction('Medium'),
        settings
      );

      assert.strictEqual(
        result.summary,
        'Penjelasan dari JSON text.'
      );

      assert.strictEqual(
        result.refactoredCode,
        'function better() {}'
      );
    });


    it('should use default positive findings for Low Risk', async () => {
      mockFetch({
        ok: true,
        text: JSON.stringify({
          summary: 'Kode relatif baik.'
        })
      });

      const result = await explainWithLLM(
        createFunction('Low'),
        settings
      );

      assert.ok(
        result.positiveFindings.length > 0
      );

      assert.ok(
        result.positiveFindings.some(
            (          item: string | string[]) => item.includes('Maintainability Index')
        )
      );
    });


    it('should use deterministic reasons when LLM reasons are missing', async () => {
      mockFetch({
        ok: true,
        text: JSON.stringify({
          summary: 'Test explanation'
        })
      });

      const fn = createFunction('High');

      const result = await explainWithLLM(
        fn,
        settings
      );

      assert.deepStrictEqual(
        result.reasons,
        fn.risk.deterministicExplanation
      );
    });


    it('should use fallback when backend returns invalid JSON', async () => {
      mockFetch({
        ok: true,
        text: 'this is not valid structured response'
      });

      const result = await explainWithLLM(
        createFunction('High'),
        settings
      );

      assert.strictEqual(
        result.source,
        'local-fallback'
      );

      assert.ok(
        result.notes.includes(
          'format penjelasan'
        )
      );
    });


    it('should use fallback when backend returns empty response', async () => {
      mockFetch({
        ok: true,
        text: ''
      });

      const result = await explainWithLLM(
        createFunction('Medium'),
        settings
      );

      assert.strictEqual(
        result.source,
        'local-fallback'
      );
    });


    it('should use fallback when backend returns HTTP error', async () => {
      mockFetch({
        ok: false,
        status: 500,
        text: JSON.stringify({
          error: 'Internal Server Error'
        })
      });

      const result = await explainWithLLM(
        createFunction('High'),
        settings
      );

      assert.strictEqual(
        result.source,
        'local-fallback'
      );

      assert.ok(
        result.notes.includes(
          'Internal Server Error'
        )
      );
    });


    it('should use fallback when backend throws an error', async () => {
      globalThis.fetch = (async () => {
        throw new Error('Network failure');
      }) as typeof fetch;

      const result = await explainWithLLM(
        createFunction('High'),
        settings
      );

      assert.strictEqual(
        result.source,
        'local-fallback'
      );

      assert.ok(
        result.notes.includes(
          'Network failure'
        )
      );
    });


    it('should include proxy token when configured', async () => {
      let capturedHeaders: Record<string, string> | undefined;

      globalThis.fetch = (async (
        _input: RequestInfo | URL,
        init?: RequestInit
      ) => {
        capturedHeaders = init?.headers as Record<string, string>;

        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({
            summary: 'Authenticated request'
          })
        };
      }) as typeof fetch;

      await explainWithLLM(
        createFunction(),
        {
          ...settings,
          llm: {
            ...settings.llm,
            proxyToken: 'secret-token'
          }
        }
      );

      assert.strictEqual(
        capturedHeaders?.['x-maintainability-token'],
        'secret-token'
      );
    });


    it('should not include proxy token when token is empty', async () => {
      let capturedHeaders: Record<string, string> | undefined;

      globalThis.fetch = (async (
        _input: RequestInfo | URL,
        init?: RequestInit
      ) => {
        capturedHeaders = init?.headers as Record<string, string>;

        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({
            summary: 'No token'
          })
        };
      }) as typeof fetch;

      await explainWithLLM(
        createFunction(),
        settings
      );

      assert.strictEqual(
        capturedHeaders?.['x-maintainability-token'],
        undefined
      );
    });

  });


  describe('testLLMProxy', () => {

    it('should return false when endpoint is empty', async () => {
      const result = await testLLMProxy({
        ...settings,
        llm: {
          ...settings.llm,
          proxyEndpoint: ''
        }
      });

      assert.strictEqual(
        result.ok,
        false
      );

      assert.ok(
        result.message.includes(
          'Endpoint backend proxy belum diisi'
        )
      );
    });


    it('should successfully perform health check', async () => {
      let capturedBody: any;

      globalThis.fetch = (async (
        _input: RequestInfo | URL,
        init?: RequestInit
      ) => {
        capturedBody = JSON.parse(String(init?.body));

        return {
          ok: true,
          status: 200,
          text: async () => ''
        };
      }) as typeof fetch;

      const result = await testLLMProxy(
        settings
      );

      assert.strictEqual(
        result.ok,
        true
      );

      assert.ok(
        result.message.includes(
          'berhasil dihubungi'
        )
      );

      assert.strictEqual(
        capturedBody.healthCheck,
        true
      );

      assert.strictEqual(
        capturedBody.functionName,
        'healthCheck'
      );

      assert.strictEqual(
        capturedBody.maintainabilityIndex,
        100
      );
    });


    it('should send model configuration during health check', async () => {
      let capturedBody: any;

      globalThis.fetch = (async (
        _input: RequestInfo | URL,
        init?: RequestInit
      ) => {
        capturedBody = JSON.parse(String(init?.body));

        return {
          ok: true,
          status: 200,
          text: async () => ''
        };
      }) as typeof fetch;

      await testLLMProxy(
        settings
      );

      assert.strictEqual(
        capturedBody.model,
        'test-model'
      );
    });


    it('should return false when backend returns HTTP error', async () => {
      mockFetch({
        ok: false,
        status: 503,
        text: 'Service unavailable'
      });

      const result = await testLLMProxy(
        settings
      );

      assert.strictEqual(
        result.ok,
        false
      );

      assert.ok(
        result.message.includes('503')
      );

      assert.ok(
        result.message.includes(
          'Service unavailable'
        )
      );
    });


    it('should return false when backend request throws error', async () => {
      globalThis.fetch = (async () => {
        throw new Error('Connection refused');
      }) as typeof fetch;

      const result = await testLLMProxy(
        settings
      );

      assert.strictEqual(
        result.ok,
        false
      );

      assert.ok(
        result.message.includes(
          'Connection refused'
        )
      );
    });


    it('should include authentication token in health check', async () => {
      let capturedHeaders: Record<string, string> | undefined;

      globalThis.fetch = (async (
        _input: RequestInfo | URL,
        init?: RequestInit
      ) => {
        capturedHeaders = init?.headers as Record<string, string>;

        return {
          ok: true,
          status: 200,
          text: async () => ''
        };
      }) as typeof fetch;

      await testLLMProxy({
        ...settings,
        llm: {
          ...settings.llm,
          proxyToken: 'health-token'
        }
      });

      assert.strictEqual(
        capturedHeaders?.['x-maintainability-token'],
        'health-token'
      );
    });

  });

});