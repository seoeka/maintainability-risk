"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_module_1 = __importDefault(require("node:module"));
const originalLoad = node_module_1.default._load;
node_module_1.default._load = function (request, parent, isMain) {
    if (request === 'vscode') {
        return {
            DiagnosticSeverity: {
                Error: 0,
                Warning: 1,
                Information: 2,
                Hint: 3
            },
            Range: class Range {
                startLine;
                startColumn;
                endLine;
                endColumn;
                constructor(startLine, startColumn, endLine, endColumn) {
                    this.startLine = startLine;
                    this.startColumn = startColumn;
                    this.endLine = endLine;
                    this.endColumn = endColumn;
                }
            },
            Diagnostic: class Diagnostic {
                range;
                message;
                severity;
                source;
                code;
                constructor(range, message, severity) {
                    this.range = range;
                    this.message = message;
                    this.severity = severity;
                }
            }
        };
    }
    return originalLoad.call(this, request, parent, isMain);
};
//# sourceMappingURL=setup.js.map