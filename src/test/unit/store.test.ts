import assert from 'node:assert';
import { describe, it } from 'node:test';
import * as vscode from 'vscode';

import { AnalysisStore } from '../../utils/store';
import {
  FileAnalysisResult,
  FunctionAnalysisResult
} from '../../analyzer/types';

function createFunction(
  id: string,
  uri: string,
  functionName: string,
  startLine = 1,
  endLine = 5
): FunctionAnalysisResult {
  return {
    id,
    functionName,
    kind: 'FunctionDeclaration',
    location: {
      uri,
      fileName: uri,
      startLine,
      endLine,
      startColumn: 0,
      endColumn: 20,
      range: new vscode.Range(
        new vscode.Position(startLine - 1, 0),
        new vscode.Position(endLine - 1, 20)
      )
    },
    snippet: `function ${functionName}() {}`,
    metrics: {
      halsteadVolume: 10,
      cyclomaticComplexity: 1,
      loc: 5,
      halstead: {
        uniqueOperators: 1,
        uniqueOperands: 1,
        totalOperators: 1,
        totalOperands: 1,
        vocabulary: 2,
        length: 2,
        volume: 10
      }
    },
    risk: {
      level: 'Low',
      score: 80,
      maintainabilityIndex: 80,
      violations: [],
      deterministicExplanation: [
        'Test explanation'
      ]
    }
  };
}

function createFile(
  uri: string,
  fileName: string,
  functions: FunctionAnalysisResult[]
): FileAnalysisResult {
  return {
    uri,
    fileName,
    analyzedAt: new Date().toISOString(),
    dependencies: [],
    functions
  };
}

describe('AnalysisStore', () => {

  it('should insert and retrieve a file using upsert and getFile', () => {
    const store = new AnalysisStore();

    const file = createFile(
      'file:///test.js',
      'test.js',
      []
    );

    store.upsert(file);

    const result = store.getFile('file:///test.js');

    assert.strictEqual(result, file);
  });

  it('should replace existing file analysis when upsert is called again', () => {
    const store = new AnalysisStore();

    const first = createFile(
      'file:///test.js',
      'test.js',
      []
    );

    const second = createFile(
      'file:///test.js',
      'test.js',
      [
        createFunction(
          'file:///test.js#test:1:0',
          'file:///test.js',
          'test'
        )
      ]
    );

    store.upsert(first);
    store.upsert(second);

    const result = store.getFile('file:///test.js');

    assert.strictEqual(result, second);
    assert.strictEqual(result?.functions.length, 1);
  });

  it('should return all stored files sorted by file name', () => {
    const store = new AnalysisStore();

    const zFile = createFile(
      'file:///z.js',
      'z.js',
      []
    );

    const aFile = createFile(
      'file:///a.js',
      'a.js',
      []
    );

    store.upsert(zFile);
    store.upsert(aFile);

    const result = store.getAllFiles();

    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].fileName, 'a.js');
    assert.strictEqual(result[1].fileName, 'z.js');
  });

  it('should return an empty list when no files are stored', () => {
    const store = new AnalysisStore();

    const result = store.getAllFiles();

    assert.deepStrictEqual(result, []);
  });

  it('should remove an existing file', () => {
    const store = new AnalysisStore();

    const file = createFile(
      'file:///test.js',
      'test.js',
      []
    );

    store.upsert(file);
    store.remove('file:///test.js');

    assert.strictEqual(
      store.getFile('file:///test.js'),
      undefined
    );
  });

  it('should remove the last hovered function when its file is removed', () => {
    const store = new AnalysisStore();

    const fn = createFunction(
      'file:///test.js#test:1:0',
      'file:///test.js',
      'test'
    );

    const file = createFile(
      'file:///test.js',
      'test.js',
      [fn]
    );

    store.upsert(file);
    store.setLastHoveredFunction(fn);

    store.remove('file:///test.js');

    assert.strictEqual(
      store.getLastHoveredFunction(),
      undefined
    );
  });

  it('should find a function by its id', () => {
    const store = new AnalysisStore();

    const fn = createFunction(
      'file:///test.js#test:1:0',
      'file:///test.js',
      'test'
    );

    const file = createFile(
      'file:///test.js',
      'test.js',
      [fn]
    );

    store.upsert(file);

    const result = store.findFunctionById(
      'file:///test.js',
      fn.id
    );

    assert.strictEqual(result, fn);
  });

  it('should return undefined when function id does not exist', () => {
    const store = new AnalysisStore();

    const fn = createFunction(
      'file:///test.js#test:1:0',
      'file:///test.js',
      'test'
    );

    store.upsert(
      createFile(
        'file:///test.js',
        'test.js',
        [fn]
      )
    );

    const result = store.findFunctionById(
      'file:///test.js',
      'file:///test.js#unknown:1:0'
    );

    assert.strictEqual(result, undefined);
  });

  it('should find a function at a position inside its range', () => {
    const store = new AnalysisStore();

    const fn = createFunction(
      'file:///test.js#test:1:0',
      'file:///test.js',
      'test',
      1,
      5
    );

    store.upsert(
      createFile(
        'file:///test.js',
        'test.js',
        [fn]
      )
    );

    const position = new vscode.Position(2, 5);

    const result = store.findFunctionAt(
      'file:///test.js',
      position
    );

    assert.strictEqual(result, fn);
  });

  it('should return undefined when position is outside function range', () => {
    const store = new AnalysisStore();

    const fn = createFunction(
      'file:///test.js#test:1:0',
      'file:///test.js',
      'test',
      1,
      5
    );

    store.upsert(
      createFile(
        'file:///test.js',
        'test.js',
        [fn]
      )
    );

    const position = new vscode.Position(10, 0);

    const result = store.findFunctionAt(
      'file:///test.js',
      position
    );

    assert.strictEqual(result, undefined);
  });

  it('should return undefined when searching function from unknown file', () => {
    const store = new AnalysisStore();

    const position = new vscode.Position(1, 0);

    const result = store.findFunctionAt(
      'file:///unknown.js',
      position
    );

    assert.strictEqual(result, undefined);
  });

  it('should store and retrieve the last hovered function', () => {
    const store = new AnalysisStore();

    const fn = createFunction(
      'file:///test.js#test:1:0',
      'file:///test.js',
      'test'
    );

    store.setLastHoveredFunction(fn);

    const result = store.getLastHoveredFunction();

    assert.strictEqual(result, fn);
  });

  it('should return workspace analysis containing all stored files', () => {
    const store = new AnalysisStore();

    const first = createFile(
      'file:///a.js',
      'a.js',
      []
    );

    const second = createFile(
      'file:///b.js',
      'b.js',
      []
    );

    store.upsert(first);
    store.upsert(second);

    const result = store.getWorkspaceResult();

    assert.strictEqual(result.files.length, 2);
    assert.strictEqual(result.files[0], first);
    assert.strictEqual(result.files[1], second);
    assert.ok(result.analyzedAt);
  });

});