import { useEffect, useState } from 'react';
import { connect, getJson, setUi, useStore } from './store';
import { Brief } from './panes/Brief';
import { Terminal } from './panes/Terminal';
import { CodePane } from './panes/CodePane';
import { BrowserPane } from './panes/BrowserPane';
import { FileSwitcher } from './panes/FileSwitcher';
import { Palette } from './panes/Palette';
import { Explorer } from './panes/Explorer';
import { Chats, NewChat } from './panes/Chats';
import { Files } from './panes/Files';
import { Comments } from './panes/Comments';
import { DesignSystem } from './panes/DesignSystem';
import { Sketch } from './panes/Sketch';
import { Review } from './panes/Review';
import { Settings } from './panes/Settings';
import { Home } from './panes/Home';
import { Icon } from './Icon';
import { ConnectPopover } from './ConnectPopover';
import { McpItem } from './panes/McpStatus';
import { SpendPill } from './SpendPill';
import { canNotify, toggleNotify, useNotify } from './notify';
import './page.css';
import './design.css';

type View = 'files' | 'chats' | 'comments' | 'system' | 'explorer';
type Center = 'home' | 'figma' | 'sketch' | 'review' | 'preview' | 'code' | 'settings';
type Tab = 'chat' | 'home' | 'figma' | 'sketch' | 'review' | 'more';

const VIEWS: { id: View; icon: string; title: string; dev?: boolean }[] = [
  { id: 'files', icon: 'file-media', title: 'Files' },
  { id: 'chats', icon: 'comment-discussion', title: 'Chats' },
  { id: 'comments', icon: 'comment', title: 'Comments' },
  { id: 'system', icon: 'symbol-color', title: 'Design System' },
  { id: 'explorer', icon: 'files', title: 'Chat folder', dev: true },
];

const CENTER: { id: Center; icon: string; label: string; dev?: boolean }[] = [
  { id: 'home', icon: 'home', label: 'Home' },
  { id: 'figma', icon: 'browser', label: 'Figma' },
  { id: 'sketch', icon: 'edit', label: 'Sketch' },
  { id: 'review', icon: 'checklist', label: 'Review' },
  { id: 'preview', icon: 'play', label: 'Preview' },
  { id: 'code', icon: 'code', label: 'Files', dev: true },
];

const PHASE_TAB: Record<string, Center> = { sketch: 'sketch', pick: 'sketch', design: 'figma', fix: 'figma', review: 'review' };
const narrow = () => window.innerWidth <= 900;

