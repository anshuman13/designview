import { Suspense, lazy, useEffect, useState } from 'react';
import { getJson, postJson, send, useRev, useStore } from '../store';
import { Icon } from '../Icon';
import type { SketchDoc } from '../../../shared/design';

const SketchCanvas = lazy(() => import('./SketchCanvas'));

export function Sketch() {
  const chat = useStore((s) => s.session.id);
  const phase = useStore((s) => s.session.flow.phase);
  const running = useStore((s) => s.session.running);
  const rev = useRev('sketch.json');
  const [doc, setDoc] = useState<SketchDoc | null>(null);
  const [board, setBoard] = useState<any[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setBoard(null);
    getJson<any[]>('/api/sketch/board').then(setBoard).catch(() => setBoard([]));
  }, [chat]);

  useEffect(() => {
    getJson<SketchDoc | { error: string } | null>('/api/sketch')
      .then((d) => {
        if (d && 'error' in d) { setError(d.error); return; }
        setError('');
        setDoc(d);
      })
      .catch((e) => setError(e.message));
  }, [chat, rev]);

  const pick = (screen: string, direction: string) => {
    send({ type: 'flow_pick', screen, direction });
    setDoc((d) => d && { screens: d.screens.map((s) => (s.id === screen ? { ...s, chosen: direction, chosenBy: 'designer' } : s)) });
  };
  const allPicked = doc?.screens.every((s) => s.chosen);

  return (
    <div className="sketch-page">
      <div className="sketch-head">
        {phase === 'pick' && (
          <div className="banner">
            <Icon name="lightbulb" small />
            <span>Pick a direction for each screen. Draw or write notes on the canvas; Claude reads your notes before it designs.</span>
            <button className="primary" disabled={!allPicked || running} onClick={() => send({ type: 'flow_continue' })}>Continue to design</button>
          </div>
        )}
        {error && <div className="error-text">{error}</div>}
        {!doc && !error && <div className="hint">No sketches yet. Ask for a design, or type /sketch and what you need. Claude sketches two or three directions per screen here before it touches Figma.</div>}
        {doc?.screens.map((s) => (
          <div key={s.id} className="sketch-screen">
            <span className="screen-name">{s.name}</span>
            {s.directions.map((d, i) => (
              <button key={d.id} className={`dir ${s.chosen === d.id ? 'chosen' : ''}`} title={d.rationale} onClick={() => pick(s.id, d.id)}>
                {s.chosen === d.id && <Icon name="check" small />}
                {String.fromCharCode(65 + i)} · {d.name}
              </button>
            ))}
            {s.chosen && <span className="muted small">{s.chosenBy === 'designer' ? 'you picked' : 'Claude picked'}</span>}
          </div>
        ))}
      </div>
      <div className="sketch-canvas">
        {board && (
          <Suspense fallback={<div className="hint">Loading the canvas…</div>}>
            <SketchCanvas key={chat} doc={doc} board={board} onBoard={(els) => postJson('/api/sketch/board', { elements: els }).catch(() => {})} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
