import path from 'node:path';
import os from 'node:os';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildReport, esc, markdown } from './report.js';

let dir = '';
const figma = { key: 'abcdefghij1', name: 'Shop <app>', url: 'https://www.figma.com/design/abcdefghij1' };

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'report-'));
});
afterEach(() => rm(dir, { recursive: true, force: true }));

describe('buildReport', () => {
  it('renders brief, review and crit and escapes text', async () => {
    await writeFile(path.join(dir, 'plan.md'), '# Plan\n\n- one **bold**\n- <script>alert(1)</script>\n');
    const finding = { id: 'f1', area: 'color', node: '1:2', severity: 'major', rule: 'Bad <script>x</script>', fix: 'Use primary' };
    await writeFile(path.join(dir, 'review.json'), JSON.stringify({ runs: [{ id: 'r', kind: 'review', at: 1, round: 1, preset: 'quick', frames: [], check: [], results: [{ area: 'all', pass: false, summary: 'Needs work', findings: [finding], tokens: 0, costUsd: 0 }], tokens: 0, costUsd: 0 }] }));
    await writeFile(path.join(dir, 'crit.json'), JSON.stringify({ runs: [{ id: 'c', at: 1, frames: [], summary: 'Solid', personas: [{ id: 'new-user', verdict: 'Clear', points: [{ kind: 'concern', text: 'Tiny label' }] }], tokens: 0, costUsd: 0 }] }));
    const html = await buildReport(dir, figma);
    expect(html).toContain('<h2>Brief</h2>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<h2>Review</h2>');
    expect(html).toContain('Use primary');
    expect(html).toContain('<h2>Crit</h2>');
    expect(html).toContain('New user');
    expect(html).toContain('Shop &lt;app&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<h2>Sketches</h2>');
    expect(html).not.toContain('<h2>Copy changes</h2>');
  });

  it('escapes quotes and renders markdown lists', () => {
    expect(esc(`<a href="x">'`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;');
    expect(markdown('## Hi\n\ntext `code`\n\n1. a\n2. b')).toContain('<ol>');
  });
});
