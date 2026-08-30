const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-maintainability-token');
}

function safeText(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function parseAllowedModels() {
  return String(process.env.ALLOWED_MODELS || 'gpt-4.1-mini,gpt-4o-mini')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function selectModel(requestedModel) {
  const allowed = parseAllowedModels();
  const fallback = process.env.OPENAI_MODEL || allowed[0] || 'gpt-4.1-mini';
  return allowed.includes(requestedModel) ? requestedModel : fallback;
}

function extractOpenAIText(json) {
  if (typeof json?.output_text === 'string' && json.output_text.trim()) {
    return json.output_text.trim();
  }

  const output = Array.isArray(json?.output)
    ? json.output
        .flatMap((item) => Array.isArray(item.content) ? item.content : [])
        .map((content) => content.text)
        .filter((value) => typeof value === 'string')
        .join('\n')
    : '';

  return output.trim();
}

function tryParseJson(text) {
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

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => typeof item === 'string' ? item.trim() : '')
    .filter(Boolean);
}

function buildPrompt(body, maxSnippetChars) {
  const functionName = safeText(body.functionName, 'anonymous');
  const riskLevel = safeText(body.riskLevel, '');
  const snippet = safeText(body.codeSnippet).slice(0, maxSnippetChars);

  return JSON.stringify({
    role: 'explanation_layer_only',
    instruction: [
      'Jelaskan hasil analisis maintainability berdasarkan metrics yang sudah dihitung oleh extension.',
      'Jangan menghitung ulang metric.',
      'Jangan mengubah maintainabilityIndex.',
      'Jangan mengubah riskLevel.',
      'Gunakan bahasa Indonesia yang ringkas dan mudah dipahami.',
      'Jika riskLevel adalah Low, jangan memberikan refactoring besar dan jangan membuat seolah-olah kode bermasalah.',
      'Jika riskLevel adalah Low, fokus pada sisi positif kode berdasarkan metrik yang aman.',
      'Jika riskLevel adalah Low, isi positiveFindings dengan hal-hal yang sudah baik dari kode.',
      'Jika riskLevel adalah Low, refactoredCode boleh dikosongkan dan refactoringSuggestions boleh berisi catatan ringan saja.',
      'Jika riskLevel adalah Medium atau High, berikan contoh kode refactor dan saran refactoring yang jelas.',
      'Contoh kode refactor untuk Medium atau High harus muncul sebagai field refactoredCode.',
      'Saran refactoring harus dipisah sebagai array refactoringSuggestions.'
    ].join(' '),
    outputFormat: {
      summary: 'Ringkasan singkat kondisi maintainability. Untuk Low jelaskan bahwa kode relatif aman, untuk Medium/High jelaskan risikonya.',
      refactoredCode: 'Contoh kode JavaScript hasil refactor untuk Medium/High. Kosongkan jika Low dan tidak perlu refactor.',
      refactoringSuggestions: [
        'Saran refactor untuk Medium/High, atau catatan ringan jika Low.'
      ],
      positiveFindings: [
        'Hal yang sudah baik dari kode jika riskLevel Low.'
      ],
      reasons: [
        'Alasan berdasarkan metric yang diberikan.'
      ],
      maintainabilityImpact: 'Dampak terhadap maintainability. Untuk Low jelaskan dampak positifnya.',
      notes: 'Catatan bahwa hasil LLM bersifat rekomendasi dan tetap perlu dicek manual.'
    },
    functionName,
    riskLevel,
    maintainabilityIndex: body.maintainabilityIndex,
    metrics: body.metrics,
    violations: body.violations || [],
    deterministicReasons: body.deterministicReasons || [],
    codeSnippet: snippet
  }, null, 2);
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Gunakan POST.' });
  }

  const configuredToken = process.env.PROXY_ACCESS_TOKEN;

  if (configuredToken) {
    const requestToken = req.headers['x-maintainability-token'];

    if (requestToken !== configuredToken) {
      return res.status(401).json({ error: 'Unauthorized proxy token.' });
    }
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY belum diatur pada environment backend.' });
  }

  const body = req.body || {};
  const maxSnippetChars = Number(process.env.MAX_SNIPPET_CHARS || 15000);
  const model = selectModel(safeText(body.model));

  const systemText = [
    'Anda adalah lapisan penjelas untuk static analysis tool bernama Maintainability Risk Analyzer.',
    'Metric, Maintainability Index, dan risk level sudah dihitung oleh extension secara deterministik.',
    'Jangan menghitung ulang metric, jangan mengubah Maintainability Index, dan jangan mengubah risk level.',
    'Jika riskLevel Low, fokus pada penjelasan sisi positif kode berdasarkan nilai MI dan jangan memberikan refactoring besar.',
    'Jika riskLevel Medium atau High, berikan contoh kode refactor dan saran refactoring yang relevan.',
    'Jangan menyatakan bahwa file sudah diubah otomatis.',
    'Balas HANYA dalam JSON valid tanpa markdown.',
    'JSON wajib memiliki field: summary, refactoredCode, refactoringSuggestions, positiveFindings, reasons, maintainabilityImpact, notes.'
  ].join(' ');

  const openAIBody = {
    model,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: systemText
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: buildPrompt(body, maxSnippetChars)
          }
        ]
      }
    ],
    max_output_tokens: 10000
  };

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(openAIBody)
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = json?.error?.message || `OpenAI API error ${response.status}`;
      return res.status(response.status).json({ error: message });
    }

    const rawText = extractOpenAIText(json);

    if (!rawText) {
      return res.status(502).json({
        error: 'OpenAI tidak mengembalikan teks penjelasan.'
      });
    }

    const parsed = tryParseJson(rawText);

    if (!parsed || typeof parsed !== 'object') {
      return res.status(502).json({
        error: 'Respons OpenAI tidak berupa JSON terstruktur yang valid.',
        rawText: rawText.slice(0, 2000)
      });
    }

    const result = {
      summary: safeText(
        parsed.summary,
        'LLM memberikan penjelasan berdasarkan hasil analisis software metrics.'
      ),
      refactoredCode: safeText(parsed.refactoredCode, ''),
      refactoringSuggestions: normalizeStringArray(
        parsed.refactoringSuggestions
      ),
      positiveFindings: normalizeStringArray(
        parsed.positiveFindings
      ),
      reasons: normalizeStringArray(parsed.reasons),
      maintainabilityImpact: safeText(
        parsed.maintainabilityImpact,
        ''
      ),
      notes: safeText(
        parsed.notes,
        'Contoh kode dan saran refactoring bersifat rekomendasi dan perlu diperiksa kembali oleh developer.'
      ),
      explanation: rawText,
      model,
      source: 'openai-proxy'
    };

    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return res.status(500).json({
      error: `Backend proxy gagal memanggil OpenAI: ${message}`
    });
  }
};