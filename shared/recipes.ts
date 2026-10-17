export type RecipeGroup = 'make' | 'improve' | 'ship';

export type Recipe = {
  id: string;
  title: string;
  blurb: string;
  icon: string;
  group: RecipeGroup;
  needsFrames: boolean;
  prompt: string;
};

export type CustomRecipe = { id: string; title: string; blurb: string; prompt: string; group: RecipeGroup };

export const toRecipe = (c: CustomRecipe): Recipe => ({ ...c, icon: 'bookmark', needsFrames: c.prompt.includes('{frames}') });

export const RECIPE_GROUPS: { id: RecipeGroup; label: string }[] = [
  { id: 'make', label: 'Make' },
  { id: 'improve', label: 'Improve' },
  { id: 'ship', label: 'Ship' },
];

export const NO_FRAMES = 'the frames I name below';

export const RECIPES: Recipe[] = [
  {
    id: 'brief',
    title: 'Design from a brief',
    blurb: 'Plan, sketch, design and review screens from a few lines of text.',
    icon: 'sparkle',
    group: 'make',
    needsFrames: false,
    prompt: 'Design: ',
  },
  {
    id: 'sketch',
    title: 'Sketch directions',
    blurb: 'Explore two or three low-fidelity directions before committing.',
    icon: 'edit',
    group: 'make',
    needsFrames: false,
    prompt: '/sketch ',
  },
  {
    id: 'screenshot',
    title: 'Screenshot to design',
    blurb: 'Rebuild a pasted screenshot with your own components and variables.',
    icon: 'device-camera',
    group: 'make',
    needsFrames: false,
    prompt:
      'Rebuild the screenshot I pasted as an editable frame on the DesignView page. Use components from our design system libraries and bind colors, type and spacing to our variables and text styles instead of raw values. Use auto layout throughout and name layers by purpose. Where the screenshot has no matching component or variable, use the closest one and list the differences afterwards.',
  },
  {
    id: 'flow-map',
    title: 'Flow map',
    blurb: 'Draw a FigJam diagram of your screens and how they connect.',
    icon: 'type-hierarchy',
    group: 'make',
    needsFrames: true,
    prompt:
      'Map the flow between {frames} as a FigJam diagram using generate_diagram. Show each screen as a node labeled with the frame name, and each transition as an arrow labeled with the action that triggers it (button, link, gesture, system event). Include entry points, dead ends and error exits. Link the diagram when it is done.',
  },
  {
    id: 'states',
    title: 'Missing states',
    blurb: 'Add empty, loading, error, long content and no permission variants.',
    icon: 'layers',
    group: 'improve',
    needsFrames: true,
    prompt:
      'For {frames}, design the states that are missing: empty, loading, error, long content (long names, many items, wrapped text) and no permission. Build each as a copy of the source frame, placed to the right of that source frame on the DesignView page with a gap of 100px and named "<source> / <state>". Reuse the existing components and variables, and list which states you added for each frame.',
  },
  {
    id: 'responsive',
    title: 'Responsive variants',
    blurb: 'Create mobile, tablet and desktop versions with auto layout.',
    icon: 'device-mobile',
    group: 'improve',
    needsFrames: true,
    prompt:
      'Create responsive variants of {frames} at 390 (mobile), 834 (tablet) and 1440 (desktop) wide. Use auto layout with resizing rules (fill, hug, fixed) so each variant reflows rather than scales, and adapt navigation, columns and spacing to the width. Place the variants next to the source frame on the DesignView page, named "<source> / 390", "<source> / 834" and "<source> / 1440".',
  },
  {
    id: 'copy',
    title: 'Copy pass',
    blurb: 'Make UI copy clear, short and consistent in tone. Cheap, one Sonnet call.',
    icon: 'symbol-string',
    group: 'improve',
    needsFrames: true,
    prompt:
      '/copy tone:friendly {frames}',
  },
  {
    id: 'crit',
    title: 'Design crit',
    blurb: 'Get feedback from four points of view, without any edits. Cheap, one Sonnet call.',
    icon: 'comment-discussion',
    group: 'improve',
    needsFrames: true,
    prompt:
      '/crit {frames}',
  },
  {
    id: 'audit',
    title: 'Audit',
    blurb: 'Check the file against your design system without model calls.',
    icon: 'search',
    group: 'improve',
    needsFrames: false,
    prompt: '/audit',
  },
  {
    id: 'handoff',
    title: 'Handoff notes',
    blurb: 'Write developer notes with spacing, tokens, props and interactions.',
    icon: 'file-code',
    group: 'ship',
    needsFrames: true,
    prompt:
      'Write developer handoff notes for {frames} as a markdown file named handoff.md in the chat folder. For each frame cover layout and spacing (with the variable names), colors and type as tokens, the components used with their props and variants, interactions and transitions, responsive behavior and open questions. Read values from Figma rather than estimating them.',
  },
  {
    id: 'comments',
    title: 'Address comments',
    blurb: 'Fix open Figma comments that ask for changes and reply on each.',
    icon: 'comment-draft',
    group: 'ship',
    needsFrames: false,
    prompt:
      'Read the open comments on this Figma file. Fix the ones that ask for a design change, then reply on each comment saying what you changed. For comments that are questions or need a decision from a person, reply with a short note and leave the design as is. List what you did for every comment at the end.',
  },
];

export function recipePrompt(recipe: Recipe, frames: string | null) {
  return recipe.prompt.replaceAll('{frames}', frames || NO_FRAMES);
}
