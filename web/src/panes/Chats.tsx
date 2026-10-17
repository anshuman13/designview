import { useEffect, useMemo, useState } from 'react';
import { getJson, getState, send, setUi, useStore } from '../store';
import { insertPrompt } from './Files';
import { Icon } from '../Icon';
import { Confirm, type ConfirmRequest } from '../Confirm';
import { parseFigmaUrl } from '../../../shared/design';
import { type ChatEvent, type LiveChat, type SavedSession } from '../../../shared/protocol';
import { replyLine } from '../../../shared/edits';
import '../chats.css';

type Folder = { cwd: string; key: string; name: string; url: string };
type Group = { cwd: string; name: string; open: LiveChat[]; recent: SavedSession[] };

const RECENT = 5;
const urgency = (c: LiveChat) => (c.pending ? 0 : c.running ? 1 : 2);
const byUrgency = (a: LiveChat, b: LiveChat) => urgency(a) - urgency(b) || b.lastActive - a.lastActive;

export function groupChats(live: LiveChat[], saved: SavedSession[], folders: Folder[]): Group[] {
  const groups = new Map<string, Group>();
  const name = (cwd: string) => folders.find((f) => f.cwd === cwd)?.name ?? (cwd.endsWith('/scratch') ? 'No file yet' : cwd.split('/').pop() ?? cwd);
  const get = (cwd: string) => groups.get(cwd) ?? groups.set(cwd, { cwd, name: name(cwd), open: [], recent: [] }).get(cwd)!;
  for (const c of live) get(c.cwd).open.push(c);
  const openIds = new Set(live.map((c) => c.sessionId));
  const roots = new Set([...folders.map((f) => f.cwd), ...live.map((c) => c.cwd)]);
  for (const s of saved) if (roots.has(s.cwd) && !openIds.has(s.sessionId)) get(s.cwd).recent.push(s);
  for (const g of groups.values()) {
    g.open.sort(byUrgency);
    g.recent.sort((a, b) => b.lastModified - a.lastModified);
  }
  const last = (g: Group) => Math.max(0, ...g.open.map((c) => c.lastActive), ...g.recent.map((s) => s.lastModified));
  return [...groups.values()].sort((a, b) => last(b) - last(a));
}

export function Chats() {
  const viewing = useStore((s) => s.session.id);
  const current = useStore((s) => s.session.sessionId);
  const live = useStore((s) => s.live);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [saved, setSaved] = useState<SavedSession[]>([]);
  const [ask, setAsk] = useState<ConfirmRequest | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    getJson<Folder[]>('/api/figma/folders').then(setFolders).catch(() => {});
    getJson<SavedSession[]>('/api/sessions').then(setSaved).catch(() => {});
    setOpening(null);
  }, [current, live.length]);

  const groups = useMemo(() => groupChats(live, saved, folders), [live, saved, folders]);
  const close = (c: LiveChat) =>
    c.running || c.pending
      ? setAsk({ title: 'Close this chat?', detail: c.title, warning: 'Claude is still working on it and will stop. The transcript is kept.', action: 'Close', run: async () => send({ type: 'close', id: c.id }) })
      : send({ type: 'close', id: c.id });

  return (
    <div className="sessions chats">
      <div className="sessions-bar">
        <button className="new-chat primary" onClick={() => setUi({ repoPicker: true })}><Icon name="add" small /> New chat from a Figma file</button>
      </div>
      <div className="tree">
        {groups.map((g) => (
          <div key={g.cwd}>
            <div className="row project" title={g.cwd}>
              <span className="twistie"><Icon name="file-media" small /></span>
              <span className="name">{g.name}</span>
              <span className="acts">
                <button className="icon-btn" title={`New chat on ${g.name}`} onClick={() => send({ type: 'new_session', cwd: g.cwd })}><Icon name="add" small /></button>
              </span>
            </div>
            {g.open.map((c) => <LiveRow key={c.id} c={c} selected={c.id === viewing} onClose={() => close(c)} />)}
            {g.recent.slice(0, RECENT).map((s) => (
              <div key={s.sessionId} className="row session recent" title={s.title} onClick={() => { setOpening(s.sessionId); send({ type: 'open_session', sessionId: s.sessionId }); }}>
                <span className="name">{opening === s.sessionId ? 'Opening… ' : ''}{s.title}</span>
                <span className="when">{ago(s.lastModified)}</span>
              </div>
            ))}
          </div>
        ))}
        {!groups.length && <div className="hint">No chats yet. Start one from a Figma file.</div>}
      </div>
      {ask && <Confirm {...ask} onClose={() => setAsk(null)} />}
    </div>
  );
}

function line(c: LiveChat, events: ChatEvent[] | null) {
  return c.pending ? 'Needs you' : c.running ? c.status : c.last ?? (events ? replyLine(events) : '') ?? '';
}

function LiveRow({ c, selected, onClose }: { c: LiveChat; selected: boolean; onClose: () => void }) {
  const events = useStore((s) => (s.session.id === c.id ? s.events : null));
  const text = line(c, events);
  return (
    <div className={`row session live ${text ? 'two' : ''} ${selected ? 'selected' : ''}`} title={c.title} onClick={() => selected || send({ type: 'view', id: c.id })}>
      <span className={`dot ${c.pending ? 'waiting' : c.running ? 'running' : 'idle'}`} />
      <span className="lines">
        <span className="l1">
          <span className="name">{c.title}</span>
          <span className="when">{c.pending ? 'needs you' : c.running ? '' : ago(c.lastActive)}</span>
        </span>
        {text && <span className="l2"><span className="sub">{text}</span></span>}
      </span>
      <span className="acts">
        <button className="icon-btn" title="Close chat, keep the transcript" onClick={(e) => { e.stopPropagation(); onClose(); }}><Icon name="close" small /></button>
      </span>
    </div>
  );
}

