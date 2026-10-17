import { useEffect, useState } from 'react';
import { getJson, postJson } from '../store';
import { Icon } from '../Icon';
import { AREAS, AREA_NAMES, PRESETS, PRESET_INFO, type Settings as S } from '../../../shared/design';

type McpInfo = { configured: boolean; status: { status: string; error?: string } | null };

export function Settings() {
  const [s, setS] = useState<S | null>(null);
  const [token, setToken] = useState('');
  const [msg, setMsg] = useState('');
  const [mcp, setMcp] = useState<McpInfo | null>(null);
  const [who, setWho] = useState('');

  useEffect(() => {
    getJson<S>('/api/settings').then((x) => { setS(x); setToken(x.figmaToken); }).catch((e) => setMsg(e.message));
    getJson<McpInfo>('/api/figma/mcp').then(setMcp).catch(() => {});
    getJson<{ handle: string; email: string }>('/api/figma/me').then((m) => setWho(`${m.handle} (${m.email})`)).catch(() => {});
  }, []);

  const save = async (patch: Partial<S>) => {
    try {
      const next = await postJson<S>('/api/settings', patch);
      setS(next);
      setToken(next.figmaToken);
      setMsg('Saved');
      if ('figmaToken' in patch) getJson<{ handle: string; email: string }>('/api/figma/me').then((m) => setWho(`${m.handle} (${m.email})`)).catch((e) => setWho(`Token not accepted: ${e.message}`));
    } catch (e) {
      setMsg((e as Error).message);
    }
  };
  const addMcp = async () => {
    try {
      await postJson('/api/figma/mcp', {});
      setMcp(await getJson<McpInfo>('/api/figma/mcp'));
      setMsg('Figma added to Claude. Sign in once: run claude in a terminal, type /mcp, pick figma and authenticate.');
    } catch (e) {
      setMsg((e as Error).message);
    }
  };
  if (!s) return <div className="settings-page"><div className="hint">{msg || 'Loading…'}</div></div>;

  return (
    <div className="settings-page">
      {msg && <div className="banner"><Icon name="info" small /> <span>{msg}</span></div>}
      <section className="set-card">
        <h2>Figma access</h2>
        <p className="muted">DesignView reads files, frames, thumbnails and comments with a Figma personal access token (Figma, Settings, Security, Personal access tokens). Give it read access to files and write access to comments.</p>
        <label className="field">
          <span>Personal access token</span>
          <div className="inline">
            <input type="password" value={token} placeholder="figd_…" onChange={(e) => setToken(e.target.value)} />
            <button className="primary" onClick={() => save({ figmaToken: token })}>Save</button>
          </div>
          {who && <span className="muted small">{who}</span>}
        </label>
        <label className="field">
          <span>Team ID, for the team files list (optional)</span>
          <div className="inline">
            <input defaultValue={s.teamId} placeholder="From figma.com/files/team/<id>" onBlur={(e) => e.target.value !== s.teamId && save({ teamId: e.target.value })} />
          </div>
        </label>
        <div className="field">
          <span>Claude's Figma tools</span>
          {mcp?.configured ? (
            <span className="muted">Figma MCP is in your Claude config{mcp.status ? `, status: ${mcp.status.status}` : ''}. {mcp.status?.status === 'needs-auth' ? 'Run claude in a terminal, type /mcp, pick figma and authenticate.' : ''}</span>
          ) : (
            <div className="inline"><span className="muted">Not set up yet.</span><button onClick={addMcp}>Add Figma to Claude</button></div>
          )}
        </div>
      </section>

      <section className="set-card">
        <h2>Design runs</h2>
        <Toggle label="Stop after sketch" detail="Wait for you to pick a sketch direction before Claude designs in Figma" on={s.stopAfterSketch} set={(v) => save({ stopAfterSketch: v })} />
        <Toggle label="Ask before changing the file" detail="Claude asks before each change to Figma. Off: Claude edits without asking, after saving a version" on={s.askBeforeEdit} set={(v) => save({ askBeforeEdit: v })} />
        <Toggle label="Follow Claude in Figma" detail="Move the Figma tab to the frame Claude is working on" on={s.followClaude} set={(v) => save({ followClaude: v })} />
        <div className="field">
          <span>Default review</span>
          <div className="seg">
            {PRESETS.map((p) => <button key={p} className={s.preset === p ? 'on' : ''} title={PRESET_INFO[p].detail} onClick={() => save({ preset: p })}>{PRESET_INFO[p].label}</button>)}
          </div>
          <span className="muted small">{PRESET_INFO[s.preset].detail}. New chats start with this.</span>
        </div>
        <div className="field">
          <span>Areas for Focused reviews</span>
          <div className="area-ticks">
            {AREAS.map((a) => (
              <label key={a}><input type="checkbox" checked={s.areas.includes(a)} onChange={(e) => save({ areas: e.target.checked ? [...s.areas, a] : s.areas.filter((x) => x !== a) })} />{AREA_NAMES[a]}</label>
            ))}
          </div>
        </div>
      </section>

      <section className="set-card">
        <h2>Models</h2>
        <p className="muted">Opus 5.5 writes the plan. Sonnet 5.5 sketches, designs, fixes and reviews.</p>
        <label className="field">
          <span>Daily budget (USD), 0 = off</span>
          <div className="inline">
            <input type="number" min={0} step={1} defaultValue={s.dailyBudgetUsd} onBlur={(e) => Number(e.target.value) !== s.dailyBudgetUsd && save({ dailyBudgetUsd: Number(e.target.value) })} />
          </div>
          <span className="muted small">The spend pill turns yellow at 80% and red above 100% of this.</span>
        </label>
        <Toggle label="Developer tools" detail="Show the chat folder's files and a terminal" on={s.devTools} set={(v) => save({ devTools: v }).then(() => window.dispatchEvent(new Event('designview:settings')))} />
      </section>
    </div>
  );
}

function Toggle({ label, detail, on, set }: { label: string; detail: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <label className="toggle-row">
      <span className="tl-text"><span className="t">{label}</span><span className="muted small">{detail}</span></span>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => set(e.target.checked)} />
    </label>
  );
}