function stored(key: string, fallback: number) {
  try {
    return Number(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function Offline() {
  const connected = useStore((s) => s.ui.connected);
  const [late, setLate] = useState(false);
  useEffect(() => {
    setLate(false);
    if (connected) return;
    const t = setTimeout(() => setLate(true), 2000);
    return () => clearTimeout(t);
  }, [connected]);
  if (connected || !late) return null;
  return <div className="app-update offline"><Icon name="plug" small /><span>Disconnected from DesignView, reconnecting</span></div>;
}

function Preview() {
  const chat = useStore((s) => s.session.id);
  const rev = useStore((s) => s.ui.revs['prototype/index.html'] ?? 0);
  const [ok, setOk] = useState<boolean | null>(null);
  const src = `/api/chat-file/prototype/index.html?chat=${encodeURIComponent(chat)}&r=${rev}`;
  useEffect(() => {
    fetch(src, { method: 'GET' }).then((r) => setOk(r.ok)).catch(() => setOk(false));
  }, [src]);
  if (!ok) return <div className="empty-state"><Icon name="play" /><div className="empty-title">No prototype yet</div><div className="muted">Type /prototype and name the frames. Claude builds a clickable version here.</div></div>;
  return <iframe className="preview-frame" title="Prototype" src={src} />;
}

export function App() {
  const connected = useStore((s) => s.ui.connected);
  const pendingCount = useStore((s) => s.pending.length);
  const elsewhere = useStore((s) => s.live.filter((c) => c.id !== s.session.id && c.pending > 0).length);
  const repoPicker = useStore((s) => s.ui.repoPicker);
  const session = useStore((s) => s.session);
  const status = useStore((s) => s.status);
  const events = useStore((s) => s.events);
  const phase = useStore((s) => s.session.flow.phase);
  const [tab, setTab] = useState<Tab>('chat');
  const [center, setCenter] = useState<Center>('home');
  const [sidebar, setSidebar] = useState(true);
  const [view, setView] = useState<View>('files');
  const [phone, setPhone] = useState(false);
  const [dev, setDev] = useState(false);
  const [chatW, setChatW] = useState(() => stored('designview.chatW', 460));
  const [termH, setTermH] = useState(() => stored('designview.termH', 240));
  const [terminal, setTerminal] = useState(false);
  const notifying = useNotify();

  const loadDev = () => getJson<{ devTools: boolean }>('/api/settings').then((s) => setDev(s.devTools)).catch(() => {});
  useEffect(() => {
    void loadDev();
    window.addEventListener('designview:settings', loadDev);
    return () => window.removeEventListener('designview:settings', loadDev);
  }, []);

  const drag = (e: React.PointerEvent, move: (ev: PointerEvent) => void, cls: string) => {
    e.preventDefault();
    document.body.classList.add(cls);
    const up = () => {
      document.body.classList.remove(cls);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const startResize = (e: React.PointerEvent) => drag(e, (ev) => setChatW(Math.round(Math.min(Math.max(window.innerWidth - ev.clientX, 380), window.innerWidth - 480))), 'resizing');
  const startTermResize = (e: React.PointerEvent) => drag(e, (ev) => setTermH(Math.round(Math.min(Math.max(window.innerHeight - 30 - ev.clientY, 100), window.innerHeight - 200))), 'resizing-v');

  const showView = (v: View) => {
    if (v === view) setSidebar((s) => !s);
    else { setView(v); setSidebar(true); }
  };
  const open = (c: Center) => {
    setCenter(c);
    if (narrow()) setTab(c === 'home' || c === 'figma' || c === 'sketch' || c === 'review' ? c : 'more');
  };

  useEffect(() => {
    if (pendingCount > 0) setTab('chat');
  }, [pendingCount]);

  const empty = !session.figma || session.id === '' || events.length === 0;
  useEffect(() => {
    if (empty) setCenter('home');
  }, [session.id]);

  useEffect(() => {
    const next = phase ? PHASE_TAB[phase] : undefined;
    if (next && !narrow()) setCenter(next);
  }, [phase]);

  useEffect(() => {
    try {
      localStorage.setItem('designview.chatW', String(chatW));
      localStorage.setItem('designview.termH', String(termH));
    } catch {}
  }, [chatW, termH]);

  useEffect(() => {
    connect();
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'o') { e.preventDefault(); setUi({ repoPicker: true }); }
      if (k === 'b') { e.preventDefault(); setSidebar((v) => !v); }
      if (k === 'j' && dev) { e.preventDefault(); setTerminal((v) => !v); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dev]);

  useEffect(() => {
    const onCommand = (e: Event) => {
      const [kind, arg] = (e as CustomEvent<{ id: string }>).detail.id.split(':');
      if (kind === 'view') { setView(arg as View); setSidebar(true); if (narrow()) setTab('more'); }
      else if (kind === 'page') open(arg as Center);
      else if (kind === 'phone') setPhone((v) => !v);
      else if (kind === 'tab') setTab(arg as Tab);
    };
    window.addEventListener('designview:command', onCommand);
    return () => window.removeEventListener('designview:command', onCommand);
  }, []);

  const figma = session.figma;
  const title = figma?.name ?? 'No Figma file';
  const centers = CENTER.filter((c) => !c.dev || dev);
  const views = VIEWS.filter((v) => !v.dev || dev);
  const shownCenter = narrow() && (tab === 'home' || tab === 'figma' || tab === 'sketch' || tab === 'review') ? tab : center;

  return (
    <div className="workbench" data-tab={tab} data-sidebar={sidebar} style={{ '--chat-w': `${chatW}px` } as React.CSSProperties}>
      <Offline />
      <header className="topbar">
        <span className="brand"><span className="logo" />DesignView</span>
        <button className="file-pill" title={figma ? `${figma.url}\nStart a chat on another file (⌘O)` : 'Start a chat from a Figma file (⌘O)'} onClick={() => setUi({ repoPicker: true })}>
          <Icon name="file-media" small /> <span>{title}</span> <Icon name="chevron-down" small />
        </button>
        <span className="spacer" />
        <span className={`run-state ${session.running ? 'busy' : ''}`}>
          <Icon name={session.running ? 'loading' : 'circle-large-outline'} small spin={session.running} /> {session.running ? status : 'Idle'}
        </span>
        <SpendPill />
        <McpItem />
        {canNotify && <button className="icon-btn" title={notifying ? 'Notifications on' : 'Notify me when Claude finishes or needs me'} onClick={toggleNotify}><Icon name={notifying ? 'bell' : 'bell-slash'} /></button>}
        <button className="icon-btn" title="Open on phone" onClick={() => setPhone((v) => !v)}><Icon name="device-mobile" /></button>
        <button className={`icon-btn ${center === 'settings' ? 'active' : ''}`} title="Settings" onClick={() => open('settings')}><Icon name="settings-gear" /></button>
        {!connected && <span className="error-text">Disconnected</span>}
      </header>
      <div className="body">
        <aside className="activitybar desktop-only">
          {views.map((v) => (
            <button key={v.id} className={sidebar && view === v.id ? 'active' : ''} title={v.title} onClick={() => showView(v.id)}>
              <Icon name={v.icon} />
              {v.id === 'chats' && elsewhere > 0 && <span className="badge">{elsewhere}</span>}
            </button>
          ))}
        </aside>

        <section className="sidebar pane side">
          <div className="sidebar-title">{VIEWS.find((v) => v.id === view)!.title}</div>
          {tab === 'more' && (
            <div className="side-switch mobile-only">
              {views.map((v) => <button key={v.id} className={view === v.id ? 'active' : ''} onClick={() => setView(v.id)}>{v.title}</button>)}
              <button onClick={() => open('settings')}>Settings</button>
            </div>
          )}
          {view === 'files' ? <Files /> : view === 'chats' ? <Chats /> : view === 'comments' ? <Comments /> : view === 'system' ? <DesignSystem /> : <Explorer />}
        </section>

        <section className="editor-group pane code">
          <div className="tabs">
            {centers.map((c) => (
              <button key={c.id} className={`tab ${shownCenter === c.id ? 'active' : ''}`} onClick={() => open(c.id)}>
                <Icon name={c.icon} small /> {c.label}
                {c.id === 'sketch' && phase === 'pick' && <span className="badge waiting">!</span>}
              </button>
            ))}
            {center === 'settings' && <button className="tab active"><Icon name="settings-gear" small /> Settings</button>}
          </div>
          <div className={`editor ${shownCenter === 'home' ? 'shown' : ''}`}>{shownCenter === 'home' && <Home />}</div>
          <div className={`editor browser ${shownCenter === 'figma' ? 'shown' : ''}`}>{shownCenter === 'figma' && <BrowserPane />}</div>
          <div className={`editor ${shownCenter === 'sketch' ? 'shown' : ''}`}>{shownCenter === 'sketch' && <Sketch />}</div>
          <div className={`editor ${shownCenter === 'review' ? 'shown' : ''}`}>{shownCenter === 'review' && <Review />}</div>
          <div className={`editor ${shownCenter === 'preview' ? 'shown' : ''}`}>{shownCenter === 'preview' && <Preview />}</div>
          <div className={`editor ${shownCenter === 'settings' ? 'shown' : ''}`}>{shownCenter === 'settings' && <Settings />}</div>
          {dev && <div className={`editor ${shownCenter === 'code' ? 'shown' : ''}`}><CodePane /></div>}
          {dev && (
            <div className="panel" style={terminal ? { height: termH } : undefined}>
              {terminal && <div className="panel-sash" onPointerDown={startTermResize} />}
              <Terminal key={session.id} chat={session.id} project={title} open={terminal} onToggle={() => setTerminal((v) => !v)} />
            </div>
          )}
        </section>

        <div className="sash desktop-only" onPointerDown={startResize} />

        <section className="main pane center">
          <Brief />
        </section>
      </div>

      <nav className="tabbar mobile-only">
        {([['chat', 'comment-discussion', 'Timeline'], ['home', 'home', 'Home'], ['figma', 'browser', 'Figma'], ['sketch', 'edit', 'Sketch'], ['review', 'checklist', 'Review'], ['more', 'ellipsis', 'More']] as const).map(([id, icon, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => { setTab(id); if (id !== 'chat' && id !== 'more') setCenter(id); }}>
            <Icon name={icon} />
            <span>{label}</span>
            {id === 'chat' && pendingCount > 0 && <span className="badge">{pendingCount}</span>}
          </button>
        ))}
      </nav>

      <FileSwitcher />
      <Palette />
      {repoPicker && <NewChat />}
      {phone && <ConnectPopover onClose={() => setPhone(false)} />}
    </div>
  );
}
