import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cp, mkdir } from 'node:fs/promises';
import { CHATS_ROOT } from './settings.js';
import { installSkills } from './figma.js';
import { readSketch, renderAll } from './sketch.js';

const SAMPLE = fileURLToPath(new URL('../sample', import.meta.url));

export const SAMPLE_NAME = 'Sample - Grocery cart';

export async function loadSample(root = CHATS_ROOT) {
  const dir = path.join(root, SAMPLE_NAME);
  await mkdir(dir, { recursive: true });
  await cp(SAMPLE, dir, { recursive: true, force: true });
  const sketch = await readSketch(dir);
  if (sketch) await renderAll(dir, sketch);
  await installSkills(dir);
  return dir;
}
