"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFunctionNode = isFunctionNode;
exports.walkAst = walkAst;
exports.collectAnalyzableFunctions = collectAnalyzableFunctions;
exports.collectTopLevelFunctions = collectTopLevelFunctions;
exports.attachParents = attachParents;
exports.getFunctionName = getFunctionName;
const FUNCTION_NODE_TYPES = new Set([
    'FunctionDeclaration',
    'FunctionExpression',
    'ArrowFunctionExpression',
    'ObjectMethod',
    'ClassMethod',
    'ClassPrivateMethod'
]);
function isFunctionNode(node) {
    return !!node && FUNCTION_NODE_TYPES.has(node.type);
}
function walkAst(node, visitor, parent) {
    if (!node || typeof node.type !== 'string') {
        return;
    }
    visitor(node, parent);
    for (const [key, value] of Object.entries(node)) {
        if (key.startsWith('__') ||
            key === 'loc' ||
            key === 'range' ||
            key === 'leadingComments' ||
            key === 'trailingComments' ||
            key === 'innerComments') {
            continue;
        }
        if (Array.isArray(value)) {
            for (const child of value) {
                if (child &&
                    typeof child === 'object' &&
                    typeof child.type === 'string') {
                    walkAst(child, visitor, node);
                }
            }
        }
        else if (value &&
            typeof value === 'object' &&
            typeof value.type === 'string') {
            walkAst(value, visitor, node);
        }
    }
}
/**
 * Mengumpulkan seluruh function yang dapat dianalisis,
 * termasuk nested function.
 *
 * Fungsi ini digunakan oleh proses analisis utama
 * dan menjadi unit yang diuji pada Unit Testing.
 */
function collectAnalyzableFunctions(programNode) {
    const functions = [];
    walkAst(programNode, (node, parent) => {
        if (!isFunctionNode(node)) {
            return;
        }
        const functionParent = parent;
        functions.push({
            ...node,
            __analysisParent: functionParent
        });
    });
    return functions;
}
function collectTopLevelFunctions(programNode) {
    const functions = [];
    walkAst(programNode, (node, parent) => {
        if (!isFunctionNode(node)) {
            return;
        }
        // Hindari menghitung nested function sebagai fungsi terpisah
        // untuk kebutuhan pengumpulan top-level function.
        let cursor = parent;
        while (cursor) {
            if (isFunctionNode(cursor)) {
                return;
            }
            cursor = cursor.__parent;
        }
        functions.push(node);
    });
    return functions;
}
function attachParents(node, parent) {
    if (!node || typeof node.type !== 'string') {
        return;
    }
    Object.defineProperty(node, '__parent', {
        value: parent,
        enumerable: false,
        configurable: true
    });
    for (const [key, value] of Object.entries(node)) {
        if (key.startsWith('__') ||
            key === 'loc' ||
            key === 'range') {
            continue;
        }
        if (Array.isArray(value)) {
            for (const child of value) {
                if (child &&
                    typeof child === 'object' &&
                    typeof child.type === 'string') {
                    attachParents(child, node);
                }
            }
        }
        else if (value &&
            typeof value === 'object' &&
            typeof value.type === 'string') {
            attachParents(value, node);
        }
    }
}
function getFunctionName(node, parent, fallbackIndex = 1) {
    if (node.id?.name) {
        return node.id.name;
    }
    if (node.key?.name) {
        return node.key.name;
    }
    if (parent?.type === 'VariableDeclarator' &&
        parent.id?.type === 'Identifier') {
        return parent.id.name;
    }
    if (parent?.type === 'AssignmentExpression' &&
        parent.left?.type === 'MemberExpression') {
        const property = parent.left.property;
        if (property?.type === 'Identifier') {
            return property.name;
        }
    }
    return `anonymousFunction${fallbackIndex}`;
}
//# sourceMappingURL=astUtils.js.map