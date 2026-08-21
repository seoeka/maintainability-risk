"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = require("node:test");
const vscode = __importStar(require("vscode"));
const store_1 = require("../../utils/store");
function createFunction(id, uri, functionName, startLine = 1, endLine = 5) {
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
            range: new vscode.Range(new vscode.Position(startLine - 1, 0), new vscode.Position(endLine - 1, 20))
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
function createFile(uri, fileName, functions) {
    return {
        uri,
        fileName,
        analyzedAt: new Date().toISOString(),
        dependencies: [],
        functions
    };
}
(0, node_test_1.describe)('AnalysisStore', () => {
    (0, node_test_1.it)('should insert and retrieve a file using upsert and getFile', () => {
        const store = new store_1.AnalysisStore();
        const file = createFile('file:///test.js', 'test.js', []);
        store.upsert(file);
        const result = store.getFile('file:///test.js');
        node_assert_1.default.strictEqual(result, file);
    });
    (0, node_test_1.it)('should replace existing file analysis when upsert is called again', () => {
        const store = new store_1.AnalysisStore();
        const first = createFile('file:///test.js', 'test.js', []);
        const second = createFile('file:///test.js', 'test.js', [
            createFunction('file:///test.js#test:1:0', 'file:///test.js', 'test')
        ]);
        store.upsert(first);
        store.upsert(second);
        const result = store.getFile('file:///test.js');
        node_assert_1.default.strictEqual(result, second);
        node_assert_1.default.strictEqual(result?.functions.length, 1);
    });
    (0, node_test_1.it)('should return all stored files sorted by file name', () => {
        const store = new store_1.AnalysisStore();
        const zFile = createFile('file:///z.js', 'z.js', []);
        const aFile = createFile('file:///a.js', 'a.js', []);
        store.upsert(zFile);
        store.upsert(aFile);
        const result = store.getAllFiles();
        node_assert_1.default.strictEqual(result.length, 2);
        node_assert_1.default.strictEqual(result[0].fileName, 'a.js');
        node_assert_1.default.strictEqual(result[1].fileName, 'z.js');
    });
    (0, node_test_1.it)('should return an empty list when no files are stored', () => {
        const store = new store_1.AnalysisStore();
        const result = store.getAllFiles();
        node_assert_1.default.deepStrictEqual(result, []);
    });
    (0, node_test_1.it)('should remove an existing file', () => {
        const store = new store_1.AnalysisStore();
        const file = createFile('file:///test.js', 'test.js', []);
        store.upsert(file);
        store.remove('file:///test.js');
        node_assert_1.default.strictEqual(store.getFile('file:///test.js'), undefined);
    });
    (0, node_test_1.it)('should remove the last hovered function when its file is removed', () => {
        const store = new store_1.AnalysisStore();
        const fn = createFunction('file:///test.js#test:1:0', 'file:///test.js', 'test');
        const file = createFile('file:///test.js', 'test.js', [fn]);
        store.upsert(file);
        store.setLastHoveredFunction(fn);
        store.remove('file:///test.js');
        node_assert_1.default.strictEqual(store.getLastHoveredFunction(), undefined);
    });
    (0, node_test_1.it)('should find a function by its id', () => {
        const store = new store_1.AnalysisStore();
        const fn = createFunction('file:///test.js#test:1:0', 'file:///test.js', 'test');
        const file = createFile('file:///test.js', 'test.js', [fn]);
        store.upsert(file);
        const result = store.findFunctionById('file:///test.js', fn.id);
        node_assert_1.default.strictEqual(result, fn);
    });
    (0, node_test_1.it)('should return undefined when function id does not exist', () => {
        const store = new store_1.AnalysisStore();
        const fn = createFunction('file:///test.js#test:1:0', 'file:///test.js', 'test');
        store.upsert(createFile('file:///test.js', 'test.js', [fn]));
        const result = store.findFunctionById('file:///test.js', 'file:///test.js#unknown:1:0');
        node_assert_1.default.strictEqual(result, undefined);
    });
    (0, node_test_1.it)('should find a function at a position inside its range', () => {
        const store = new store_1.AnalysisStore();
        const fn = createFunction('file:///test.js#test:1:0', 'file:///test.js', 'test', 1, 5);
        store.upsert(createFile('file:///test.js', 'test.js', [fn]));
        const position = new vscode.Position(2, 5);
        const result = store.findFunctionAt('file:///test.js', position);
        node_assert_1.default.strictEqual(result, fn);
    });
    (0, node_test_1.it)('should return undefined when position is outside function range', () => {
        const store = new store_1.AnalysisStore();
        const fn = createFunction('file:///test.js#test:1:0', 'file:///test.js', 'test', 1, 5);
        store.upsert(createFile('file:///test.js', 'test.js', [fn]));
        const position = new vscode.Position(10, 0);
        const result = store.findFunctionAt('file:///test.js', position);
        node_assert_1.default.strictEqual(result, undefined);
    });
    (0, node_test_1.it)('should return undefined when searching function from unknown file', () => {
        const store = new store_1.AnalysisStore();
        const position = new vscode.Position(1, 0);
        const result = store.findFunctionAt('file:///unknown.js', position);
        node_assert_1.default.strictEqual(result, undefined);
    });
    (0, node_test_1.it)('should store and retrieve the last hovered function', () => {
        const store = new store_1.AnalysisStore();
        const fn = createFunction('file:///test.js#test:1:0', 'file:///test.js', 'test');
        store.setLastHoveredFunction(fn);
        const result = store.getLastHoveredFunction();
        node_assert_1.default.strictEqual(result, fn);
    });
    (0, node_test_1.it)('should return workspace analysis containing all stored files', () => {
        const store = new store_1.AnalysisStore();
        const first = createFile('file:///a.js', 'a.js', []);
        const second = createFile('file:///b.js', 'b.js', []);
        store.upsert(first);
        store.upsert(second);
        const result = store.getWorkspaceResult();
        node_assert_1.default.strictEqual(result.files.length, 2);
        node_assert_1.default.strictEqual(result.files[0], first);
        node_assert_1.default.strictEqual(result.files[1], second);
        node_assert_1.default.ok(result.analyzedAt);
    });
});
//# sourceMappingURL=store.test.js.map