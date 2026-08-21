"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const parser_1 = require("@babel/parser");
const dependencyAnalyzer_1 = require("../../analyzer/dependencyAnalyzer");
const node_test_1 = require("node:test");
function parseProgram(source) {
    const ast = (0, parser_1.parse)(source, {
        sourceType: 'unambiguous'
    });
    return ast.program;
}
(0, node_test_1.describe)('dependencyAnalyzer', () => {
    (0, node_test_1.it)('should detect ES module imports', () => {
        const program = parseProgram(`
      import fs from 'fs';
      import axios from 'axios';
    `);
        const result = (0, dependencyAnalyzer_1.analyzeDependencies)(program);
        node_assert_1.default.deepStrictEqual(result.dependencies, ['axios', 'fs']);
    });
    (0, node_test_1.it)('should detect require dependencies', () => {
        const program = parseProgram(`
      const fs = require('fs');
      const path = require('path');
    `);
        const result = (0, dependencyAnalyzer_1.analyzeDependencies)(program);
        node_assert_1.default.deepStrictEqual(result.dependencies, ['fs', 'path']);
    });
    (0, node_test_1.it)('should detect dependencies from export declarations', () => {
        const program = parseProgram(`
      export { something } from 'module-a';
      export * from 'module-b';
    `);
        const result = (0, dependencyAnalyzer_1.analyzeDependencies)(program);
        node_assert_1.default.deepStrictEqual(result.dependencies, ['module-a', 'module-b']);
    });
    (0, node_test_1.it)('should detect standalone require expressions', () => {
        const program = parseProgram(`
      require('dotenv');
    `);
        const result = (0, dependencyAnalyzer_1.analyzeDependencies)(program);
        node_assert_1.default.deepStrictEqual(result.dependencies, ['dotenv']);
    });
    (0, node_test_1.it)('should remove duplicate dependencies and sort them', () => {
        const program = parseProgram(`
      import fs from 'fs';
      const fs2 = require('fs');
      const path = require('path');
    `);
        const result = (0, dependencyAnalyzer_1.analyzeDependencies)(program);
        node_assert_1.default.deepStrictEqual(result.dependencies, ['fs', 'path']);
    });
    (0, node_test_1.it)('should return an empty list when no dependencies exist', () => {
        const program = parseProgram(`
      function hello() {
        return true;
      }
    `);
        const result = (0, dependencyAnalyzer_1.analyzeDependencies)(program);
        node_assert_1.default.deepStrictEqual(result.dependencies, []);
    });
});
//# sourceMappingURL=dependencyAnalyzer.test.js.map