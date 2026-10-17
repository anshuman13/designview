import { useEffect, useMemo, useState } from 'react';
import { getJson, postJson, send, useStore } from '../store';
import { Icon } from '../Icon';
import { insertPrompt } from './Files';
import { runRecipe, useCustomRecipes } from '../recipes';
import { RecipeEditor, newDraft, type Draft } from './RecipeEditor';
import { RECIPES, RECIPE_GROUPS, toRecipe } from '../../../shared/recipes';
import type { DesignSystem, Settings } from '../../../shared/design';

const command = (id: string) => window.dispatchEvent(new CustomEvent('designview:command', { detail: { id } }));

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function useChromeOn() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const load = () => getJson<{ state: string }>('/api/chrome/status').then((c) => setOn(c.state === 'on')).catch(() => setOn(false));
    void load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);
  return on;
}

function Setup() {
  const chat = useStore((s) => s.session.id);
  const [token, setToken] = useState<boolean | null>(null);
  const [mcp, setMcp] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<boolean | null>(null);
  const [open, setOpen] = useState(true);
  const chrome = useChromeOn();

  useEffect(() => {
    const load = () => {
      getJson<Settings>('/api/settings').then((s) => setToken(!!s.figmaToken)).catch(() => setToken(false));
      getJson<{ configured: boolean }>('/api/figma/mcp').then((m) => setMcp(m.configured)).catch(() => setMcp(false));
    };
    load();
    window.addEventListener('designview:settings', load);
    window.addEventListener('focus', load);
    return () => {
      window.removeEventListener('designview:settings', load);
      window.removeEventListener('focus', load);
    };
  }, []);

  useEffect(() => {
    setProfile(null);
    getJson<DesignSystem | null>('/api/design-system').then((d) => setProfile(!!d)).catch(() => setProfile(false));
  }, [chat]);

  const rows = [
    { label: 'Figma token set', ok: token, action: 'Open Settings', run: () => command('page:settings') },
    { label: 'Figma tools added to Claude', ok: mcp, action: 'Open Settings', run: () => command('page:settings') },
    { label: 'Chrome connected', ok: chrome, action: 'Open Figma tab', run: () => command('page:figma') },
    { label: 'Design system profile', ok: profile, action: 'Build with /system', run: () => { command('tab:chat'); insertPrompt('/system'); } },
  ];
  const left = rows.filter((r) => !r.ok).length;
  if (rows.every((r) => r.ok) || (token === null && mcp === null)) return null;

  return (
    <section className="home-setup">
      <button className="home-setup-head" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Icon name={open ? 'chevron-down' : 'chevron-right'} small />
        <span className="home-setup-title">Get set up</span>
        <span className="muted">{left} to do</span>
      </button>
      {open && (
        <ul>
          {rows.map((r) => (
            <li key={r.label} className={r.ok ? 'done' : ''}>
              <span className={`dot ${r.ok ? 'ok' : ''}`} />
              <span className="home-setup-label">{r.label}</span>
              {!r.ok && <button onClick={r.run}>{r.action}</button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Recent() {
  const live = useStore((s) => s.live);
  const files = useMemo(() => {
    const seen = new Set<string>();
    return [...live]
      .filter((c) => c.file)
      .sort((a, b) => b.lastActive - a.lastActive)
      .filter((c) => !seen.has(c.file!) && seen.add(c.file!))
      .slice(0, 6);
  }, [live]);
  if (!files.length) return null;
  return (
    <section className="home-group">
      <h2>Recent files</h2>
      <div className="home-recent">
        {files.map((c) => (
          <button key={c.id} className="home-file" onClick={() => send({ type: 'view', id: c.id })}>
            <span className="home-thumb"><span className="home-frame">{c.file!.trim().charAt(0).toUpperCase()}</span></span>
            <span className="home-file-name">{c.file}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function Sample() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const open = async () => {
    setBusy(true);
    setError('');
    try {
      const { id } = await postJson<{ id: string }>('/api/sample', {});
      send({ type: 'view', id });
      setTimeout(() => command('page:sketch'), 400);
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  };
  return (
    <section className="home-setup">
      <div className="home-setup-head">
        <span className="home-setup-title">Take the tour with sample data</span>
        <button disabled={busy} onClick={() => void open()}>Open sample</button>
      </div>
      <p className="muted">See a finished plan, sketches, review, crit and copy pass for a grocery cart. Uses no tokens.</p>
      {error && <div className="error-text">{error}</div>}
    </section>
  );
}

export function Home() {
  const focus = useStore((s) => s.ui.focus);
  const custom = useCustomRecipes();
  const [draft, setDraft] = useState<Draft | null>(null);
  useEffect(() => {
    const onNew = (e: Event) => setDraft(newDraft((e as CustomEvent<string>).detail));
    window.addEventListener('designview:recipe-new', onNew);
    return () => window.removeEventListener('designview:recipe-new', onNew);
  }, []);
  return (
    <div className="home">
      <header className="home-head">
        <h1>{greeting()}</h1>
        <p>Plan, sketch, design and review in Figma with Claude.</p>
      </header>
      <Setup />
      <Sample />
      {RECIPE_GROUPS.map((g) => (
        <section key={g.id} className="home-group">
          <h2>{g.label}</h2>
          <div className="home-cards">
            {RECIPES.filter((r) => r.group === g.id).map((r) => (
              <button key={r.id} className="home-card" onClick={() => void runRecipe(r)}>
                <span className="home-card-icon"><Icon name={r.icon} /></span>
                <span className="home-card-title">{r.title}</span>
                <span className="home-card-blurb">{r.blurb}</span>
                <span className="home-card-foot">
                  <span className="home-badge">{r.id === 'brief' ? 'Opus plan' : 'Sonnet'}</span>
                  {r.needsFrames && !focus && <span className="home-hint">pick frames in Files</span>}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
      <section className="home-group">
        <h2>Yours</h2>
        <div className="home-cards">
          {custom.map((c) => {
            const r = toRecipe(c);
            return (
              <div key={r.id} className="home-card-wrap">
                <button className="home-card" onClick={() => void runRecipe(r)}>
                  <span className="home-card-icon"><Icon name={r.icon} /></span>
                  <span className="home-card-title">{r.title}</span>
                  <span className="home-card-blurb">{r.blurb}</span>
                  <span className="home-card-foot">
                    <span className="home-badge">Yours</span>
                    {r.needsFrames && !focus && <span className="home-hint">pick frames in Files</span>}
                  </span>
                </button>
                <button className="icon-btn home-card-edit" title="Edit recipe" aria-label="Edit recipe" onClick={() => setDraft(c)}><Icon name="edit" small /></button>
              </div>
            );
          })}
          <button className="home-card home-card-new" onClick={() => setDraft(newDraft())}>
            <span className="home-card-icon"><Icon name="add" /></span>
            <span className="home-card-title">New recipe</span>
            <span className="home-card-blurb">Save a prompt you use often.</span>
          </button>
        </div>
      </section>
      <Recent />
      {draft && <RecipeEditor draft={draft} onClose={() => setDraft(null)} />}
    </div>
  );
}
