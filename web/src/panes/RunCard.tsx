import { send, useStore } from '../store';
import { Icon } from '../Icon';
import { FLOW_ACTIVE, PRESET_INFO, type FlowPhase, type FlowState } from '../../../shared/design';

const STEPS: Array<{ label: string; phases: FlowPhase[] }> = [
  { label: 'Plan', phases: ['plan'] },
  { label: 'Sketch', phases: ['sketch', 'pick'] },
  { label: 'Design', phases: ['system', 'design'] },
  { label: 'Review', phases: ['review', 'fix'] },
];

export type RunRow = { label: string; state: 'done' | 'now' | 'idle'; detail?: string };

export function runRows(flow: FlowState): { title: string; rows: RunRow[]; tokens: number; waiting: boolean } | null {
  const phase = flow.phase;
  if (!phase || (!FLOW_ACTIVE.includes(phase) && phase !== 'pick')) return null;
  const at = STEPS.findIndex((s) => s.phases.includes(phase));
  const detail = phase === 'pick' ? 'Pick directions on the Sketch tab'
    : phase === 'fix' ? `Fixing round ${flow.round}`
    : phase === 'review' ? `Review ${flow.round} · ${PRESET_INFO[flow.preset].label}`
    : phase === 'system' ? 'Reading the design system'
    : 'Running';
  const steps = flow.kind === 'sketch' ? STEPS.slice(0, 2) : STEPS;
  const rows = steps.map((s, i): RunRow => (i < at ? { label: s.label, state: 'done' } : i === at ? { label: s.label, state: 'now', detail } : { label: s.label, state: 'idle' }));
  return { title: flow.kind === 'sketch' ? 'Sketch run' : 'Design run', rows, tokens: flow.tokens, waiting: phase === 'pick' };
}

export function RunCard() {
  const flow = useStore((s) => s.session.flow);
  const stopping = useStore((s) => s.session.stopping);
  const run = runRows(flow);
  if (!run) return null;
  return (
    <div className="run-card">
      <div className="run-head">
        <b>{run.title}</b>
        {run.tokens > 0 && <span className="run-tokens">{Math.round(run.tokens / 1000)}k tokens</span>}
      </div>
      <ol className="run-rows">
        {run.rows.map((r) => (
          <li key={r.label} className={r.state}>
            <span className="mark">{r.state === 'done' ? <Icon name="check" small /> : <i className="dot" />}</span>
            <span>{r.label}</span>
            {r.detail && <span className="detail">{r.detail}</span>}
          </li>
        ))}
      </ol>
      <div className="run-acts">
        {run.waiting ? (
          <button className="primary" onClick={() => window.dispatchEvent(new CustomEvent('designview:command', { detail: { id: 'page:sketch' } }))}>Open Sketch</button>
        ) : (
          <button disabled={stopping} onClick={() => send({ type: 'interrupt' })}>Stop</button>
        )}
      </div>
    </div>
  );
}
