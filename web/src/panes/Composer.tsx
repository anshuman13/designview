import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, notice, send, steer, useStore } from '../store';
import { Icon } from '../Icon';
import { Voice, useDictation } from './Voice';
import { FileIcon } from './Explorer';
import { match } from './FileSwitcher';
import { COMPACT_AT, type ChatEvent } from '../../../shared/protocol';
import { FLOW_MODES, PRESET_INFO, type FlowMode } from '../../../shared/design';
import { imageProblem, imagesIn } from './attach';
import '../composer.css';

export type Trigger = { kind: 'command' | 'file'; start: number; query: string } | { kind: 'shell' } | null;

export type Ranked<T> = { item: T; hits: number[]; score: number };

export const MODE_INFO: Record<FlowMode, { label: string; detail: string; placeholder: string; icon: string }> = {
  chat: { label: 'Chat', detail: 'Talk to Claude. Edits Figma when you ask.', placeholder: 'Ask Claude anything, or paste a Figma link', icon: 'comment' },
  design: { label: 'Design', detail: 'Opus plans, then Claude sketches, designs and reviews.', placeholder: 'Describe the screens you need. Opus plans, then Claude sketches, designs and reviews.', icon: 'sparkle' },
  review: { label: 'Review', detail: 'Reviewers check the frames. No edits.', placeholder: 'What should the reviewers look at?', icon: 'checklist' },
};

export const nextMode = (m: FlowMode): FlowMode => FLOW_MODES[(FLOW_MODES.indexOf(m) + 1) % FLOW_MODES.length];

export const MAX_ROWS = 8;
export const MAX_STORED = 50;
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit']);

export function triggerAt(text: string, caret: number): Trigger {
  if (text.startsWith('!')) return { kind: 'shell' };
  const before = text.slice(0, Math.min(caret, text.length));
  const m = /(?:^|\s)([/@])(\S*)$/.exec(before);
  if (!m) return null;
  return { kind: m[1] === '/' ? 'command' : 'file', start: before.length - 1 - m[2].length, query: m[2] };
}

