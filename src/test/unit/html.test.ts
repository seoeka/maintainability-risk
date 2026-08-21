import assert from 'node:assert';

import { escapeHtml } from '../../utils/html';
import { describe, it } from 'node:test';

describe('html', () => {

  it('should escape HTML special characters', () => {
    const input = '<script>alert("test")</script>';

    const result = escapeHtml(input);

    assert.strictEqual(
      result,
      '&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;'
    );
  });

  it('should preserve normal text', () => {
    const input = 'Maintainability Risk';

    const result = escapeHtml(input);

    assert.strictEqual(result, input);
  });

  it('should escape ampersand characters', () => {
    const result = escapeHtml('A & B');

    assert.strictEqual(result, 'A &amp; B');
  });
});