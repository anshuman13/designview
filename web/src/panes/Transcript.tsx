import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { setUi, useStore } from '../store';
import { Icon } from '../Icon';
import { Markdown } from './Chat';
import { FileIcon } from './Explorer';
import { insertPrompt, showNode } from './Files';
import { useThumbs } from '../useThumbs';
import { buildTranscript, duration, firstLine, groupTurns, relPath, stepLabel, type Block, type Item, type ToolResult, type ToolUse } from './steps';
import type { ChatEvent } from '../../../shared/protocol';
import '../transcript.css';

export function Transcript({ children }: { children?: ReactNode }) {
  const events = useStore((s) => s.events);
  const cwd = useStore((s) => s.session.cwd);
  const running = useStore((s) => s.session.running);
  const stopping = useStore((s) => s.session.stopping);
  const status = useStore((s) => s.status);
  const figmaKey = useStore((s) => s.session.figma?.key);
  return <TranscriptView events={events} cwd={cwd} running={running} stopping={stopping} status={status} figmaKey={figmaKey}>{children}</TranscriptView>;
}

const SUGGESTIONS = ['A notifications settings page with email and push toggles', 'An empty state for a search with no results', 'Onboarding in three steps for a budgeting app', 'A pricing page with three plans and a FAQ'];

