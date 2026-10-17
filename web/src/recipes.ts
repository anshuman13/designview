import { getJson, getState, send } from './store';
import { insertPrompt } from './panes/Files';
import { RECIPES, recipePrompt, type Recipe } from '../../shared/recipes';
import { figmaNodeUrl } from '../../shared/design';

type Outline = { pages: Array<{ frames: Array<{ id: string; name: string }> }> };

async function selectedFrames() {
  const { figma } = getState().session;
  const focus = getState().ui.focus;
  if (!figma || !focus) return null;
  const outline = await getJson<Outline>('/api/figma/outline').catch(() => null);
  const name = outline?.pages.flatMap((p) => p.frames).find((f) => f.id === focus)?.name;
  return `${name ?? focus} (${figmaNodeUrl(figma.key, focus)})`;
}

export async function runRecipe(recipe: Recipe) {
  const frames = recipe.needsFrames ? await selectedFrames() : null;
  if (recipe.id === 'brief') send({ type: 'set_flow', patch: { on: true } });
  window.dispatchEvent(new CustomEvent('designview:command', { detail: { id: 'tab:chat' } }));
  insertPrompt(recipePrompt(recipe, frames).trimEnd());
}

export const runRecipeById = (id: string) => {
  const r = RECIPES.find((x) => x.id === id);
  if (r) void runRecipe(r);
};
