"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeDependencies = analyzeDependencies;
function isStringLiteral(node) {
    return !!node && (node.type === 'StringLiteral' || node.type === 'Literal') && typeof node.value === 'string';
}
function analyzeDependencies(programNode) {
    const dependencies = new Set();
    for (const node of programNode.body ?? []) {
        if (node.type === 'ImportDeclaration' && isStringLiteral(node.source)) {
            dependencies.add(node.source.value);
        }
        if ((node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') && isStringLiteral(node.source)) {
            dependencies.add(node.source.value);
        }
        if (node.type === 'VariableDeclaration') {
            for (const declaration of node.declarations ?? []) {
                const init = declaration.init;
                if (init?.type === 'CallExpression' &&
                    init.callee?.type === 'Identifier' &&
                    init.callee.name === 'require' &&
                    isStringLiteral(init.arguments?.[0])) {
                    dependencies.add(init.arguments[0].value);
                }
            }
        }
        if (node.type === 'ExpressionStatement' &&
            node.expression?.type === 'CallExpression' &&
            node.expression.callee?.type === 'Identifier' &&
            node.expression.callee.name === 'require' &&
            isStringLiteral(node.expression.arguments?.[0])) {
            dependencies.add(node.expression.arguments[0].value);
        }
    }
    const sorted = Array.from(dependencies).sort((a, b) => a.localeCompare(b));
    return { dependencies: sorted };
}
//# sourceMappingURL=dependencyAnalyzer.js.map