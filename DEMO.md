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
