import Module from 'node:module';
import assert from 'node:assert';
import { describe, it } from 'mocha';

import { AnalyzerSettings } from '../../analyzer/types';

/**
 * ============================================================
 * MOCK VS CODE MODULE
 * ============================================================
 *
 * analyzeDocument.ts melakukan:
 *
 *   import * as vscode from 'vscode';
 *
 * Node.js saat unit testing tidak berjalan di Extension Host
 * Visual Studio Code, sehingga module vscode tidak tersedia.
 *
 * Karena itu module vscode digantikan dengan mock sederhana.
 */

class MockPosition {
  public line: number;
  public character: number;

  constructor(line: number, character: number) {
    this.line = line;
    this.character = character;
  }
}

class MockRange {
  public start: MockPosition;
  public end: MockPosition;

  constructor(start: MockPosition, end: MockPosition) {
    this.start = start;
    this.end = end;
  }

  contains(position: MockPosition): boolean {
    if (position.line < this.start.line) {
      return false;
    }

    if (position.line > this.end.line) {
      return false;
    }

    if (
      position.line === this.start.line &&
      position.character < this.start.character
    ) {
      return false;
    }

    if (
      position.line === this.end.line &&
      position.character > this.end.character
    ) {
      return false;
    }

    return true;
  }
}

/**
 * Mock module "vscode".
 */
const vscodeMock = {
  Position: MockPosition,
  Range: MockRange
};

/**
 * Intercept require('vscode').
 *
 * PENTING:
 * Hook ini harus dipasang SEBELUM analyzeDocument di-load.
 */
const moduleLoader = Module as typeof Module & {
  _load: (
    request: string,
    parent: NodeModule | null,
    isMain: boolean
  ) => unknown;
};

const originalLoad = moduleLoader._load;

moduleLoader._load = function (
  request: string,
  parent: NodeModule | null,
  isMain: boolean
): unknown {
  if (request === 'vscode') {
    return vscodeMock;
  }

  return originalLoad.call(this, request, parent, isMain);
};

/**
 * ============================================================
 * LOAD ANALYZER AFTER MOCK
 * ============================================================
 *
 * Jangan ubah menjadi:
 *
 * import { analyzeTextDocument } from ...
 *
 * karena static import dapat membuat module di-load sebelum
 * mock runtime aktif.
 */
const { analyzeTextDocument } =
  require('../../analyzer/analyzeDocument') as typeof import('../../analyzer/analyzeDocument');

/**
 * ============================================================
 * SETTINGS
 * ============================================================
 */

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

/**
 * ============================================================
 * MOCK TEXT DOCUMENT
 * ============================================================
 */

class MockTextDocument {
  public languageId: string;
  public fileName: string;

  public uri: {
    fsPath: string;
    toString(): string;
  };

  private readonly source: string;

  constructor(
    source: string,
    fileName: string = '/test/example.js',
    languageId: string = 'javascript'
  ) {
    this.source = source;
    this.fileName = fileName;
    this.languageId = languageId;

    this.uri = {
      fsPath: fileName,

      toString(): string {
        return `file://${fileName.replace(/\\/g, '/')}`;
      }
    };
  }

  getText(range?: MockRange): string {
    if (!range) {
      return this.source;
    }

    const lines = this.source.split(/\r?\n/);

    const startLine = range.start.line;
    const endLine = range.end.line;

    if (startLine === endLine) {
      return (
        lines[startLine]?.slice(
          range.start.character,
          range.end.character
        ) ?? ''
      );
    }

    const result: string[] = [];

    for (let i = startLine; i <= endLine; i++) {
      const line = lines[i] ?? '';

      if (i === startLine) {
        result.push(line.slice(range.start.character));
      } else if (i === endLine) {
        result.push(line.slice(0, range.end.character));
      } else {
        result.push(line);
      }
    }

    return result.join('\n');
  }
}

/**
 * ============================================================
 * TEST HELPER
 * ============================================================
 */

function createDocument(
  source: string,
  fileName: string = '/test/example.js',
  languageId: string = 'javascript'
): MockTextDocument {
  return new MockTextDocument(
    source,
    fileName,
    languageId
  );
}

/**
 * ============================================================
 * UNIT TESTS
 * ============================================================
 */

