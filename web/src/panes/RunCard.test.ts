import { describe, expect, it } from 'vitest';
import { flowOff, type FlowPhase, type FlowState } from '../../../shared/design';
import { runRows } from './RunCard';

const flow = (phase: FlowPhase | null, over: Partial<FlowState> = {}): FlowState => ({ ...flowOff(), mode: 'design', phase, ...over });

describe('runRows', () => {
  it('is null when idle, done or stopped', () => {
    for (const p of [null, 'done', 'stopped'] as const) expect(runRows(flow(p))).toBeNull();
  });

  it('marks earlier steps done and the current one now', () => {
    const run = runRows(flow('review', { round: 1, preset: 'quick', tokens: 12000 }))!;
    expect(run.title).toBe('Design run');
    expect(run.rows.map((r) => r.state)).toEqual(['done', 'done', 'done', 'now']);
    expect(run.rows[3].detail).toBe('Review 1 · Quick');
    expect(run.tokens).toBe(12000);
    expect(run.waiting).toBe(false);
  });

  it('shows two rows for a sketch run', () => {
    const run = runRows(flow('plan', { kind: 'sketch' }))!;
    expect(run.title).toBe('Sketch run');
    expect(run.rows.map((r) => r.label)).toEqual(['Plan', 'Sketch']);
  });

  it('waits on the Sketch row when picking', () => {
    const run = runRows(flow('pick'))!;
    expect(run.waiting).toBe(true);
    expect(run.rows[1]).toMatchObject({ label: 'Sketch', state: 'now' });
    expect(run.rows[2].state).toBe('idle');
  });
});
