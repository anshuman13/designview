import { describe, expect, it, vi } from 'vitest';
import { AgentSession } from './session.js';
import { withReviews } from './transcript.js';

const run = { id: 'r1', kind: 'audit', at: 1234, round: 0, preset: 'check', frames: ['1:2'], check: [], results: [], tokens: 0, costUsd: 0 };

vi.mock('./review.js', async (orig) => ({ ...(await orig<typeof import('./review.js')>()), runReview: vi.fn(async () => run) }));
vi.mock('./figma.js', async (orig) => ({ ...(await orig<typeof import('./figma.js')>()), fileOutline: vi.fn(async () => ({ pages: [{ frames: [{ id: '1:2' }] }] })) }));

describe('review events', () => {
  it('a finished audit emits a review event for the saved run', async () => {
    const s = new AgentSession('/tmp/project', null);
    s.setFigma({ key: 'AbC123', name: 'Checkout', url: 'https://www.figma.com/design/AbC123' });
    await (s as unknown as { command: (c: string, a: string, r: string) => Promise<void> }).command('audit', '', '/audit');
    expect(s.state.events.find((e) => e.kind === 'review')).toMatchObject({ kind: 'review', runAt: 1234 });
  });

  it('replays saved runs in time order on history load', () => {
    const events = withReviews([{ id: 'a', kind: 'user', text: 'x', at: 1000 }, { id: 'b', kind: 'user', text: 'y', at: 3000 }], [{ at: 2000 }, { at: 4000 }]);
    expect(events.map((e) => e.at)).toEqual([1000, 2000, 3000, 4000]);
    expect(events[1]).toMatchObject({ kind: 'review', runAt: 2000 });
  });
});
