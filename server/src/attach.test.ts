import os from 'node:os';
import path from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { loadImages, refPath, saveImage, userContent, withRefs } from './attach.js';

describe('attach', () => {
  it('saves an image under refs and loads it as a base64 block', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'dv-'));
    const ref = await saveImage(dir, 'image/png', Buffer.from('abc'));
    expect(refPath(ref)).toBe(true);
    const { refs, blocks } = await loadImages(dir, [ref, '../etc/passwd', 'refs/missing.png']);
    expect(refs).toEqual([ref]);
    expect(blocks[0]).toEqual({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'YWJj' } });
  });

  it('rejects other types and empty or large bodies', async () => {
    await expect(saveImage('/tmp', 'image/svg+xml', Buffer.from('x'))).rejects.toThrow(/png/);
    await expect(saveImage('/tmp', 'image/png', Buffer.alloc(0))).rejects.toThrow(/5 MB/);
  });

  it('builds content and the reference line', () => {
    expect(withRefs('hi', [])).toBe('hi');
    expect(withRefs('hi', ['refs/a.png', 'refs/b.jpg'])).toBe('hi\n\nReference images: refs/a.png, refs/b.jpg');
    expect(userContent('hi', [])).toBe('hi');
    expect(userContent('hi', [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'x' } }])).toHaveLength(2);
  });
});
