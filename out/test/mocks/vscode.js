"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Diagnostic = exports.Range = exports.Position = exports.DiagnosticSeverity = void 0;
var DiagnosticSeverity;
(function (DiagnosticSeverity) {
    DiagnosticSeverity[DiagnosticSeverity["Error"] = 0] = "Error";
    DiagnosticSeverity[DiagnosticSeverity["Warning"] = 1] = "Warning";
    DiagnosticSeverity[DiagnosticSeverity["Information"] = 2] = "Information";
    DiagnosticSeverity[DiagnosticSeverity["Hint"] = 3] = "Hint";
})(DiagnosticSeverity || (exports.DiagnosticSeverity = DiagnosticSeverity = {}));
class Position {
    line;
    character;
    constructor(line, character) {
        this.line = line;
        this.character = character;
    }
}
exports.Position = Position;
class Range {
    start;
    end;
    constructor(startOrLine, startCharacterOrEnd, endLine, endCharacter) {
        if (typeof startOrLine === 'number' &&
            typeof startCharacterOrEnd === 'number' &&
            endLine !== undefined &&
            endCharacter !== undefined) {
            this.start = new Position(startOrLine, startCharacterOrEnd);
            this.end = new Position(endLine, endCharacter);
        }
        else {
            this.start = startOrLine;
            this.end = startCharacterOrEnd;
        }
    }
    contains(position) {
        if (position.line < this.start.line) {
            return false;
        }
        if (position.line > this.end.line) {
            return false;
        }
        if (position.line === this.start.line &&
            position.character < this.start.character) {
            return false;
        }
        if (position.line === this.end.line &&
            position.character > this.end.character) {
            return false;
        }
        return true;
    }
}
exports.Range = Range;
class Diagnostic {
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
exports.Diagnostic = Diagnostic;
//# sourceMappingURL=vscode.js.map