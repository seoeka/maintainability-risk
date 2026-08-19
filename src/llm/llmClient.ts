import { AnalyzerSettings, FunctionAnalysisResult } from '../analyzer/types';

export interface LLMExplanationResult {
  summary: string;
  refactoredCode: string;
  refactoringSuggestions: string[];
  positiveFindings: string[];
  reasons: string[];
  maintainabilityImpact: string;
  notes: string;
  model?: string;
  source?: string;
  rawText?: string;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => typeof item === 'string' ? item.trim() : '')
    .filter(Boolean);
}

function deterministicFallback(fn: FunctionAnalysisResult, technicalNote?: string): LLMExplanationResult {
  return {
    summary: `Fungsi ${fn.functionName} dikategorikan ${fn.risk.level} dengan Maintainability Index ${fn.risk.maintainabilityIndex}/100 berdasarkan hasil perhitungan software metrics.`,
    refactoredCode: `// Contoh kode refactor tidak tersedia karena LLM/backend tidak dapat digunakan.
// Gunakan saran refactoring di bawah sebagai acuan manual.
//
// Fungsi asli:
${fn.snippet}`,
    refactoringSuggestions: [
      'Pecah fungsi besar menjadi beberapa fungsi kecil dengan tanggung jawab yang lebih spesifik.',
      'Sederhanakan percabangan agar alur logika lebih mudah dipahami.',
      'Kurangi percabangan yang terlalu dalam apabila memungkinkan.',
      'Pisahkan bagian kode yang terlalu panjang menjadi fungsi kecil dengan tanggung jawab lebih spesifik.'
    ],
    positiveFindings: fn.risk.level === 'Low'
  ? [
      'Nilai Maintainability Index berada pada rentang aman.',
      'Struktur fungsi relatif mudah dipahami berdasarkan hasil analisis.',
      'Fungsi tidak menunjukkan risiko maintainability yang signifikan berdasarkan klasifikasi MI.'
    ]
  : [],
    reasons: fn.risk.deterministicExplanation,
    maintainabilityImpact: 'Kode dengan risiko maintainability yang tinggi dapat menjadi lebih sulit dipahami, diuji, dan dimodifikasi.',
    notes: technicalNote
      ? `Penjelasan ini dibuat secara lokal. Catatan teknis: ${technicalNote}`
      : 'Penjelasan ini dibuat secara lokal karena backend/LLM tidak tersedia.',
    source: 'local-fallback'
  };
}

function createProxyPayload(fn: FunctionAnalysisResult, settings: AnalyzerSettings): Record<string, unknown> {
  return {
    application: 'Maintainability Risk Analyzer',
    role: 'explanation_layer_only',
    instruction: [
      'Jelaskan hasil analisis maintainability berdasarkan metrics yang sudah dihitung.',
      'Jangan menghitung ulang metric.',
      'Jangan mengubah Maintainability Index.',
      'Jangan mengubah risk level.',
      'Boleh memberikan contoh kode refactor sebagai rekomendasi.',
      'Jangan mengubah file otomatis.'
    ].join(' '),
    model: settings.llm.model,
    functionName: fn.functionName,
    riskLevel: fn.risk.level,
    maintainabilityIndex: fn.risk.maintainabilityIndex,
    metrics: fn.metrics,
    violations: fn.risk.violations,
    deterministicReasons: fn.risk.deterministicExplanation,
    codeSnippet: fn.snippet.slice(0, settings.llm.maxSnippetCharacters),
    location: {
      fileName: fn.location.fileName,
      startLine: fn.location.startLine,
      endLine: fn.location.endLine
    }
  };
}

function extractTextFromResponse(json: any): string | undefined {
  if (!json || typeof json !== 'object') {
    return undefined;
  }

  if (typeof json.explanation === 'string' && json.explanation.trim()) {
    return json.explanation.trim();
  }

  if (typeof json.output_text === 'string' && json.output_text.trim()) {
    return json.output_text.trim();
  }

  const output = Array.isArray(json.output)
    ? json.output
        .flatMap((item: any) => Array.isArray(item.content) ? item.content : [])
        .map((content: any) => content.text)
        .filter((value: unknown) => typeof value === 'string')
        .join('\n')
    : '';

  return output.trim() ? output.trim() : undefined;
}

function tryParseJsonText(text?: string): any | undefined {
  if (!text || typeof text !== 'string') {
    return undefined;
  }

  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');

    if (first >= 0 && last > first) {
      try {
        return JSON.parse(cleaned.slice(first, last + 1));
      } catch {
        return undefined;
      }
    }

    return undefined;
  }
}

