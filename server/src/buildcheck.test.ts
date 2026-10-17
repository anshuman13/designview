import { describe, expect, it } from 'vitest';
import { buildChecklist } from '../../shared/design.js';
import { clampWidth, parseBuildArg } from './buildcheck.js';

describe('parseBuildArg', () => {
  it('reads the url, the frame and an optional width', () => {
    expect(parseBuildArg('http://localhost:3000/a Home (https://www.figma.com/design/abcdefghij1?node-id=1-2) width:5000')).toEqual({ url: 'http://localhost:3000/a', width: 1920, frames: ['1:2'] });
    expect(parseBuildArg('https://example.com')).toEqual({ url: 'https://example.com/', width: null, frames: [] });
  });
  it('rejects other schemes and missing urls', () => {
    expect(parseBuildArg('file:///etc/passwd')).toHaveProperty('error');
    expect(parseBuildArg('javascript:alert(1)')).toHaveProperty('error');
    expect(parseBuildArg('')).toHaveProperty('error');
  });
});

describe('clampWidth', () => {
  it('keeps the width between 320 and 1920', () => {
    expect([clampWidth(100), clampWidth(800.4), clampWidth(4000)]).toEqual([320, 800, 1920]);
  });
});

describe('buildChecklist', () => {
  it('writes one checkbox per difference', () => {
    const md = buildChecklist({ url: 'http://x', frameName: 'Home', matchScore: 80, diffs: [{ area: 'Hero', kind: 'spacing', severity: 'major', figma: '24px gap', site: '12px gap', fix: 'Set the gap to 24px', nodeId: '1:2' }] });
    expect(md).toBe('Build check of http://x against Home: 80% match, 1 difference\n\n- [ ] **major** (spacing) Hero: Set the gap to 24px Figma: 24px gap. Site: 12px gap. Node 1:2.');
  });
});
