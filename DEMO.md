# DesignView demo guide

Built overnight on 2026-10-17. Each section is one change you can try. Open http://localhost:5174 on the Mac, or
http://<tailscale-ip>:5174 on your phone (Tailscale) and add it to the home screen for the app.

DesignView.app runs from the menu bar (started by `./start.sh`). `caffeinate` keeps the Mac awake until about 11:00.

No step below spends tokens unless it says so.

## 1. Look and feel

Claude's cream paper background and coral accent, with Figma blue kept for Figma things (focused frames, the
Figma tab). Headings, the brief and dialog titles use the system serif (New York). New coral app icon for the home
screen.

Try: open the app, then Settings and the new chat dialog. On the phone, add to home screen and check the icon.

## 2. Home and recipes

A Home tab opens first in a new chat. It greets you, shows a setup checklist (Figma token, Figma tools in Claude,
Chrome, design system profile) with a button for each missing step, and lists eleven recipes in three groups:

- Make: Design from a brief, Sketch directions, Screenshot to design, Flow map
- Improve: Missing states, Responsive variants, Copy pass, Design crit, Audit
- Ship: Handoff notes, Address comments

Clicking a recipe fills the composer with a written prompt and does not send it, so you can edit it first. If a
frame is focused in Files, the prompt names it. Every recipe is also in the command palette (Cmd+K) as "Recipe: ...".

Try: click "Missing states" and read the prompt in the composer. Delete it without sending.

## 3. Empty states

Sketch, Review, Design system and Files each show a small line drawing, one sentence on what the tab is for and one
button that puts the right command (/sketch, /review, /system) in the composer.

Try: the Files sidebar in a chat with no Figma file.

## 4. Spend meter

A pill in the top bar shows what the chat has cost. Click it for a breakdown by phase (plan, sketch, design, review,
design system, chat) and by model, today's total across all chats, and a budget bar. Set a daily budget in Settings;
the pill turns amber at 80% and red past 100%. Background reviewers and profile builds count too.

Try: click the "0 tok" pill. Set a budget of 5 in Settings and open it again.

Note: per-chat spend resets when the server restarts; the daily total is kept in ~/.designview/spend.json.

## 5. Design crit and copy pass

The Review tab has three views: Review, Crit and Copy. Both new ones are a single Sonnet call (a few cents) and never
edit Figma.

- **Crit** (`/crit`): four viewpoints on the frames (new user, power user, accessibility, product), each with a
  verdict and likes, concerns and ideas linked to nodes.
- **Copy** (`/copy tone:friendly`): suggested text changes with a reason each. Edit any "after", untick what you
  don't want, then "Apply selected in Figma" puts a precise use_figma prompt in the composer for you to send.

Try: Review tab, switch to Crit and Copy. The runs shown are sample data in ~/DesignView/scratch.

## 6. Comments inbox

A Comments panel in the left bar lists the Figma file's comment threads, open first. Each has Show in Figma, Reply
and Ask Claude (fills the composer with the comment and asks Claude to fix it and reply). "Ask Claude to address all
open comments" does the whole list. Figma's API cannot resolve comments, so Claude replies instead.

Try: needs a chat on a Figma file and a token in Settings.

## 7. Token export and brief templates

- Design system panel: "Export tokens" turns the profile into CSS variables, a Tailwind theme or W3C design tokens
  JSON, with Copy and Download.
- New chat dialog: brief templates (feature screen, landing page, onboarding, settings, dashboard, empty and error
  states). The brief lands in the new chat's composer, not sent.

Try: the file switcher at the top left, pick "Onboarding flow".

## 8. Changes: before and after

Review tab, Changes view. Lists the file's Figma versions, with Claude's checkpoints marked. Pick a version and a
frame to compare it with now, either with a slider you drag or side by side. Links to the version in Figma.

Try: needs a chat on a Figma file and a token.

## 9. Images in the composer

Paste, drop or attach up to five images (screenshots, references, moodboards). They are saved to refs/ in the chat
folder and sent to Claude with the message. Pairs with the "Screenshot to design" recipe.

Try: paste a screenshot into the composer and remove it with the x. Do not send unless you want a run.

## 10. House rules

A Rules panel in the left bar with "This file" and "All files" rule lists, such as "no drop shadows on cards".
Claude gets them in every chat, and the reviewers and crit check against them. "Suggest rules from my design
system" asks Claude to propose some.

Try: add a rule, click away, see "Saved".

## 11. Shortcuts

Press ? for the sheet. Cmd+1 to Cmd+6 switch tabs (Chrome may keep Cmd+digit, then use Ctrl), / focuses the
composer. Node ids in crit, copy and review show as Figma-blue chips.

## 12. Sample tour (start here)

Home has "Take the tour with sample data". It opens a read-only chat, "Grocery app (sample)", with a finished brief,
sketches, a full review, a crit, a copy pass and a design system profile. It never calls Claude or Figma: sending a
message there only shows a note.

Try: Home, Open sample. Then walk Sketch, Review (Review, Crit, Copy), the Design system panel (Export tokens).

## 13. Design report

Review tab, "Export report" (or the download icon, or "Export: Design report" in the palette). One self-contained
HTML file with the brief, sketches, frames, review, crit and copy changes. No external requests, prints cleanly.

Try: in the sample chat, Review, Export report.

## 14. Your recipes

Home has a "Yours" group. "New recipe" saves your own prompt (use {frames} for the focused frame), with edit and
delete. Palette: "Recipe: Save composer text as recipe" turns what you typed into a recipe.

Try: make a recipe "Dark mode pass" and click it.
