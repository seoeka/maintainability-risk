type AnyNode = Record<string, any>;

import { HalsteadMetrics, RawMetrics } from './types';
import { isFunctionNode } from './astUtils';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function countLoc(startLine: number, endLine: number): number {
  return Math.max(1, endLine - startLine + 1);
}

function walkWithinFunction(functionNode: AnyNode, visitor: (node: AnyNode, parent?: AnyNode) => void): void {
  function visit(node: AnyNode | undefined, parent?: AnyNode): void {
    if (!node || typeof node.type !== 'string') {
      return;
    }

    if (node !== functionNode && isFunctionNode(node)) {
      return;
    }

    visitor(node, parent);

    for (const [key, value] of Object.entries(node)) {
      if (
        key.startsWith('__') ||
        key === 'loc' ||
        key === 'range' ||
        key === 'leadingComments' ||
        key === 'trailingComments' ||
        key === 'innerComments'
      ) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof child === 'object' && typeof (child as AnyNode).type === 'string') {
            visit(child as AnyNode, node);
          }
        }
      } else if (value && typeof value === 'object' && typeof (value as AnyNode).type === 'string') {
        visit(value as AnyNode, node);
      }
    }
  }

  visit(functionNode);
}

function countCyclomaticComplexity(functionNode: AnyNode): number {
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

function literalOperand(node: AnyNode): string | undefined {
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

function memberName(node: AnyNode | undefined): string | undefined {
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

function calculateHalstead(functionNode: AnyNode): HalsteadMetrics {
  const uniqueOperators = new Set<string>();
  const uniqueOperands = new Set<string>();
  let totalOperators = 0;
  let totalOperands = 0;

  const addOperator = (operator: string | undefined): void => {
    if (!operator) {
      return;
    }
    uniqueOperators.add(operator);
    totalOperators += 1;
  };

  const addOperand = (operand: string | undefined): void => {
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

export function calculateFunctionMetrics(functionNode: AnyNode, _source: string): RawMetrics {
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
