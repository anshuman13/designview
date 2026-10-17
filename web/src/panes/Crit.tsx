import { useEffect, useState } from 'react';
import { getJson, postJson, useRev, useStore } from '../store';
import { Icon } from '../Icon';
import { PERSONAS, PERSONA_NAMES, TONES, type CopyItem, type CopyRun, type CritRun, type Persona, type Tone } from '../../../shared/design';
import { showNode, insertPrompt } from './Files';
import { Empty, ReviewArt } from './Empty';

const PERSONA_ICON: Record<Persona, string> = { 'new-user': 'person', 'power-user': 'zap', accessibility: 'eye', product: 'target' };
const k = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
const when = (t: number) => new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const cost = (r: { tokens: number; costUsd: number }) => `${k(r.tokens)} tokens · $${r.costUsd.toFixed(2)}`;

function useRuns<T extends { id: string }>(file: string, api: string) {
  const chat = useStore((s) => s.session.id);
  const rev = useRev(file);
  const [runs, setRuns] = useState<T[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => {
    getJson<{ runs: T[] }>(api).then((d) => { setRuns([...d.runs].reverse()); setSel(null); }).catch(() => {});
  }, [chat, rev, api]);
  const run = runs.find((r) => r.id === sel) ?? runs[0];
  return { runs, run, setSel };
}

function RunPicker<T extends { id: string; at: number }>({ runs, run, onPick }: { runs: T[]; run?: T; onPick: (id: string) => void }) {
  if (runs.length < 2) return null;
  return (
    <select value={run?.id} onChange={(e) => onPick(e.target.value)}>
      {runs.map((r) => <option key={r.id} value={r.id}>{when(r.at)}</option>)}
    </select>
  );
}

export function Crit() {
  const running = useStore((s) => s.session.running);
  const { runs, run, setSel } = useRuns<CritRun>('crit.json', '/api/crit');
  return (
    <div className="review-page">
      <div className="review-bar">
        <button className="primary" disabled={running} onClick={() => insertPrompt('/crit ')}><Icon name="play" small /> Run a crit</button>
        <span className="muted small">Cheap, one Sonnet call. Frames default to the design run.</span>
        <span className="spacer" />
        <RunPicker runs={runs} run={run} onPick={setSel} />
      </div>
      {!run && <Empty art={<ReviewArt />} title="No crit yet" text="Get feedback on your frames from a new user, a power user, accessibility and product. Paste frame links after /crit, or leave them out to use the latest design." action={{ label: 'Run a crit', onClick: () => insertPrompt('/crit ') }} />}
      {run && (
        <>
          <div className="crit-head">
            <p className="crit-summary">{run.summary}</p>
            <div className="muted small">{when(run.at)} · {run.frames.length} {run.frames.length === 1 ? 'frame' : 'frames'} · {cost(run)}</div>
          </div>
          <div className="crit-grid">
            {PERSONAS.map((id) => run.personas.find((p) => p.id === id)).filter((p) => !!p).map((p) => (
              <section key={p!.id} className="crit-card">
                <header>
                  <span className="crit-icon"><Icon name={PERSONA_ICON[p!.id]} /></span>
                  <h3>{PERSONA_NAMES[p!.id]}</h3>
                </header>
                <p className="crit-verdict">{p!.verdict}</p>
                <ul>
                  {p!.points.map((pt, i) => (
                    <li key={i}>
                      <span className={`crit-dot ${pt.kind}`} title={pt.kind} />
                      <div>
                        <span>{pt.text}</span>
                        {pt.nodeId && <> <button className="node-chip" onClick={() => showNode(pt.nodeId!)}>{pt.nodeId}</button></>}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const grow = (e: { currentTarget: HTMLTextAreaElement }) => {
  const el = e.currentTarget;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
};

export function Copy() {
  const running = useStore((s) => s.session.running);
  const { runs, run, setSel } = useRuns<CopyRun>('copy.json', '/api/copy');
  const [tone, setTone] = useState<Tone>('friendly');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');

  useEffect(() => {
    setPicked(new Set(run?.items.map((i) => i.nodeId)));
    setEdits({});
    setNote('');
  }, [run?.id]);

  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (!n.delete(id)) n.add(id); return n; });
  const allOn = !!run && picked.size === run.items.length;
  const apply = async () => {
    if (!run) return;
    try {
      const r = await postJson<{ prompt: string }>('/api/copy/apply', { runId: run.id, nodeIds: [...picked], edits });
      insertPrompt(r.prompt);
    } catch (e) {
      setNote((e as Error).message);
    }
  };

  return (
    <div className="review-page">
      <div className="review-bar">
        <label className="copy-tone">Tone
          <select value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
            {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <button className="primary" disabled={running} onClick={() => insertPrompt(`/copy tone:${tone} `)}><Icon name="play" small /> Run copy pass</button>
        <span className="muted small">Cheap, one Sonnet call.</span>
        <span className="spacer" />
        <RunPicker runs={runs} run={run} onPick={setSel} />
      </div>
      {!run && <Empty art={<ReviewArt />} title="No copy pass yet" text="Find labels, buttons and messages worth rewording. Paste frame links after /copy, or leave them out to use the latest design." action={{ label: 'Run a copy pass', onClick: () => insertPrompt(`/copy tone:${tone} `) }} />}
      {run && (
        <>
          <div className="review-summary">
            <div><b>{run.items.length} suggested changes</b> · {run.tone} · {when(run.at)}</div>
            <div className="muted small">{cost(run)}</div>
            {run.items.length > 0 && (
              <>
                <button onClick={() => setPicked(allOn ? new Set() : new Set(run.items.map((i) => i.nodeId)))}>{allOn ? 'Select none' : 'Accept all'}</button>
                <button className="primary" disabled={!picked.size} onClick={apply}>Apply selected in Figma ({picked.size})</button>
              </>
            )}
            {note && <span className="muted">{note}</span>}
          </div>
          {run.items.length === 0 ? <p className="muted">Nothing worth changing in these frames.</p> : (
            <div className="copy-scroll">
              <table className="copy-table">
                <thead><tr><th /><th>Before</th><th>After</th><th>Reason</th><th /></tr></thead>
                <tbody>
                  {run.items.map((i: CopyItem) => (
                    <tr key={i.nodeId}>
                      <td><input type="checkbox" checked={picked.has(i.nodeId)} onChange={() => toggle(i.nodeId)} aria-label={`Accept ${i.before}`} /></td>
                      <td className="before">{i.before}</td>
                      <td><textarea rows={1} value={edits[i.nodeId] ?? i.after} onChange={(e) => setEdits((m) => ({ ...m, [i.nodeId]: e.target.value }))} onInput={grow} ref={(el) => { if (el) grow({ currentTarget: el }); }} /></td>
                      <td className="reason">{i.reason}</td>
                      <td><button className="node-chip" onClick={() => showNode(i.nodeId)}>{i.nodeId}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
