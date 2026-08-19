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
exports.getAnalyzerSettings = getAnalyzerSettings;
const vscode = __importStar(require("vscode"));
function getNumber(config, key, fallback) {
    const value = config.get(key);
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function getBoolean(config, key, fallback) {
    const value = config.get(key);
    return typeof value === 'boolean' ? value : fallback;
}
function getString(config, key, fallback) {
    const value = config.get(key);
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}
function getAnalyzerSettings() {
    const config = vscode.workspace.getConfiguration('maintainabilityRiskAnalyzer');
    return {
        showLowRiskDiagnostics: getBoolean(config, 'showLowRiskDiagnostics', false),
        analyzeOnSave: getBoolean(config, 'analyzeOnSave', true),
        llm: {
            model: getString(config, 'llm.model', 'gpt-4.1-mini'),
            maxSnippetCharacters: getNumber(config, 'llm.maxSnippetCharacters', 6000),
            proxyEndpoint: getString(config, 'llm.proxyEndpoint', 'https://maintainability-risk-proxy.vercel.app/api/explain'),
            proxyToken: getString(config, 'llm.proxyToken', ''),
            requestTimeoutMs: getNumber(config, 'llm.requestTimeoutMs', 30000)
        },
        privacy: {
            sendCodeToLLM: getBoolean(config, 'privacy.sendCodeToLLM', true)
        }
    };
}
//# sourceMappingURL=config.js.map