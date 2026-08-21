import assert from 'node:assert';
import { parse } from '@babel/parser';

import { analyzeDependencies } from '../../analyzer/dependencyAnalyzer';
import { describe, it } from 'node:test';

type AnyNode = Record<string, any>;

function parseProgram(source: string): AnyNode {
  const ast = parse(source, {
    sourceType: 'unambiguous'
  });

  return ast.program as unknown as AnyNode;
}

describe('dependencyAnalyzer', () => {

  it('should detect ES module imports', () => {
    const program = parseProgram(`
      import fs from 'fs';
      import axios from 'axios';
    `);

    const result = analyzeDependencies(program);

    assert.deepStrictEqual(
      result.dependencies,
      ['axios', 'fs']
    );
  });

  it('should detect require dependencies', () => {
    const program = parseProgram(`
      const fs = require('fs');
      const path = require('path');
    `);

    const result = analyzeDependencies(program);

    assert.deepStrictEqual(
      result.dependencies,
      ['fs', 'path']
    );
  });

  it('should detect dependencies from export declarations', () => {
    const program = parseProgram(`
      export { something } from 'module-a';
      export * from 'module-b';
    `);

    const result = analyzeDependencies(program);

    assert.deepStrictEqual(
      result.dependencies,
      ['module-a', 'module-b']
    );
  });

  it('should detect standalone require expressions', () => {
    const program = parseProgram(`
      require('dotenv');
    `);

    const result = analyzeDependencies(program);

    assert.deepStrictEqual(
      result.dependencies,
      ['dotenv']
    );
  });

  it('should remove duplicate dependencies and sort them', () => {
    const program = parseProgram(`
      import fs from 'fs';
      const fs2 = require('fs');
      const path = require('path');
    `);

    const result = analyzeDependencies(program);

    assert.deepStrictEqual(
      result.dependencies,
      ['fs', 'path']
    );
  });

  it('should return an empty list when no dependencies exist', () => {
    const program = parseProgram(`
      function hello() {
        return true;
      }
    `);

    const result = analyzeDependencies(program);

    assert.deepStrictEqual(
      result.dependencies,
      []
    );
  });
});