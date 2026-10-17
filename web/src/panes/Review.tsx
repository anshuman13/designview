import { useEffect, useMemo, useState } from 'react';
import { api, getJson, postJson, send, useRev, useStore } from '../store';
import { Icon } from '../Icon';
import { AREAS, AREA_NAMES, PRESETS, PRESET_INFO, type Area, type Finding, type ReviewDoc, type ReviewPreset, type ReviewRun } from '../../../shared/design';
import { showNode, insertPrompt } from './Files';
import { Empty, ReviewArt } from './Empty';
import { Copy, Crit } from './Crit';
import { Changes } from './Changes';

const SEV: Record<Finding['severity'], string> = { blocking: 'Blocking', major: 'Major', minor: 'Minor' };
type Tab = 'review' | 'crit' | 'copy' | 'changes';

export function Review() {
  const [tab, setTab] = useState<Tab>('review');
  return (
    <div className="crit-wrap">
      <div className="crit-tabs">
        <div className="seg" role="radiogroup" aria-label="Review type">
          {([['review', 'Review'], ['crit', 'Crit'], ['copy', 'Copy'], ['changes', 'Changes']] as const).map(([id, name]) => (
            <button key={id} role="radio" aria-checked={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{name}</button>
          ))}
        </div>
        <button className="ghost" style={{ marginLeft: 'auto' }} onClick={() => window.open(api('/api/report'), '_blank')}>Export report</button>
        <a className="ghost" href={api('/api/report?download=1')} download aria-label="Download report" title="Download report"><Icon name="cloud-download" /></a>
      </div>
      {tab === 'review' && <ReviewRuns />}
      {tab === 'crit' && <Crit />}
      {tab === 'copy' && <Copy />}
      {tab === 'changes' && <Changes />}
    </div>
  );
}

const k = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
const when = (t: number) => new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function ReviewRuns() {
  const chat = useStore((s) => s.session.id);
  const running = useStore((s) => s.session.running);
  const flow = useStore((s) => s.session.flow);
  const rev = useRev('review.json');
  const [doc, setDoc] = useState<ReviewDoc>({ runs: [] });
  const [sel, setSel] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    getJson<ReviewDoc>('/api/review').then((d) => { setDoc(d); setSel(null); }).catch(() => {});
  }, [chat, rev]);

  const runs = [...doc.runs].reverse();
  const run = runs.find((r) => r.id === sel) ?? runs[0];
  const all = useMemo(() => (run ? [...run.check, ...run.results.flatMap((r) => r.findings)] : []), [run]);
  const unposted = all.filter((f) => !doc.posted?.includes(f.id) && f.severity !== 'minor');

  const post = async () => {
    setPosting(true);
    try {
      const r = await postJson<{ posted: number }>('/api/review/post', { ids: unposted.map((f) => f.id) });
      setNote(`Posted ${r.posted} comments in Figma`);
      setDoc(await getJson<ReviewDoc>('/api/review'));
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="review-page">
      <div className="review-bar">
        <PresetPicker preset={flow.preset} areas={flow.areas} />
        <button className="primary" disabled={running} onClick={() => send({ type: 'prompt', text: `/review ${flow.preset}` })}><Icon name="play" small /> Review the design</button>
        <button disabled={running} onClick={() => send({ type: 'prompt', text: '/audit' })} title="Design system check across every frame in the file, no model calls">Audit the file</button>
        <span className="spacer" />
        {runs.length > 1 && (
          <select value={run?.id} onChange={(e) => setSel(e.target.value)}>
            {runs.map((r) => <option key={r.id} value={r.id}>{label(r)} · {when(r.at)}</option>)}
          </select>
        )}
      </div>
      {!run && <Empty art={<ReviewArt />} title="Nothing reviewed yet" text="Every review starts with a free design system check, then the reviewers you pick with the presets above. Review any frames by pasting their links after /review." action={{ label: 'Run a review', onClick: () => insertPrompt('/review') }} />}
      {run && (
        <>
          <div className="review-summary">
            <div><b>{label(run)}</b> · {when(run.at)} · {run.frames.length} frames</div>
            <div className="muted">{run.tokens ? `${k(run.tokens)} tokens · $${run.costUsd.toFixed(2)}` : 'No model tokens used'}</div>
            {unposted.length > 0 && <button disabled={posting} onClick={post}><Icon name="comment" small /> Post {unposted.length} as Figma comments</button>}
            {note && <span className="muted">{note}</span>}
          </div>
          <div className="review-grid">
            <AreaCard title="Design system check" sub={run.checkError ?? (run.check.length ? `${run.check.length} issues` : 'No issues')} pass={!run.checkError && !run.check.some((f) => f.severity !== 'minor')} tokens={0} findings={run.check} grouped />
            {run.results.map((r) => (
              <AreaCard key={r.area} title={r.area === 'all' ? 'Reviewer · all areas' : AREA_NAMES[r.area]} sub={r.error ? `Failed: ${r.error}` : r.summary} pass={r.pass} tokens={r.tokens} findings={r.findings} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function label(r: ReviewRun) {
  if (r.kind === 'audit') return 'File audit';
  if (r.kind === 'verify') return 'Final check';
  return `Review ${r.round} · ${PRESET_INFO[r.preset].label}`;
}

function AreaCard({ title, sub, pass, tokens, findings, grouped = false }: { title: string; sub: string; pass: boolean; tokens: number; findings: Finding[]; grouped?: boolean }) {
  const [open, setOpen] = useState(!pass);
  const shown = grouped ? [...findings].sort((a, b) => AREAS.indexOf(a.area as Area) - AREAS.indexOf(b.area as Area)) : findings;
  return (
    <section className={`area-card ${pass ? 'pass' : 'fail'}`}>
      <header onClick={() => setOpen((v) => !v)}>
        <Icon name={pass ? 'pass-filled' : 'error'} />
        <div className="area-title">
          <div className="t">{title}</div>
          <div className="s">{sub}</div>
        </div>
        {tokens > 0 && <span className="chip" title="Tokens this reviewer used">{k(tokens)}</span>}
        <Icon name={open ? 'chevron-up' : 'chevron-down'} small />
      </header>
      {open && findings.length > 0 && (
        <ul className="findings">
          {shown.slice(0, 60).map((f) => (
            <li key={f.id} className={f.severity}>
              <span className={`sev ${f.severity}`}>{SEV[f.severity]}</span>
              <div className="f-body">
                <div className="f-rule">{f.rule}</div>
                <div className="f-fix">{f.fix}</div>
                <button className="link" onClick={() => showNode(f.node)}>{grouped ? `${AREA_NAMES[f.area as Area] ?? f.area} · ` : ''}{f.nodeName ?? f.node}</button>
              </div>
            </li>
          ))}
          {shown.length > 60 && <li className="muted">…and {shown.length - 60} more</li>}
        </ul>
      )}
    </section>
  );
}

export function PresetPicker({ preset, areas, compact = false }: { preset: ReviewPreset; areas: Area[]; compact?: boolean }) {
  return (
    <div className={`preset ${compact ? 'compact' : ''}`}>
      <div className="seg" role="radiogroup" aria-label="Review preset">
        {PRESETS.map((p) => (
          <button key={p} role="radio" aria-checked={preset === p} className={preset === p ? 'on' : ''} title={PRESET_INFO[p].detail} onClick={() => send({ type: 'set_flow', patch: { preset: p } })}>{PRESET_INFO[p].label}</button>
        ))}
      </div>
      {preset === 'focused' && (
        <div className="area-ticks">
          {AREAS.map((a) => (
            <label key={a}>
              <input type="checkbox" checked={areas.includes(a)} onChange={(e) => send({ type: 'set_flow', patch: { areas: e.target.checked ? [...areas, a] : areas.filter((x) => x !== a) } })} />
              {AREA_NAMES[a]}
            </label>
          ))}
        </div>
      )}
      {!compact && <div className="muted small">{PRESET_INFO[preset].detail}</div>}
    </div>
  );
}