function rank<T>(items: T[], key: (t: T) => string, query: string, limit: number): Ranked<T>[] {
  const out: Ranked<T>[] = [];
  for (const item of items) {
    const m = match(key(item), query);
    if (m) out.push({ item, hits: m.hits, score: m.score });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

export const rankCommands = <T extends { name: string }>(commands: T[], query: string, limit = MAX_ROWS) => rank(commands, (c) => c.name, query, limit);

export const rankFiles = (files: string[], query: string, limit = MAX_ROWS) => rank(files, (f) => f, query, limit);

export function figmaLinkIn(text: string): { url: string; key: string; name: string } | null {
  const m = /https?:\/\/(?:[\w-]+\.)?figma\.com\/(?:design|file|proto)\/([A-Za-z0-9]{10,})(?:\/([^\s/?#]+))?[^\s]*/.exec(text);
  if (!m) return null;
  const name = m[2] ? decodeURIComponent(m[2]).replace(/[.,;:!?)\]]+$/, '').replace(/-/g, ' ') : 'this Figma file';
  return { url: m[0].replace(/[.,;:!?)\]]+$/, ''), key: m[1], name };
}

export function accept(text: string, start: number, caret: number, insert: string) {
  const next = `${text.slice(0, start)}${insert} ${text.slice(caret)}`;
  return { text: next, caret: start + insert.length + 1 };
}

export function buildHistory(events: ChatEvent[], stored: string[]) {
  const local = events.filter((e) => e.kind === 'user').map((e) => e.text.trim()).reverse();
  const out: string[] = [];
  for (const t of [...local, ...[...stored].reverse()]) {
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

export function ghostFor(text: string, history: string[]) {
  if (text.length < 3) return '';
  const hit = history.find((h) => h.length > text.length && h.startsWith(text));
  return hit ? hit.slice(text.length) : '';
}

export const remember = (text: string, stored: string[], max = MAX_STORED) => [...stored.filter((t) => t !== text), text].slice(-max);

export function filesEdited(events: ChatEvent[]) {
  const paths = new Set<string>();
  for (const e of events) {
    if (e.kind === 'tool_use' && EDIT_TOOLS.has(e.name) && typeof e.input.file_path === 'string') paths.add(e.input.file_path);
  }
  return paths.size;
}

export const contextPercent = (context: number | null) => (context === null ? null : Math.min(100, Math.round((context / COMPACT_AT) * 100)));

const STORED_KEY = 'designview.prompts';

const MAX_HEIGHT = 220;
const fileCache = new Map<string, string[]>();

function readStored(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(STORED_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

async function runInTerminal(cmd: string) {
  const list: Array<{ id: string }> = await fetch(api('/api/terms')).then((r) => r.json());
  const term = list.at(-1) ?? (await fetch(api('/api/terms'), { method: 'POST' }).then((r) => r.json()));
  window.dispatchEvent(new CustomEvent('designview:terminal', { detail: term.id }));
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/ws?term=${encodeURIComponent(term.id)}`);
  ws.onopen = () => {
    ws.send(JSON.stringify({ t: 'i', d: `${cmd}\r` }));
    ws.close();
  };
}

function hl(text: string, hits: number[], from = 0): ReactNode {
  return [...text].map((c, i) => (hits.includes(from + i) ? <b key={i}>{c}</b> : c));
}

type Img = { ref: string; url: string };

type Hist = { list: string[]; index: number; draft: string };

export function Composer() {
  const cwd = useStore((s) => s.session.cwd);
  const chatId = useStore((s) => s.session.id);
  const running = useStore((s) => s.session.running);
  const stopping = useStore((s) => s.session.stopping);
  const waiting = useStore((s) => s.pending.length > 0);
  const commands = useStore((s) => s.session.commands);
  const flow = useStore((s) => s.session.flow);
  const context = useStore((s) => s.session.context);
  const events = useStore((s) => s.events);
  const hasFile = useStore((s) => !!s.session.figma);

  const [modeOpen, setModeOpen] = useState(false);
  const modePop = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  const [caret, setCaret] = useState(0);
  const [sel, setSel] = useState(0);
  const [dismissed, setDismissed] = useState('');
  const [skipLink, setSkipLink] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [stored, setStored] = useState(readStored);
  const [hist, setHist] = useState<Hist | null>(null);
  const [imgs, setImgs] = useState<Img[]>([]);
  const imgsRef = useRef(imgs);
  imgsRef.current = imgs;
  const chatRef = useRef(chatId);
  chatRef.current = chatId;
  const [busy, setBusy] = useState(0);
  const [drag, setDrag] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const have = useRef(0);
  const dictate = useDictation(text, setText);
  const ta = useRef<HTMLTextAreaElement>(null);
  const mirror = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const pop = useRef<HTMLUListElement>(null);
  const wantCaret = useRef<number | null>(null);

  const at = Math.min(caret, text.length);
  const trigger = useMemo(() => triggerAt(text, at), [text, at]);
  const shell = trigger?.kind === 'shell';
  const popKey = trigger && trigger.kind !== 'shell' ? `${trigger.kind}:${trigger.start}:${trigger.query}` : '';
  const items = useMemo(() => {
    if (!trigger || trigger.kind === 'shell' || popKey === dismissed) return [];
    return trigger.kind === 'command' ? rankCommands(commands, trigger.query) : rankFiles(files, trigger.query);
  }, [trigger, popKey, dismissed, commands, files]);
  const open = items.length > 0;
  const history = useMemo(() => buildHistory(events, stored), [events, stored]);
  const ghost = !open && !shell && at === text.length ? ghostFor(text, history) : '';
  const link = useMemo(() => (hasFile ? null : figmaLinkIn(text)), [hasFile, text]);
  const edited = useMemo(() => filesEdited(events), [events]);
  const pct = contextPercent(context);
  const setMode = (mode: FlowMode) => send({ type: 'set_flow', patch: { mode } });

  useEffect(() => {
    const onInsert = (e: Event) => {
      const add = (e as CustomEvent<string>).detail;
      setText((t) => (t && !t.endsWith(' ') ? `${t} ${add} ` : `${t}${add} `));
      ta.current?.focus();
    };
    window.addEventListener('designview:insert', onInsert);
    return () => window.removeEventListener('designview:insert', onInsert);
  }, []);

  useEffect(() => {
    if (trigger?.kind !== 'file' || !cwd) return;
    const cached = fileCache.get(cwd);
    if (cached) { setFiles(cached); return; }
    fetch(api('/api/files')).then((r) => r.json()).then((f: string[]) => { fileCache.set(cwd, f); setFiles(f); }).catch(() => {});
  }, [trigger?.kind, cwd]);

  useEffect(() => setSel(0), [popKey]);

  useEffect(() => {
    if (!modeOpen) return;
    const down = (e: MouseEvent) => { if (!(e.target as Element).closest('.cp-mode')) setModeOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setModeOpen(false); ta.current?.focus(); } };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [modeOpen]);

  useEffect(() => {
    pop.current?.children[sel]?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  useLayoutEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = '0';
    const h = Math.max(el.scrollHeight, mirror.current?.offsetHeight ?? 0);
    el.style.height = `${Math.min(h, MAX_HEIGHT)}px`;
    if (mirror.current) mirror.current.style.visibility = h > MAX_HEIGHT ? 'hidden' : '';
    if (wantCaret.current !== null) {
      el.setSelectionRange(wantCaret.current, wantCaret.current);
      setCaret(wantCaret.current);
      wantCaret.current = null;
    }
  }, [text, ghost]);

  useLayoutEffect(() => {
    const el = pop.current;
    const anchor = card.current;
    if (!el || !anchor) return;
    const r = anchor.getBoundingClientRect();
    el.style.left = `${r.left}px`;
    el.style.width = `${r.width}px`;
    if (r.top - 8 >= el.offsetHeight) { el.style.bottom = `${window.innerHeight - r.top + 4}px`; el.style.top = ''; }
    else { el.style.top = `${r.bottom + 4}px`; el.style.bottom = ''; }
  }, [items]);

  have.current = imgs.length + busy;

  const clearImgs = () => {
    imgsRef.current.forEach((i) => URL.revokeObjectURL(i.url));
    setImgs([]);
  };
  useEffect(clearImgs, [chatId]);
  useEffect(() => () => imgsRef.current.forEach((i) => URL.revokeObjectURL(i.url)), []);

  const attach = async (list: File[]) => {
    const forChat = chatRef.current;
    for (const f of list) {
      const problem = imageProblem(f, have.current);
      if (problem) { notice(problem); continue; }
      have.current++;
      setBusy((n) => n + 1);
      try {
        const r = await fetch(api('/api/attach'), { method: 'POST', headers: { 'content-type': f.type }, body: f });
        const body = await r.json();
        if (!r.ok) throw new Error(body.error);
        if (chatRef.current === forChat) setImgs((l) => [...l, { ref: body.ref, url: URL.createObjectURL(f) }]);
      } catch (err) {
        notice((err as Error).message || 'Upload failed');
      } finally {
        setBusy((n) => n - 1);
      }
    }
  };

  const dropImage = (ref: string) => {
    imgs.filter((i) => i.ref === ref).forEach((i) => URL.revokeObjectURL(i.url));
    setImgs((l) => l.filter((i) => i.ref !== ref));
  };

  const apply = (next: string, c = next.length) => {
    wantCaret.current = c;
    setText(next);
  };

  const choose = (i: number) => {
    if (!trigger || trigger.kind === 'shell' || !items[i]) return;
    const value = trigger.kind === 'command' ? `/${(items[i].item as { name: string }).name}` : `@${items[i].item as string}`;
    const r = accept(text, trigger.start, at, value);
    apply(r.text, r.caret);
  };

  const stepHistory = (dir: 1 | -1) => {
    const h = hist ?? { list: history, index: -1, draft: text };
    const index = Math.min(h.list.length - 1, h.index + dir);
    if (index < 0) { setHist(null); apply(h.draft); return; }
    setHist({ ...h, index });
    apply(h.list[index]);
  };

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    if (shell) {
      const cmd = t.slice(1).trim();
      if (cmd) runInTerminal(cmd).catch(() => notice('Terminal unavailable'));
    } else {
      const images = imgs.length ? imgs.map((i) => i.ref) : undefined;
      if (running) steer(t, images);
      else send({ type: 'prompt', text: t, images });
      clearImgs();
      const next = remember(t, stored);
      setStored(next);
      try { localStorage.setItem(STORED_KEY, JSON.stringify(next)); } catch {}
    }
    setHist(null);
    apply('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    const el = e.currentTarget;
    const onEntry = hist !== null && text === hist.list[hist.index];
    if (open) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel((i) => (i + 1) % items.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSel((i) => (i - 1 + items.length) % items.length); return; }
      if (e.key === 'Escape') { e.preventDefault(); setDismissed(popKey); return; }
      const exact = trigger?.kind === 'command' && (items[sel].item as { name: string }).name === trigger.query;
      if ((e.key === 'Tab' && !e.shiftKey) || (e.key === 'Enter' && !e.shiftKey && !exact)) { e.preventDefault(); choose(sel); return; }
    }
    if (ghost && (e.key === 'Tab' || e.key === 'ArrowRight') && el.selectionStart === text.length) { e.preventDefault(); apply(text + ghost); return; }
    if (e.key === 'ArrowUp' && (text === '' || onEntry) && !text.slice(0, el.selectionStart).includes('\n')) { e.preventDefault(); stepHistory(1); return; }
    if (e.key === 'ArrowDown' && onEntry && !text.slice(el.selectionEnd).includes('\n')) { e.preventDefault(); stepHistory(-1); return; }
    if (e.key === 'Tab' && e.shiftKey) { e.preventDefault(); setMode(nextMode(flow.mode)); return; }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  const hint = shell ? 'Runs in the terminal' : stopping ? 'Stopping…' : !text && !running ? '/ for commands like /design, /review, /audit' : '';
  const placeholder = waiting ? 'Answer below, or steer Claude' : running ? 'Steer Claude: stops the current step and sends this' : MODE_INFO[flow.mode].placeholder;
  const level = pct === null ? '' : context! >= COMPACT_AT ? 'over' : context! >= COMPACT_AT * 0.75 ? 'near' : '';

  return (
    <div className="cp" data-mode={flow.mode}>
      <div
        ref={card}
        className={`cp-card${shell ? ' shell' : ''}${drag ? ' drop' : ''}`}
        onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDrag(true); } }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { setDrag(false); const list = imagesIn(e.dataTransfer.files); if (list.length) { e.preventDefault(); void attach(list); } }}
      >
        {link && link.url !== skipLink && (
          <div className="cp-attach">
            <Icon name="file-media" small />
            <span>Attach {link.name}?</span>
            <button className="primary" onClick={() => send({ type: 'set_figma', url: link.url })}>Attach</button>
            <button className="icon-btn" title="Dismiss" aria-label="Dismiss" onClick={() => setSkipLink(link.url)}><Icon name="close" small /></button>
          </div>
        )}
        {(imgs.length > 0 || busy > 0) && !shell && (
          <div className="cp-imgs">
            {imgs.map((i) => (
              <span key={i.ref} className="cp-img">
                <img src={i.url} alt="" />
                <button title="Remove image" aria-label="Remove image" onClick={() => dropImage(i.ref)}><Icon name="close" small /></button>
              </span>
            ))}
            {busy > 0 && <span className="cp-img busy"><Icon name="loading" small spin /></span>}
          </div>
        )}
        <div className="cp-text">
          <div ref={mirror} className="cp-mirror" aria-hidden><span className="cp-typed">{text}</span><span className="cp-ghost">{ghost}</span></div>
          <textarea
            ref={ta}
            value={text}
            rows={1}
            placeholder={placeholder}
            spellCheck={!shell}
            onChange={(e) => { setText(e.target.value); setCaret(e.target.selectionStart); }}
            onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
            onKeyDown={onKeyDown}
            onPaste={(e) => { const list = imagesIn(e.clipboardData.files); if (list.length) { e.preventDefault(); void attach(list); } }}
          />
        </div>
        <div className="cp-foot">
          <div className="cp-mode">
            <button className="cp-pill cp-modebtn" aria-haspopup="true" aria-expanded={modeOpen} title="Mode (Shift+Tab to cycle)" onClick={() => setModeOpen((o) => !o)}>
              <Icon name={MODE_INFO[flow.mode].icon} small /><span>{MODE_INFO[flow.mode].label}</span><Icon name="chevron-down" small />
            </button>
            {modeOpen && (
              <div ref={modePop} className="cp-modepop" role="menu">
                {FLOW_MODES.map((m) => (
                  <button key={m} role="menuitemradio" aria-checked={flow.mode === m} className={flow.mode === m ? 'active' : ''} onClick={() => { setMode(m); if (m !== 'design') setModeOpen(false); }}>
                    <Icon name={MODE_INFO[m].icon} small />
                    <span className="cp-modetext"><b>{MODE_INFO[m].label}</b><span>{MODE_INFO[m].detail}</span></span>
                  </button>
                ))}
                {flow.mode === 'design' && (
                  <div className="cp-modeopts">
                    <label><input type="checkbox" checked={flow.stopAfterSketch} onChange={(e) => send({ type: 'set_flow', patch: { stopAfterSketch: e.target.checked } })} />Stop after sketch</label>
                    <div className="cp-depth" role="radiogroup" aria-label="Review depth">
                      <span>Review depth</span>
                      {(['quick', 'full'] as const).map((p) => (
                        <button key={p} role="radio" aria-checked={flow.preset === p} className={flow.preset === p ? 'on' : ''} title={PRESET_INFO[p].detail} onClick={() => send({ type: 'set_flow', patch: { preset: p } })}>{PRESET_INFO[p].label}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <span className="cp-spacer" />
          <input ref={picker} type="file" accept="image/*" multiple hidden onChange={(e) => { void attach(imagesIn(e.target.files)); e.target.value = ''; }} />
          <button className="icon-btn" title="Attach images" aria-label="Attach images" onClick={() => picker.current?.click()}><Icon name="file-media" small /></button>
          <Voice onText={dictate} />
          {running && (
            <button className="cp-stop" title={stopping ? 'Stopping…' : 'Stop Claude'} aria-label={stopping ? 'Stopping' : 'Stop'} disabled={stopping} onClick={() => send({ type: 'interrupt' })}>
              <Icon name={stopping ? 'loading' : 'debug-stop'} small spin={stopping} />
            </button>
          )}
          <button
            className={`cp-send${running ? ' steer' : ''}`}
            title={shell ? 'Run in the terminal (Enter)' : running ? 'Stop the current step and send (Enter)' : 'Send (Enter)'}
            aria-label={shell ? 'Run' : running ? 'Stop and send' : 'Send'}
            disabled={!text.trim()}
            onClick={submit}
          >
            <Icon name={shell ? 'terminal' : 'arrow-up'} small />
          </button>
        </div>
      </div>
      <div className="cp-under">
        {hint && <span className="cp-hint">{hint}</span>}
        <span className="cp-stats">
          {pct !== null && <span className={level} title={`${context!.toLocaleString()} tokens in context. Compact once it passes ${COMPACT_AT / 1000}k.`}>{pct}% context</span>}
          {edited > 0 && <span>{edited} {edited === 1 ? 'file' : 'files'} edited</span>}
        </span>
      </div>
      {open && (
        <ul ref={pop} className="cp-pop" role="listbox">
          {items.map((r, i) => {
            if (trigger?.kind === 'command') {
              const c = r.item as { name: string; description: string };
              return (
                <li key={c.name} role="option" aria-selected={i === sel} className={i === sel ? 'active' : ''} onMouseDown={(e) => { e.preventDefault(); choose(i); }}>
                  <span className="cp-name">/{hl(c.name, r.hits)}</span>
                  <span className="cp-detail">{c.description}</span>
                </li>
              );
            }
            const f = r.item as string;
            const base = f.lastIndexOf('/') + 1;
            return (
              <li key={f} role="option" aria-selected={i === sel} className={i === sel ? 'active' : ''} title={f} onMouseDown={(e) => { e.preventDefault(); choose(i); }}>
                <FileIcon name={f} />
                <span className="cp-name">{hl(f.slice(base), r.hits, base)}</span>
                <span className="cp-detail">{hl(f.slice(0, Math.max(base - 1, 0)), r.hits)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
