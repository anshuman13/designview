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
Chrome, design system profile) with a button for each missing step, and lists recipes in three groups (fifteen now, see section 17):

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

## 15. Timeline thumbnails and focus mode

- When Claude reports progress on Figma nodes, the timeline shows small thumbnails of them. Click one to jump there
  in Figma.
- Focus mode (Cmd+. or the icon at the right of the tab strip) hides both side panels so Figma, Sketch or Review get
  the full width. A floating pill shows the phase and lets you exit.

## 16. Security fixes from a review of tonight's code

- The server now rejects POSTs and WebSockets from other websites (Origin and Host checks; localhost, LAN,
  Tailscale and Netbird stay allowed). Before, any page you visited could write house rules or settings. This was
  inherited from AgentView, so AgentView has the same gap.
- The report embeds sketches as images and sends a strict CSP, so a sketch cannot run script.
- Uploads are checked by their bytes, request bodies are capped at 1 MB, rules at 20 KB.
- The sample chat is read-only on every path (steer, plan changes, commands), not only new messages.
- Edited house rules now reach open chats on the next message.

## 17. More recipes and the build check

New recipes: Accessibility notes (focus order, headings, labels as annotations next to the frames), Localization
stress test (copies with 40% longer text, then lists what breaks), Dark mode pass (dark copies via variable modes),
Frame to code (React and CSS using your tokens, saved to the chat folder), Build check.

Build check (`/buildcheck <url> <frame link>`, Review tab, Build view): DesignView opens the URL in a hidden Chrome
tab at the frame's width, takes a full-page screenshot, renders the Figma frame, and one Sonnet call lists the
differences with a match score. Slider or side by side, and "Send diffs to engineer" copies a markdown checklist.
Not tried against a real page yet, since it needs a Figma file and spends a few cents.

README.md is rewritten to cover all of this.

## 18. Small things

- The timeline in a new chat asks "What are we designing?" and offers four example briefs as chips.
- Three variations recipe: three alternatives of a frame in a row, each with a caption, plus Claude's pick.
- The Figma and Preview tabs use the same empty state style as the rest, with "Open this file" and "Build a
  prototype" buttons.
- A chat's spend now survives a server restart (stored per session in spend.json in the chat folder).
- Phone: the Review switcher scrolls sideways, and Export report is the download icon only.

## 19. Check setup

Settings has a "Check setup" card. It tests the Figma token, Figma tools in Claude, Chrome and the Claude CLI login,
without spending model tokens. Each row says ok or what is wrong, with a fix button where one exists (for example
"Add Figma to Claude").

Try: Settings, Run all checks.

## 20. Open on phone

The phone icon in the top bar shows a QR code for the Tailscale or Wi-Fi address, with a switch between them, and
how to add DesignView to the home screen. The Android app tab from AgentView is gone (DesignView has no Android
build).

Try: click the phone icon and scan the code with your phone camera.

## 21. Recipe search

Home has a search box above the recipes. It filters every group, your own recipes included, by title and
description. Escape clears it.

Try: Home, type "frame" or "copy".

## 22. Modes: Chat, Design, Review

A plain message is now a normal chat with Claude. The pill at the left of the composer picks the mode:
Chat (default), Design (Opus plans, then sketch, design and review) or Review (reviewers check the frames,
no edits). Shift+Tab in the composer cycles modes. Design mode has a coral ring and its options (stop
after sketch, review depth) live in the pill menu.

Try: click the Chat pill, pick Design, open the menu again to see the options. Shift+Tab back to Chat.

## 23. Attach a Figma file

A chat no longer needs a Figma link to start. New chat opens an empty chat right away. Attach a file later
from the top bar pill ("Attach Figma file": paste a link or pick a recent file), or paste a figma.com link
in the composer and click Attach on the chip that appears. Claude gets the file on its next turn. ⌘O opens
the same popover.

Try: Chats, New chat. Click "Attach Figma file" in the top bar. Paste a Figma link in the composer to see
the chip (no need to send).

## 24. Run card

The Plan / Sketch / Design / Review stepper at the top of the right panel is gone. While a design or sketch
run is going, a card at the end of the conversation shows each phase (done, now, still to come), tokens
used so far, and a Stop button. While Claude waits for you to pick sketch directions, the button is Open
Sketch instead.

Try: switch the composer to Design and send a brief; the card appears below your message.

## 25. One conversation view

The Timeline and Transcript tabs are merged. Each turn shows your message, Claude's progress lines (with
Figma frame thumbnails), important notes, Fable reviews, and Claude's full reply. All tool calls of a turn
sit in one collapsed "n steps" row with the total time; click it to see every step. While Claude works,
that row shows the current step. Read aloud moved into the status line.

Try: open any chat with history and click "n steps" above a reply.

## Open questions for you

- "Next message starts a design run" is on by default, so a plain question in a new chat starts an Opus plan and a
  full run. Turn it off by default?
- AgentView has the same cross-site request gap that section 16 fixed here. Port the fix there?
- Not tried with real Figma and Claude yet: comments inbox, crit, copy pass, Changes, build check, image paste.
  They need a Figma token and spend a few cents each.