const lines = (...l: string[]) => l.join('\n');
const brief = (goal: string, users: string, screens: string, must: string, content: string, constraints: string) =>
  lines(`Goal: ${goal}`, `Users: ${users}`, 'Screens:', ...screens.split('|').map((x) => `- ${x}`), 'Must include:', ...must.split('|').map((x) => `- ${x}`), `Content notes: ${content}`, `Constraints: ${constraints}`);

const BRIEFS: { name: string; text: string }[] = [
  { name: 'Feature screen', text: brief('What the user can do on this screen, and why it matters', 'Who uses it and in what situation', 'Main screen|Loading, empty and error states', 'Primary action|Key information users need to decide|Entry and exit points', 'Real labels and sample data, not lorem ipsum', 'Design system components, platform, accessibility needs') },
  { name: 'Landing page', text: brief('What visitors should understand and do after reading', 'Target audience and how they arrive', 'Desktop landing page|Mobile landing page', 'Hero with one clear call to action|Benefits or features|Social proof|Footer', 'Headline, supporting copy and tone of voice', 'Brand guidelines, breakpoints, performance') },
  { name: 'Onboarding flow', text: brief('What a new user should have set up or learned by the end', 'New users, their experience level and motivation', 'Welcome|Setup steps|Confirmation', 'Progress indicator|Skip or back option|One decision per step', 'Short friendly copy for each step', 'Number of steps, required permissions or data') },
  { name: 'Settings page', text: brief('What users can configure and manage', 'Who changes these settings and how often', 'Settings overview|Detail view for one group|Confirmation for risky changes', 'Grouped sections|Toggles and inputs with helper text|Save or auto-save feedback', 'Plain-language setting names and descriptions', 'Existing settings to keep, permissions, mobile layout') },
  { name: 'Dashboard', text: brief('The questions this dashboard answers at a glance', 'Who checks it and how often', 'Overview|Filtered or detail view', 'Key metrics|Charts with clear labels|Date range and filters|Table of recent items', 'Metric names, units and example values', 'Data limits, refresh rate, responsive behavior') },
  { name: 'Empty and error states', text: brief('Help users recover or move forward when there is no content or something fails', 'Who hits these states and what they were trying to do', 'First-use empty state|No search results|Error with retry|Offline', 'Short explanation|Clear next action|Illustration or icon|Support link', 'Tone: calm and helpful, never blame the user', 'Reuse existing components, keep layouts consistent') },
];

function handOff(text: string) {
  const before = getState().session.id;
  const started = Date.now();
  const timer = setInterval(() => {
    if (Date.now() - started > 15000) return clearInterval(timer);
    if (getState().session.id === before) return;
    clearInterval(timer);
    setTimeout(() => insertPrompt(text), 300);
  }, 100);
}

export function NewChat() {
  const [url, setUrl] = useState('');
  const [template, setTemplate] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const valid = Boolean(parseFigmaUrl(url));
  const closeDialog = () => setUi({ repoPicker: false });
  useEffect(() => {
    getJson<Folder[]>('/api/figma/folders').then(setFolders).catch(() => {});
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeDialog();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const start = (link: string) => {
    setBusy(true);
    if (text.trim()) handOff(text.trim());
    send({ type: 'new_chat', url: link });
    setTimeout(closeDialog, 400);
  };
  return (
    <div className="nc-overlay" onClick={closeDialog}>
      <div className="nc-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>New chat</h2>
        <p className="muted">Paste the link to a Figma design file. Copy it from Share, or from the address bar.</p>
        <form onSubmit={(e) => { e.preventDefault(); if (valid) start(url); }}>
          <input autoFocus placeholder="https://www.figma.com/design/…" value={url} onChange={(e) => setUrl(e.target.value)} />
          {url && !valid && <div className="error-text">That does not look like a Figma file link.</div>}
          <div className="dialog-label">Start with a brief (optional)</div>
          <div className="brief-chips">
            {BRIEFS.map((b) => (
              <button type="button" key={b.name} className={b.name === template ? 'on' : ''} onClick={() => { setTemplate(b.name); setText(b.text); }}>{b.name}</button>
            ))}
          </div>
          <textarea rows={8} placeholder="Describe what to design, or pick a template above" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="dialog-actions">
            <button type="button" className="ghost" onClick={closeDialog}>Cancel</button>
            <button type="submit" className="primary" disabled={!valid || busy}>{busy ? 'Opening…' : 'Start chat'}</button>
          </div>
        </form>
        {folders.length > 0 && (
          <>
            <div className="dialog-label">Recent files</div>
            <ul className="pick-list">
              {folders.map((f) => (
                <li key={f.cwd}><button onClick={() => { send({ type: 'new_session', cwd: f.cwd }); closeDialog(); }}><Icon name="file-media" small /> {f.name}</button></li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function ago(t: number) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 60) return `${m}m`;
  if (m < 60 * 24) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 1440)}d`;
}
