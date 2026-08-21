"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_module_1 = __importDefault(require("node:module"));
const node_assert_1 = __importDefault(require("node:assert"));
const mocha_1 = require("mocha");
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
    line;
    character;
    constructor(line, character) {
        this.line = line;
        this.character = character;
    }
}
class MockRange {
    start;
    end;
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }
    contains(position) {
        if (position.line < this.start.line) {
            return false;
        }
        if (position.line > this.end.line) {
            return false;
        }
        if (position.line === this.start.line &&
            position.character < this.start.character) {
            return false;
        }
        if (position.line === this.end.line &&
            position.character > this.end.character) {
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
const moduleLoader = node_module_1.default;
const originalLoad = moduleLoader._load;
moduleLoader._load = function (request, parent, isMain) {
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
const { analyzeTextDocument } = require('../../analyzer/analyzeDocument');
/**
 * ============================================================
 * SETTINGS
 * ============================================================
 */
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
/**
 * ============================================================
 * MOCK TEXT DOCUMENT
 * ============================================================
 */
class MockTextDocument {
    languageId;
    fileName;
    uri;
    source;
    constructor(source, fileName = '/test/example.js', languageId = 'javascript') {
        this.source = source;
        this.fileName = fileName;
        this.languageId = languageId;
        this.uri = {
            fsPath: fileName,
            toString() {
                return `file://${fileName.replace(/\\/g, '/')}`;
            }
        };
    }
    getText(range) {
        if (!range) {
            return this.source;
        }
        const lines = this.source.split(/\r?\n/);
        const startLine = range.start.line;
        const endLine = range.end.line;
        if (startLine === endLine) {
            return (lines[startLine]?.slice(range.start.character, range.end.character) ?? '');
        }
        const result = [];
        for (let i = startLine; i <= endLine; i++) {
            const line = lines[i] ?? '';
            if (i === startLine) {
                result.push(line.slice(range.start.character));
            }
            else if (i === endLine) {
                result.push(line.slice(0, range.end.character));
            }
            else {
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
function createDocument(source, fileName = '/test/example.js', languageId = 'javascript') {
    return new MockTextDocument(source, fileName, languageId);
}
/**
 * ============================================================
 * UNIT TESTS
 * ============================================================
 */
(0, mocha_1.describe)('analyzeDocument', () => {
    /**
     * ----------------------------------------------------------
     * 1. JavaScript document
     * ----------------------------------------------------------
     */
    (0, mocha_1.it)('should analyze a JavaScript document', () => {
        const source = `
function hello() {
  return 1;
}
`;
        const document = createDocument(source);
        const result = analyzeTextDocument(document, settings);
        node_assert_1.default.strictEqual(result.fileName, '/test/example.js');
        node_assert_1.default.strictEqual(result.functions.length, 1);
    });
    /**
     * ----------------------------------------------------------
     * 2. Function declaration
     * ----------------------------------------------------------
     */
    (0, mocha_1.it)('should detect function declarations', () => {
        const source = `
function hello() {
  return 1;
}

function goodbye() {
  return 2;
}
`;
        const document = createDocument(source);
        const result = analyzeTextDocument(document, settings);
        node_assert_1.default.strictEqual(result.functions.length, 2);
        node_assert_1.default.ok(result.functions.some(fn => fn.functionName === 'hello'));
        node_assert_1.default.ok(result.functions.some(fn => fn.functionName === 'goodbye'));
    });
    /**
     * ----------------------------------------------------------
     * 3. Arrow function
     * ----------------------------------------------------------
     */
    (0, mocha_1.it)('should detect arrow functions', () => {
        const source = `
const add = (a, b) => {
  return a + b;
};
`;
        const document = createDocument(source);
        const result = analyzeTextDocument(document, settings);
        node_assert_1.default.strictEqual(result.functions.length, 1);
        node_assert_1.default.ok(result.functions[0].functionName.includes('add'));
    });
    /**
     * ----------------------------------------------------------
     * 4. Multiple function types
     * ----------------------------------------------------------
     */
    (0, mocha_1.it)('should detect multiple function types', () => {
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
        const result = analyzeTextDocument(document, settings);
        node_assert_1.default.strictEqual(result.functions.length, 3);
    });
    /**
     * ----------------------------------------------------------
     * 5. Nested function
     * ----------------------------------------------------------
     */
    (0, mocha_1.it)('should analyze nested functions', () => {
        const source = `
function outer() {

  function inner() {
    return 10;
  }

  return inner();
}
`;
        const document = createDocument(source);
        const result = analyzeTextDocument(document, settings);
        node_assert_1.default.ok(result.functions.length >= 2);
        node_assert_1.default.ok(result.functions.some(fn => fn.functionName === 'outer'));
        node_assert_1.default.ok(result.functions.some(fn => fn.functionName === 'inner'));
    });
    /**
     * ----------------------------------------------------------
     * 6. Metrics generated
     * ----------------------------------------------------------
     */
    (0, mocha_1.it)('should calculate metrics for analyzed functions', () => {
        const source = `
function calculate(a, b) {
  if (a > b) {
    return a - b;
  }

  return b - a;
}
`;
        const document = createDocument(source);
        const result = analyzeTextDocument(document, settings);
        node_assert_1.default.strictEqual(result.functions.length, 1);
        const fn = result.functions[0];
        node_assert_1.default.ok(typeof fn.metrics.loc === 'number');
        node_assert_1.default.ok(typeof fn.metrics.cyclomaticComplexity === 'number');
        node_assert_1.default.ok(typeof fn.metrics.halsteadVolume === 'number');
        node_assert_1.default.ok(fn.metrics.loc > 0);
        node_assert_1.default.ok(fn.metrics.cyclomaticComplexity >= 1);
        node_assert_1.default.ok(fn.metrics.halsteadVolume >= 0);
    });
    /**
     * ----------------------------------------------------------
     * 7. Risk calculation
     * ----------------------------------------------------------
     */
    (0, mocha_1.it)('should calculate maintainability risk', () => {
        const source = `
function simple() {
  return 1;
}
`;
        const document = createDocument(source);
        const result = analyzeTextDocument(document, settings);
        const fn = result.functions[0];
        node_assert_1.default.ok(fn.risk);
        node_assert_1.default.ok(['Low', 'Medium', 'High'].includes(fn.risk.level));
        node_assert_1.default.ok(typeof fn.risk.maintainabilityIndex === 'number');
        node_assert_1.default.ok(typeof fn.risk.score === 'number');
    });
    /**
     * ----------------------------------------------------------
     * 8. Function location
     * ----------------------------------------------------------
     */
    (0, mocha_1.it)('should store function location', () => {
        const source = `
function hello() {
  return 1;
}
`;
        const document = createDocument(source);
        const result = analyzeTextDocument(document, settings);
        const fn = result.functions[0];
        node_assert_1.default.ok(fn.location);
        node_assert_1.default.strictEqual(fn.location.fileName, '/test/example.js');
        node_assert_1.default.ok(fn.location.startLine >= 1);
        node_assert_1.default.ok(fn.location.endLine >= fn.location.startLine);
        node_assert_1.default.ok(fn.location.range);
    });
    /**
     * ----------------------------------------------------------
     * 9. Function snippet
     * ----------------------------------------------------------
     */
    (0, mocha_1.it)('should extract function snippet', () => {
        const source = `
function hello() {
  return 123;
}
`;
        const document = createDocument(source);
        const result = analyzeTextDocument(document, settings);
        const fn = result.functions[0];
        node_assert_1.default.ok(fn.snippet.includes('function hello'));
        node_assert_1.default.ok(fn.snippet.includes('return 123'));
    });
    /**
     * ----------------------------------------------------------
     * 10. JavaScript extensions
     * ----------------------------------------------------------
     */
    (0, mocha_1.it)('should support .js files', () => {
        const document = createDocument('function test() { return 1; }', '/test/file.js');
        const result = analyzeTextDocument(document, settings);
        node_assert_1.default.strictEqual(result.functions.length, 1);
    });
    (0, mocha_1.it)('should support .mjs files', () => {
        const document = createDocument('function test() { return 1; }', '/test/file.mjs');
        const result = analyzeTextDocument(document, settings);
        node_assert_1.default.strictEqual(result.functions.length, 1);
    });
    (0, mocha_1.it)('should support .cjs files', () => {
        const document = createDocument('function test() { return 1; }', '/test/file.cjs');
        const result = analyzeTextDocument(document, settings);
        node_assert_1.default.strictEqual(result.functions.length, 1);
    });
    /**
     * ----------------------------------------------------------
     * 11. Non-JavaScript file
     * ----------------------------------------------------------
     */
    (0, mocha_1.it)('should ignore unsupported file types', () => {
        const document = createDocument('function test() { return 1; }', '/test/file.ts', 'typescript');
        const result = analyzeTextDocument(document, settings);
        node_assert_1.default.strictEqual(result.functions.length, 0);
        node_assert_1.default.strictEqual(result.dependencies.length, 0);
    });
    /**
     * ----------------------------------------------------------
     * 12. Parse error
     * ----------------------------------------------------------
     */
    (0, mocha_1.it)('should return parseError for invalid JavaScript', () => {
        const source = `
function broken( {
  return 1;
}
`;
        const document = createDocument(source);
        const result = analyzeTextDocument(document, settings);
        node_assert_1.default.ok(result.parseError);
        node_assert_1.default.strictEqual(result.functions.length, 0);
        node_assert_1.default.strictEqual(result.dependencies.length, 0);
    });
    /**
     * ----------------------------------------------------------
     * 13. Empty document
     * ----------------------------------------------------------
     */
    (0, mocha_1.it)('should handle an empty JavaScript document', () => {
        const document = createDocument('');
        const result = analyzeTextDocument(document, settings);
        node_assert_1.default.strictEqual(result.functions.length, 0);
        node_assert_1.default.strictEqual(result.dependencies.length, 0);
        node_assert_1.default.strictEqual(result.parseError, undefined);
    });
    /**
     * ----------------------------------------------------------
     * 14. Function ID
     * ----------------------------------------------------------
     */
    (0, mocha_1.it)('should generate a unique function id', () => {
        const source = `
function first() {
  return 1;
}

function second() {
  return 2;
}
`;
        const document = createDocument(source);
        const result = analyzeTextDocument(document, settings);
        node_assert_1.default.strictEqual(result.functions.length, 2);
        node_assert_1.default.notStrictEqual(result.functions[0].id, result.functions[1].id);
        node_assert_1.default.ok(result.functions[0].id.length > 0);
        node_assert_1.default.ok(result.functions[1].id.length > 0);
    });
    /**
     * ----------------------------------------------------------
     * 15. Dependencies
     * ----------------------------------------------------------
     */
    (0, mocha_1.it)('should analyze dependencies from imports', () => {
        const source = `
import fs from 'fs';

function readFile() {
  return fs.readFileSync('test.txt');
}
`;
        const document = createDocument(source);
        const result = analyzeTextDocument(document, settings);
        node_assert_1.default.ok(Array.isArray(result.dependencies));
        node_assert_1.default.strictEqual(result.functions.length, 1);
    });
    /**
     * ----------------------------------------------------------
     * 16. Conditional function
     * ----------------------------------------------------------
     */
    (0, mocha_1.it)('should analyze a function containing conditional logic', () => {
        const source = `
function check(value) {
  if (value > 10) {
    return 'high';
  }

  return 'low';
}
`;
        const document = createDocument(source);
        const result = analyzeTextDocument(document, settings);
        const fn = result.functions[0];
        node_assert_1.default.ok(fn.metrics.cyclomaticComplexity >= 2);
        node_assert_1.default.ok(fn.metrics.loc > 0);
        node_assert_1.default.ok(fn.metrics.halsteadVolume >= 0);
    });
    /**
     * ----------------------------------------------------------
     * 17. Loop function
     * ----------------------------------------------------------
     */
    (0, mocha_1.it)('should analyze a function containing a loop', () => {
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
        const result = analyzeTextDocument(document, settings);
        const fn = result.functions[0];
        node_assert_1.default.ok(fn.metrics.cyclomaticComplexity >= 2);
        node_assert_1.default.ok(fn.metrics.loc > 0);
    });
    /**
     * ----------------------------------------------------------
     * 18. Complete analysis result
     * ----------------------------------------------------------
     */
    (0, mocha_1.it)('should return a complete file analysis result', () => {
        const source = `
function calculate(a, b) {
  if (a > b) {
    return a - b;
  }

  return b - a;
}
`;
        const document = createDocument(source);
        const result = analyzeTextDocument(document, settings);
        node_assert_1.default.strictEqual(result.fileName, '/test/example.js');
        node_assert_1.default.ok(result.uri.startsWith('file://'));
        node_assert_1.default.ok(result.analyzedAt);
        node_assert_1.default.ok(Array.isArray(result.functions));
        node_assert_1.default.ok(Array.isArray(result.dependencies));
    });
});
//# sourceMappingURL=analyzeDocument.test.js.map