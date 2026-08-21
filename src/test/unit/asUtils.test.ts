import assert from 'node:assert';
import { parse } from '@babel/parser';

import {
  isFunctionNode,
  walkAst,
  collectTopLevelFunctions,
  attachParents,
  getFunctionName
} from '../../analyzer/astUtils';
import { describe, it } from 'node:test';

type AnyNode = Record<string, any>;

function parseProgram(source: string): AnyNode {
  const ast = parse(source, {
    sourceType: 'unambiguous',
    plugins: ['jsx']
  });

  return ast.program as unknown as AnyNode;
}

describe('astUtils', () => {

  it('should identify function nodes', () => {
    const program = parseProgram(`
      function hello() {
        return 1;
      }
    `);

    const functionNode = program.body[0];

    assert.strictEqual(isFunctionNode(functionNode), true);
  });

  it('should return false for non-function nodes', () => {
    const program = parseProgram(`
      const value = 10;
    `);

    const variableNode = program.body[0];

    assert.strictEqual(isFunctionNode(variableNode), false);
  });

  it('should walk all relevant AST nodes', () => {
    const program = parseProgram(`
      function hello(value) {
        if (value) {
          return true;
        }

        return false;
      }
    `);

    const visited: string[] = [];

    walkAst(program, (node) => {
      visited.push(node.type);
    });

    assert.ok(visited.includes('Program'));
    assert.ok(visited.includes('FunctionDeclaration'));
    assert.ok(visited.includes('IfStatement'));
    assert.ok(visited.includes('ReturnStatement'));
  });

  it('should collect top-level functions', () => {
    const program = parseProgram(`
      function first() {
        function nested() {
          return true;
        }

        return nested();
      }

      function second() {
        return false;
      }
    `);

    attachParents(program);

    const functions = collectTopLevelFunctions(program);

    assert.strictEqual(functions.length, 2);
    assert.strictEqual(functions[0].id.name, 'first');
    assert.strictEqual(functions[1].id.name, 'second');
  });

  it('should attach parent nodes to AST nodes', () => {
    const program = parseProgram(`
      function hello() {
        return 1;
      }
    `);

    attachParents(program);

    const functionNode = program.body[0];
    const blockNode = functionNode.body;
    const returnNode = blockNode.body[0];
    const literalNode = returnNode.argument;

    assert.strictEqual(functionNode.__parent, program);
    assert.strictEqual(blockNode.__parent, functionNode);
    assert.strictEqual(returnNode.__parent, blockNode);
    assert.strictEqual(literalNode.__parent, returnNode);
  });

  it('should get function declaration name', () => {
    const program = parseProgram(`
      function calculate() {
        return 1;
      }
    `);

    const functionNode = program.body[0];

    assert.strictEqual(
      getFunctionName(functionNode, undefined, 1),
      'calculate'
    );
  });

  it('should get arrow function name from variable declaration', () => {
    const program = parseProgram(`
      const calculate = () => {
        return 1;
      };
    `);

    const declaration = program.body[0];
    const functionNode = declaration.declarations[0].init;

    assert.strictEqual(
      getFunctionName(functionNode, declaration.declarations[0], 1),
      'calculate'
    );
  });

  it('should generate fallback name for anonymous function', () => {
    const program = parseProgram(`
      [1].map(function () {
        return 1;
      });
    `);

    const call = program.body[0].expression;
    const functionNode = call.arguments[0];

    assert.strictEqual(
      getFunctionName(functionNode, call, 3),
      'anonymousFunction3'
    );
  });
});