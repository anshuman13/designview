import { useEffect, useState } from 'react';
import { RecipeEditor, newDraft, type Draft } from './panes/RecipeEditor';

export function RecipeEditorHost() {
  const [draft, setDraft] = useState<Draft | null>(null);
  useEffect(() => {
    const onNew = (e: Event) => setDraft(newDraft((e as CustomEvent<string>).detail));
    const onEdit = (e: Event) => setDraft((e as CustomEvent<Draft>).detail);
    window.addEventListener('designview:recipe-new', onNew);
    window.addEventListener('designview:recipe-edit', onEdit);
    return () => {
      window.removeEventListener('designview:recipe-new', onNew);
      window.removeEventListener('designview:recipe-edit', onEdit);
    };
  }, []);
  return draft && <RecipeEditor draft={draft} onClose={() => setDraft(null)} />;
}
