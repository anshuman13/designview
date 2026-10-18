import { useEffect, useState } from 'react';
import { api, getJson, postJson, send, useRev, useStore } from '../store';
import { Icon } from '../Icon';
import { AREAS, AREA_NAMES, PRESET_INFO, type Area, type CopyRun, type CritRun, type Finding, type ReviewDoc, type ReviewRun } from '../../../shared/design';
import { showNode, insertPrompt } from './Files';
import { Empty, ReviewArt } from './Empty';
import { CopyDetail, CritDetail } from './Crit';
import { BuildCheck } from './BuildCheck';
import { KIND_LABEL, ago, mergeRuns, shownPreset, summarize, type RunRow } from './reviewRuns';

const SEV: Record<Finding['severity'], string> = { blocking: 'Blocking', major: 'Major', minor: 'Minor' };
const k = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
const when = (t: number) => new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export function Review({ dev = false }: { dev?: boolean }) {
  const chat = useStore((s) => s.session.id);
  const preset = useStore((s) => shownPreset(s.session.flow.preset));
  const reviewRev = useRev('review.json');
  const critRev = useRev('crit.json');
  const copyRev = useRev('copy.json');
  const [doc, setDoc] = useState<ReviewDoc>({ runs: [] });
  const [crit, setCrit] = useState<CritRun[]>([]);
  const [copy, setCopy] = useState<CopyRun[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [build, setBuild] = useState(false);

  useEffect(() => { getJson<ReviewDoc>('/api/review').then(setDoc).catch(() => {}); }, [chat, reviewRev]);
  useEffect(() => { getJson<{ runs: CritRun[] }>('/api/crit').then((d) => setCrit(d.runs)).catch(() => {}); }, [chat, critRev]);
  useEffect(() => { getJson<{ runs: CopyRun[] }>('/api/copy').then((d) => setCopy(d.runs)).catch(() => {}); }, [chat, copyRev]);
  useEffect(() => { setOpen({}); }, [chat]);

  const rows = mergeRuns(doc.runs, crit, copy);

  return (
    <div className="review-page">
      <div className="review-bar">
        <button className="primary" onClick={() => insertPrompt('/review ')}><Icon name="play" small /> Review</button>
        <div className="seg" role="radiogroup" aria-label="Review depth">
          {(['quick', 'full'] as const).map((p) => (
            <button key={p} role="radio" aria-checked={preset === p} className={preset === p ? 'on' : ''} title={PRESET_INFO[p].detail} onClick={() => send({ type: 'set_flow', patch: { preset: p } })}>{PRESET_INFO[p].label}</button>
          ))}
        </div>
        <span className="spacer" />
        <button className="ghost export-report" onClick={() => window.open(api('/api/report'), '_blank')}>Export report</button>
        <a className="ghost" href={api('/api/report?download=1')} download aria-label="Download report" title="Download report"><Icon name="cloud-download" /></a>
      </div>
      {!rows.length && <Empty art={<ReviewArt />} title="Nothing reviewed yet" text="Reviews run after every Design run, or type /review with frame links." />}
      {!!rows.length && (
        <ul className="run-list">
          {rows.map((row, i) => {
            const on = open[row.id] ?? i === 0;
            return (
              <li key={row.id} className={on ? 'open' : ''}>
                <button className="run-row" aria-expanded={on} onClick={() => setOpen((o) => ({ ...o, [row.id]: !on }))}>
                  <Icon name={on ? 'chevron-down' : 'chevron-right'} small />
                  <span className={`run-kind ${row.kind}`}>{KIND_LABEL[row.kind]}</span>
                  <span className="muted" title={when(row.at)}>{ago(row.at)}</span>
                  <span className="run-sum">{summarize(row)}</span>
                  {row.tokens > 0 && <span className="chip" title="Tokens this run used">{k(row.tokens)}</span>}
                </button>
                {on && <div className="run-detail"><RunDetail row={row} doc={doc} onDoc={setDoc} /></div>}
              </li>
            );
          })}
        </ul>
      )}
      {dev && (
        <section className="run-dev">
          <button className="run-row" aria-expanded={build} onClick={() => setBuild((v) => !v)}><Icon name={build ? 'chevron-down' : 'chevron-right'} small /> Build check</button>
          {build && <BuildCheck />}
        </section>
      )}
    </div>
  );
}

function RunDetail({ row, doc, onDoc }: { row: RunRow; doc: ReviewDoc; onDoc: (d: ReviewDoc) => void }) {
  if (row.kind === 'crit') return <CritDetail run={row.run} />;
  if (row.kind === 'copy') return <CopyDetail run={row.run} />;
  return <ReviewDetail run={row.run} doc={doc} onDoc={onDoc} />;
}

function ReviewDetail({ run, doc, onDoc }: { run: ReviewRun; doc: ReviewDoc; onDoc: (d: ReviewDoc) => void }) {
  const [posting, setPosting] = useState(false);
  const [note, setNote] = useState('');
  const unposted = [...run.check, ...run.results.flatMap((r) => r.findings)].filter((f) => !doc.posted?.includes(f.id) && f.severity !== 'minor');

  const post = async () => {
    setPosting(true);
    try {
      const r = await postJson<{ posted: number }>('/api/review/post', { ids: unposted.map((f) => f.id) });
      setNote(`Posted ${r.posted} comments in Figma`);
      onDoc(await getJson<ReviewDoc>('/api/review'));
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <>
      <div className="review-summary">
        <div><b>{run.kind === 'audit' ? 'File audit' : run.kind === 'verify' ? 'Final check' : `Review ${run.round} · ${PRESET_INFO[run.preset].label}`}</b> · {when(run.at)} · {run.frames.length} frames</div>
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
  );
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
