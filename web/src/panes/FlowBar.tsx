import { send, useStore } from '../store';
import { Icon } from '../Icon';
import { PRESET_INFO, type FlowPhase } from '../../../shared/design';

const STEPS: Array<{ id: string; label: string; phases: FlowPhase[] }> = [
  { id: 'plan', label: 'Plan', phases: ['plan'] },
  { id: 'sketch', label: 'Sketch', phases: ['sketch', 'pick'] },
  { id: 'design', label: 'Design', phases: ['system', 'design'] },
  { id: 'review', label: 'Review', phases: ['review', 'fix'] },
];

export function FlowBar() {
  const flow = useStore((s) => s.session.flow);
  const running = useStore((s) => s.session.running);
  const active = flow.phase && !['done', 'stopped'].includes(flow.phase);
  const at = STEPS.findIndex((s) => flow.phase && s.phases.includes(flow.phase));
  const steps = flow.kind === 'sketch' ? STEPS.slice(0, 2) : STEPS;
  return (
    <div className={`flowbar ${active ? 'active' : ''}`}>
      <ol className="steps-row">
        {steps.map((s, i) => {
          const state = !active ? (flow.phase === 'done' ? 'done' : 'idle') : i < at ? 'done' : i === at ? 'now' : 'idle';
          return (
            <li key={s.id} className={state} title={s.id === 'plan' ? 'Opus 5.5 plans' : 'Sonnet 5.5'}>
              <span className="n">{state === 'done' ? <Icon name="check" small /> : i + 1}</span>
              <span>{s.label}</span>
            </li>
          );
        })}
      </ol>
      <div className="flow-meta">
        {flow.phase === 'pick' ? (
          <span className="waiting">Pick sketch directions, then Continue on the Sketch tab</span>
        ) : active ? (
          <span>{flow.phase === 'fix' ? `Fixing round ${flow.round}` : flow.phase === 'review' ? `Review ${flow.round} · ${PRESET_INFO[flow.preset].label}` : flow.phase === 'system' ? 'Reading the design system' : 'Running'}{flow.tokens ? ` · ${Math.round(flow.tokens / 1000)}k tokens` : ''}</span>
        ) : (
          <label className="run-toggle" title="When on, your next message starts a plan, sketch, design, review run">
            <input type="checkbox" checked={flow.on} disabled={running} onChange={(e) => send({ type: 'set_flow', patch: { on: e.target.checked } })} />
            Next message starts a design run
          </label>
        )}
      </div>
    </div>
  );
}
