import Module from 'node:module';

const originalLoad = (Module as any)._load;

(Module as any)._load = function (
  request: string,
  parent: NodeModule | null,
  isMain: boolean
) {
  if (request === 'vscode') {
    return {
      DiagnosticSeverity: {
        Error: 0,
        Warning: 1,
        Information: 2,
        Hint: 3
      },

      Range: class Range {
        constructor(
          public startLine: number,
          public startColumn: number,
          public endLine: number,
          public endColumn: number
        ) {}
      },

      Diagnostic: class Diagnostic {
        public source?: string;
        public code?: string;

        constructor(
          public range: any,
          public message: string,
          public severity: number
        ) {}
      }
    };
  }

  return originalLoad.call(this, request, parent, isMain);
};