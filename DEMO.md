# DesignView demo guide

Open http://localhost:5174 on the Mac, or scan the phone icon's QR code to open it on your phone and add it to the home
screen. DesignView.app runs from the menu bar (started by `./start.sh`). This guide shows the app after the redesign.

Nothing in the tour spends tokens. Do not send anything while you follow it.

## Ten-minute tour

1. **Open the app.** Go to the URL.
   You should see: The top bar, the left rail and the conversation. With no file and no content, the canvas column is
   hidden and the conversation fills the window. If the Figma token or tools are missing, a one-line "Figma is not
   connected yet" banner shows.

2. **Chats and the Sample tour.** In the Chats panel, click the pinned "Sample tour" row.
   You should see: The read-only chat "Grocery app (sample)". The Figma, Sketch and Review tabs appear above the canvas.

3. **The review card.** At the top of the sample conversation, find the review card.
   You should see: The card shows the run ("Review 1 · Full"), blocking and major counts, tokens, a pass or fail mark
   per area, and the buttons Open Review and Post as Figma comments (do not click it). Review deeper appears only after
   a Quick review or an audit. In a chat with history, each reply has an "n steps" row that expands into the tool calls.

4. **Review tab.** Open Review. Click the Crit row, then the Copy row.
   You should see: One list, newest first, one line per run (kind, time, counts, tokens). The newest is open. Crit
   shows four viewpoints. Copy shows suggested text changes, each with an edit field and a tick.

5. **Sketch tab.** Open Sketch.
   You should see: Low-fidelity directions per screen on an Excalidraw canvas. You can draw and add notes here.

6. **File panel.** Click File in the left rail. Open and close Comments and Versions.
   You should see: The frames list, then the two collapsible sections. They remember whether they are open.

7. **Design system panel.** Click the design system icon. Open "Export tokens". Scroll to Rules and open it.
   You should see: Colors, text styles, spacing and components. Export offers CSS, Tailwind and W3C JSON. Rules lists
   house rules for "This file" and "All files".

8. **Mode pill and Shift+Tab.** Click the pill at the left of the composer, pick Design, then open the menu again.
   Press Shift+Tab in the composer until you are back on Chat.
   You should see: The menu lists Chat, Design and Review. In Design, "Stop after sketch" and "Review depth" (Quick or
   Full) appear and the composer gets a coral ring.

9. **Attach popover and link chip.** In Chats, click New chat. Click "Attach Figma file" in the top bar (or press
   Cmd+O), then close it. Paste a figma.com design link in the composer. Clear the text. Do not click Attach.
   You should see: The popover has a link field and a Recent files list. The chip "Attach <name>?" has an Attach button.

10. **Slash commands.** Type `/`. Then type `/sta` and press Tab. Clear the text.
   You should see: The six recipes first, then the server commands. Tab expands the recipe into its full prompt.

11. **Settings and Check setup.** Click the gear. Click "Run all checks" in Check setup. Press Escape.
   You should see: Settings opens as an overlay. Check setup tests the Figma token, Figma tools, Chrome and the Claude
   login, and says ok or what is wrong, with a fix button where one exists.

12. **Phone QR.** Click the phone icon in the top bar. Scan the code with your phone camera.
   You should see: A QR code with a switch between the Tailscale and Wi-Fi addresses, and how to add the app to the
   home screen.

Also worth a look: press `?` for the shortcut sheet, and press Cmd+Shift+P for the command palette.

## If something looks different

- No Figma, Sketch or Review tab: the chat has no file, sketches or review yet. Open the Sample tour, or press Cmd+1 to
  Cmd+3 to bring a tab back.
- No Preview or Files tab, terminal or build check: turn on "Developer tools" in Settings.
- Cmd+digit does nothing: Chrome keeps some of them, so use Ctrl+digit.
- The top bar status is hidden on wide screens. The conversation status line shows it there.

## What changed in the redesign

- R1, Modes: a plain message is a normal chat. The composer pill picks Chat, Design or Review, and Shift+Tab cycles.
- R2, Attach a Figma file: a chat starts without a file. Attach from the top bar, Cmd+O, or the composer link chip.
- R3, Run card: the Plan, Sketch, Design, Review stepper is replaced by a card in the conversation with Stop.
- R4, One conversation view: Timeline and Transcript are merged, with an "n steps" row per reply.
- R5, No Home tab: a short welcome with four suggestions, a setup banner and the sample tour row in Chats.
- R6, Tabs only with content: Figma, Sketch and Review show when they have something. Settings is an overlay.
- R7, Six recipes as slash commands: `/brief`, `/states`, `/responsive`, `/crit`, `/copy`, `/handoff`.
- R8, Review as one list: no Review, Crit, Copy, Changes and Build sub-tabs, and no Check or Focused presets.
- R9, Review card in the conversation: counts, area marks, Open Review, Post as Figma comments, Review deeper.
- R10, Free check after edits: in Chat mode, a turn that edited Figma gets the design system check on its frames.
- R11, Three left panels: Chats, File (Comments and Versions inside) and Design system (Rules inside).
- R12, Theme pass: one type scale, serif only for titles, no model names in the UI, no shadows except popovers.
- R13, Cuts: the FlowBar, the New chat dialog and brief templates, the focus pill, the Preview tab, and ten recipes.

## Feature reference

**Look and feel.** Cream paper background and coral accent, with Figma blue for Figma things (node chips, focused
frames, the Figma tab). Type is 16 body, 14 secondary and 13 labels. The system serif (New York) is used for the
wordmark, page titles and headings in Claude's replies. The home screen icon is coral.

