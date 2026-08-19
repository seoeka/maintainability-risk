"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateRisk = calculateRisk;
function round2(value) {
    return Math.round(value * 100) / 100;
}
function calculateMaintainabilityIndex(metrics) {
    const hv = Math.max(metrics.halsteadVolume, 1);
    const cc = Math.max(metrics.cyclomaticComplexity, 0);
    const loc = Math.max(metrics.loc, 1);
    const raw = 171 - 5.2 * Math.log(hv) - 0.23 * cc - 16.2 * Math.log(loc);
    return round2(Math.max(0, (raw * 100) / 171));
}
function calculateRisk(metrics, _settings) {
    const maintainabilityIndex = calculateMaintainabilityIndex(metrics);
    const level = maintainabilityIndex >= 20 ? 'Low' : maintainabilityIndex >= 10 ? 'Medium' : 'High';
    const violations = [];
    if (level === 'Medium') {
        violations.push({
            metric: 'maintainabilityIndex',
            value: maintainabilityIndex,
            warningThreshold: 20,
            highThreshold: 10,
            level: 'warning',
            message: `Nilai Maintainability Index ${maintainabilityIndex}/100 berada pada rentang 10-19 sehingga termasuk Medium Risk.`
        });
    }
    if (level === 'High') {
        violations.push({
            metric: 'maintainabilityIndex',
            value: maintainabilityIndex,
            warningThreshold: 20,
            highThreshold: 10,
            level: 'high',
            message: `Nilai Maintainability Index ${maintainabilityIndex}/100 berada di bawah 10 sehingga termasuk High Risk.`
        });
    }
    const deterministicExplanation = [
        `Maintainability Index dihitung dari Halstead Volume ${metrics.halsteadVolume}, Cyclomatic Complexity ${metrics.cyclomaticComplexity}, dan LOC ${metrics.loc}.`,
        level === 'Low'
            ? `Nilai Maintainability Index ${maintainabilityIndex}/100 berada pada rentang 20-100 sehingga termasuk Low Risk.`
            : violations[0]?.message ?? `Nilai Maintainability Index ${maintainabilityIndex}/100 digunakan sebagai dasar klasifikasi risiko.`
    ];
    return {
        level,
        score: maintainabilityIndex,
        maintainabilityIndex,
        violations,
        deterministicExplanation
    };
}
//# sourceMappingURL=riskEngine.js.map