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
exports.RiskDecorationManager = void 0;
const vscode = __importStar(require("vscode"));
class RiskDecorationManager {
    highRiskDecoration = vscode.window.createTextEditorDecorationType({
        overviewRulerColor: new vscode.ThemeColor('errorForeground'),
        overviewRulerLane: vscode.OverviewRulerLane.Right,
        borderWidth: '0 0 0 3px',
        borderStyle: 'solid',
        borderColor: new vscode.ThemeColor('errorForeground'),
        backgroundColor: new vscode.ThemeColor('editorError.background')
    });
    mediumRiskDecoration = vscode.window.createTextEditorDecorationType({
        overviewRulerColor: new vscode.ThemeColor('editorWarning.foreground'),
        overviewRulerLane: vscode.OverviewRulerLane.Right,
        borderWidth: '0 0 0 3px',
        borderStyle: 'solid',
        borderColor: new vscode.ThemeColor('editorWarning.foreground'),
        backgroundColor: new vscode.ThemeColor('editorWarning.background')
    });
    update(editor, file) {
        if (!editor || !file || editor.document.uri.toString() !== file.uri) {
            return;
        }
        const highRanges = file.functions
            .filter((fn) => fn.risk.level === 'High')
            .map((fn) => fn.location.range);
        const mediumRanges = file.functions
            .filter((fn) => fn.risk.level === 'Medium')
            .map((fn) => fn.location.range);
        editor.setDecorations(this.highRiskDecoration, highRanges);
        editor.setDecorations(this.mediumRiskDecoration, mediumRanges);
    }
    clear(editor) {
        if (!editor) {
            return;
        }
        editor.setDecorations(this.highRiskDecoration, []);
        editor.setDecorations(this.mediumRiskDecoration, []);
    }
    dispose() {
        this.highRiskDecoration.dispose();
        this.mediumRiskDecoration.dispose();
    }
}
exports.RiskDecorationManager = RiskDecorationManager;
//# sourceMappingURL=decorations.js.map