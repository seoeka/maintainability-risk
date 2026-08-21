"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const html_1 = require("../../utils/html");
const node_test_1 = require("node:test");
(0, node_test_1.describe)('html', () => {
    (0, node_test_1.it)('should escape HTML special characters', () => {
        const input = '<script>alert("test")</script>';
        const result = (0, html_1.escapeHtml)(input);
        node_assert_1.default.strictEqual(result, '&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;');
    });
    (0, node_test_1.it)('should preserve normal text', () => {
        const input = 'Maintainability Risk';
        const result = (0, html_1.escapeHtml)(input);
        node_assert_1.default.strictEqual(result, input);
    });
    (0, node_test_1.it)('should escape ampersand characters', () => {
        const result = (0, html_1.escapeHtml)('A & B');
        node_assert_1.default.strictEqual(result, 'A &amp; B');
    });
});
//# sourceMappingURL=html.test.js.map