type AnyNode = Record<string, any>;

const FUNCTION_NODE_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'ObjectMethod',
  'ClassMethod',
  'ClassPrivateMethod'
]);

export function isFunctionNode(node: AnyNode | undefined): boolean {
  return !!node && FUNCTION_NODE_TYPES.has(node.type);
}

export function walkAst(
  node: AnyNode | undefined,
  visitor: (node: AnyNode, parent?: AnyNode) => void,
  parent?: AnyNode
): void {
  if (!node || typeof node.type !== 'string') {
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
        if (
          child &&
          typeof child === 'object' &&
          typeof child.type === 'string'
        ) {
          walkAst(child as AnyNode, visitor, node);
        }
      }
    } else if (
      value &&
      typeof value === 'object' &&
      typeof (value as AnyNode).type === 'string'
    ) {
      walkAst(value as AnyNode, visitor, node);
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
export function collectAnalyzableFunctions(
  programNode: AnyNode
): AnyNode[] {
  const functions: AnyNode[] = [];

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

export function collectTopLevelFunctions(
  programNode: AnyNode
): AnyNode[] {
  const functions: AnyNode[] = [];

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

export function attachParents(
  node: AnyNode | undefined,
  parent?: AnyNode
): void {
  if (!node || typeof node.type !== 'string') {
    return;
  }

  Object.defineProperty(node, '__parent', {
    value: parent,
    enumerable: false,
    configurable: true
  });

  for (const [key, value] of Object.entries(node)) {
    if (
      key.startsWith('__') ||
      key === 'loc' ||
      key === 'range'
    ) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const child of value) {
        if (
          child &&
          typeof child === 'object' &&
          typeof child.type === 'string'
        ) {
          attachParents(child as AnyNode, node);
        }
      }
    } else if (
      value &&
      typeof value === 'object' &&
      typeof (value as AnyNode).type === 'string'
    ) {
      attachParents(value as AnyNode, node);
    }
  }
}

export function getFunctionName(
  node: AnyNode,
  parent?: AnyNode,
  fallbackIndex = 1
): string {
  if (node.id?.name) {
    return node.id.name;
  }

  if (node.key?.name) {
    return node.key.name;
  }

  if (
    parent?.type === 'VariableDeclarator' &&
    parent.id?.type === 'Identifier'
  ) {
    return parent.id.name;
  }

  if (
    parent?.type === 'AssignmentExpression' &&
    parent.left?.type === 'MemberExpression'
  ) {
    const property = parent.left.property;

    if (property?.type === 'Identifier') {
      return property.name;
    }
  }

  return `anonymousFunction${fallbackIndex}`;
}