describe('analyzeDocument', () => {

  /**
   * ----------------------------------------------------------
   * 1. JavaScript document
   * ----------------------------------------------------------
   */

  it('should analyze a JavaScript document', () => {
    const source = `
function hello() {
  return 1;
}
`;

    const document = createDocument(source);

    const result = analyzeTextDocument(
      document as any,
      settings
    );

    assert.strictEqual(
      result.fileName,
      '/test/example.js'
    );

    assert.strictEqual(
      result.functions.length,
      1
    );
  });

  /**
   * ----------------------------------------------------------
   * 2. Function declaration
   * ----------------------------------------------------------
   */

  it('should detect function declarations', () => {
    const source = `
function hello() {
  return 1;
}

function goodbye() {
  return 2;
}
`;

    const document = createDocument(source);

    const result = analyzeTextDocument(
      document as any,
      settings
    );

    assert.strictEqual(
      result.functions.length,
      2
    );

    assert.ok(
      result.functions.some(
        fn => fn.functionName === 'hello'
      )
    );

    assert.ok(
      result.functions.some(
        fn => fn.functionName === 'goodbye'
      )
    );
  });

  /**
   * ----------------------------------------------------------
   * 3. Arrow function
   * ----------------------------------------------------------
   */

  it('should detect arrow functions', () => {
    const source = `
const add = (a, b) => {
  return a + b;
};
`;

    const document = createDocument(source);

    const result = analyzeTextDocument(
      document as any,
      settings
    );

    assert.strictEqual(
      result.functions.length,
      1
    );

    assert.ok(
      result.functions[0].functionName.includes('add')
    );
  });

  /**
   * ----------------------------------------------------------
   * 4. Multiple function types
   * ----------------------------------------------------------
   */

  it('should detect multiple function types', () => {
    const source = `
function declaration() {
  return 1;
}

const arrow = () => {
  return 2;
};

const another = function () {
  return 3;
};
`;

    const document = createDocument(source);

    const result = analyzeTextDocument(
      document as any,
      settings
    );

    assert.strictEqual(
      result.functions.length,
      3
    );
  });

  /**
   * ----------------------------------------------------------
   * 5. Nested function
   * ----------------------------------------------------------
   */

  it('should analyze nested functions', () => {
    const source = `
function outer() {

  function inner() {
    return 10;
  }

  return inner();
}
`;

    const document = createDocument(source);

    const result = analyzeTextDocument(
      document as any,
      settings
    );

    assert.ok(
      result.functions.length >= 2
    );

    assert.ok(
      result.functions.some(
        fn => fn.functionName === 'outer'
      )
    );

    assert.ok(
      result.functions.some(
        fn => fn.functionName === 'inner'
      )
    );
  });

  /**
   * ----------------------------------------------------------
   * 6. Metrics generated
   * ----------------------------------------------------------
   */

  it('should calculate metrics for analyzed functions', () => {
    const source = `
function calculate(a, b) {
  if (a > b) {
    return a - b;
  }

  return b - a;
}
`;

    const document = createDocument(source);

    const result = analyzeTextDocument(
      document as any,
      settings
    );

    assert.strictEqual(
      result.functions.length,
      1
    );

    const fn = result.functions[0];

    assert.ok(
      typeof fn.metrics.loc === 'number'
    );

    assert.ok(
      typeof fn.metrics.cyclomaticComplexity === 'number'
    );

    assert.ok(
      typeof fn.metrics.halsteadVolume === 'number'
    );

    assert.ok(
      fn.metrics.loc > 0
    );

    assert.ok(
      fn.metrics.cyclomaticComplexity >= 1
    );

    assert.ok(
      fn.metrics.halsteadVolume >= 0
    );
  });

  /**
   * ----------------------------------------------------------
   * 7. Risk calculation
   * ----------------------------------------------------------
   */

  it('should calculate maintainability risk', () => {
    const source = `
function simple() {
  return 1;
}
`;

    const document = createDocument(source);

    const result = analyzeTextDocument(
      document as any,
      settings
    );

    const fn = result.functions[0];

    assert.ok(fn.risk);

    assert.ok(
      ['Low', 'Medium', 'High'].includes(
        fn.risk.level
      )
    );

    assert.ok(
      typeof fn.risk.maintainabilityIndex === 'number'
    );

    assert.ok(
      typeof fn.risk.score === 'number'
    );
  });

  /**
   * ----------------------------------------------------------
   * 8. Function location
   * ----------------------------------------------------------
   */

  it('should store function location', () => {
    const source = `
function hello() {
  return 1;
}
`;

    const document = createDocument(source);

    const result = analyzeTextDocument(
      document as any,
      settings
    );

    const fn = result.functions[0];

    assert.ok(fn.location);

    assert.strictEqual(
      fn.location.fileName,
      '/test/example.js'
    );

    assert.ok(
      fn.location.startLine >= 1
    );

    assert.ok(
      fn.location.endLine >= fn.location.startLine
    );

    assert.ok(
      fn.location.range
    );
  });

  /**
   * ----------------------------------------------------------
   * 9. Function snippet
   * ----------------------------------------------------------
   */

  it('should extract function snippet', () => {
    const source = `
function hello() {
  return 123;
}
`;

    const document = createDocument(source);

    const result = analyzeTextDocument(
      document as any,
      settings
    );

    const fn = result.functions[0];

    assert.ok(
      fn.snippet.includes('function hello')
    );

    assert.ok(
      fn.snippet.includes('return 123')
    );
  });

  /**
   * ----------------------------------------------------------
   * 10. JavaScript extensions
   * ----------------------------------------------------------
   */

  it('should support .js files', () => {
    const document = createDocument(
      'function test() { return 1; }',
      '/test/file.js'
    );

    const result = analyzeTextDocument(
      document as any,
      settings
    );

    assert.strictEqual(
      result.functions.length,
      1
    );
  });

  it('should support .mjs files', () => {
    const document = createDocument(
      'function test() { return 1; }',
      '/test/file.mjs'
    );

    const result = analyzeTextDocument(
      document as any,
      settings
    );

    assert.strictEqual(
      result.functions.length,
      1
    );
  });

  it('should support .cjs files', () => {
    const document = createDocument(
      'function test() { return 1; }',
      '/test/file.cjs'
    );

    const result = analyzeTextDocument(
      document as any,
      settings
    );

    assert.strictEqual(
      result.functions.length,
      1
    );
  });

  /**
   * ----------------------------------------------------------
   * 11. Non-JavaScript file
   * ----------------------------------------------------------
   */

  it('should ignore unsupported file types', () => {
    const document = createDocument(
      'function test() { return 1; }',
      '/test/file.ts',
      'typescript'
    );

    const result = analyzeTextDocument(
      document as any,
      settings
    );

    assert.strictEqual(
      result.functions.length,
      0
    );

    assert.strictEqual(
      result.dependencies.length,
      0
    );
  });

  /**
   * ----------------------------------------------------------
   * 12. Parse error
   * ----------------------------------------------------------
   */

  it('should return parseError for invalid JavaScript', () => {
    const source = `
function broken( {
  return 1;
}
`;

    const document = createDocument(source);

    const result = analyzeTextDocument(
      document as any,
      settings
    );

    assert.ok(
      result.parseError
    );

    assert.strictEqual(
      result.functions.length,
      0
    );

    assert.strictEqual(
      result.dependencies.length,
      0
    );
  });

  /**
   * ----------------------------------------------------------
   * 13. Empty document
   * ----------------------------------------------------------
   */

  it('should handle an empty JavaScript document', () => {
    const document = createDocument('');

    const result = analyzeTextDocument(
      document as any,
      settings
    );

    assert.strictEqual(
      result.functions.length,
      0
    );

    assert.strictEqual(
      result.dependencies.length,
      0
    );

    assert.strictEqual(
      result.parseError,
      undefined
    );
  });

  /**
   * ----------------------------------------------------------
   * 14. Function ID
   * ----------------------------------------------------------
   */

  it('should generate a unique function id', () => {
    const source = `
function first() {
  return 1;
}

function second() {
  return 2;
}
`;

    const document = createDocument(source);

    const result = analyzeTextDocument(
      document as any,
      settings
    );

    assert.strictEqual(
      result.functions.length,
      2
    );

    assert.notStrictEqual(
      result.functions[0].id,
      result.functions[1].id
    );

    assert.ok(
      result.functions[0].id.length > 0
    );

    assert.ok(
      result.functions[1].id.length > 0
    );
  });

  /**
   * ----------------------------------------------------------
   * 15. Dependencies
   * ----------------------------------------------------------
   */

  it('should analyze dependencies from imports', () => {
    const source = `
import fs from 'fs';

function readFile() {
  return fs.readFileSync('test.txt');
}
`;

    const document = createDocument(source);

    const result = analyzeTextDocument(
      document as any,
      settings
    );

    assert.ok(
      Array.isArray(result.dependencies)
    );

    assert.strictEqual(
      result.functions.length,
      1
    );
  });

  /**
   * ----------------------------------------------------------
   * 16. Conditional function
   * ----------------------------------------------------------
   */

  it('should analyze a function containing conditional logic', () => {
    const source = `
function check(value) {
  if (value > 10) {
    return 'high';
  }

  return 'low';
}
`;

    const document = createDocument(source);

    const result = analyzeTextDocument(
      document as any,
      settings
    );

    const fn = result.functions[0];

    assert.ok(
      fn.metrics.cyclomaticComplexity >= 2
    );

    assert.ok(
      fn.metrics.loc > 0
    );

    assert.ok(
      fn.metrics.halsteadVolume >= 0
    );
  });

  /**
   * ----------------------------------------------------------
   * 17. Loop function
   * ----------------------------------------------------------
   */

  it('should analyze a function containing a loop', () => {
    const source = `
function sum(values) {
  let total = 0;

  for (let i = 0; i < values.length; i++) {
    total += values[i];
  }

  return total;
}
`;

    const document = createDocument(source);

    const result = analyzeTextDocument(
      document as any,
      settings
    );

    const fn = result.functions[0];

    assert.ok(
      fn.metrics.cyclomaticComplexity >= 2
    );

    assert.ok(
      fn.metrics.loc > 0
    );
  });

  /**
   * ----------------------------------------------------------
   * 18. Complete analysis result
   * ----------------------------------------------------------
   */

  it('should return a complete file analysis result', () => {
    const source = `
function calculate(a, b) {
  if (a > b) {
    return a - b;
  }

  return b - a;
}
`;

    const document = createDocument(source);

    const result = analyzeTextDocument(
      document as any,
      settings
    );

    assert.strictEqual(
      result.fileName,
      '/test/example.js'
    );

    assert.ok(
      result.uri.startsWith('file://')
    );

    assert.ok(
      result.analyzedAt
    );

    assert.ok(
      Array.isArray(result.functions)
    );

    assert.ok(
      Array.isArray(result.dependencies)
    );
  });

});