"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateFunctionMetrics = calculateFunctionMetrics;
const astUtils_1 = require("./astUtils");
function round2(value) {
    return Math.round(value * 100) / 100;
}
function countLoc(startLine, endLine) {
    return Math.max(1, endLine - startLine + 1);
}
function walkWithinFunction(functionNode, visitor) {
    function visit(node, parent) {
        if (!node || typeof node.type !== 'string') {
            return;
        }
        if (node !== functionNode && (0, astUtils_1.isFunctionNode)(node)) {
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
                    if (child && typeof child === 'object' && typeof child.type === 'string') {
                        visit(child, node);
                    }
                }
            }
            else if (value && typeof value === 'object' && typeof value.type === 'string') {
                visit(value, node);
            }
        }
    }
    visit(functionNode);
}
function countCyclomaticComplexity(functionNode) {
    let complexity = 1;
    walkWithinFunction(functionNode, (node) => {
        switch (node.type) {
            case 'IfStatement':
            case 'ForStatement':
            case 'ForInStatement':
            case 'ForOfStatement':
            case 'WhileStatement':
            case 'DoWhileStatement':
            case 'CatchClause':
            case 'ConditionalExpression':
                complexity += 1;
                break;
            case 'SwitchCase':
                if (node.test) {
                    complexity += 1;
                }
                break;
            case 'LogicalExpression':
                if (node.operator === '&&' || node.operator === '||' || node.operator === '??') {
                    complexity += 1;
                }
                break;
            default:
                break;
        }
    });
    return complexity;
}
function literalOperand(node) {
    switch (node.type) {
        case 'StringLiteral':
        case 'NumericLiteral':
        case 'BooleanLiteral':
        case 'BigIntLiteral':
            return String(node.value);
        case 'NullLiteral':
            return 'null';
        case 'RegExpLiteral':
            return `/${node.pattern ?? ''}/${node.flags ?? ''}`;
        default:
            return undefined;
    }
}
function memberName(node) {
    if (!node) {
        return undefined;
    }
    if (node.type === 'Identifier') {
        return node.name;
    }
    if (node.type === 'ThisExpression') {
        return 'this';
    }
    if (node.type === 'Super') {
        return 'super';
    }
    if (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') {
        const objectName = memberName(node.object);
        const propertyName = memberName(node.property) ?? literalOperand(node.property);
        if (objectName && propertyName) {
            return node.computed ? `${objectName}[${propertyName}]` : `${objectName}.${propertyName}`;
        }
    }
    return literalOperand(node);
}
function calculateHalstead(functionNode) {
    const uniqueOperators = new Set();
    const uniqueOperands = new Set();
    let totalOperators = 0;
    let totalOperands = 0;
    const addOperator = (operator) => {
        if (!operator) {
            return;
        }
        uniqueOperators.add(operator);
        totalOperators += 1;
    };
    const addOperand = (operand) => {
        if (!operand) {
            return;
        }
        uniqueOperands.add(operand);
        totalOperands += 1;
    };
    walkWithinFunction(functionNode, (node, parent) => {
        switch (node.type) {
            case 'FunctionDeclaration':
            case 'FunctionExpression':
            case 'ObjectMethod':
            case 'ClassMethod':
            case 'ClassPrivateMethod':
                addOperator('function');
                addOperand(node.id?.name ?? node.key?.name);
                break;
            case 'ArrowFunctionExpression':
                addOperator('=>');
                break;
            case 'VariableDeclaration':
                addOperator(node.kind);
                break;
            case 'VariableDeclarator':
                addOperator('=');
                break;
            case 'IfStatement':
                addOperator('if');
                break;
            case 'ForStatement':
                addOperator('for');
                break;
            case 'ForInStatement':
                addOperator('for-in');
                break;
            case 'ForOfStatement':
                addOperator('for-of');
                break;
            case 'WhileStatement':
                addOperator('while');
                break;
            case 'DoWhileStatement':
                addOperator('do-while');
                break;
            case 'SwitchStatement':
                addOperator('switch');
                break;
            case 'SwitchCase':
                addOperator(node.test ? 'case' : 'default');
                break;
            case 'ReturnStatement':
                addOperator('return');
                break;
            case 'BreakStatement':
                addOperator('break');
                break;
            case 'ContinueStatement':
                addOperator('continue');
                break;
            case 'ThrowStatement':
                addOperator('throw');
                break;
            case 'TryStatement':
                addOperator('try');
                break;
            case 'CatchClause':
                addOperator('catch');
                break;
            case 'BinaryExpression':
            case 'LogicalExpression':
            case 'AssignmentExpression':
                addOperator(node.operator);
                break;
            case 'UnaryExpression':
            case 'UpdateExpression':
                addOperator(node.operator);
                break;
            case 'ConditionalExpression':
                addOperator('?:');
                break;
            case 'CallExpression':
            case 'OptionalCallExpression':
                addOperator('call');
                break;
            case 'NewExpression':
                addOperator('new');
                break;
            case 'MemberExpression':
            case 'OptionalMemberExpression':
                addOperator(node.computed ? '[]' : '.');
                addOperand(memberName(node));
                break;
            case 'ArrayExpression':
                addOperator('[]');
                break;
            case 'ObjectExpression':
                addOperator('{}');
                break;
            case 'Identifier':
                if (parent?.type !== 'MemberExpression' && parent?.type !== 'OptionalMemberExpression') {
                    addOperand(node.name);
                }
                break;
            case 'ThisExpression':
                addOperand('this');
                break;
            case 'Super':
                addOperand('super');
                break;
            case 'StringLiteral':
            case 'NumericLiteral':
            case 'BooleanLiteral':
            case 'BigIntLiteral':
            case 'NullLiteral':
            case 'RegExpLiteral':
                addOperand(literalOperand(node));
                break;
            default:
                break;
        }
    });
    const n1 = uniqueOperators.size;
    const n2 = uniqueOperands.size;
    const n = n1 + n2;
    const nLength = totalOperators + totalOperands;
    const volume = n > 0 && nLength > 0 ? nLength * Math.log2(n) : 0;
    return {
        uniqueOperators: n1,
        uniqueOperands: n2,
        totalOperators,
        totalOperands,
        vocabulary: n,
        length: nLength,
        volume: round2(volume)
    };
}
function calculateFunctionMetrics(functionNode, _source) {
    const startLine = functionNode.loc?.start?.line ?? 1;
    const endLine = functionNode.loc?.end?.line ?? startLine;
    const halstead = calculateHalstead(functionNode);
    return {
        halsteadVolume: halstead.volume,
        halstead,
        cyclomaticComplexity: countCyclomaticComplexity(functionNode),
        loc: countLoc(startLine, endLine)
    };
}
//# sourceMappingURL=metrics.js.map