function buildStructuredExplanation(json: any, fn: FunctionAnalysisResult): LLMExplanationResult {
  return {
    summary: typeof json.summary === 'string' && json.summary.trim()
      ? json.summary.trim()
      : `Fungsi ${fn.functionName} memiliki risiko ${fn.risk.level} berdasarkan hasil software metrics.`,

    refactoredCode: typeof json.refactoredCode === 'string'
      ? json.refactoredCode.trim()
      : '',

    refactoringSuggestions: normalizeStringArray(json.refactoringSuggestions),

    positiveFindings: normalizeStringArray(json.positiveFindings).length
      ? normalizeStringArray(json.positiveFindings)
      : fn.risk.level === 'Low'
        ? [
            'Nilai Maintainability Index berada pada rentang aman.',
            'Fungsi tidak melewati threshold risiko maintainability.',
            'Kode relatif lebih mudah dipahami, diuji, dan dimodifikasi dibanding fungsi dengan risiko sedang atau tinggi.'
          ]
        : [],
    reasons: normalizeStringArray(json.reasons).length
      ? normalizeStringArray(json.reasons)
      : fn.risk.deterministicExplanation,

    maintainabilityImpact: typeof json.maintainabilityImpact === 'string'
      ? json.maintainabilityImpact.trim()
      : 'Risiko maintainability dapat membuat kode lebih sulit dipahami, diuji, dan dimodifikasi.',

    notes: typeof json.notes === 'string'
      ? json.notes.trim()
      : 'Contoh kode dan saran refactoring bersifat rekomendasi dan perlu diperiksa kembali.',

    model: typeof json.model === 'string' ? json.model : undefined,
    source: typeof json.source === 'string' ? json.source : undefined,
    rawText: typeof json.rawText === 'string'
      ? json.rawText
      : typeof json.explanation === 'string'
        ? json.explanation
        : undefined
  };
}

function extractExplanation(json: any, fn: FunctionAnalysisResult): LLMExplanationResult | undefined {
  if (!json || typeof json !== 'object') {
    return undefined;
  }

  const textFromResponse = extractTextFromResponse(json);
  const parsedFromText = tryParseJsonText(textFromResponse);

  if (parsedFromText && typeof parsedFromText === 'object') {
    return buildStructuredExplanation(
      {
        ...parsedFromText,
        model: json.model,
        source: json.source,
        rawText: textFromResponse
      },
      fn
    );
  }

  const hasStructuredFields =
    typeof json.summary === 'string' ||
    typeof json.refactoredCode === 'string' ||
    Array.isArray(json.refactoringSuggestions) ||
    Array.isArray(json.reasons) ||
    typeof json.maintainabilityImpact === 'string' ||
    typeof json.notes === 'string';

  if (hasStructuredFields) {
    return buildStructuredExplanation(json, fn);
  }

  if (textFromResponse) {
    return {
      summary: `Fungsi ${fn.functionName} memiliki risiko ${fn.risk.level} berdasarkan hasil software metrics.`,
      refactoredCode: '',
      refactoringSuggestions: [],
      positiveFindings: fn.risk.level === 'Low'
        ? [
            'Nilai Maintainability Index berada pada rentang aman.',
            'Fungsi tidak melewati threshold risiko maintainability.',
            'Kode relatif mudah dipahami berdasarkan hasil analisis metrik.'
          ]
        : [],
      reasons: fn.risk.deterministicExplanation,
      maintainabilityImpact: textFromResponse,
      notes: 'Backend belum mengembalikan format terstruktur. Teks mentah ditampilkan pada bagian dampak.',
      rawText: textFromResponse
    };
  }

  return undefined;
}

export async function explainWithLLM(
  fn: FunctionAnalysisResult,
  settings: AnalyzerSettings
): Promise<LLMExplanationResult> {
  if (!settings.privacy.sendCodeToLLM) {
    return deterministicFallback(fn, 'Pengiriman kode ke backend LLM dinonaktifkan pada pengaturan privacy.sendCodeToLLM.');
  }

  const endpoint = settings.llm.proxyEndpoint.trim();

  if (!endpoint) {
    return deterministicFallback(fn, 'Endpoint backend proxy belum diisi.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), settings.llm.requestTimeoutMs);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (settings.llm.proxyToken.trim()) {
    headers['x-maintainability-token'] = settings.llm.proxyToken.trim();
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(createProxyPayload(fn, settings)),
      signal: controller.signal
    });

    const text = await response.text();
    let json: any = undefined;

    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = undefined;
    }

    if (!response.ok) {
      const message = json?.error || json?.message || text || `Status ${response.status}`;
      return deterministicFallback(fn, `Backend proxy gagal dipanggil (${message}).`);
    }

    const explanation = extractExplanation(json, fn);

    return explanation ?? deterministicFallback(
      fn,
      'Backend proxy tidak mengembalikan format penjelasan yang dapat dibaca.'
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return deterministicFallback(fn, `Backend/LLM tidak tersedia (${message}).`);
  } finally {
    clearTimeout(timeout);
  }
}

export async function testLLMProxy(settings: AnalyzerSettings): Promise<{ ok: boolean; message: string }> {
  const endpoint = settings.llm.proxyEndpoint.trim();

  if (!endpoint) {
    return { ok: false, message: 'Endpoint backend proxy belum diisi.' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (settings.llm.proxyToken.trim()) {
    headers['x-maintainability-token'] = settings.llm.proxyToken.trim();
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        application: 'Maintainability Risk Analyzer',
        healthCheck: true,
        functionName: 'healthCheck',
        riskLevel: 'Low',
        maintainabilityIndex: 100,
        metrics: {
          halsteadVolume: 1,
          halstead: {
            uniqueOperators: 1,
            uniqueOperands: 1,
            totalOperators: 1,
            totalOperands: 1,
            vocabulary: 2,
            length: 2,
            volume: 2
          },
          cyclomaticComplexity: 1,
          loc: 3
        },
        deterministicReasons: ['Health check koneksi backend proxy.'],
        codeSnippet: 'function healthCheck() { return true; }',
        model: settings.llm.model
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        ok: false,
        message: `Backend merespons status ${response.status}: ${text.slice(0, 200)}`
      };
    }

    return {
      ok: true,
      message: 'Backend proxy LLM berhasil dihubungi.'
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      ok: false,
      message: `Backend proxy tidak dapat dihubungi: ${message}`
    };
  }
}