export function TranscriptView({ events, cwd, running, stopping, status, figmaKey, children }: { events: ChatEvent[]; cwd: string; running: boolean; stopping: boolean; status: string; figmaKey?: string; children?: ReactNode }) {
  const items = useMemo(() => buildTranscript(events), [events]);
  const turns = useMemo(() => groupTurns(items), [items]);
  const box = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const last = events[events.length - 1];
  const wanted = new Map<string, number>();
  for (const it of items.filter((x) => x.kind === 'done' && x.nodes.length).slice(-10)) for (const [id, rev] of (it as DoneItem).nodes) wanted.set(id, Math.max(wanted.get(id) ?? 0, rev));
  const thumb = useThumbs(figmaKey, [...wanted]);

  useEffect(() => {
    const el = box.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [items.length, last, running, children]);

  const onScroll = () => {
    const el = box.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  return (
    <div ref={box} className="tr" onScroll={onScroll}>
      {items.length === 0 && (
        <div className="tl-welcome">
          <h2>What are we designing?</h2>
          <p>Claude plans with Opus, then sketches, designs in Figma and reviews with Sonnet.</p>
          <div className="tl-chips">
            {SUGGESTIONS.map((s) => <button key={s} onClick={() => insertPrompt(s)}>{s}</button>)}
          </div>
        </div>
      )}
      {turns.map((t, i) => t.blocks.map((b) => <BlockRow key={b.id} b={b} cwd={cwd} thumb={thumb} live={running && i === turns.length - 1} />))}
      {running && children === undefined && (
        <div className="tr-working">
          <span className="tr-mark"><Icon name="loading" small spin /></span>
          <span className="tr-text">{stopping ? 'Stopping…' : status === 'Idle' ? 'Working' : status}</span>
        </div>
      )}
      {children}
    </div>
  );
}

type DoneItem = Extract<Item, { kind: 'done' }>;

function BlockRow({ b, cwd, thumb, live }: { b: Block; cwd: string; thumb: (id: string) => string | null; live: boolean }) {
  if (b.kind === 'steps') return <Steps b={b} cwd={cwd} thumb={thumb} live={live} />;
  return <Row it={b} cwd={cwd} thumb={thumb} />;
}

function latest(items: Item[], cwd: string) {
  const it = [...items].reverse().find((x) => x.kind === 'step' || x.kind === 'file' || x.kind === 'agent');
  if (!it) return '';
  if (it.kind === 'file') return `Edited ${relPath(it.path, cwd)}`;
  if (it.kind === 'agent') return typeof it.use.input.description === 'string' && it.use.input.description ? it.use.input.description : 'Sub-agent';
  const { verb, object } = stepLabel(it.use.name, it.use.input, cwd);
  return `${verb} ${object}`;
}

function Steps({ b, cwd, thumb, live }: { b: Extract<Block, { kind: 'steps' }>; cwd: string; thumb: (id: string) => string | null; live: boolean }) {
  const [open, setOpen] = useState(false);
  const dur = duration(b.ms);
  return (
    <div className={`tr-steps ${open ? 'open' : ''}`}>
      <div className="tr-steps-head" onClick={() => setOpen((v) => !v)}>
        <span className="tr-mark">{live ? <Icon name="loading" small spin /> : <Icon name={open ? 'chevron-down' : 'chevron-right'} small />}</span>
        <span className="tr-text">{live ? latest(b.items, cwd) : `${b.count} ${b.count === 1 ? 'step' : 'steps'}`}</span>
        <span className="tr-dur">{live ? `${b.count}` : dur}</span>
      </div>
      {open && <div className="tr-steps-body">{b.items.map((it) => <Row key={it.id} it={it} cwd={cwd} thumb={thumb} />)}</div>}
    </div>
  );
}

function Row({ it, cwd, thumb }: { it: Item; cwd: string; thumb: (id: string) => string | null }) {
  switch (it.kind) {
    case 'user':
      return <div className={`tr-user ${it.stopping ? 'stopping' : ''}`}>{it.text}{it.stopping && <span className="tr-stop"><Icon name="loading" small spin /></span>}</div>;
    case 'phase':
      return <div className="tr-phase"><Icon name="sync" small />{it.text}</div>;
    case 'assistant':
      return <div className={`tr-assistant ${it.streaming ? 'streaming' : ''}`}><Markdown text={it.text} /></div>;
    case 'system':
      return <div className="tr-system">{it.text}</div>;
    case 'step':
      return <Step use={it.use} result={it.result} cwd={cwd} />;
    case 'file':
      return <FileCard it={it} cwd={cwd} />;
    case 'agent':
      return <AgentRow use={it.use} result={it.result} />;
    case 'done':
      return (
        <div className="tr-done tr-act">
          <span className="tr-mark"><Icon name="check" small /></span>
          <span className="tr-text" title={it.text}>{it.text}</span>
          {it.nodes.some(([id]) => thumb(id)) && (
            <span className="tl-thumbs">
              {it.nodes.filter(([id]) => thumb(id)).map(([id]) => (
                <button key={id} title="Show in Figma" onClick={() => showNode(id)}><img src={thumb(id)!} alt="" loading="lazy" /></button>
              ))}
            </span>
          )}
        </div>
      );
    case 'note':
      return <div className="tr-note tr-act"><span className="tr-mark"><i className="tr-dot" /></span><span className="tr-text" title={it.text}>{it.text}</span></div>;
  }
}

function Step({ use, result, cwd }: { use: ToolUse; result?: ToolResult; cwd: string }) {
  const [open, setOpen] = useState(false);
  const { verb, object, mono } = stepLabel(use.name, use.input, cwd);
  const state = !result ? 'pending' : result.isError ? 'err' : 'ok';
  const dur = result ? duration(result.at - use.at) : '';
  return (
    <div className={`tr-step tr-act ${state} ${open ? 'open' : ''}`} onClick={() => setOpen((v) => !v)}>
      <span className="tr-mark">{state === 'pending' ? <Icon name="loading" small spin /> : <i className="tr-hex" />}</span>
      <span className="tr-text" title={object}>{verb} <span className={`tr-obj ${mono ? 'mono' : ''}`}>{object}</span></span>
      <span className="tr-dur">{dur}</span>
      {state === 'err' && !open && <span className="tr-err">{firstLine(result!.text) || 'Failed'}</span>}
      {open && <Detail use={use} result={result} />}
    </div>
  );
}

function Detail({ use, result }: { use: ToolUse; result?: ToolResult }) {
  const input = typeof use.input.command === 'string' ? use.input.command : JSON.stringify(use.input, null, 2);
  return (
    <div className="tr-detail" onClick={(e) => e.stopPropagation()}>
      <pre>{input}</pre>
      {result && <pre className={result.isError ? 'err' : ''}>{result.text || '(no output)'}</pre>}
    </div>
  );
}

function FileCard({ it, cwd }: { it: Extract<Item, { kind: 'file' }>; cwd: string }) {
  const rel = relPath(it.path, cwd);
  const cut = rel.lastIndexOf('/');
  const name = rel.slice(cut + 1);
  return (
    <div className={`tr-file tr-act ${it.error ? 'err' : ''}`} title={rel} onClick={() => setUi({ openFile: rel, follow: false })}>
      <FileIcon name={name} />
      <span className="tr-path"><span className="tr-dir">{cut >= 0 ? rel.slice(0, cut + 1) : ''}</span>{name}</span>
      {it.error ? (
        <span className="tr-err">{it.error}</span>
      ) : (
        <span className="tr-count"><span className="add">+{it.count.add}</span> <span className="del">-{it.count.del}</span></span>
      )}
    </div>
  );
}

function AgentRow({ use, result }: { use: ToolUse; result?: ToolResult }) {
  const [open, setOpen] = useState(false);
  const desc = typeof use.input.description === 'string' && use.input.description ? use.input.description : 'Sub-agent';
  const dur = result ? duration(result.at - use.at) : '';
  return (
    <div className={`tr-agent tr-act ${!result ? 'running' : result.isError ? 'err' : 'done'} ${open ? 'open' : ''}`} onClick={() => result && setOpen((v) => !v)}>
      <span className="tr-mark"><i className="tr-ring" /></span>
      <span className="tr-text" title={desc}>
        {desc}
        <span className="tr-state"> · {!result ? 'running' : result.isError ? 'failed' : `done${dur ? ` ${dur}` : ''}`}</span>
        {!result && <Icon name="loading" small spin />}
      </span>
      {open && result && <div className="tr-detail" onClick={(e) => e.stopPropagation()}><div className="tr-report"><Markdown text={result.text || '(no output)'} /></div></div>}
    </div>
  );
}
