import { useEffect, useState } from 'react';
import { getJson } from './store';

export type Outline = { name: string; lastModified: string; pages: Array<{ id: string; name: string; frames: Array<{ id: string; name: string; page: string }> }> };

const cache = new Map<string, { promise: Promise<Outline | null>; at: number }>();

export function getOutline(key: string): Promise<Outline | null> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 60_000) return hit.promise;
  const promise = getJson<Outline>('/api/figma/outline').catch(() => {
    if (cache.get(key)?.promise === promise) cache.delete(key);
    return null;
  });
  cache.set(key, { promise, at: Date.now() });
  return promise;
}

export function useOutline(key: string | undefined): Outline | null {
  const [outline, setOutline] = useState<Outline | null>(null);
  useEffect(() => {
    if (!key) return setOutline(null);
    let live = true;
    void getOutline(key).then((o) => live && setOutline(o));
    return () => { live = false; };
  }, [key]);
  return key ? outline : null;
}

export function frameName(outline: Outline | null, id: string): string | null {
  for (const p of outline?.pages ?? []) {
    const f = p.frames.find((x) => x.id === id);
    if (f) return f.name;
  }
  return null;
}

const LINK = /https?:\/\/(?:www\.)?figma\.com\/(?:design|file|proto)\/[A-Za-z0-9]+[^\s]*node-id=(\d+)[-:](\d+)[^\s]*/g;

export function splitFrameLinks(text: string): Array<string | { url: string; id: string }> {
  const out: Array<string | { url: string; id: string }> = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    const url = m[0].replace(/[.,;:!?)]+$/, '');
    const start = m.index!;
    if (start > last) out.push(text.slice(last, start));
    out.push({ url, id: `${m[1]}:${m[2]}` });
    last = start + url.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
