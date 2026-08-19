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
exports.MaintainabilityHoverProvider = void 0;
const vscode = __importStar(require("vscode"));
function commandUri(command) {
    return `command:${command}`;
}
class MaintainabilityHoverProvider {
    store;
    constructor(store) {
        this.store = store;
    }
    provideHover(document, position) {
        const file = this.store.getFile(document.uri.toString());
        if (!file) {
            const md = new vscode.MarkdownString(undefined, true);
            md.isTrusted = {
                enabledCommands: ['maintainability.analyzeCurrentFile']
            };
            md.appendMarkdown('**Maintainability Risk Analyzer**\n\n');
            md.appendMarkdown('File ini belum dianalisis. Analisis biasanya berjalan otomatis saat file JavaScript dibuka atau diubah.\n\n');
            md.appendMarkdown(`[🔍 Analyze Now](${commandUri('maintainability.analyzeCurrentFile')})`);
            return new vscode.Hover(md);
        }
        const fn = file.functions.find((candidate) => candidate.location.range.contains(position));
        if (!fn) {
            return undefined;
        }
        this.store.setLastHoveredFunction(fn);
        const md = new vscode.MarkdownString(undefined, true);
        md.isTrusted = {
            enabledCommands: [
                'maintainability.explainRiskAt',
                'maintainability.showSummary',
                'maintainability.analyzeCurrentFile'
            ]
        };
        md.supportHtml = true;
        md.appendMarkdown(`**Maintainability Risk Analyzer**\n\n`);
        md.appendMarkdown(`Fungsi: \`${fn.functionName}\`  \n`);
        md.appendMarkdown(`Risk Level: **${fn.risk.level}**  \n`);
        md.appendMarkdown(`Maintainability Index: **${fn.risk.maintainabilityIndex}/100**\n\n`);
        md.appendMarkdown(`| Metric | Value |\n|---|---:|\n`);
        md.appendMarkdown(`| Halstead Volume | ${fn.metrics.halsteadVolume} |\n`);
        md.appendMarkdown(`| Cyclomatic Complexity | ${fn.metrics.cyclomaticComplexity} |\n`);
        md.appendMarkdown(`| Lines of Code | ${fn.metrics.loc} |\n\n`);
        md.appendMarkdown(`**Alasan deterministik:**\n`);
        for (const reason of fn.risk.deterministicExplanation) {
            md.appendMarkdown(`- ${reason}\n`);
        }
        md.appendMarkdown(`\n---\n`);
        md.appendMarkdown(`[🤖 Explain Maintainability Risk](${commandUri('maintainability.explainRiskAt')})`);
        md.appendMarkdown(` &nbsp; `);
        md.appendMarkdown(`[📊 Show Summary](${commandUri('maintainability.showSummary')})`);
        return new vscode.Hover(md, fn.location.range);
    }
}
exports.MaintainabilityHoverProvider = MaintainabilityHoverProvider;
//# sourceMappingURL=hoverProvider.js.map