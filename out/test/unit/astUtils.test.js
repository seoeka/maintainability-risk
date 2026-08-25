"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const parser_1 = require("@babel/parser");
const astUtils_1 = require("../../analyzer/astUtils");
const mocha_1 = require("mocha");
function parseProgram(source) {
    const ast = (0, parser_1.parse)(source, {
        sourceType: 'unambiguous',
        plugins: ['jsx']
    });
    return ast.program;
}
(0, mocha_1.describe)('astUtils', () => {
    (0, mocha_1.it)('should identify function nodes', () => {
        const program = parseProgram(`
      function hello() {
        return 1;
      }
    `);
        const functionNode = program.body[0];
        node_assert_1.default.strictEqual((0, astUtils_1.isFunctionNode)(functionNode), true);
    });
    (0, mocha_1.it)('should return false for non-function nodes', () => {
        const program = parseProgram(`
      const value = 10;
    `);
        const variableNode = program.body[0];
        node_assert_1.default.strictEqual((0, astUtils_1.isFunctionNode)(variableNode), false);
    });
    (0, mocha_1.it)('should walk all relevant AST nodes', () => {
        const program = parseProgram(`
      function hello(value) {
        if (value) {
          return true;
        }

        return false;
      }
    `);
        const visited = [];
        (0, astUtils_1.walkAst)(program, (node) => {
            visited.push(node.type);
        });
        node_assert_1.default.ok(visited.includes('Program'));
        node_assert_1.default.ok(visited.includes('FunctionDeclaration'));
        node_assert_1.default.ok(visited.includes('IfStatement'));
        node_assert_1.default.ok(visited.includes('ReturnStatement'));
    });
    (0, mocha_1.it)('should collect analyzable functions including nested functions', () => {
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
        const functions = (0, astUtils_1.collectAnalyzableFunctions)(program);
        node_assert_1.default.strictEqual(functions.length, 3);
        node_assert_1.default.strictEqual(functions[0].id.name, 'first');
        node_assert_1.default.strictEqual(functions[1].id.name, 'nested');
        node_assert_1.default.strictEqual(functions[2].id.name, 'second');
    });
    (0, mocha_1.it)('should attach parent nodes to AST nodes', () => {
        const program = parseProgram(`
      function hello() {
        return 1;
      }
    `);
        (0, astUtils_1.attachParents)(program);
        const functionNode = program.body[0];
        const blockNode = functionNode.body;
        const returnNode = blockNode.body[0];
        const literalNode = returnNode.argument;
        node_assert_1.default.strictEqual(functionNode.__parent, program);
        node_assert_1.default.strictEqual(blockNode.__parent, functionNode);
        node_assert_1.default.strictEqual(returnNode.__parent, blockNode);
        node_assert_1.default.strictEqual(literalNode.__parent, returnNode);
    });
    (0, mocha_1.it)('should get function declaration name', () => {
        const program = parseProgram(`
      function calculate() {
        return 1;
      }
    `);
        const functionNode = program.body[0];
        node_assert_1.default.strictEqual((0, astUtils_1.getFunctionName)(functionNode, undefined, 1), 'calculate');
    });
    (0, mocha_1.it)('should get arrow function name from variable declaration', () => {
        const program = parseProgram(`
      const calculate = () => {
        return 1;
      };
    `);
        const declaration = program.body[0];
        const functionNode = declaration.declarations[0].init;
        node_assert_1.default.strictEqual((0, astUtils_1.getFunctionName)(functionNode, declaration.declarations[0], 1), 'calculate');
    });
    (0, mocha_1.it)('should generate fallback name for anonymous function', () => {
        const program = parseProgram(`
      [1].map(function () {
        return 1;
      });
    `);
        const call = program.body[0].expression;
        const functionNode = call.arguments[0];
        node_assert_1.default.strictEqual((0, astUtils_1.getFunctionName)(functionNode, call, 3), 'anonymousFunction3');
    });
});
//# sourceMappingURL=astUtils.test.js.map