**Modes.** Chat is a normal conversation with Sonnet. Design runs plan (Opus), sketch, design and review. Review checks
frames and edits nothing. Design options (stop after sketch, review depth) are in the pill menu. Settings also has
"Stop after sketch" and a default review depth.

**Design run.** Plan writes a brief. Sketch draws two or three directions per screen. Design builds the screens on a
page named DesignView with your library components, variables and text styles. Review runs the free design system
check, then reviewers by depth: Quick is one reviewer, Full is six area reviewers with up to two fix rounds. Before
its first change in each turn, Claude saves a Figma version, and a hook blocks changes until it has.

**Attach and Figma access.** The Figma token gives file lists, frames, thumbnails, comments and the design system
check. "Add Figma to Claude" in Settings adds the Figma MCP server. The Figma tab shows your own Chrome through the
relay on :7780. Check setup tests the token, tools, Chrome and Claude login without spending tokens.

**Conversation.** Each turn shows progress lines with frame thumbnails (click one to jump to it in Figma), notes and
the reply. Read aloud is in the status line. You can paste, drop or attach up to five images in the composer. They are
saved to `refs/` in the chat folder and sent with the message.

**Review, crit and copy.** `/review` runs reviewers and the free check. `/audit` checks the whole file with no model
calls. `/crit` gives four viewpoints with a verdict and notes. `/copy tone:friendly` suggests text changes, and
"Apply selected in Figma" puts a precise prompt in the composer. Crit and copy are one Sonnet call each (a few cents)
and never edit Figma. The Review tab can post findings as Figma comments.

**Build check.** With developer tools on, `/buildcheck <url> <frame link>` opens the URL in a hidden Chrome tab at the
frame's width, screenshots it, renders the Figma frame, and one Sonnet call lists the differences with a match score.
View by slider or side by side. "Send diffs to engineer" copies a markdown checklist.

**File panel.** Frames (select one to target recipes), Comments with Show in Figma, Reply and Ask Claude ("Ask Claude
to address all open comments" does the list, since Figma's API cannot resolve comments), and Versions with Claude's
checkpoints marked and a compare view.

**Design system and Rules.** The profile can be rebuilt with `/system`. "Export tokens" gives CSS variables, a
Tailwind theme or W3C JSON. Rules for "This file" and "All files" reach every chat on the next message, and the
reviewers and crit check against them. "Suggest rules from my design system" proposes some.

**Recipes.** Six built-in recipes expand from `/`. Your own recipes show as `/<title>`, and you manage them in the
palette ("Recipe: Save composer text as recipe", "Recipe: Edit ...").

**Spend meter.** The pill shows chat cost by phase and model, today's total, and a budget bar. The daily budget is in
Settings. Background reviewers and profile builds count. Chat spend survives a server restart.

**Design report.** Review tab, "Export report" (or the palette). One self-contained HTML file with the brief, sketches,
frames, review, crit and copy changes. No external requests, prints cleanly.

**Shortcuts and focus mode.** Press `?` for the sheet. Cmd+1 to Cmd+5 open Figma, Sketch, Review, Preview and
Settings (Ctrl if Chrome keeps the digits). Cmd+B toggles the sidebar and Cmd+. toggles focus mode, which hides both
side panels. Node ids show as Figma-blue chips.

**Sample tour.** Read-only chat with a finished brief, sketches, a full review, a crit, a copy pass, a review card and
a design system profile. It never calls Claude or Figma.

**Phone.** The phone icon shows a QR code for the Tailscale or Wi-Fi address and how to add the app to the home screen.
Everything except the Figma tab works on the phone.

**Security.** The server rejects POSTs and WebSockets from other websites (Origin and Host checks; localhost, LAN,
Tailscale and Netbird stay allowed). Before this fix, any page you visited could write house rules or settings. The
report embeds sketches as images and sends a strict CSP. Uploads are checked by their bytes, request bodies are capped
at 1 MB and rules at 20 KB. The sample chat is read-only on every path.

## After the tour: real runs

These spend tokens and need a Figma token, Claude's Figma tools and a file you can edit. Use a scratch file.

1. **Attach a file.** Click "Attach Figma file", paste a link, send a plain question such as "What frames are on this
   page?". You should see a normal reply with an "n steps" row.
2. **Free check after an edit.** In Chat mode, ask Claude to change one frame. When the reply ends, the status line shows
   "Checking edited frames" and a review card follows. This check uses no model tokens.
3. **Review mode.** Switch to Review with Shift+Tab, name a frame and send. Reviewers run and a review card appears.
   Click Review deeper to put `/review full` in the composer.
4. **Design mode.** Switch to Design, send a short brief. The run card shows plan, sketch, design and review. Turn on
   "Stop after sketch" first if you want to pick a direction before Claude touches Figma.
5. **Crit and copy.** Type `/crit` or `/copy tone:friendly` with a frame link. Each is one Sonnet call, a few cents.
6. **Spend.** Click the spend pill to see the cost by phase and model.

## One group for chats without a file

All chats that have no Figma file attached sit in one "No file yet" group in Chats, instead of one group
per chat folder. Its + button starts another new chat.

## Open questions for you

- AgentView has the same cross-site request gap that DesignView fixed (Origin and Host checks). Port the fix there?
- Not tried with real Figma and Claude yet. These need a Figma token and spend a few cents each:
  - Comments inbox, crit, copy pass, Versions compare, build check and image paste.
  - The attach flow with a real file (top bar, link chip, Cmd+O).
  - The free check after Claude edits Figma in Chat mode.
  - The review card after a real review.
  - Design mode end to end, with the run card.
