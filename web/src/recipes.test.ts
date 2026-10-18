import { describe, expect, it } from 'vitest';
import { recipeMatches } from './recipes';

describe('recipeMatches', () => {
  const r = { title: 'Missing states', blurb: 'Empty, loading and error variants of a frame.' };
  it('matches every word in title or blurb, any case', () => {
    expect(recipeMatches('', r)).toBe(true);
    expect(recipeMatches('STATES', r)).toBe(true);
    expect(recipeMatches('error states', r)).toBe(true);
    expect(recipeMatches('dark', r)).toBe(false);
  });
});
