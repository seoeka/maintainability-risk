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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDiagnostics = createDiagnostics;
const vscode = __importStar(require("vscode"));
const sourceName = 'Maintainability Risk Analyzer';
function severityOf(fn, showLowRisk) {
    if (fn.risk.level === 'High') {
        return vscode.DiagnosticSeverity.Error;
    }
    if (fn.risk.level === 'Medium') {
        return vscode.DiagnosticSeverity.Warning;
    }
    if (showLowRisk) {
        return vscode.DiagnosticSeverity.Information;
    }
    return undefined;
}
function createDiagnostics(file, showLowRisk) {
    if (file.parseError) {
        return [
            new vscode.Diagnostic(new vscode.Range(0, 0, 0, 1), `Kode JavaScript tidak dapat dianalisis: ${file.parseError}`, vscode.DiagnosticSeverity.Error)
        ];
    }
    const diagnostics = [];
    for (const fn of file.functions) {
        const severity = severityOf(fn, showLowRisk);
        if (severity === undefined) {
            continue;
        }
        const metricText = `MI ${fn.risk.maintainabilityIndex}/100, HV ${fn.metrics.halsteadVolume}, CC ${fn.metrics.cyclomaticComplexity}, LOC ${fn.metrics.loc}`;
        const message = `${fn.risk.level} maintainability risk pada fungsi ${fn.functionName}. ${metricText}.`;
        const diagnostic = new vscode.Diagnostic(fn.location.range, message, severity);
        diagnostic.source = sourceName;
        diagnostic.code = 'maintainability-index-risk';
        diagnostics.push(diagnostic);
    }
    return diagnostics;
}
//# sourceMappingURL=diagnostics.js.map